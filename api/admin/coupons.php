<?php
/**
 * VALERIE JEWELS — Admin Coupons & Promotions Management
 * Create, edit, and toggle discount promotional vouchers.
 */

require_once dirname(__DIR__) . '/utils/admin_auth.php';

$adminUser = AdminAuth::authenticate(['admin', 'staff']);
$pdo = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM coupons ORDER BY id DESC");
    $coupons = $stmt->fetchAll(PDO::FETCH_ASSOC);
    ApiResponse::success($coupons, 'Coupons list');
}

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

if ($method === 'POST') {
    $code = strtoupper(trim($input['code'] ?? ''));
    $type = trim($input['discount_type'] ?? 'percentage');
    $val = (float)($input['discount_value'] ?? 0);
    $min = (float)($input['min_order_amount'] ?? 0);
    $max = isset($input['max_discount_amount']) ? (float)$input['max_discount_amount'] : null;
    $limit = (int)($input['usage_limit'] ?? 1000);

    if (empty($code) || $val <= 0) {
        ApiResponse::error('Code and positive discount value are required', 422);
    }

    $stmt = $pdo->prepare("
        INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
    ");
    $stmt->execute([$code, $type, $val, $min, $max, $limit]);
    $newId = $pdo->lastInsertId();

    AdminAuth::logActivity($adminUser['id'], 'create_coupon', 'coupon', $newId, ['code' => $code]);

    ApiResponse::success(['id' => $newId, 'code' => $code], 'Coupon created successfully', 201);
}

if ($method === 'PUT') {
    $id = (int)($input['id'] ?? 0);
    if ($id <= 0) {
        ApiResponse::error('Coupon ID required', 422);
    }

    $stmt = $pdo->prepare("
        UPDATE coupons SET 
            is_active = :active,
            usage_limit = :limit,
            min_order_amount = :min,
            discount_value = :val
        WHERE id = :id
    ");
    $stmt->execute([
        ':active' => isset($input['is_active']) ? (int)$input['is_active'] : 1,
        ':limit'  => (int)($input['usage_limit'] ?? 1000),
        ':min'    => (float)($input['min_order_amount'] ?? 0),
        ':val'    => (float)($input['discount_value'] ?? 0),
        ':id'     => $id,
    ]);

    AdminAuth::logActivity($adminUser['id'], 'update_coupon', 'coupon', $id);

    ApiResponse::success(['id' => $id], 'Coupon updated successfully');
}

if ($method === 'DELETE') {
    if ($adminUser['role'] !== 'admin') {
        ApiResponse::error('Only administrators can delete coupons', 403);
    }
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    $pdo->prepare("DELETE FROM coupons WHERE id = ?")->execute([$id]);

    AdminAuth::logActivity($adminUser['id'], 'delete_coupon', 'coupon', $id);

    ApiResponse::success(null, 'Coupon deleted');
}
