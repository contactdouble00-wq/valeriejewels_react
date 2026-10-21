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

        $type = isset($input['discount_type']) ? trim($input['discount_type']) : ($orig['discount_type'] ?? 'percentage');
        if (!in_array($type, ['percentage', 'fixed'], true)) {
            $type = 'percentage';
        }

        $val = isset($input['discount_value']) ? (float)$input['discount_value'] : (float)$orig['discount_value'];
        if ($val <= 0) {
            ApiResponse::error('A positive discount value is required', 422);
        }
        if ($type === 'percentage' && $val > 100) {
            ApiResponse::error('Percentage discount cannot exceed 100%', 422);
        }

        $min = isset($input['min_order_amount']) ? max(0.0, (float)$input['min_order_amount']) : (float)$orig['min_order_amount'];
        
        $max = null;
        if (array_key_exists('max_discount_amount', $input)) {
            if ($input['max_discount_amount'] !== '' && $input['max_discount_amount'] !== null && (float)$input['max_discount_amount'] > 0) {
                $max = (float)$input['max_discount_amount'];
            }
        } else {
            $max = $orig['max_discount_amount'] !== null ? (float)$orig['max_discount_amount'] : null;
        }

        $limit = isset($input['usage_limit']) && $input['usage_limit'] !== '' && (int)$input['usage_limit'] > 0 
            ? (int)$input['usage_limit'] 
            : (isset($input['usage_limit']) && $input['usage_limit'] === '' ? null : $orig['usage_limit']);

        $active = isset($input['is_active']) ? ((int)$input['is_active'] ? 1 : 0) : (int)$orig['is_active'];

        $stmt = $pdo->prepare("
            UPDATE coupons SET 
                code = :code,
                discount_type = :type,
                discount_value = :val,
                min_order_amount = :min,
                max_discount_amount = :max,
                usage_limit = :limit,
                is_active = :active
            WHERE id = :id
        ");
        $stmt->execute([
            ':code'   => $newCode,
            ':type'   => $type,
            ':val'    => $val,
            ':min'    => $min,
            ':max'    => $max,
            ':limit'  => $limit,
            ':active' => $active,
            ':id'     => $id,
        ]);

        // Synchronize changes to site_settings.homepage_content if this coupon is referenced in banners/guarantee strips
        try {
            $settingStmt = $pdo->query("SELECT `value` FROM site_settings WHERE `key` = 'homepage_content' LIMIT 1");
            $rawContent = $settingStmt->fetchColumn();
            if ($rawContent) {
                $content = json_decode($rawContent, true);
                if (is_array($content)) {
                    $synced = false;
                    $origCodeUpper = strtoupper($orig['code']);
                    
                    // 1. Guarantee strip in jhumkaBoxHero
                    if (isset($content['jhumkaBoxHero']['guaranteeStrip']['couponCode'])) {
                        if (strtoupper(trim($content['jhumkaBoxHero']['guaranteeStrip']['couponCode'])) === $origCodeUpper) {
                            $content['jhumkaBoxHero']['guaranteeStrip']['couponCode'] = $newCode;
                            $synced = true;
                        }
                    }

                    // 2. Festival Offer banner
                    if (isset($content['festivalOffer']['couponCode'])) {
                        if (strtoupper(trim($content['festivalOffer']['couponCode'])) === $origCodeUpper) {
                            $content['festivalOffer']['couponCode'] = $newCode;
                            if ($type === 'percentage') {
                                $content['festivalOffer']['couponDiscount'] = 'FLAT ' . round($val) . '% OFF';
                            } else {
                                $content['festivalOffer']['couponDiscount'] = '₹' . round($val) . ' FLAT OFF';
                            }
                            $synced = true;
                        }
                    }

                    if ($synced) {
                        $updStmt = $pdo->prepare("UPDATE site_settings SET `value` = :val WHERE `key` = 'homepage_content'");
                        $updStmt->execute([':val' => json_encode($content, JSON_UNESCAPED_UNICODE)]);
                    }
                }
            }
        } catch (Throwable $syncErr) {
            error_log('Coupon banner sync error: ' . $syncErr->getMessage());
        }

        AdminAuth::logActivity($adminUser['id'], 'update_coupon', 'coupon', $id, [
            'code' => $newCode,
            'type' => $type,
            'val'  => $val,
            'active' => $active
        ]);

        ApiResponse::success([
            'id' => $id,
            'code' => $newCode,
            'discount_type' => $type,
            'discount_value' => $val,
            'min_order_amount' => $min,
            'max_discount_amount' => $max,
            'usage_limit' => $limit,
            'is_active' => $active
        ], 'Coupon updated successfully');
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
