<?php
/**
 * VALERIE JEWELS — Payment & Order Verification Endpoint
 * Returns verified order details, payment splits, and itemized receipt.
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

    // Optional sandbox simulation for automated demo testing
    if ($simulate && $order['order_status'] === 'pending') {
        $newPaymentStatus = 'paid';
        if ($order['payment_type'] === 'partial') {
            $newPaymentStatus = 'partial_paid';
        } elseif ($order['payment_type'] === 'cod') {
            $newPaymentStatus = 'pending';
        }

        $upStmt = $pdo->prepare("
            UPDATE orders 
            SET payment_status = :ps,
                order_status = 'confirmed',
                fastrr_order_id = COALESCE(fastrr_order_id, :fid),
                updated_at = NOW()
            WHERE id = :id
        ");
        $upStmt->execute([
            ':ps'  => $newPaymentStatus,
            ':fid' => 'FST-SBX-' . strtoupper(substr(md5(uniqid()), 0, 8)),
            ':id'  => $order['id'],
        ]);

        // Refresh record
        $stmt->execute(!empty($orderNumber) ? [$orderNumber] : [$orderId]);
        $order = $stmt->fetch();

        // Phase 7: Dispatch idempotent order confirmation email
        try {
            MailerService::sendOrderConfirmation((int)$order['id']);
        } catch (Throwable $e) {
            // Log silently, do not fail response
        }
    }


    // Fetch order items
    $itemStmt = $pdo->prepare("
        SELECT id, product_id, variant_id, product_name, variant_title, quantity, unit_price, total_price
        FROM order_items
        WHERE order_id = ?
        ORDER BY id ASC
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
            ];
        }, $items),
    ];

    ApiResponse::success($response, 'Order status retrieved');

} catch (Throwable $e) {
    ApiResponse::error('Order verification failed: ' . $e->getMessage(), 500);
}
