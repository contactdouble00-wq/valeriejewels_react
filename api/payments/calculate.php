<?php
/**
 * VALERIE JEWELS — Server-Side Price & Payment Split Recalculation
 * CRITICAL SECURITY: Never trusts client-submitted prices. 
 * Recomputes all totals directly from canonical MySQL database records.
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/config/database.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ApiResponse::error('Method not allowed. Use POST.', 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

$items      = $input['items'] ?? [];
$couponCode = strtoupper(trim($input['coupon_code'] ?? ''));

if (empty($items) || !is_array($items)) {
    ApiResponse::error('Cart items are required for checkout calculation', 422);
}

try {
    $pdo = Database::getConnection();

    $recalculatedItems = [];
    $subtotal = 0.0;
    $totalMrp = 0.0;

    $prodStmt = $pdo->prepare("SELECT id, name, slug, price, mrp, is_active FROM products WHERE id = ? LIMIT 1");
    $varStmt  = $pdo->prepare("SELECT id, title, price, mrp, is_active FROM product_variants WHERE id = ? AND product_id = ? LIMIT 1");
    $bndlStmt = $pdo->prepare("SELECT id, title, slug, bundle_price, compare_price, is_active FROM bundles WHERE id = ? LIMIT 1");

    foreach ($items as $item) {
        $quantity = max(1, (int)($item['quantity'] ?? 1));

        if (!empty($item['isBundle'])) {
            // Bundle / Combo Item
            $bundleId = (int)($item['bundleId'] ?? $item['id'] ?? 0);
            $bndlStmt->execute([$bundleId]);
            $bndl = $bndlStmt->fetch();

            if (!$bndl || !$bndl['is_active']) {
                continue;
            }

            $price = (float)$bndl['bundle_price'];
            $mrp   = (float)$bndl['compare_price'];
            $lineTotal = $price * $quantity;
            $lineMrp   = $mrp * $quantity;

            $subtotal += $lineTotal;
            $totalMrp += $lineMrp;

            $recalculatedItems[] = [
                'type'       => 'bundle',
                'id'         => $bndl['id'],
                'name'       => $bndl['title'],
                'price'      => $price,
                'mrp'        => $mrp,
                'quantity'   => $quantity,
                'line_total' => $lineTotal,
            ];
        } else {
            // Regular Product Item
            $productId = (int)($item['productId'] ?? $item['id'] ?? 0);
            $variantId = !empty($item['variantId']) ? (int)$item['variantId'] : null;

            $prodStmt->execute([$productId]);
            $prod = $prodStmt->fetch();

            if (!$prod || !$prod['is_active']) {
                continue;
            }

            $price = (float)$prod['price'];
            $mrp   = (float)($prod['mrp'] ?: $prod['price']);
            $variantTitle = null;

            if ($variantId) {
                $varStmt->execute([$variantId, $productId]);
                $variant = $varStmt->fetch();
                if ($variant && $variant['is_active']) {
                    $variantTitle = $variant['title'];
                    if ($variant['price'] !== null) $price = (float)$variant['price'];
                    if ($variant['mrp'] !== null)   $mrp   = (float)$variant['mrp'];
                }
            }

            $lineTotal = $price * $quantity;
            $lineMrp   = $mrp * $quantity;

            $subtotal += $lineTotal;
            $totalMrp += $lineMrp;

            $recalculatedItems[] = [
                'type'          => 'product',
                'id'            => $prod['id'],
                'variant_id'    => $variantId,
                'name'          => $prod['name'],
                'variant_title' => $variantTitle,
                'price'         => $price,
                'mrp'           => $mrp,
                'quantity'      => $quantity,
                'line_total'    => $lineTotal,
            ];
        }
    }

    if (empty($recalculatedItems)) {
        ApiResponse::error('No valid active products in cart', 400);
    }

    // Coupon discount logic
    $discountAmount = 0.0;
    $appliedCoupon  = null;

    if (!empty($couponCode)) {
        $coupStmt = $pdo->prepare("
            SELECT * FROM coupons 
            WHERE code = :code AND is_active = 1
            LIMIT 1
        ");
        $coupStmt->execute([':code' => $couponCode]);
        $coupon = $coupStmt->fetch();

        if ($coupon) {
            $minOrder = (float)$coupon['min_order_amount'];
            if ($subtotal >= $minOrder) {
                if ($coupon['discount_type'] === 'percentage') {
                    $discountAmount = ($subtotal * (float)$coupon['discount_value']) / 100.0;
                    if ($coupon['max_discount_amount'] !== null) {
                        $discountAmount = min($discountAmount, (float)$coupon['max_discount_amount']);
                    }
                } else {
                    // Fixed discount
                    $discountAmount = (float)$coupon['discount_value'];
                }
                $discountAmount = min($discountAmount, $subtotal);
                $appliedCoupon = [
                    'code'           => $coupon['code'],
                    'discount_type'  => $coupon['discount_type'],
                    'discount_value' => (float)$coupon['discount_value'],
                    'amount_saved'   => round($discountAmount, 2),
                ];
            }
        }
    }

    // Net cart amount after coupons
    $netSubtotal = round(max(0.0, $subtotal - $discountAmount), 2);
    $totalSavings = round(($totalMrp - $subtotal) + $discountAmount, 2);

    // Load dynamic payment settings from database if configured
    $payConfig = [
        'online_payment_enabled' => true,
        'prepaid_discount'    => 50.0,
        'partial_advance'     => 100.0,
        'partial_cod_enabled' => true,
        'cod_fee'             => 0.0,
        'cod_available'       => false,
    ];
    try {
        $settStmt = $pdo->prepare("SELECT `value` FROM `site_settings` WHERE `key` = 'payment_settings' LIMIT 1");
        $settStmt->execute();
        $rawSettings = $settStmt->fetchColumn();
        if ($rawSettings) {
            $saved = json_decode($rawSettings, true);
            if (is_array($saved)) {
                $payConfig = array_merge($payConfig, $saved);
            }
        }
    } catch (Exception $e) {}

    // Delivery / Shipping Rules:
    // 1. Prepaid Orders: 100% FREE DELIVERY (₹0 shipping fee across India)
    // 2. Partial COD Orders: 100% FREE DELIVERY (₹0 shipping fee across India)
    // 3. Full Cash on Delivery (COD): Standard shipping applies (Free on >= ₹999, else ₹99)
    $freeShippingThreshold = 999.0;
    $codShippingFee = ($netSubtotal >= $freeShippingThreshold) ? 0.0 : 99.0;
    $codFee = (float)($payConfig['cod_fee'] ?? 0.0);

    // 1. Prepaid Calculation
    // Free delivery: shipping fee = 0
    // Instant discount: flat ₹50 (or configured prepaid_discount), but cannot discount below ₹1.00 min gateway transaction
    $maxPrepaidDiscount = (float)($payConfig['prepaid_discount'] ?? 50.0);
    $prepaidIncentiveDiscount = 0.0;
    if ($netSubtotal > 1.0) {
        $prepaidIncentiveDiscount = min($maxPrepaidDiscount, round($netSubtotal - 1.0, 2));
    }
    $prepaidTotal = ($netSubtotal > 0.0) ? round(max(1.0, $netSubtotal - $prepaidIncentiveDiscount), 2) : 0.0;

    // 2. Partial COD Calculation
    // Free delivery: shipping fee = 0
    // Upfront deposit: min($partialAdvance, $netSubtotal) with min ₹1
    $configuredAdvance = (float)($payConfig['partial_advance'] ?? 100.0);
    $partialDeposit = ($netSubtotal > 0.0) ? round(min($configuredAdvance, $netSubtotal), 2) : 0.0;
    $partialDueOnDelivery = round(max(0.0, $netSubtotal - $partialDeposit), 2);

    // 3. Full COD Calculation
    // Standard shipping applies if < 999 + optional COD fee
    $codTotal = round($netSubtotal + $codShippingFee + $codFee, 2);

    $calculation = [
        'items'                   => $recalculatedItems,
        'item_count'              => array_sum(array_column($recalculatedItems, 'quantity')),
        'subtotal'                => round($subtotal, 2),
        'total_mrp'               => round($totalMrp, 2),
        'discount_amount'         => round($discountAmount, 2),
        'total_savings'           => $totalSavings,
        'shipping_fee'            => 0.0, // Free on default active checkout methods (prepaid & partial COD)
        'cod_shipping_fee'        => $codShippingFee,
        'is_free_shipping'        => true,
        'final_total'             => $netSubtotal,
        'applied_coupon'          => $appliedCoupon,
        'payment_splits' => [
            'full_prepaid' => [
                'enabled'               => (bool)($payConfig['online_payment_enabled'] ?? true),
                'title'                 => 'Prepaid (UPI / Cards / NetBanking)',
                'badge'                 => $prepaidIncentiveDiscount > 0 ? ('Save ₹' . round($prepaidIncentiveDiscount) . ' Extra Instant Discount') : 'Free Delivery Included',
                'incentive_discount'    => $prepaidIncentiveDiscount,
                'shipping_fee'          => 0.0,
                'is_free_shipping'      => true,
                'amount_due_now'        => $prepaidTotal,
                'amount_due_on_delivery'=> 0.0,
            ],
            'partial' => [
                'enabled'               => (bool)$payConfig['partial_cod_enabled'],
                'title'                 => 'Partial COD (Smart Split)',
                'badge'                 => 'Free Delivery • Pay ₹' . round($partialDeposit) . ' Deposit Now',
                'shipping_fee'          => 0.0,
                'is_free_shipping'      => true,
                'amount_due_now'        => $partialDeposit,
                'amount_due_on_delivery'=> $partialDueOnDelivery,
            ],
            'cod' => [
                'enabled'               => (bool)$payConfig['cod_available'],
                'title'                 => 'Cash on Delivery (Full COD)',
                'badge'                 => $codShippingFee > 0 ? '₹99 Delivery Fee' : ($codFee > 0 ? ('₹' . round($codFee) . ' COD Fee') : 'Pay Full Cash at Doorstep'),
                'shipping_fee'          => $codShippingFee,
                'is_free_shipping'      => ($codShippingFee === 0.0),
                'cod_fee'               => $codFee,
                'amount_due_now'        => 0.0,
                'amount_due_on_delivery'=> $codTotal,
            ],
        ],
    ];

    ApiResponse::success($calculation, 'Order totals recalculated successfully');

} catch (Throwable $e) {
    ApiResponse::error('Calculation error: ' . $e->getMessage(), 500);
}
