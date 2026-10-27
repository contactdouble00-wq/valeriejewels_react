<?php
/**
 * VALERIE JEWELS — Payment & Order Verification Endpoint
 * Returns verified order details, payment splits, and itemized receipt.
 * Automatically syncs with Razorpay REST API if order is pending.
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/utils/mailer.php';
require_once dirname(__DIR__) . '/config/database.php';

handleCors();

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'GET' && $method !== 'POST') {
    ApiResponse::error('Method not allowed. Use GET or POST.', 405);
}

$input = $method === 'POST' ? (json_decode(file_get_contents('php://input'), true) ?: $_POST) : $_GET;

$orderNumber = trim($input['order_number'] ?? '');
$orderId     = !empty($input['order_id']) ? (int)$input['order_id'] : null;
$simulate    = !empty($input['simulate_success']);

if (empty($orderNumber) && empty($orderId)) {
    ApiResponse::error('order_number or order_id is required', 422);
}

try {
    $pdo = Database::getConnection();

    if (!empty($orderNumber)) {
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE order_number = ? LIMIT 1");
        $stmt->execute([$orderNumber]);
    } else {
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
        $stmt->execute([$orderId]);
    }

    $order = $stmt->fetch();

    if (!$order) {
        ApiResponse::error('Order not found', 404);
    }

    $razorpayPaymentId = trim($input['razorpay_payment_id'] ?? '');
    $razorpayOrderId   = trim($input['razorpay_order_id'] ?? '');
    $razorpaySignature = trim($input['razorpay_signature'] ?? '');

    // Fetch Razorpay credentials from site_settings
    $rpKeyId = 'rzp_live_Tf7Bar4fWloC2y';
    $rpSecret = 'u8xu0HfY01b0wkwWwiYfEBRN';

    try {
        $secretStmt = $pdo->prepare("SELECT `value` FROM `site_settings` WHERE `key` = 'payment_settings' LIMIT 1");
        $secretStmt->execute();
        $rawS = $secretStmt->fetchColumn();
        if ($rawS) {
            $pSettings = json_decode($rawS, true) ?: [];
            if (!empty($pSettings['razorpay_key_id'])) {
                $rpKeyId = $pSettings['razorpay_key_id'];
            }
            if (!empty($pSettings['razorpay_key_secret'])) {
                $rpSecret = $pSettings['razorpay_key_secret'];
            }
        }
    } catch (Throwable $e) {}

    $isVerified = false;
    $capturedPaymentId = null;
    $capturedAmount = null;

    // 1. Signature Verification if client sent signature
    if (!empty($razorpayPaymentId) && !empty($razorpayOrderId) && !empty($razorpaySignature)) {
        $expectedSignature = hash_hmac('sha256', $razorpayOrderId . '|' . $razorpayPaymentId, $rpSecret);
        if (hash_equals($expectedSignature, $razorpaySignature)) {
            $isVerified = true;
            $capturedPaymentId = $razorpayPaymentId;
        }
    }

    // 2. Direct Razorpay API Verification if payment_id provided without signature or signature didn't match
    if (!$isVerified && !empty($razorpayPaymentId) && !empty($rpKeyId) && !empty($rpSecret)) {
        $ch = curl_init('https://api.razorpay.com/v1/payments/' . urlencode($razorpayPaymentId));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERPWD, $rpKeyId . ':' . $rpSecret);
        curl_setopt($ch, CURLOPT_TIMEOUT, 6);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $rpResp = curl_exec($ch);
        $rpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($rpCode === 200 && $rpResp) {
            $rpPay = json_decode($rpResp, true);
            if (!empty($rpPay['id']) && $rpPay['id'] === $razorpayPaymentId && ($rpPay['status'] === 'captured' || $rpPay['status'] === 'authorized')) {
                $isVerified = true;
                $capturedPaymentId = $rpPay['id'];
                if (isset($rpPay['amount'])) {
                    $capturedAmount = (float)$rpPay['amount'] / 100;
                }
            }
        }
    }

    // 3. Fallback: If order is still pending, actively check Razorpay API for captured payments
    $isOrderPending = ($order['payment_status'] === 'pending' || $order['payment_status'] === 'unpaid' || $order['order_status'] === 'pending');
    if (!$isVerified && $isOrderPending && !empty($rpKeyId) && !empty($rpSecret) && $order['payment_type'] !== 'cod') {
        $lookupOrderId = $order['fastrr_order_id'];

        // Option A: If fastrr_order_id is a Razorpay order ID (starts with order_)
        if (!empty($lookupOrderId) && str_starts_with($lookupOrderId, 'order_')) {
            $ch = curl_init('https://api.razorpay.com/v1/orders/' . urlencode($lookupOrderId) . '/payments');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_USERPWD, $rpKeyId . ':' . $rpSecret);
            curl_setopt($ch, CURLOPT_TIMEOUT, 6);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            $ordResp = curl_exec($ch);
            $ordCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($ordCode === 200 && $ordResp) {
                $payList = json_decode($ordResp, true);
                if (!empty($payList['items']) && is_array($payList['items'])) {
                    foreach ($payList['items'] as $item) {
                        if (($item['status'] === 'captured' || $item['status'] === 'authorized')) {
                            $isVerified = true;
                            $capturedPaymentId = $item['id'];
                            if (isset($item['amount'])) {
                                $capturedAmount = (float)$item['amount'] / 100;
                            }
                            break;
                        }
                    }
                }
            }
        }

        // Option B: Search recent payments by order_number in notes or receipt
        if (!$isVerified && !empty($order['order_number'])) {
            $ch = curl_init('https://api.razorpay.com/v1/payments?count=25');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_USERPWD, $rpKeyId . ':' . $rpSecret);
            curl_setopt($ch, CURLOPT_TIMEOUT, 6);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            $recentResp = curl_exec($ch);
            $recentCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($recentCode === 200 && $recentResp) {
                $recentList = json_decode($recentResp, true);
                if (!empty($recentList['items']) && is_array($recentList['items'])) {
                    foreach ($recentList['items'] as $item) {
                        $notes = $item['notes'] ?? [];
                        $noteOrderNum = $notes['order_number'] ?? '';
                        $noteValerieId= $notes['valerie_order_id'] ?? '';
                        $match = ($noteOrderNum === $order['order_number']) || ((string)$noteValerieId === (string)$order['id']);
                        if ($match && ($item['status'] === 'captured' || $item['status'] === 'authorized')) {
                            $isVerified = true;
                            $capturedPaymentId = $item['id'];
                            if (isset($item['amount'])) {
                                $capturedAmount = (float)$item['amount'] / 100;
                            }
                            break;
                        }
                    }
                }
            }
        }
    }

    // Apply verification update if payment verified
    if ($isVerified) {
        $newPaymentStatus = 'paid';
        $paidUpfront = (float)$order['amount_paid_upfront'];
        $dueOnDelivery = (float)$order['amount_due_on_delivery'];

        if ($order['payment_type'] === 'partial') {
            $newPaymentStatus = 'partial_paid';
            if ($capturedAmount !== null && $capturedAmount > 0) {
                $paidUpfront = $capturedAmount;
            }
            $dueOnDelivery = round(max(0, (float)$order['total_amount'] - $paidUpfront), 2);
        } elseif ($order['payment_type'] === 'full_prepaid') {
            $newPaymentStatus = 'paid';
            if ($capturedAmount !== null && $capturedAmount > 0) {
                $paidUpfront = $capturedAmount;
            } else {
                $paidUpfront = (float)$order['total_amount'];
            }
            $dueOnDelivery = 0.0;
        }

        $nowSql = Database::getDriver() === 'sqlite' ? "datetime('now')" : "NOW()";
        $upStmt = $pdo->prepare("
            UPDATE orders 
            SET payment_status = :ps,
                order_status = 'confirmed',
                fastrr_order_id = COALESCE(:p_id, fastrr_order_id),
                amount_paid_upfront = :paid_upfront,
                amount_due_on_delivery = :due_on_deliv,
                updated_at = $nowSql
            WHERE id = :id
        ");
        $upStmt->execute([
            ':ps'            => $newPaymentStatus,
            ':p_id'          => $capturedPaymentId ?: $order['fastrr_order_id'],
            ':paid_upfront'  => $paidUpfront,
            ':due_on_deliv'  => $dueOnDelivery,
            ':id'            => $order['id'],
        ]);

        // Refresh order
        $stmt->execute(!empty($orderNumber) ? [$orderNumber] : [$orderId]);
        $order = $stmt->fetch();

        try {
            MailerService::sendOrderConfirmation((int)$order['id']);
        } catch (Throwable $e) {}

        try {
            require_once dirname(__DIR__) . '/shipping/shiprocket.php';
            ShiprocketService::createShipment((int)$order['id']);
        } catch (Throwable $e) {
            error_log('[Shiprocket] Auto-sync error on verify: ' . $e->getMessage());
        }
    }
    // Sandbox simulation for test/mock mode
    elseif ($simulate && $order['order_status'] === 'pending') {
        $newPaymentStatus = 'paid';
        if ($order['payment_type'] === 'partial') {
            $newPaymentStatus = 'partial_paid';
        } elseif ($order['payment_type'] === 'cod') {
            $newPaymentStatus = 'pending';
        }

        $nowSql = Database::getDriver() === 'sqlite' ? "datetime('now')" : "NOW()";
        $upStmt = $pdo->prepare("
            UPDATE orders 
            SET payment_status = :ps,
                order_status = 'confirmed',
                fastrr_order_id = COALESCE(fastrr_order_id, :fid),
                updated_at = $nowSql
            WHERE id = :id
        ");
        $upStmt->execute([
            ':ps'  => $newPaymentStatus,
            ':fid' => 'FST-SBX-' . strtoupper(substr(md5(uniqid()), 0, 8)),
            ':id'  => $order['id'],
        ]);

        $stmt->execute(!empty($orderNumber) ? [$orderNumber] : [$orderId]);
        $order = $stmt->fetch();

        try {
            MailerService::sendOrderConfirmation((int)$order['id']);
        } catch (Throwable $e) {}

        try {
            require_once dirname(__DIR__) . '/shipping/shiprocket.php';
            ShiprocketService::createShipment((int)$order['id']);
        } catch (Throwable $e) {
            error_log('[Shiprocket] Auto-sync error on simulate verify: ' . $e->getMessage());
        }
    }

    // Fetch order items
    $itemStmt = $pdo->prepare("
        SELECT 
            oi.id, oi.product_id, oi.variant_id, oi.product_name, oi.variant_title, oi.quantity, oi.unit_price, oi.total_price,
            COALESCE(
                (SELECT image_url FROM product_images WHERE product_id = oi.product_id AND is_primary = 1 AND image_url NOT LIKE '%.mp4%' AND image_url NOT LIKE '%.webm%' AND image_url NOT LIKE '%.mov%' AND image_url NOT LIKE '%video_%' AND image_url NOT LIKE '%photo-1630019852942%' LIMIT 1),
                (SELECT image_url FROM product_images WHERE product_id = oi.product_id AND image_url NOT LIKE '%.mp4%' AND image_url NOT LIKE '%.webm%' AND image_url NOT LIKE '%.mov%' AND image_url NOT LIKE '%video_%' AND image_url NOT LIKE '%photo-1630019852942%' ORDER BY display_order ASC, id ASC LIMIT 1),
                (SELECT pi2.image_url FROM product_images pi2 JOIN products p2 ON pi2.product_id = p2.id WHERE p2.name = oi.product_name AND pi2.is_primary = 1 AND pi2.image_url NOT LIKE '%.mp4%' AND pi2.image_url NOT LIKE '%.webm%' AND pi2.image_url NOT LIKE '%photo-1630019852942%' LIMIT 1),
                (SELECT pi2.image_url FROM product_images pi2 JOIN products p2 ON pi2.product_id = p2.id WHERE p2.name = oi.product_name AND pi2.image_url NOT LIKE '%.mp4%' AND pi2.image_url NOT LIKE '%.webm%' AND pi2.image_url NOT LIKE '%photo-1630019852942%' ORDER BY pi2.display_order ASC, pi2.id ASC LIMIT 1),
                (SELECT pi3.image_url FROM product_images pi3 JOIN products p3 ON pi3.product_id = p3.id WHERE (p3.sku = 'VJ-OXD-016' OR p3.name LIKE '%16 Pairs%') AND (oi.product_name LIKE '%16 Pairs%' OR oi.product_name LIKE '%Oxidized%') AND pi3.image_url NOT LIKE '%.mp4%' AND pi3.image_url NOT LIKE '%photo-1630019852942%' ORDER BY pi3.is_primary DESC, pi3.id ASC LIMIT 1)
            ) AS image_url
        FROM order_items oi
        WHERE oi.order_id = ?
        ORDER BY oi.id ASC
    ");
    $itemStmt->execute([$order['id']]);
    $items = $itemStmt->fetchAll();

    $response = [
        'order' => [
            'id'                     => (int)$order['id'],
            'order_number'           => $order['order_number'],
            'customer_name'          => $order['customer_name'],
            'customer_email'         => $order['customer_email'],
            'customer_phone'         => $order['customer_phone'],
            'shipping_address_line1' => $order['shipping_address_line1'],
            'shipping_address_line2' => $order['shipping_address_line2'],
            'city'                   => $order['city'],
            'state'                  => $order['state'],
            'pincode'                => $order['pincode'],
            'subtotal'               => (float)$order['subtotal'],
            'discount_amount'        => (float)$order['discount_amount'],
            'shipping_fee'           => (float)$order['shipping_fee'],
            'total_amount'           => (float)$order['total_amount'],
            'payment_type'           => $order['payment_type'],
            'payment_status'         => $order['payment_status'],
            'amount_paid_upfront'    => (float)$order['amount_paid_upfront'],
            'amount_due_on_delivery' => (float)$order['amount_due_on_delivery'],
            'order_status'           => $order['order_status'],
            'fastrr_order_id'        => $order['fastrr_order_id'],
            'fastrr_risk_tier'       => $order['fastrr_risk_tier'],
            'created_at'             => $order['created_at'],
        ],
        'items' => array_map(function($item) {
            return [
                'id'            => (int)$item['id'],
                'product_id'    => (int)$item['product_id'],
                'variant_id'    => $item['variant_id'] ? (int)$item['variant_id'] : null,
                'product_name'  => $item['product_name'],
                'variant_title' => $item['variant_title'],
                'quantity'      => (int)$item['quantity'],
                'unit_price'    => (float)$item['unit_price'],
                'total_price'   => (float)$item['total_price'],
                'image_url'     => $item['image_url'] ?? null,
            ];
        }, $items),
    ];

    ApiResponse::success($response, 'Order status retrieved');

} catch (Throwable $e) {
    ApiResponse::error('Order verification failed: ' . $e->getMessage(), 500);
}
