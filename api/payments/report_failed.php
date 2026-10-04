<?php
/**
 * VALERIE JEWELS — Instant Payment Failure / Drop-Off Reporter
 * Automatically notifies backend when checkout payment is cancelled or failed on client-side,
 * marks the order, and dispatches the high-converting luxury recovery email with product link.
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
$data = json_decode($rawPayload, true) ?: $_POST;

$orderNumber = trim($data['order_number'] ?? '');
$reason = trim($data['reason'] ?? 'Payment authorization was cancelled or interrupted');

if (empty($orderNumber)) {
    ApiResponse::error('Missing order_number parameter', 422);
}

try {
    $pdo = Database::getConnection();

    $stmt = $pdo->prepare("SELECT * FROM orders WHERE order_number = ? LIMIT 1");
    $stmt->execute([$orderNumber]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
        ApiResponse::error('Order not found', 404);
    }

    // Do not mark failed if order is already paid or confirmed
    if ($order['payment_status'] === 'paid' || $order['payment_status'] === 'partial_paid' || $order['order_status'] === 'confirmed' || $order['order_status'] === 'shipped') {
        ApiResponse::success(['order_number' => $orderNumber, 'status' => $order['payment_status']], 'Order is already completed');
    }

    // Update order status to failed
    $upStmt = $pdo->prepare("
        UPDATE orders 
        SET payment_status = 'failed',
            order_status   = 'failed',
            updated_at     = :updated_at 
        WHERE id = :id
    ");
    $upStmt->execute([
        ':updated_at' => date('Y-m-d H:i:s'),
        ':id'         => $order['id'],
    ]);

    // Dispatch luxury conversion email (with idempotency locking in email_logs)
    $emailResult = null;
    $emailValid = !empty($order['customer_email']) && 
                  filter_var($order['customer_email'], FILTER_VALIDATE_EMAIL) && 
                  strpos($order['customer_email'], '@valerieclient.in') === false;

    if ($emailValid) {
        try {
            $emailResult = MailerService::sendOrderFailed((int)$order['id'], $reason);
        } catch (Throwable $me) {
            error_log("[report_failed] Mailer dispatch failed: " . $me->getMessage());
        }
    }

    ApiResponse::success([
        'order_id'       => $order['id'],
        'order_number'   => $order['order_number'],
        'payment_status' => 'failed',
        'email_sent'     => !empty($emailResult['success']),
        'email_status'   => $emailResult['status'] ?? 'skipped',
        'log_id'         => $emailResult['log_id'] ?? null,
    ], 'Payment failure noted and customer recovery dispatched');

} catch (Throwable $e) {
    ApiResponse::error('Failed to process payment status update: ' . $e->getMessage(), 500);
}
