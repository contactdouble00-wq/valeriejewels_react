<?php
/**
 * VALERIE JEWELS — Admin Categories Management
 * Full CRUD for product categories. Admin-only for create/edit/delete.
 * Staff can read. Cannot delete a category that still has products assigned.
 */

require_once dirname(__DIR__) . '/utils/admin_auth.php';

$adminUser = AdminAuth::authenticate(['admin', 'staff']);
$pdo = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true) ?: [];
$action = $_GET['action'] ?? ($input['action'] ?? '');

try {
// ─────────────────────────────────────────────────────────────────────────────
// GET — List all categories with product counts (ANSI SQL / ONLY_FULL_GROUP_BY safe)
// ─────────────────────────────────────────────────────────────────────────────
if ($method === 'GET') {
    $stmt = $pdo->query("
        SELECT 
            c.id, c.name, c.slug, c.description, c.image_url, c.display_order, c.is_active, c.created_at,
            COUNT(p.id) AS product_count
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
        GROUP BY c.id, c.name, c.slug, c.description, c.image_url, c.display_order, c.is_active, c.created_at
        ORDER BY c.display_order ASC, c.name ASC
    ");
    $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
    ApiResponse::success($categories, 'Categories retrieved');
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — Create new category (admin only)
// ─────────────────────────────────────────────────────────────────────────────
if ($method === 'POST' && empty($action)) {
    if ($adminUser['role'] !== 'admin') {
        ApiResponse::error('Permission denied: Only admins can create categories', 403);
    }

    $name = trim($input['name'] ?? '');
    if (empty($name)) {
        ApiResponse::error('Category name is required', 422);
    }

    $slug = trim($input['slug'] ?? '');
    if (empty($slug)) {
        $slug = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $name));
    }

    // Check slug uniqueness
    $checkStmt = $pdo->prepare("SELECT id FROM categories WHERE slug = ?");
    $checkStmt->execute([$slug]);
    if ($checkStmt->fetch()) {
        $slug .= '-' . rand(10, 99);
    }

    $maxOrder = $pdo->query("SELECT COALESCE(MAX(display_order), 0) + 1 FROM categories")->fetchColumn();

    $stmt = $pdo->prepare("
        INSERT INTO categories (name, slug, description, display_order, is_active)
        VALUES (:name, :slug, :desc, :order, 1)
    ");
    $stmt->execute([
        ':name'  => $name,
        ':slug'  => $slug,
        ':desc'  => $input['description'] ?? '',
        ':order' => (int)($input['display_order'] ?? $maxOrder),
    ]);
    $newId = $pdo->lastInsertId();

    AdminAuth::logActivity($adminUser['id'], 'create_category', 'category', $newId, ['name' => $name, 'slug' => $slug]);

    ApiResponse::success(['id' => $newId, 'name' => $name, 'slug' => $slug], 'Category created', 201);
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE — Delete category (admin only, blocks if products assigned)
// ─────────────────────────────────────────────────────────────────────────────
$isDeleteAction = ($method === 'DELETE')
    || ($method === 'POST' && in_array($action, ['delete', 'delete_category'], true))
    || ($method === 'POST' && in_array($input['action'] ?? '', ['delete', 'delete_category'], true))
    || ($method === 'POST' && ($input['_method'] ?? '') === 'DELETE');

if ($isDeleteAction) {
    if ($adminUser['role'] !== 'admin') {
        ApiResponse::error('Permission denied: Only admins can delete categories', 403);
    }

    $id = isset($_GET['id']) ? (int)$_GET['id'] : (int)($input['id'] ?? 0);
    if ($id <= 0) {
        ApiResponse::error('Category ID required', 422);
    }

    // Block if products are assigned
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM products WHERE category_id = ?");
    $countStmt->execute([$id]);
    $productCount = (int)$countStmt->fetchColumn();

    if ($productCount > 0) {
        ApiResponse::error("Cannot delete: {$productCount} product(s) are assigned to this category. Reassign them first.", 409);
    }

    $stmt = $pdo->prepare("DELETE FROM categories WHERE id = ?");
    $stmt->execute([$id]);

    AdminAuth::logActivity($adminUser['id'], 'delete_category', 'category', $id);

    ApiResponse::success(['id' => $id, 'deleted' => true], 'Category deleted');
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT — Update category (admin only)
// ─────────────────────────────────────────────────────────────────────────────
$isUpdateAction = ($method === 'PUT')
    || ($method === 'POST' && in_array($action, ['update', 'update_category'], true))
    || ($method === 'POST' && in_array($input['action'] ?? '', ['update', 'update_category'], true))
    || ($method === 'POST' && ($input['_method'] ?? '') === 'PUT');

if ($isUpdateAction) {
    if ($adminUser['role'] !== 'admin') {
        ApiResponse::error('Permission denied: Only admins can edit categories', 403);
    }

    $id = (int)($input['id'] ?? ($_GET['id'] ?? 0));
    if ($id <= 0) {
        ApiResponse::error('Category ID required', 422);
    }

    $name = trim($input['name'] ?? '');
    if (empty($name)) {
        ApiResponse::error('Category name is required', 422);
    }

    $slug = trim($input['slug'] ?? '');
    if (empty($slug)) {
        $slug = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $name));
    }

    $stmt = $pdo->prepare("
        UPDATE categories SET
            name = :name,
            slug = :slug,
            description = :desc,
            display_order = :order,
            is_active = :active
        WHERE id = :id
    ");
    $stmt->execute([
        ':name'   => $name,
        ':slug'   => $slug,
        ':desc'   => $input['description'] ?? '',
        ':order'  => (int)($input['display_order'] ?? 0),
        ':active' => isset($input['is_active']) ? (int)$input['is_active'] : 1,
        ':id'     => $id,
    ]);

    AdminAuth::logActivity($adminUser['id'], 'update_category', 'category', $id, ['name' => $name]);

    ApiResponse::success(['id' => $id, 'name' => $name, 'slug' => $slug], 'Category updated');
}

// ─────────────────────────────────────────────────────────────────────────────
// POST?action=reorder — Bulk update display_order
// ─────────────────────────────────────────────────────────────────────────────
if ($action === 'reorder') {
    if ($adminUser['role'] !== 'admin') {
        ApiResponse::error('Permission denied', 403);
    }

    $order = $input['order'] ?? []; // array of {id, display_order}
    $stmt = $pdo->prepare("UPDATE categories SET display_order = :order WHERE id = :id");
    foreach ($order as $item) {
        $stmt->execute([':order' => (int)$item['display_order'], ':id' => (int)$item['id']]);
    }

    ApiResponse::success(null, 'Category order updated');
}

// ─────────────────────────────────────────────────────────────────────────────
// POST?action=toggle_active — Toggle or set is_active status (show/hide on storefront)
// ─────────────────────────────────────────────────────────────────────────────
if ($action === 'toggle_active') {
    if ($adminUser['role'] !== 'admin' && $adminUser['role'] !== 'staff') {
        ApiResponse::error('Permission denied', 403);
    }

    $id = (int)($input['id'] ?? ($_GET['id'] ?? 0));
    if ($id <= 0) {
        ApiResponse::error('Category ID required', 422);
    }

    if (isset($input['is_active'])) {
        $isActive = (int)$input['is_active'];
    } else {
        $current = (int)$pdo->query("SELECT is_active FROM categories WHERE id = $id")->fetchColumn();
        $isActive = $current ? 0 : 1;
    }

    $stmt = $pdo->prepare("UPDATE categories SET is_active = :active WHERE id = :id");
    $stmt->execute([':active' => $isActive, ':id' => $id]);

    AdminAuth::logActivity($adminUser['id'], 'toggle_category_active', 'category', $id, ['is_active' => $isActive]);

    ApiResponse::success(['id' => $id, 'is_active' => $isActive], 'Category visibility updated');
}

ApiResponse::error('Invalid request action or method', 400);

} catch (Throwable $e) {
    error_log('categories.php error: ' . $e->getMessage());
    ApiResponse::handleDatabaseException($e, 'Failed to process category request');
}
