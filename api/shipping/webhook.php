<?php
/**
 * VALERIE JEWELS — Shiprocket Tracking Webhook Handler
 * Receives courier status changes and syncs shipment progress into orders table.
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

$rawPayload = file_get_contents('php://input');
$data = json_decode($rawPayload, true);

if (!$data) {
    ApiResponse::error('Invalid JSON payload', 400);
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Authentication & Signature Verification
// ─────────────────────────────────────────────────────────────────────────────
$configFile = dirname(__DIR__) . '/config/config.php';
$config = file_exists($configFile) ? require $configFile : require dirname(__DIR__) . '/config/config.sample.php';
$expectedToken = $config['shiprocket']['webhook_token'] ?? ($config['shiprocket']['token'] ?? '');
$receivedToken = $_SERVER['HTTP_X_API_KEY'] ?? ($_SERVER['HTTP_X_SHIPROCKET_TOKEN'] ?? ($_GET['token'] ?? ''));
$isProduction = ($config['app']['env'] ?? 'development') === 'production';

if (!empty($expectedToken)) {
    if (empty($receivedToken) || !hash_equals($expectedToken, $receivedToken)) {
        ApiResponse::error('Unauthorized webhook request: Invalid signature token', 401);
    }
} elseif ($isProduction) {
    ApiResponse::error('Shiprocket webhook token must be configured in production', 500);
}

$awbCode     = trim($data['awb'] ?? ($data['awb_code'] ?? ($data['shipment']['awb_code'] ?? '')));
$currentStatus= strtolower(trim($data['current_status'] ?? ($data['status'] ?? '')));
$courierName = trim($data['courier_name'] ?? 'Bluedart Express');
$location    = trim($data['location'] ?? ($data['current_location'] ?? ''));
$activity    = trim($data['activity'] ?? ($data['scans'][0]['activity'] ?? ''));
$orderNumber = trim($data['order_id'] ?? ($data['order_number'] ?? ''));

if (empty($awbCode) && empty($orderNumber)) {
    ApiResponse::error('Missing awb or order identifier', 422);
}

try {
    $pdo = Database::getConnection();

    // Map Shiprocket shipment status strings to Valerie Jewels order_status ENUM
    $statusMap = [
        'manifest_generated' => 'processing',
        'packed'             => 'processing',
        'pickup_scheduled'   => 'processing',
        'in_transit'         => 'shipped',
        'shipped'            => 'shipped',
        'out_for_delivery'   => 'out_for_delivery',
        'delivered'          => 'delivered',
        'rto_initiated'      => 'rto',
        'rto_delivered'      => 'rto',
        'cancelled'          => 'cancelled',
    ];

    $mappedStatus = $statusMap[$currentStatus] ?? 'shipped';

    // Locate order
    if (!empty($awbCode)) {
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE shiprocket_awb = ? LIMIT 1");
        $stmt->execute([$awbCode]);
    } else {
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE order_number = ? LIMIT 1");
        $stmt->execute([$orderNumber]);
    }

    $order = $stmt->fetch();

    if (!$order) {
        ApiResponse::error('Order not found for given AWB/order reference', 404);
    }

    // Update orders record
    $upStmt = $pdo->prepare("
        UPDATE orders 
        SET order_status = :status,
            courier_name = COALESCE(:courier, courier_name),
            updated_at   = NOW()
        WHERE id = :id
    ");
    $upStmt->execute([
        ':status'  => $mappedStatus,
        ':courier' => !empty($courierName) ? $courierName : null,
        ':id'      => $order['id'],
    ]);

    // Insert tracking milestone
    $title = ucwords(str_replace('_', ' ', $currentStatus ?: $mappedStatus));
    $desc  = !empty($activity) ? $activity : "Shipment status updated to {$title}";
    $loc   = !empty($location) ? $location : 'Transit Hub';

    $evStmt = $pdo->prepare("
        INSERT INTO order_tracking_events (order_id, status, title, description, location, occurred_at)
        VALUES (:order_id, :status, :title, :desc, :loc, NOW())
    ");
    $evStmt->execute([
        ':order_id' => $order['id'],
        ':status'   => $mappedStatus,
        ':title'    => $title,
        ':desc'     => $desc,
        ':loc'      => $loc,
    ]);

    // Phase 7: If newly shipped, dispatch idempotent shipping email
    if ($mappedStatus === 'shipped') {
        try {
            MailerService::sendOrderShipped((int)$order['id']);
        } catch (Throwable $e) {
            // Log silently
        }
    }

    ApiResponse::success([

        'order_id'     => $order['id'],
        'order_number' => $order['order_number'],
        'new_status'   => $mappedStatus,
        'awb'          => $awbCode ?: $order['shiprocket_awb'],
        'courier'      => $courierName ?: $order['courier_name'],
    ], 'Shiprocket tracking webhook processed successfully');

} catch (Throwable $e) {
    ApiResponse::error('Webhook processing failed: ' . $e->getMessage(), 500);
}
