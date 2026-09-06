<?php
/**
 * VALERIE JEWELS — Customer Order Tracking Endpoint
 * Returns live shipment status, courier partner, AWB code, and chronological milestone history.
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/shipping/shiprocket.php';
require_once dirname(__DIR__) . '/config/database.php';

handleCors();

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'GET' && $method !== 'POST') {
    ApiResponse::error('Method not allowed. Use GET or POST.', 405);
}

$input = $method === 'POST' ? (json_decode(file_get_contents('php://input'), true) ?: $_POST) : $_GET;

$orderNumber = trim($input['order_number'] ?? '');
$contact     = trim($input['contact'] ?? ($input['email_or_phone'] ?? ''));

if (empty($orderNumber)) {
    ApiResponse::error('Order number is required for tracking', 422);
}

try {
    $pdo = Database::getConnection();

    // Query order
    $sql = "SELECT * FROM orders WHERE order_number = :order_number LIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':order_number' => $orderNumber]);
    $order = $stmt->fetch();

    if (!$order) {
        ApiResponse::error('No order found with the provided reference number', 404);
    }

    // Optional verification check if contact provided
    if (!empty($contact)) {
        $cleanContact = strtolower(preg_replace('/[^a-zA-Z0-9@.]/', '', $contact));
        $orderEmail   = strtolower(trim($order['customer_email']));
        $orderPhone   = preg_replace('/[^0-9]/', '', $order['customer_phone']);

        $match = (str_contains($orderEmail, $cleanContact)) || 
                 (str_contains($orderPhone, $cleanContact)) || 
                 (str_contains($cleanContact, substr($orderPhone, -6)));

        if (!$match) {
            ApiResponse::error('The contact information provided does not match the order records', 403);
        }
    }

    // Auto-create Shiprocket tracking if confirmed but not yet provisioned with AWB
    if (empty($order['shiprocket_awb']) && in_array($order['order_status'], ['confirmed', 'processing', 'shipped'], true)) {
        ShiprocketService::createShipment((int)$order['id']);
        $stmt->execute([':order_number' => $orderNumber]);
        $order = $stmt->fetch();
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

    // Fetch tracking events
    $eventStmt = $pdo->prepare("
        SELECT id, status, title, description, location, occurred_at 
        FROM order_tracking_events 
        WHERE order_id = ? 
        ORDER BY occurred_at ASC, id ASC
    ");
    $eventStmt->execute([$order['id']]);
    $events = $eventStmt->fetchAll();

    // Compute standard milestone ladder
    $milestonesOrder = ['confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];
    $currentStatus = $order['order_status'];

    $isCancelled = $currentStatus === 'cancelled';
    $isRto       = $currentStatus === 'rto';

    $currentIndex = array_search($currentStatus, $milestonesOrder, true);
    if ($currentIndex === false) {
        $currentIndex = 0; // pending or unknown
    }

    $milestoneSteps = [
        [
            'key'         => 'confirmed',
            'label'       => 'Order Confirmed',
            'description' => 'Payment verified. Allocated to atelier.',
            'is_completed'=> !$isCancelled && $currentIndex >= 0,
            'is_current'  => $currentStatus === 'confirmed',
        ],
        [
            'key'         => 'processing',
            'label'       => 'Packed & Quality Checked',
            'description' => 'Packaged in signature velvet case.',
            'is_completed'=> !$isCancelled && $currentIndex >= 1,
            'is_current'  => $currentStatus === 'processing',
        ],
        [
            'key'         => 'shipped',
            'label'       => 'Dispatched via Courier',
            'description' => 'In transit with ' . ($order['courier_name'] ?: 'Bluedart Express'),
            'is_completed'=> !$isCancelled && $currentIndex >= 2,
            'is_current'  => $currentStatus === 'shipped',
        ],
        [
            'key'         => 'out_for_delivery',
            'label'       => 'Out for Delivery',
            'description' => 'Courier agent arriving today.',
            'is_completed'=> !$isCancelled && $currentIndex >= 3,
            'is_current'  => $currentStatus === 'out_for_delivery',
        ],
        [
            'key'         => 'delivered',
            'label'       => 'Delivered',
            'description' => 'Handed over to customer.',
            'is_completed'=> !$isCancelled && $currentIndex >= 4,
            'is_current'  => $currentStatus === 'delivered',
        ],
    ];

    // Customer cancellation permission: allowed ONLY when pre-shipping (pending, confirmed, processing)
    $canCancel = in_array($currentStatus, ['pending', 'confirmed', 'processing'], true);

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
            'refund_amount'          => (float)$order['refund_amount'],
            'order_status'           => $order['order_status'],
            'courier_name'           => $order['courier_name'] ?: 'Bluedart Express',
            'shiprocket_awb'         => $order['shiprocket_awb'],
            'tracking_url'           => $order['tracking_url'] ?: ($order['shiprocket_awb'] ? "https://shiprocket.co/tracking/{$order['shiprocket_awb']}" : null),
            'estimated_delivery_date'=> $order['estimated_delivery_date'] ?: date('Y-m-d', strtotime($order['created_at'] . ' + 4 days')),
            'cancelled_at'           => $order['cancelled_at'],
            'cancellation_reason'    => $order['cancellation_reason'],
            'created_at'             => $order['created_at'],
            'can_cancel'             => $canCancel,
        ],
        'items' => array_map(function($it) {
            return [
                'id'            => (int)$it['id'],
                'product_name'  => $it['product_name'],
                'variant_title' => $it['variant_title'],
                'quantity'      => (int)$it['quantity'],
                'unit_price'    => (float)$it['unit_price'],
                'total_price'   => (float)$it['total_price'],
            ];
        }, $items),
        'milestones' => $milestoneSteps,
        'events'     => $events,
    ];

    ApiResponse::success($response, 'Tracking status retrieved');

} catch (Throwable $e) {
    ApiResponse::error('Tracking request failed: ' . $e->getMessage(), 500);
}
