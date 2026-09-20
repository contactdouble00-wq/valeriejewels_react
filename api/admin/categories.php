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

// ─────────────────────────────────────────────────────────────────────────────
// GET — List all categories with product counts
// ─────────────────────────────────────────────────────────────────────────────
if ($method === 'GET') {
    // Auto-heal: Ensure 'jhumka-boxes' category exists in DB so it never permanently disappears
    $checkJhumka = $pdo->query("SELECT id FROM categories WHERE slug = 'jhumka-boxes' LIMIT 1")->fetch();
    if (!$checkJhumka) {
        $pdo->exec("
            INSERT INTO categories (name, slug, description, display_order, is_active)
            VALUES ('Jhumka Boxes', 'jhumka-boxes', 'Our viral 4 signature curated jhumka boxes designed for weddings, festivities, and daily wear.', 1, 1)
        ");
        $newJhumkaId = (int)$pdo->lastInsertId();
        $pdo->exec("UPDATE products SET category_id = {$newJhumkaId} WHERE sku LIKE 'VJ-JHM%' OR sku LIKE 'VJ-BX-%' OR name LIKE '%Jhumka Box%'");
    }

    $stmt = $pdo->query("
        SELECT 
            c.*,
            COUNT(p.id) AS product_count
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
        GROUP BY c.id
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

    // Block if jhumka-boxes (protected system category)
    $slugStmt = $pdo->prepare("SELECT slug FROM categories WHERE id = ?");
    $slugStmt->execute([$id]);
    $catSlug = $slugStmt->fetchColumn();
    if ($catSlug === 'jhumka-boxes') {
        ApiResponse::error('The "Jhumka Boxes" category is a protected core hero module for the storefront and cannot be deleted.', 400);
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

// ─────────────────────────────────────────────────────────────────────────────
// POST?action=restore_jhumka_boxes — Ensure 4 Signature Jhumka Boxes category exists & is active
// ─────────────────────────────────────────────────────────────────────────────
if ($action === 'restore_jhumka_boxes') {
    if ($adminUser['role'] !== 'admin') {
        ApiResponse::error('Permission denied', 403);
    }

    $stmt = $pdo->prepare("SELECT id, is_active FROM categories WHERE slug = 'jhumka-boxes' LIMIT 1");
    $stmt->execute();
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        $jhumkaId = (int)$existing['id'];
        $pdo->prepare("UPDATE categories SET is_active = 1, display_order = 1, name = 'Jhumka Boxes' WHERE id = ?")->execute([$jhumkaId]);
    } else {
        $insert = $pdo->prepare("
            INSERT INTO categories (name, slug, description, display_order, is_active)
            VALUES ('Jhumka Boxes', 'jhumka-boxes', 'Our viral 4 signature curated jhumka boxes designed for weddings, festivities, and daily wear.', 1, 1)
        ");
        $insert->execute();
        $jhumkaId = (int)$pdo->lastInsertId();
    }

    // Re-link any products that are jhumka boxes
    $pdo->prepare("
        UPDATE products 
        SET category_id = ? 
        WHERE sku LIKE 'VJ-JHM%' OR sku LIKE 'VJ-BX-%' OR name LIKE '%Jhumka Box%'
    ")->execute([$jhumkaId]);

    AdminAuth::logActivity($adminUser['id'], 'restore_category', 'category', $jhumkaId, ['slug' => 'jhumka-boxes']);

    ApiResponse::success([
        'id' => $jhumkaId,
        'slug' => 'jhumka-boxes',
        'name' => 'Jhumka Boxes',
        'is_active' => 1,
        'restored' => true
    ], 'Jhumka Boxes category restored and re-linked to hero products successfully');
}
