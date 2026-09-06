<?php
/**
 * VALERIE JEWELS — Shipment Status Advance (Testing & Sandbox Endpoint)
 * Allows developers & automated QA to simulate Shiprocket shipment state progression.
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/utils/mailer.php';
require_once dirname(__DIR__) . '/shipping/shiprocket.php';
require_once dirname(__DIR__) . '/config/database.php';


handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ApiResponse::error('Method not allowed. Use POST.', 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

$orderNumber = trim($input['order_number'] ?? '');
$orderId     = !empty($input['order_id']) ? (int)$input['order_id'] : null;
$newStatus   = trim($input['status'] ?? 'shipped'); // processing | shipped | out_for_delivery | delivered
$location    = trim($input['location'] ?? '');
$note        = trim($input['note'] ?? '');

if (empty($orderNumber) && empty($orderId)) {
    ApiResponse::error('order_number or order_id is required', 422);
}

try {
    $pdo = Database::getConnection();

    if (!empty($orderNumber)) {
        $stmt = $pdo->prepare("SELECT id FROM orders WHERE order_number = ? LIMIT 1");
        $stmt->execute([$orderNumber]);
    } else {
        $stmt = $pdo->prepare("SELECT id FROM orders WHERE id = ? LIMIT 1");
        $stmt->execute([$orderId]);
    }

    $id = (int)$stmt->fetchColumn();
    if (!$id) {
        ApiResponse::error('Order not found', 404);
    }

    // Ensure AWB created first
    ShiprocketService::createShipment($id);

    // Advance status
    $result = ShiprocketService::advanceOrderStatus($id, $newStatus, $location, $note);

    // Phase 7: If advancing to shipped, trigger idempotent shipping email
    if ($newStatus === 'shipped') {
        try {
            MailerService::sendOrderShipped($id);
        } catch (Throwable $e) {
            // Log silently
        }
    }

    ApiResponse::success($result, "Order status advanced to {$newStatus}");


} catch (Throwable $e) {
    ApiResponse::error('Failed to advance shipment status: ' . $e->getMessage(), 500);
}
