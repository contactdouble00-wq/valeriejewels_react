<?php
/**
 * VALERIE JEWELS — Instant Payment Failure / Drop-Off Reporter
 * Automatically marks order as failed and immediately dispatches the luxury recovery email.
 * Runs with ignore_user_abort to ensure email delivery even if user closes the tab or navigates.
 */

ignore_user_abort(true);
set_time_limit(60);

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/utils/auto_recovery.php';
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
    if ($order['payment_status'] === 'paid' || $order['payment_status'] === 'partial_paid' || 
        $order['order_status'] === 'confirmed' || $order['order_status'] === 'shipped') {
        ApiResponse::success([
            'order_number'   => $orderNumber,
            'payment_status' => $order['payment_status'],
            'order_status'   => $order['order_status'],
        ], 'Order is already completed/confirmed');
    }

    // Update order status to failed
    $nowSql = Database::getDriver() === 'sqlite' ? "datetime('now')" : "NOW()";
    $upStmt = $pdo->prepare("
        UPDATE orders 
        SET payment_status = 'failed',
            order_status   = 'failed',
            updated_at     = $nowSql 
        WHERE id = :id
    ");
    $upStmt->execute([':id' => $order['id']]);

    // Dispatch luxury conversion email via AutoRecoveryService (strictly idempotent)
    $emailResult = AutoRecoveryService::sendForOrder((int)$order['id'], $reason);

    ApiResponse::success([
        'order_id'       => $order['id'],
        'order_number'   => $order['order_number'],
        'payment_status' => 'failed',
        'order_status'   => 'failed',
        'email_sent'     => !empty($emailResult['success']),
        'email_status'   => $emailResult['status'] ?? 'unknown',
        'log_id'         => $emailResult['log_id'] ?? null,
    ], 'Payment failure noted and automatic customer recovery dispatched');

} catch (Throwable $e) {
    ApiResponse::error('Failed to process payment status update: ' . $e->getMessage(), 500);
}
