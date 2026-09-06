<?php
/**
 * VALERIE JEWELS — Fastrr Payment Webhook Handler
 * Verifies HMAC-SHA256 signature and updates order status atomically.
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/utils/mailer.php';
require_once dirname(__DIR__) . '/config/database.php';


handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ApiResponse::error('Method not allowed. Use POST.', 405);
}

$rawPayload = file_get_contents('php://input');
$data = json_decode($rawPayload, true);

if (!$data) {
    ApiResponse::error('Invalid JSON payload', 400);
}

// Fetch fastrr config
$config = require dirname(__DIR__) . '/config/config.php';
$secretKey = $config['fastrr']['secret_key'] ?? '';
$isSandbox = !empty($config['fastrr']['sandbox']);

// Verify signature if provided or in production
$signature = $_SERVER['HTTP_X_FASTRR_SIGNATURE'] ?? $_SERVER['X_FASTRR_SIGNATURE'] ?? null;

if (!empty($secretKey) && !empty($signature)) {
    $expectedSignature = hash_hmac('sha256', $rawPayload, $secretKey);
    if (!hash_equals($expectedSignature, $signature)) {
        ApiResponse::error('Invalid webhook signature', 401);
    }
} elseif (!$isSandbox && empty($signature)) {
    ApiResponse::error('Missing required webhook signature header', 401);
}

try {
    $pdo = Database::getConnection();

    $event        = $data['event'] ?? 'payment.success';
    $orderNumber  = $data['order_number'] ?? ($data['data']['order_number'] ?? null);
    $orderId      = $data['order_id'] ?? ($data['data']['order_id'] ?? null);
    $fastrrOrderId= $data['fastrr_order_id'] ?? ($data['data']['fastrr_order_id'] ?? 'FST-' . uniqid());
    $amountPaid   = isset($data['amount_paid']) ? (float)$data['amount_paid'] : (isset($data['data']['amount_paid']) ? (float)$data['data']['amount_paid'] : null);
    $riskTier     = $data['risk_tier'] ?? ($data['data']['risk_tier'] ?? null);

    if (!$orderNumber && !$orderId) {
        ApiResponse::error('Missing order identifier in webhook payload', 422);
    }

    // Locate order
    if ($orderNumber) {
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE order_number = ? LIMIT 1");
        $stmt->execute([$orderNumber]);
    } else {
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
        $stmt->execute([(int)$orderId]);
    }
    $order = $stmt->fetch();

    if (!$order) {
        ApiResponse::error('Order not found', 404);
    }

    if ($event === 'payment.success' || $event === 'order.paid' || $event === 'order.confirmed') {
        $paymentType = $order['payment_type'];
        
        $newPaymentStatus = 'paid';
        $newOrderStatus   = 'confirmed';
        $paidUpfront      = (float)$order['amount_paid_upfront'];
        $dueOnDelivery    = (float)$order['amount_due_on_delivery'];

        if ($paymentType === 'full_prepaid') {
            $newPaymentStatus = 'paid';
            $paidUpfront = $amountPaid !== null ? $amountPaid : (float)$order['total_amount'];
            $dueOnDelivery = 0.0;
        } elseif ($paymentType === 'partial') {
            $newPaymentStatus = 'partial_paid';
            $paidUpfront = $amountPaid !== null ? $amountPaid : (float)$order['amount_paid_upfront'];
            $dueOnDelivery = round(max(0, (float)$order['total_amount'] - $paidUpfront), 2);
        } else {
            // Full COD
            $newPaymentStatus = 'pending';
            $paidUpfront = 0.0;
            $dueOnDelivery = (float)$order['total_amount'];
        }

        $updateSql = "
            UPDATE orders 
            SET payment_status = :payment_status,
                order_status   = :order_status,
                fastrr_order_id = :fastrr_order_id,
                amount_paid_upfront = :paid_upfront,
                amount_due_on_delivery = :due_on_delivery,
                fastrr_risk_tier = COALESCE(:risk_tier, fastrr_risk_tier),
                updated_at = NOW()
            WHERE id = :id
        ";
        $updateStmt = $pdo->prepare($updateSql);
        $updateStmt->execute([
            ':payment_status'   => $newPaymentStatus,
            ':order_status'     => $newOrderStatus,
            ':fastrr_order_id'  => $fastrrOrderId,
            ':paid_upfront'     => $paidUpfront,
            ':due_on_delivery'  => $dueOnDelivery,
            ':risk_tier'        => $riskTier,
            ':id'               => $order['id'],
        ]);

        // Phase 7: Send idempotent order confirmation email
        try {
            MailerService::sendOrderConfirmation((int)$order['id']);
        } catch (Throwable $e) {
            // Log silently
        }

        ApiResponse::success([

            'order_id'               => $order['id'],
            'order_number'           => $order['order_number'],
            'payment_status'         => $newPaymentStatus,
            'order_status'           => $newOrderStatus,
            'fastrr_order_id'        => $fastrrOrderId,
            'amount_paid_upfront'    => $paidUpfront,
            'amount_due_on_delivery' => $dueOnDelivery,
        ], 'Webhook processed: Order confirmed');

    } elseif ($event === 'payment.failed') {
        $updateStmt = $pdo->prepare("UPDATE orders SET payment_status = 'failed', updated_at = NOW() WHERE id = ?");
        $updateStmt->execute([$order['id']]);

        ApiResponse::success([
            'order_id'       => $order['id'],
            'order_number'   => $order['order_number'],
            'payment_status' => 'failed',
        ], 'Webhook processed: Payment failed noted');
    } else {
        ApiResponse::success(['event' => $event], 'Webhook received (unhandled event)');
    }

} catch (Throwable $e) {
    ApiResponse::error('Webhook processing error: ' . $e->getMessage(), 500);
}
