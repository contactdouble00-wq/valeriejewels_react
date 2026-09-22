<?php
/**
 * VALERIE JEWELS — Admin Coupons & Promotions Management
 * Create, edit, and toggle discount promotional vouchers.
 * Resilient against method stripping and duplicate key constraints.
 */

require_once dirname(__DIR__) . '/utils/admin_auth.php';

$adminUser = AdminAuth::authenticate(['admin', 'staff']);
$pdo = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
if (empty($action) && !empty($input['action'])) {
    $action = $input['action'];
}

try {
    // ─────────────────────────────────────────────────────────────────────────────
    // 1. GET — List Coupons
    // ─────────────────────────────────────────────────────────────────────────────
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT * FROM coupons ORDER BY id DESC");
        $coupons = $stmt->fetchAll(PDO::FETCH_ASSOC);
        ApiResponse::success($coupons, 'Coupons list');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. DELETE — Delete Coupon
    // ─────────────────────────────────────────────────────────────────────────────
    $isDeleteAction = ($method === 'DELETE')
        || ($method === 'POST' && in_array($action, ['delete', 'delete_coupon'], true))
        || ($method === 'POST' && ($input['_method'] ?? '') === 'DELETE');

    if ($isDeleteAction) {
        if ($adminUser['role'] !== 'admin') {
            ApiResponse::error('Permission Denied: Only administrators can delete coupons', 403);
        }
        $id = isset($_GET['id']) ? (int)$_GET['id'] : (int)($input['id'] ?? 0);
        if ($id <= 0) {
            ApiResponse::error('Valid coupon ID is required', 422);
        }

        $checkStmt = $pdo->prepare("SELECT id, code FROM coupons WHERE id = ? LIMIT 1");
        $checkStmt->execute([$id]);
        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            ApiResponse::error('Coupon not found or already deleted', 404);
        }

        $delStmt = $pdo->prepare("DELETE FROM coupons WHERE id = ?");
        $delStmt->execute([$id]);

        AdminAuth::logActivity($adminUser['id'], 'delete_coupon', 'coupon', $id, ['code' => $existing['code']]);

        ApiResponse::success(['id' => $id, 'deleted' => true], "Coupon '{$existing['code']}' deleted successfully");
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. UPDATE / PUT — Update Existing Coupon
    // ─────────────────────────────────────────────────────────────────────────────
    $isUpdateAction = ($method === 'PUT')
        || ($method === 'POST' && in_array($action, ['update', 'update_coupon'], true))
        || ($method === 'POST' && ($input['_method'] ?? '') === 'PUT');

    if ($isUpdateAction) {
        $id = (int)($input['id'] ?? ($_GET['id'] ?? 0));
        if ($id <= 0) {
            ApiResponse::error('Coupon ID is required for update', 422);
        }

        $checkStmt = $pdo->prepare("SELECT * FROM coupons WHERE id = ? LIMIT 1");
        $checkStmt->execute([$id]);
        $orig = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$orig) {
            ApiResponse::error('Coupon not found', 404);
        }

        // If code is modified, check uniqueness
        if (!empty($input['code'])) {
            $newCode = strtoupper(trim($input['code']));
            if ($newCode !== strtoupper($orig['code'])) {
                $codeCheck = $pdo->prepare("SELECT id FROM coupons WHERE code = ? AND id != ? LIMIT 1");
                $codeCheck->execute([$newCode, $id]);
                if ($codeCheck->fetch()) {
                    ApiResponse::error("A voucher with code '{$newCode}' already exists.", 409);
                }
            }
        } else {
            $newCode = $orig['code'];
        }

        $stmt = $pdo->prepare("
            UPDATE coupons SET 
                code = :code,
                is_active = :active,
                usage_limit = :limit,
                min_order_amount = :min,
                discount_value = :val
            WHERE id = :id
        ");
        $stmt->execute([
            ':code'   => $newCode,
            ':active' => isset($input['is_active']) ? (int)$input['is_active'] : (int)$orig['is_active'],
            ':limit'  => isset($input['usage_limit']) ? (int)$input['usage_limit'] : (int)$orig['usage_limit'],
            ':min'    => isset($input['min_order_amount']) ? (float)$input['min_order_amount'] : (float)$orig['min_order_amount'],
            ':val'    => isset($input['discount_value']) ? (float)$input['discount_value'] : (float)$orig['discount_value'],
            ':id'     => $id,
        ]);

        AdminAuth::logActivity($adminUser['id'], 'update_coupon', 'coupon', $id, ['code' => $newCode]);

        ApiResponse::success(['id' => $id, 'code' => $newCode], 'Coupon updated successfully');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. POST — Create New Coupon
    // ─────────────────────────────────────────────────────────────────────────────
    if ($method === 'POST') {
        $code = strtoupper(trim($input['code'] ?? ''));
        $type = trim($input['discount_type'] ?? 'percentage');
        $val = (float)($input['discount_value'] ?? 0);
        $min = (float)($input['min_order_amount'] ?? 0);
        $max = isset($input['max_discount_amount']) && $input['max_discount_amount'] !== '' ? (float)$input['max_discount_amount'] : null;
        $limit = (int)($input['usage_limit'] ?? 1000);

        if (empty($code) || $val <= 0) {
            ApiResponse::error('Coupon code and a positive discount value are required', 422);
        }

        // Check if code already exists
        $dupCheck = $pdo->prepare("SELECT id FROM coupons WHERE code = ? LIMIT 1");
        $dupCheck->execute([$code]);
        if ($dupCheck->fetch()) {
            ApiResponse::error("A voucher with code '{$code}' already exists. Please choose a different code.", 409);
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

    ApiResponse::error('Invalid request action or HTTP method', 400);

} catch (Throwable $e) {
    error_log('coupons.php error: ' . $e->getMessage());
    ApiResponse::handleDatabaseException($e, 'Failed to process coupon request');
}
