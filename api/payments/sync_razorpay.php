<?php
/**
 * VALERIE JEWELS — Razorpay Live Payment Sync & Verification Engine
 * Queries Razorpay REST API directly to verify payment status for any order.
 * Automatically marks captured orders as paid/confirmed, updates receipts, 
 * dispatches confirmation emails, and syncs shipments to Shiprocket.
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

$orderNumber       = trim($input['order_number'] ?? '');
$orderId           = !empty($input['order_id']) ? (int)$input['order_id'] : (!empty($input['id']) ? (int)$input['id'] : null);
$razorpayPaymentId = trim($input['razorpay_payment_id'] ?? ($input['payment_id'] ?? ''));

if (empty($orderNumber) && empty($orderId) && empty($razorpayPaymentId)) {
    ApiResponse::error('order_number, order_id, or razorpay_payment_id is required', 422);
}

try {
    $pdo = Database::getConnection();

    // 1. Fetch Razorpay live API credentials
    $rpKeyId  = 'rzp_live_Tf7Bar4fWloC2y';
    $rpSecret = 'u8xu0HfY01b0wkwWwiYfEBRN';

    try {
        $stmtS = $pdo->prepare("SELECT `value` FROM `site_settings` WHERE `key` = 'payment_settings' LIMIT 1");
        $stmtS->execute();
        $rawS = $stmtS->fetchColumn();
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

    // 2. Locate order in database
    $order = null;
    if (!empty($orderNumber)) {
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE order_number = ? LIMIT 1");
        $stmt->execute([$orderNumber]);
        $order = $stmt->fetch();
    } elseif (!empty($orderId)) {
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();
    } elseif (!empty($razorpayPaymentId)) {
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE fastrr_order_id = ? LIMIT 1");
        $stmt->execute([$razorpayPaymentId]);
        $order = $stmt->fetch();
    }

    // 3. If order not found yet and razorpay_payment_id provided, fetch payment from Razorpay to find notes
    if (!$order && !empty($razorpayPaymentId)) {
        $ch = curl_init('https://api.razorpay.com/v1/payments/' . urlencode($razorpayPaymentId));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERPWD, $rpKeyId . ':' . $rpSecret);
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $res = curl_exec($ch);
        curl_close($ch);
        $payData = json_decode($res, true);
        if (!empty($payData['notes']['order_number'])) {
            $stmt = $pdo->prepare("SELECT * FROM orders WHERE order_number = ? LIMIT 1");
            $stmt->execute([$payData['notes']['order_number']]);
            $order = $stmt->fetch();
        }
    }

    if (!$order) {
        ApiResponse::error('Order not found', 404);
    }

    $isAlreadyConfirmed = ($order['payment_status'] === 'paid' || ($order['payment_type'] === 'partial' && $order['payment_status'] === 'partial_paid'))
        && ($order['order_status'] === 'confirmed' || $order['order_status'] === 'shipped' || $order['order_status'] === 'delivered');

    // 4. Query Razorpay API for live payment status
    $foundPayment = null;

    // Check by payment ID if provided
    if (!empty($razorpayPaymentId)) {
        $ch = curl_init('https://api.razorpay.com/v1/payments/' . urlencode($razorpayPaymentId));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERPWD, $rpKeyId . ':' . $rpSecret);
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $res = curl_exec($ch);
        curl_close($ch);
        $payData = json_decode($res, true);
        if (!empty($payData['id']) && ($payData['status'] === 'captured' || $payData['status'] === 'authorized')) {
            $foundPayment = $payData;
        }
    }

    // Check by order's fastrr_order_id if it starts with order_
    if (!$foundPayment && !empty($order['fastrr_order_id']) && str_starts_with($order['fastrr_order_id'], 'order_')) {
        $ch = curl_init('https://api.razorpay.com/v1/orders/' . urlencode($order['fastrr_order_id']) . '/payments');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERPWD, $rpKeyId . ':' . $rpSecret);
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $res = curl_exec($ch);
        curl_close($ch);
        $listData = json_decode($res, true);
        if (!empty($listData['items']) && is_array($listData['items'])) {
            foreach ($listData['items'] as $item) {
                if ($item['status'] === 'captured' || $item['status'] === 'authorized') {
                    $foundPayment = $item;
                    break;
                }
            }
        }
    }

    // Search recent payments by order_number or phone
    if (!$foundPayment) {
        $ch = curl_init('https://api.razorpay.com/v1/payments?count=50');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERPWD, $rpKeyId . ':' . $rpSecret);
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $res = curl_exec($ch);
        curl_close($ch);
        $listData = json_decode($res, true);
        if (!empty($listData['items']) && is_array($listData['items'])) {
            foreach ($listData['items'] as $item) {
                $notes = $item['notes'] ?? [];
                $match = (!empty($notes['order_number']) && $notes['order_number'] === $order['order_number'])
                    || (!empty($notes['valerie_order_id']) && (string)$notes['valerie_order_id'] === (string)$order['id']);
                if ($match && ($item['status'] === 'captured' || $item['status'] === 'authorized')) {
                    $foundPayment = $item;
                    break;
                }
            }
        }
    }

    // 5. If captured payment found, update the order!
    if ($foundPayment) {
        $paymentAmount = isset($foundPayment['amount']) ? ((float)$foundPayment['amount'] / 100) : null;
        $paymentId     = $foundPayment['id'];
        $paymentMethod = $foundPayment['method'] ?? 'online';
        $now           = date('Y-m-d H:i:s');

        $paymentType = $order['payment_type'];
        $newPaymentStatus = 'paid';
        $newOrderStatus   = 'confirmed';
        $paidUpfront      = (float)$order['amount_paid_upfront'];
        $dueOnDelivery    = (float)$order['amount_due_on_delivery'];

        if ($paymentType === 'partial') {
            $newPaymentStatus = 'partial_paid';
            $paidUpfront      = $paymentAmount !== null ? $paymentAmount : (float)$order['amount_paid_upfront'];
            $dueOnDelivery    = round(max(0, (float)$order['total_amount'] - $paidUpfront), 2);
        } elseif ($paymentType === 'full_prepaid') {
            $newPaymentStatus = 'paid';
            $paidUpfront      = $paymentAmount !== null ? $paymentAmount : (float)$order['total_amount'];
            $dueOnDelivery    = 0.0;
        }

        $nowSql = Database::getDriver() === 'sqlite' ? "datetime('now')" : "NOW()";
        $upStmt = $pdo->prepare("
            UPDATE orders 
            SET payment_status = :ps,
                order_status = :os,
                fastrr_order_id = :p_id,
                amount_paid_upfront = :paid_upfront,
                amount_due_on_delivery = :due_on_deliv,
                updated_at = $nowSql
            WHERE id = :id
        ");
        $upStmt->execute([
            ':ps'           => $newPaymentStatus,
            ':os'           => $newOrderStatus,
            ':p_id'         => $paymentId,
            ':paid_upfront' => $paidUpfront,
            ':due_on_deliv' => $dueOnDelivery,
            ':id'           => $order['id'],
        ]);

        // Send confirmation email
        $emailResult = null;
        try {
            $emailResult = MailerService::sendOrderConfirmation((int)$order['id']);
        } catch (Throwable $e) {
            error_log('[Sync Razorpay] Mailer error: ' . $e->getMessage());
        }

        // Push to default delivery partner
        $srResult = null;
        try {
            require_once dirname(__DIR__) . '/shipping/DeliveryProviderFactory.php';
            $provider = DeliveryProviderFactory::getDefaultProvider();
            $srResult = $provider->createShipment((int)$order['id']);
        } catch (Throwable $e) {
            error_log('[Sync Razorpay] Fulfillment sync error: ' . $e->getMessage());
        }

        ApiResponse::success([
            'order_id'               => (int)$order['id'],
            'order_number'           => $order['order_number'],
            'payment_status'         => $newPaymentStatus,
            'order_status'           => $newOrderStatus,
            'transaction_id'         => $paymentId,
            'amount_paid_upfront'    => $paidUpfront,
            'amount_due_on_delivery' => $dueOnDelivery,
            'payment_method'         => $paymentMethod,
            'payment_verified'       => true,
            'email_sent'             => !empty($emailResult['success']),
            'shiprocket_synced'      => !empty($srResult['success']),
        ], "Payment verified successfully via Razorpay (₹{$paidUpfront} received - ID: {$paymentId})");

    } else {
        if ($isAlreadyConfirmed) {
            ApiResponse::success([
                'order_id'       => (int)$order['id'],
                'order_number'   => $order['order_number'],
                'payment_status' => $order['payment_status'],
                'order_status'   => $order['order_status'],
                'payment_verified'=> true,
            ], "Order is already marked confirmed and {$order['payment_status']}");
        }

        ApiResponse::error("No captured Razorpay payment found for Order #{$order['order_number']}. Status remains {$order['payment_status']}.", 404, [
            'order_id'       => (int)$order['id'],
            'order_number'   => $order['order_number'],
            'payment_status' => $order['payment_status'],
            'order_status'   => $order['order_status'],
            'payment_verified'=> false,
        ]);
    }

} catch (Throwable $e) {
    ApiResponse::error('Razorpay sync error: ' . $e->getMessage(), 500);
}
