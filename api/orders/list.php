<?php
/**
 * VALERIE JEWELS — Customer Order History Endpoint
 * Lists orders for authenticated users or customer query.
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/auth/middleware.php';
require_once dirname(__DIR__) . '/config/database.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    ApiResponse::error('Method not allowed. Use GET.', 405);
}

try {
    $pdo = Database::getConnection();

    $authUser = AuthMiddleware::getOptionalAuth();
    $emailQuery = strtolower(trim($_GET['email'] ?? ''));
    $phoneQuery = trim($_GET['phone'] ?? '');

    $conditions = [];
    $params     = [];

    if ($authUser) {
        $conditions[] = "user_id = :user_id OR customer_email = :user_email";
        $params[':user_id']    = (int)$authUser['id'];
        $params[':user_email'] = strtolower(trim($authUser['email']));
    } elseif (!empty($emailQuery)) {
        $conditions[] = "customer_email = :email";
        $params[':email'] = $emailQuery;
    } elseif (!empty($phoneQuery)) {
        $cleanPhone = preg_replace('/[^0-9]/', '', $phoneQuery);
        $conditions[] = "customer_phone LIKE :phone";
        $params[':phone'] = "%{$cleanPhone}%";
    } else {
        ApiResponse::error('Authentication or email query required to view order history', 401);
    }

    $whereClause = implode(' OR ', $conditions);

    $sql = "
        SELECT 
            id, order_number, customer_name, customer_email, total_amount, 
            payment_type, payment_status, order_status, 
            amount_paid_upfront, amount_due_on_delivery, refund_amount,
            courier_name, shiprocket_awb, tracking_url, estimated_delivery_date,
            created_at
        FROM orders 
        WHERE {$whereClause}
        ORDER BY created_at DESC 
        LIMIT 50
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $orders = $stmt->fetchAll();

    // Fetch item counts for each order
    $itemCountStmt = $pdo->prepare("SELECT COUNT(*) AS total_items FROM order_items WHERE order_id = ?");

    $formattedOrders = [];
    foreach ($orders as $ord) {
        $itemCountStmt->execute([$ord['id']]);
        $itemCount = (int)$itemCountStmt->fetchColumn();

        $formattedOrders[] = [
            'id'                     => (int)$ord['id'],
            'order_number'           => $ord['order_number'],
            'customer_name'          => $ord['customer_name'],
            'customer_email'         => $ord['customer_email'],
            'total_amount'           => (float)$ord['total_amount'],
            'payment_type'           => $ord['payment_type'],
            'payment_status'         => $ord['payment_status'],
            'order_status'           => $ord['order_status'],
            'amount_paid_upfront'    => (float)$ord['amount_paid_upfront'],
            'amount_due_on_delivery' => (float)$ord['amount_due_on_delivery'],
            'refund_amount'          => (float)$ord['refund_amount'],
            'courier_name'           => $ord['courier_name'],
            'shiprocket_awb'         => $ord['shiprocket_awb'],
            'tracking_url'           => $ord['tracking_url'],
            'estimated_delivery_date'=> $ord['estimated_delivery_date'],
            'item_count'             => $itemCount,
            'created_at'             => $ord['created_at'],
        ];
    }

    ApiResponse::success($formattedOrders, 'Customer orders retrieved');

} catch (Throwable $e) {
    ApiResponse::error('Failed to retrieve orders: ' . $e->getMessage(), 500);
}
