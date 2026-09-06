<?php
/**
 * VALERIE JEWELS — HTML Email Preview & Developer Tool
 * Allows developers and store administrators to inspect rendered lifecycle emails.
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/utils/mailer.php';
require_once dirname(__DIR__) . '/config/database.php';

handleCors();

$type        = trim($_GET['type'] ?? 'order_confirmation'); // order_confirmation | order_shipped | order_cancelled
$orderNumber = trim($_GET['order_number'] ?? '');
$orderId     = !empty($_GET['order_id']) ? (int)$_GET['order_id'] : null;
$format      = trim($_GET['format'] ?? 'html'); // html | json

try {
    $pdo = Database::getConnection();

    if ($orderId) {
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
        $stmt->execute([$orderId]);
    } elseif (!empty($orderNumber)) {
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE order_number = ? LIMIT 1");
        $stmt->execute([$orderNumber]);
    } else {
        // Grab latest order
        $stmt = $pdo->query("SELECT * FROM orders ORDER BY id DESC LIMIT 1");
    }

    $order = $stmt->fetch();
    if (!$order) {
        ApiResponse::error('No orders available to preview email', 404);
    }

    // Fetch items
    $itemStmt = $pdo->prepare("SELECT * FROM order_items WHERE order_id = ?");
    $itemStmt->execute([$order['id']]);
    $items = $itemStmt->fetchAll();

    $appConfig = require dirname(__DIR__) . '/config/config.php';
    $storeUrl  = $appConfig['app']['url'] ?? 'http://localhost:5173';

    $validTypes = ['order_confirmation', 'order_shipped', 'order_cancelled'];
    if (!in_array($type, $validTypes, true)) {
        $type = 'order_confirmation';
    }

    $templateFile = dirname(__DIR__) . "/templates/emails/{$type}.php";
    if (!file_exists($templateFile)) {
        ApiResponse::error("Template {$type} not found", 404);
    }

    ob_start();
    require $templateFile;
    $renderedHtml = ob_get_clean();

    if ($format === 'json') {
        ApiResponse::success([
            'email_type'   => $type,
            'order_id'     => (int)$order['id'],
            'order_number' => $order['order_number'],
            'recipient'    => $order['customer_email'],
            'html_length'  => strlen($renderedHtml),
            'preview_url'  => "http://127.0.0.1:8000/utils/email_preview.php?type={$type}&order_id={$order['id']}",
        ], 'Email preview rendered');
    } else {
        header('Content-Type: text/html; charset=UTF-8');
        echo $renderedHtml;
        exit;
    }

} catch (Throwable $e) {
    ApiResponse::error('Preview failed: ' . $e->getMessage(), 500);
}
