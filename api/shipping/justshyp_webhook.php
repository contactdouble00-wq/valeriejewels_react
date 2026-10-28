<?php
/**
 * VALERIE JEWELS — JustShyp Tracking Webhook Handler
 * Receives courier tracking status callbacks, maps to internal order statuses,
 * appends milestone events to order_tracking_events, and dispatches customer notification emails.
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/utils/mailer.php';
require_once dirname(__DIR__) . '/shipping/providers/JustShypProvider.php';
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

// Optional webhook token verification if configured
$authHeader = $_SERVER['HTTP_ACCESS_TOKEN'] ?? ($_SERVER['HTTP_X_JUSTSHYP_TOKEN'] ?? ($_GET['token'] ?? ''));
$configuredToken = JustShypProvider::getAccessToken();
if (!empty($configuredToken) && !empty($authHeader)) {
    // If header sent, verify it matches
    if (!hash_equals($configuredToken, $authHeader)) {
        ApiResponse::error('Unauthorized webhook request: token mismatch', 401);
    }
}

// Extract AWB and status identifiers
$awbCode      = trim($data['awb'] ?? ($data['waybill_number'] ?? ($data['shipment']['awb'] ?? '')));
$currentStatus= strtolower(trim($data['current_status'] ?? ($data['status'] ?? '')));
$courierName  = trim($data['courier_name'] ?? ($data['courier'] ?? 'JustShyp Express'));
$location     = trim($data['location'] ?? ($data['current_location'] ?? 'Transit Hub'));
$activity     = trim($data['activity'] ?? ($data['scans'][0]['activity'] ?? ''));
$orderNumber  = trim($data['client_order_id'] ?? ($data['order_number'] ?? ($data['order_id'] ?? '')));

if (empty($awbCode) && empty($orderNumber)) {
    ApiResponse::error('Missing awb or order identifier', 422);
}

try {
    $pdo = Database::getConnection();

    // Locate order by provider_awb, shiprocket_awb, or order_number
    if (!empty($awbCode)) {
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE provider_awb = ? OR shiprocket_awb = ? LIMIT 1");
        $stmt->execute([$awbCode, $awbCode]);
    } else {
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE order_number = ? LIMIT 1");
        $stmt->execute([$orderNumber]);
    }

    $order = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
        ApiResponse::error('Order not found for given AWB/order reference', 404);
    }

    $mappedStatus = JustShypProvider::mapStatus($currentStatus);
    $now = date('Y-m-d H:i:s');
    $nowSql = Database::getDriver() === 'sqlite' ? "datetime('now')" : "NOW()";

    // Update orders record
    $upStmt = $pdo->prepare("
        UPDATE orders 
        SET order_status = :status,
            courier_name = COALESCE(NULLIF(:courier, ''), courier_name),
            updated_at   = $nowSql
        WHERE id = :id
    ");
    $upStmt->execute([
        ':status'  => $mappedStatus,
        ':courier' => $courierName,
        ':id'      => $order['id'],
    ]);

    // Insert tracking milestone
    $title = ucwords(str_replace('_', ' ', $currentStatus ?: $mappedStatus));
    $desc  = !empty($activity) ? $activity : "Shipment status updated to {$title}";

    $evStmt = $pdo->prepare("
        INSERT INTO order_tracking_events (order_id, status, title, description, location, courier_partner, awb_code, occurred_at)
        VALUES (:order_id, :status, :title, :desc, :loc, :courier, :awb, $nowSql)
    ");
    $evStmt->execute([
        ':order_id' => $order['id'],
        ':status'   => $mappedStatus,
        ':title'    => $title,
        ':desc'     => $desc,
        ':loc'      => $location ?: 'Transit Atelier Hub',
        ':courier'  => $courierName,
        ':awb'      => $awbCode ?: ($order['provider_awb'] ?? ''),
    ]);

    // Dispatch idempotent customer notification emails based on mapped status
    if ($mappedStatus === 'shipped') {
        try {
            MailerService::sendOrderShipped((int)$order['id']);
        } catch (Throwable $e) {}
    } elseif ($mappedStatus === 'out_for_delivery') {
        try {
            MailerService::sendStatusUpdate((int)$order['id'], 'out_for_delivery', 'Your Valerie Jewels bespoke order is out for doorstep delivery today.');
        } catch (Throwable $e) {}
    } elseif ($mappedStatus === 'delivered') {
        try {
            MailerService::sendStatusUpdate((int)$order['id'], 'delivered', 'Your Valerie Jewels bespoke order has been successfully delivered to your doorstep. We hope you cherish your exquisite fine jewelry pieces!');
        } catch (Throwable $e) {}
    }

    ApiResponse::success([
        'order_id'     => $order['id'],
        'order_number' => $order['order_number'],
        'provider'     => 'justshyp',
        'new_status'   => $mappedStatus,
        'raw_status'   => $currentStatus,
        'awb'          => $awbCode ?: ($order['provider_awb'] ?? ''),
        'courier'      => $courierName,
    ], "Order status synchronized via JustShyp webhook");

} catch (Throwable $e) {
    error_log("[JustShyp Webhook Error] " . $e->getMessage());
    ApiResponse::error('Webhook processing failed: ' . $e->getMessage(), 500);
}
