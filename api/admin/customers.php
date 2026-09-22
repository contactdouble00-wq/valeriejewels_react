<?php
/**
 * VALERIE JEWELS — Admin Customer Management & RTO Flagging
 * View customer order history and enforce RTO blocking.
 */

require_once dirname(__DIR__) . '/utils/admin_auth.php';

$adminUser = AdminAuth::authenticate(['admin', 'staff']);
$pdo = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {

if ($method === 'GET') {
    $search = trim($_GET['search'] ?? '');
    $rtoBlocked = isset($_GET['is_blocked_rto']) ? (int)$_GET['is_blocked_rto'] : null;

    $where = ["u.role = 'customer'"];
    $params = [];

    if ($search !== '') {
        $where[] = "(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)";
        $term = "%{$search}%";
        $params = array_merge($params, [$term, $term, $term]);
    }

    if ($rtoBlocked !== null) {
        $where[] = "u.is_blocked_rto = ?";
        $params[] = $rtoBlocked;
    }

    $whereSql = implode(' AND ', $where);

    $stmt = $pdo->prepare("
        SELECT 
            u.id,
            u.name,
            u.email,
            u.phone,
            u.role,
            u.is_blocked_rto,
            u.created_at,
            COUNT(o.id) AS total_orders,
            COALESCE(SUM(CASE WHEN o.order_status != 'cancelled' THEN o.total_amount ELSE 0 END), 0) AS total_spent,
            COUNT(CASE WHEN o.order_status = 'cancelled' OR o.order_status = 'rto' THEN 1 END) AS rto_cancellations
        FROM users u
        LEFT JOIN orders o ON o.user_id = u.id OR o.customer_email = u.email
        WHERE {$whereSql}
        GROUP BY u.id, u.name, u.email, u.phone, u.role, u.is_blocked_rto, u.created_at
        ORDER BY total_orders DESC, u.id DESC
    ");
    $stmt->execute($params);
    $customers = $stmt->fetchAll(PDO::FETCH_ASSOC);

    ApiResponse::success($customers, 'Customers retrieved successfully');
}

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
$action = $_GET['action'] ?? ($input['action'] ?? '');

if ($action === 'toggle_rto_block') {
    $userId = (int)($input['user_id'] ?? 0);
    $block = !empty($input['is_blocked_rto']) ? 1 : 0;
    $reason = trim($input['reason'] ?? 'Flagged via Admin Dashboard');

    if ($userId <= 0) {
        ApiResponse::error('Valid user ID is required', 422);
    }

    $stmt = $pdo->prepare("UPDATE users SET is_blocked_rto = ? WHERE id = ?");
    $stmt->execute([$block, $userId]);

    AdminAuth::logActivity($adminUser['id'], 'toggle_rto_block', 'user', $userId, [
        'is_blocked_rto' => $block,
        'reason'         => $reason,
    ]);

    ApiResponse::success([
        'user_id'        => $userId,
        'is_blocked_rto' => $block,
    ], $block ? 'Customer blocked from COD due to high RTO risk.' : 'Customer RTO block lifted.');
}

ApiResponse::error('Invalid action or method', 400);

} catch (Throwable $e) {
    error_log('customers.php error: ' . $e->getMessage());
    ApiResponse::handleDatabaseException($e, 'Failed to process customer request');
}
