<?php
/**
 * VALERIE JEWELS — Order & Checkout Initiation Endpoint
 * Creates order records with server-side validation and Fastrr payment session generation.
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/utils/rate_limiter.php';
require_once dirname(__DIR__) . '/auth/middleware.php';
require_once dirname(__DIR__) . '/config/database.php';

handleCors();

// Anti card-testing & bot rate limit: relaxed to 60 checkouts per 10 minutes per IP for active checkout & QA testing
RateLimiter::check('payment_initiate', 60, 600);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ApiResponse::error('Method not allowed. Use POST.', 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

$customerName  = trim($input['customer_name'] ?? '');
$customerEmail = strtolower(trim($input['customer_email'] ?? ''));
$customerPhone = trim($input['customer_phone'] ?? '');
$addressLine1  = trim($input['shipping_address_line1'] ?? '');
$addressLine2  = trim($input['shipping_address_line2'] ?? '');
$city          = trim($input['city'] ?? '');
$state         = trim($input['state'] ?? '');
$pincode       = trim($input['pincode'] ?? '');
$paymentType   = trim($input['payment_type'] ?? 'full_prepaid'); // full_prepaid | partial | cod
$couponCode    = strtoupper(trim($input['coupon_code'] ?? ''));
$items         = $input['items'] ?? [];

// Basic validation
$errors = [];
if (empty($customerName))  $errors['customer_name']  = 'Customer name is required';
if (empty($customerEmail) && !empty($customerPhone)) {
    $cleanP = preg_replace('/\D/', '', $customerPhone);
    $customerEmail = ($cleanP ?: 'guest') . '@valerieclient.in';
}
if (empty($customerEmail)) $errors['customer_email'] = 'Valid email is required';
if (empty($customerPhone)) $errors['customer_phone'] = 'Mobile phone number is required';
if (empty($addressLine1))  $errors['shipping_address_line1'] = 'Address is required';
if (empty($city))          $errors['city']          = 'City is required';
if (empty($state))         $errors['state']         = 'State is required';
if (empty($pincode))       $errors['pincode']       = 'Valid 6-digit pincode is required';
if (empty($items))         $errors['items']         = 'Cart items are required';

if (!in_array($paymentType, ['full_prepaid', 'partial', 'cod'], true)) {
    $paymentType = 'full_prepaid';
}

if (!empty($errors)) {
    ApiResponse::error('Validation failed', 422, $errors);
}

// Optional authenticated user
$authUser = AuthMiddleware::getOptionalAuth();
$userId   = $authUser ? (int)$authUser['id'] : null;

try {
    $pdo = Database::getConnection();
    $pdo->beginTransaction();

    // 1. Recalculate order totals strictly server-side
    $subtotal = 0.0;
    $totalMrp = 0.0;
    $validatedOrderItems = [];

    $prodStmt = $pdo->prepare("SELECT id, name, price, mrp, is_active FROM products WHERE id = ? LIMIT 1");
    $varStmt  = $pdo->prepare("SELECT id, title, price, mrp, is_active FROM product_variants WHERE id = ? AND product_id = ? LIMIT 1");
    $bndlStmt = $pdo->prepare("SELECT id, title, bundle_price, compare_price, is_active FROM bundles WHERE id = ? LIMIT 1");

    foreach ($items as $item) {
        $quantity = max(1, (int)($item['quantity'] ?? 1));

        if (!empty($item['isBundle'])) {
            $bundleId = (int)($item['bundleId'] ?? $item['id'] ?? 0);
            $bndlStmt->execute([$bundleId]);
            $bndl = $bndlStmt->fetch();
            if (!$bndl || !$bndl['is_active']) continue;

            $unitPrice = (float)$bndl['bundle_price'];
            $unitMrp   = (float)$bndl['compare_price'];
            $lineTotal = $unitPrice * $quantity;

            $subtotal += $lineTotal;
            $totalMrp += ($unitMrp * $quantity);

            $validatedOrderItems[] = [
                'product_id'    => null,
                'bundle_id'     => $bndl['id'],
                'product_name'  => $bndl['title'],
                'variant_id'    => null,
                'variant_title' => 'Curated Combo Set',
                'quantity'      => $quantity,
                'unit_price'    => $unitPrice,
                'total_price'   => $lineTotal,
            ];
        } else {
            $productId = (int)($item['productId'] ?? $item['id'] ?? 0);
            $variantId = !empty($item['variantId']) ? (int)$item['variantId'] : null;

            $prodStmt->execute([$productId]);
            $prod = $prodStmt->fetch();
            if (!$prod || !$prod['is_active']) continue;

            $unitPrice = (float)$prod['price'];
            $unitMrp   = (float)($prod['mrp'] ?: $prod['price']);
            $variantTitle = null;

            if ($variantId) {
                $varStmt->execute([$variantId, $productId]);
                $variant = $varStmt->fetch();
                if ($variant && $variant['is_active']) {
                    $variantTitle = $variant['title'];
                    if ($variant['price'] !== null) $unitPrice = (float)$variant['price'];
                    if ($variant['mrp'] !== null)   $unitMrp   = (float)$variant['mrp'];
                }
            }

            $lineTotal = $unitPrice * $quantity;
            $subtotal += $lineTotal;
            $totalMrp += ($unitMrp * $quantity);

            $validatedOrderItems[] = [
                'product_id'    => $prod['id'],
                'bundle_id'     => null,
                'product_name'  => $prod['name'],
                'variant_id'    => $variantId,
                'variant_title' => $variantTitle,
                'quantity'      => $quantity,
                'unit_price'    => $unitPrice,
                'total_price'   => $lineTotal,
            ];
        }
    }

    if (empty($validatedOrderItems)) {
        $pdo->rollBack();
        ApiResponse::error('No valid products available in order', 400);
    }

    // Coupon calculation
    $discountAmount = 0.0;
    if (!empty($couponCode)) {
        $coupStmt = $pdo->prepare("SELECT * FROM coupons WHERE code = :code AND is_active = 1 LIMIT 1");
        $coupStmt->execute([':code' => $couponCode]);
        $coupon = $coupStmt->fetch();
        if ($coupon && $subtotal >= (float)$coupon['min_order_amount']) {
            if ($coupon['discount_type'] === 'percentage') {
                $discountAmount = ($subtotal * (float)$coupon['discount_value']) / 100.0;
                if ($coupon['max_discount_amount'] !== null) {
                    $discountAmount = min($discountAmount, (float)$coupon['max_discount_amount']);
                }
            } else {
                $discountAmount = (float)$coupon['discount_value'];
            }
            $discountAmount = min($discountAmount, $subtotal);
        }
    }

    // Net cart amount after coupons
    $netSubtotal = round(max(0.0, $subtotal - $discountAmount), 2);

    // Load active payment settings from database
    $payConfig = [
        'online_payment_enabled' => true,
        'prepaid_discount'       => 50.0,
        'partial_cod_enabled'    => true,
        'partial_advance'        => 100.0,
        'cod_available'          => false,
        'cod_fee'                => 0.0,
        'gateway_mode'           => 'sandbox',
        'razorpay_key_id'        => '',
        'razorpay_key_secret'    => '',
        'fastrr_app_id'          => '',
    ];
    try {
        $settingsStmt = $pdo->prepare("SELECT `value` FROM `site_settings` WHERE `key` = 'payment_settings' LIMIT 1");
        $settingsStmt->execute();
        $rawSettings = $settingsStmt->fetchColumn();
        if ($rawSettings) {
            $parsedSettings = json_decode($rawSettings, true);
            if (is_array($parsedSettings)) {
                $payConfig = array_merge($payConfig, $parsedSettings);
            }
        }
    } catch (Throwable $se) {}

    // Delivery / Shipping Rules:
    // 1. Prepaid Orders: 100% FREE DELIVERY (₹0 shipping fee across India)
    // 2. Partial COD Orders: 100% FREE DELIVERY (₹0 shipping fee across India)
    // 3. Full Cash on Delivery (COD): Standard shipping applies (Free on >= ₹999, else ₹99)
    $freeShippingThreshold = 999.0;
    $codShippingFee = ($netSubtotal >= $freeShippingThreshold) ? 0.0 : 99.0;
    $codFee = (float)($payConfig['cod_fee'] ?? 0.0);

    // Split logic
    $amountPaidUpfront = 0.0;
    $amountDueOnDelivery = 0.0;
    $shippingFee = 0.0;

    if ($paymentType === 'full_prepaid') {
        // Free delivery on prepaid: ₹0 shipping
        $shippingFee = 0.0;
        $maxPrepaidDiscount = (float)($payConfig['prepaid_discount'] ?? 50.0);
        $prepaidDiscount = 0.0;
        if ($netSubtotal > 1.0) {
            $prepaidDiscount = min($maxPrepaidDiscount, round($netSubtotal - 1.0, 2));
        }
        $totalAmount = ($netSubtotal > 0.0) ? round(max(1.0, $netSubtotal - $prepaidDiscount), 2) : 0.0;
        $discountAmount += $prepaidDiscount;
        $amountPaidUpfront = $totalAmount;
        $amountDueOnDelivery = 0.0;
    } elseif ($paymentType === 'partial') {
        // Free delivery on partial COD: ₹0 shipping
        $shippingFee = 0.0;
        $totalAmount = $netSubtotal;
        $configuredAdvance = max(1.0, (float)($payConfig['partial_advance'] ?? 100.0));
        $deposit = ($totalAmount > 0.0) ? round(min($configuredAdvance, $totalAmount), 2) : 0.0;
        $amountPaidUpfront = $deposit;
        $amountDueOnDelivery = round(max(0.0, $totalAmount - $deposit), 2);
    } else {
        // Full COD
        $shippingFee = $codShippingFee;
        $totalAmount = round($netSubtotal + $shippingFee + $codFee, 2);
        $amountPaidUpfront = 0.0;
        $amountDueOnDelivery = $totalAmount;
    }

    // Risk tier estimation (Fastrr engine simulator)
    $fastrrRiskTier = 'low';
    if ($authUser && !empty($authUser['is_blocked_rto'])) {
        $fastrrRiskTier = 'high';
    }

    // 2. Insert into orders table
    $orderNumber = sprintf('VJ-%s-%04d', date('Ymd'), rand(1000, 9999));

    $orderSql = "
        INSERT INTO orders (
            order_number, user_id, customer_name, customer_email, customer_phone,
            shipping_address_line1, shipping_address_line2, city, state, pincode,
            subtotal, discount_amount, shipping_fee, total_amount,
            payment_type, amount_paid_upfront, amount_due_on_delivery,
            payment_status, order_status, fastrr_risk_tier
        ) VALUES (
            :order_number, :user_id, :name, :email, :phone,
            :addr1, :addr2, :city, :state, :pincode,
            :subtotal, :discount, :shipping, :total,
            :payment_type, :paid_upfront, :due_on_deliv,
            'pending', 'pending', :risk_tier
        )
    ";

    $orderStmt = $pdo->prepare($orderSql);
    $orderStmt->execute([
        ':order_number' => $orderNumber,
        ':user_id'      => $userId,
        ':name'         => $customerName,
        ':email'        => $customerEmail,
        ':phone'        => $customerPhone,
        ':addr1'        => $addressLine1,
        ':addr2'        => !empty($addressLine2) ? $addressLine2 : null,
        ':city'         => $city,
        ':state'        => $state,
        ':pincode'      => $pincode,
        ':subtotal'     => $subtotal,
        ':discount'     => $discountAmount,
        ':shipping'     => $shippingFee,
        ':total'        => $totalAmount,
        ':payment_type' => $paymentType,
        ':paid_upfront' => $amountPaidUpfront,
        ':due_on_deliv' => $amountDueOnDelivery,
        ':risk_tier'    => $fastrrRiskTier,
    ]);

    $orderId = (int)$pdo->lastInsertId();

    // 3. Insert into order_items
    $itemSql = "
        INSERT INTO order_items (
            order_id, product_id, variant_id, product_name, variant_title, quantity, unit_price, total_price
        ) VALUES (
            :order_id, :product_id, :variant_id, :product_name, :variant_title, :quantity, :unit_price, :total_price
        )
    ";
    $itemStmt = $pdo->prepare($itemSql);

    foreach ($validatedOrderItems as $vItem) {
        $itemStmt->execute([
            ':order_id'      => $orderId,
            ':product_id'    => $vItem['product_id'] ?? 1, // Fallback product id for bundles
            ':variant_id'    => $vItem['variant_id'],
            ':product_name'  => $vItem['product_name'],
            ':variant_title' => $vItem['variant_title'],
            ':quantity'      => $vItem['quantity'],
            ':unit_price'    => $vItem['unit_price'],
            ':total_price'   => $vItem['total_price'],
        ]);
    }

    $pdo->commit();

    // Active payment & gateway credentials from payConfig
    $razorpayKeyId     = $payConfig['razorpay_key_id'] ?? '';
    $razorpayKeySecret = $payConfig['razorpay_key_secret'] ?? '';
    $fastrrAppId       = $payConfig['fastrr_app_id'] ?? '';
    $isLive            = ($payConfig['gateway_mode'] ?? 'sandbox') === 'live';

    $razorpayOrderId = null;
    if ($amountPaidUpfront > 0 && !empty($razorpayKeyId) && !empty($razorpayKeySecret)) {
        // Create an official Razorpay Order via REST API
        $amountInPaise = (int)round($amountPaidUpfront * 100);
        $orderPayload = [
            'amount'   => $amountInPaise,
            'currency' => 'INR',
            'receipt'  => $orderNumber,
            'notes'    => [
                'valerie_order_id' => (string)$orderId,
                'customer_phone'   => $customerPhone,
                'customer_name'    => $customerName,
                'payment_type'     => $paymentType,
            ],
        ];

        $ch = curl_init('https://api.razorpay.com/v1/orders');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERPWD, $razorpayKeyId . ':' . $razorpayKeySecret);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($orderPayload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $rpResponse = curl_exec($ch);
        $rpHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($rpHttpCode === 200 && $rpResponse) {
            $rpData = json_decode($rpResponse, true);
            if (!empty($rpData['id'])) {
                $razorpayOrderId = $rpData['id'];
                $upStmt = $pdo->prepare("UPDATE orders SET fastrr_order_id = ? WHERE id = ?");
                $upStmt->execute([$razorpayOrderId, $orderId]);
            }
        }
    }

    // Auto-create order in Shiprocket for 100% Cash on Delivery orders
    if ($paymentType === 'cod') {
        try {
            $upStmt = $pdo->prepare("UPDATE orders SET order_status = 'confirmed' WHERE id = ?");
            $upStmt->execute([$orderId]);

            require_once dirname(__DIR__) . '/shipping/shiprocket.php';
            ShiprocketService::createShipment($orderId);
        } catch (Throwable $se) {
            error_log('[Shiprocket] COD auto-sync error: ' . $se->getMessage());
        }
    }

    // Generate Fastrr & Razorpay checkout session payload
    $fastrrSession = [
        'order_id'               => $orderId,
        'order_number'           => $orderNumber,
        'payment_type'           => $paymentType,
        'amount_payable_now'     => $amountPaidUpfront,
        'amount_due_on_delivery' => $amountDueOnDelivery,
        'total_amount'           => $totalAmount,
        'currency'               => 'INR',
        'razorpay_order_id'      => $razorpayOrderId,
        'razorpay_key_id'        => $razorpayKeyId,
        'fastrr_app_id'          => $fastrrAppId,
        'customer'               => [
            'name'  => $customerName,
            'email' => $customerEmail,
            'phone' => $customerPhone,
        ],
        'shipping_address'       => [
            'line1'   => $addressLine1,
            'line2'   => $addressLine2,
            'city'    => $city,
            'state'   => $state,
            'pincode' => $pincode,
        ],
        'risk_tier'              => $fastrrRiskTier,
        'sandbox'                => !$isLive,
    ];

    ApiResponse::success($fastrrSession, 'Order initiated successfully', 201);

} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    ApiResponse::error('Order initiation failed: ' . $e->getMessage(), 500);
}
