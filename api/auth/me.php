<?php
/**
 * VALERIE JEWELS — Current Authenticated User Profile Endpoint
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once __DIR__ . '/middleware.php';
require_once dirname(__DIR__) . '/config/database.php';

handleCors();

try {
    $user = AuthMiddleware::requireAuth();
    $pdo = Database::getConnection();

    // Fetch quick order statistics
    $stmt = $pdo->prepare("
        SELECT 
            COUNT(*) AS total_orders,
            COALESCE(SUM(total_amount), 0) AS total_spent
        FROM orders 
        WHERE user_id = :user_id AND order_status != 'cancelled'
    ");
    $stmt->execute([':user_id' => $user['id']]);
    $stats = $stmt->fetch();

    $response = [
        'id'             => (int)$user['id'],
        'name'           => $user['name'],
        'email'          => $user['email'],
        'phone'          => $user['phone'],
        'role'           => $user['role'],
        'is_blocked_rto' => (bool)$user['is_blocked_rto'],
        'created_at'     => $user['created_at'],
        'orders_count'   => (int)($stats['total_orders'] ?? 0),
        'total_spent'    => (float)($stats['total_spent'] ?? 0),
    ];

    ApiResponse::success($response, 'User profile retrieved successfully');

} catch (Throwable $e) {
    ApiResponse::error('Failed to retrieve profile: ' . $e->getMessage(), 500);
}
