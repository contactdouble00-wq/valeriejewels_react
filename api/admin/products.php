<?php
/**
 * VALERIE JEWELS — Admin Products CRUD & Inventory Management
 * Handles product listing, creation, updating, stock adjustments, and duplication.
 * Restricts price editing for 'staff' role accounts.
 */

require_once dirname(__DIR__) . '/utils/admin_auth.php';

$adminUser = AdminAuth::authenticate(['admin', 'staff']);
$pdo = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// Handle GET: List, Detail, or CSV Export
if ($method === 'GET') {
    // ─────────────────────────────────────────────────────────────────────────
    // GET?action=export_csv — Stream all products as a downloadable CSV
    // ─────────────────────────────────────────────────────────────────────────
    if ($action === 'export_csv') {
        $stmt = $pdo->query("
            SELECT p.id, p.name, p.sku, c.name AS category, p.price, p.mrp, p.cost_price,
                   p.stock_quantity, p.material, p.slug, p.meta_title, p.meta_description,
                   p.is_bestseller, p.is_anti_tarnish, p.is_active, p.video_url
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            ORDER BY p.id ASC
        ");
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="valerie-products-' . date('Y-m-d') . '.csv"');
        header('Pragma: no-cache');

        $out = fopen('php://output', 'w');
        fputcsv($out, ['ID', 'Name', 'SKU', 'Category', 'Selling Price', 'MRP', 'Cost Price',
                       'Stock', 'Material', 'Slug', 'Meta Title', 'Meta Description',
                       'Is Bestseller', 'Is Anti-Tarnish', 'Is Active', 'Video URL']);
        foreach ($products as $p) {
            fputcsv($out, [
                $p['id'], $p['name'], $p['sku'], $p['category'], $p['price'], $p['mrp'],
                $p['cost_price'], $p['stock_quantity'], $p['material'], $p['slug'],
                $p['meta_title'], $p['meta_description'], $p['is_bestseller'],
                $p['is_anti_tarnish'], $p['is_active'], $p['video_url'],
            ]);
        }
        fclose($out);
        exit;
    }

    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    
    if ($id > 0) {
        $stmt = $pdo->prepare("
            SELECT p.*, c.name AS category_name, c.slug AS category_slug
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ?
        ");
        $stmt->execute([$id]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$product) {
            ApiResponse::error('Product not found', 404);
        }

        // Variants
        $varStmt = $pdo->prepare("SELECT * FROM product_variants WHERE product_id = ? ORDER BY id ASC");
        $varStmt->execute([$id]);
        $product['variants'] = $varStmt->fetchAll(PDO::FETCH_ASSOC);

        // Images
        $imgStmt = $pdo->prepare("SELECT * FROM product_images WHERE product_id = ? ORDER BY display_order ASC");
        $imgStmt->execute([$id]);
        $product['images'] = $imgStmt->fetchAll(PDO::FETCH_ASSOC);

        ApiResponse::success($product, 'Product fetched');
    }

    // List with filters
    $search = trim($_GET['search'] ?? '');
    $category = trim($_GET['category'] ?? '');
    $isBestseller = isset($_GET['is_bestseller']) ? (int)$_GET['is_bestseller'] : null;

    $where = [isset($_GET['include_inactive']) ? "1=1" : "p.is_active = 1"];
    $params = [];

    if ($search !== '') {
        $where[] = "(p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)";
        $term = "%{$search}%";
        $params[] = $term;
        $params[] = $term;
        $params[] = $term;
    }

    if ($category !== '') {
        $where[] = "(c.slug = ? OR c.id = ?)";
        $params[] = $category;
        $params[] = $category;
    }

    if ($isBestseller !== null) {
        $where[] = "p.is_bestseller = ?";
        $params[] = $isBestseller;
    }

    $whereSql = implode(' AND ', $where);

    $stmt = $pdo->prepare("
        SELECT 
            p.*, 
            c.name AS category_name, 
            c.slug AS category_slug,
            (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS primary_image,
            (SELECT COUNT(*) FROM product_variants WHERE product_id = p.id) AS variant_count
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE {$whereSql}
        ORDER BY p.id DESC
    ");
    $stmt->execute($params);
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    ApiResponse::success($products, 'Products retrieved');
}

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
$action = $_GET['action'] ?? ($input['action'] ?? '');

// ─────────────────────────────────────────────────────────────────────────────
// POST?action=import_csv — Bulk import products from uploaded CSV
// ─────────────────────────────────────────────────────────────────────────────
if ($method === 'POST' && $action === 'import_csv') {
    if ($adminUser['role'] !== 'admin') {
        ApiResponse::error('Permission denied: Only admins can import products', 403);
    }

    if (empty($_FILES['csv_file']['tmp_name'])) {
        ApiResponse::error('CSV file is required', 422);
    }

    $file = fopen($_FILES['csv_file']['tmp_name'], 'r');
    $headers = fgetcsv($file); // skip header row

    $created = 0; $updated = 0; $errors = [];

    // Fetch category map: name => id
    $catRows = $pdo->query("SELECT id, name FROM categories")->fetchAll(PDO::FETCH_ASSOC);
    $categoryMap = [];
    foreach ($catRows as $row) {
        $categoryMap[strtolower(trim($row['name']))] = (int)$row['id'];
    }

    $insertStmt = $pdo->prepare("
        INSERT INTO products (name, sku, category_id, price, mrp, cost_price, stock_quantity,
                             material, slug, meta_title, meta_description, is_bestseller,
                             is_anti_tarnish, is_active, video_url)
        VALUES (:name,:sku,:cat,:price,:mrp,:cost,:stock,:material,:slug,:meta_t,:meta_d,:best,:anti,:active,:vid)
    ");
    $updateStmt = $pdo->prepare("
        UPDATE products SET
            name=:name, category_id=:cat, price=:price, mrp=:mrp, cost_price=:cost,
            stock_quantity=:stock, material=:material, slug=:slug, meta_title=:meta_t,
            meta_description=:meta_d, is_bestseller=:best, is_anti_tarnish=:anti,
            is_active=:active, video_url=:vid
        WHERE sku=:sku
    ");
    $existsStmt = $pdo->prepare("SELECT id FROM products WHERE sku = ?");

    $rowNum = 1;
    while (($row = fgetcsv($file)) !== false) {
        $rowNum++;
        if (count($row) < 4) { $errors[] = "Row {$rowNum}: Too few columns"; continue; }

        $name  = trim($row[1] ?? '');
        $sku   = trim($row[2] ?? '');
        $price = (float)($row[4] ?? 0);

        if (empty($name) || empty($sku) || $price <= 0) {
            $errors[] = "Row {$rowNum}: Name, SKU, and Price are required";
            continue;
        }

        $catName   = strtolower(trim($row[3] ?? ''));
        $categoryId = $categoryMap[$catName] ?? 1;
        $slug      = !empty($row[9]) ? trim($row[9]) : strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $name));

        $params = [
            ':name'     => $name,
            ':sku'      => $sku,
            ':cat'      => $categoryId,
            ':price'    => $price,
            ':mrp'      => (float)($row[5] ?? $price),
            ':cost'     => (float)($row[6] ?? 0),
            ':stock'    => (int)($row[7] ?? 0),
            ':material' => $row[8] ?? '',
            ':slug'     => $slug,
            ':meta_t'   => $row[10] ?? $name,
            ':meta_d'   => $row[11] ?? '',
            ':best'     => (int)($row[12] ?? 0),
            ':anti'     => (int)($row[13] ?? 1),
            ':active'   => (int)($row[14] ?? 1),
            ':vid'      => $row[15] ?? null,
        ];

        $existsStmt->execute([$sku]);
        if ($existsStmt->fetch()) {
            $updateStmt->execute($params);
            $updated++;
        } else {
            $insertStmt->execute($params);
            $created++;
        }
    }
    fclose($file);

    AdminAuth::logActivity($adminUser['id'], 'import_csv_products', 'product', null, [
        'created' => $created, 'updated' => $updated, 'errors' => count($errors)
    ]);

    ApiResponse::success([
        'created' => $created,
        'updated' => $updated,
        'errors'  => $errors,
    ], "CSV import complete: {$created} created, {$updated} updated");
}

// Handle Quick Stock Update
if ($action === 'quick_stock') {
    $productId = (int)($input['product_id'] ?? 0);
    $newStock = (int)($input['stock_quantity'] ?? 0);

    if ($productId <= 0 || $newStock < 0) {
        ApiResponse::error('Invalid product ID or stock value', 422);
    }

    $stmt = $pdo->prepare("UPDATE products SET stock_quantity = ? WHERE id = ?");
    $stmt->execute([$newStock, $productId]);

    AdminAuth::logActivity(
        $adminUser['id'],
        'update_stock',
        'product',
        $productId,
        ['new_stock' => $newStock]
    );

    ApiResponse::success(['product_id' => $productId, 'stock_quantity' => $newStock], 'Stock updated successfully');
}

// Handle Duplicate Product
if ($action === 'duplicate') {
    $productId = (int)($input['product_id'] ?? 0);
    if ($productId <= 0) {
        ApiResponse::error('Invalid product ID to duplicate', 422);
    }

    $origStmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
    $origStmt->execute([$productId]);
    $orig = $origStmt->fetch(PDO::FETCH_ASSOC);

    if (!$orig) {
        ApiResponse::error('Original product not found', 404);
    }

    $newSlug = $orig['slug'] . '-copy-' . time();
    $newSku = $orig['sku'] . '-CPY';
    $newName = $orig['name'] . ' (Copy)';

    $insStmt = $pdo->prepare("
        INSERT INTO products (category_id, name, slug, short_description, description, mrp, price, cost_price, sku, stock_quantity, is_anti_tarnish, material, is_bestseller, video_url, is_active, meta_title, meta_description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $insStmt->execute([
        $orig['category_id'],
        $newName,
        $newSlug,
        $orig['short_description'],
        $orig['description'],
        $orig['mrp'],
        $orig['price'],
        $orig['cost_price'],
        $newSku,
        $orig['stock_quantity'],
        $orig['is_anti_tarnish'],
        $orig['material'],
        $orig['is_bestseller'],
        $orig['video_url'],
        1,
        $newName,
        $orig['meta_description'],
    ]);
    $newProductId = $pdo->lastInsertId();

    // Copy images
    $pdo->query("
        INSERT INTO product_images (product_id, image_url, alt_text, display_order, is_primary)
        SELECT {$newProductId}, image_url, alt_text, display_order, is_primary
        FROM product_images WHERE product_id = {$productId}
    ");

    AdminAuth::logActivity($adminUser['id'], 'duplicate_product', 'product', $newProductId, ['original_id' => $productId]);

    ApiResponse::success(['id' => $newProductId, 'name' => $newName], 'Product duplicated successfully');
}

// Handle Create (POST)
if ($method === 'POST') {
    $name = trim($input['name'] ?? '');
    $sku = trim($input['sku'] ?? '');
    $price = (float)($input['price'] ?? 0);
    $mrp = (float)($input['mrp'] ?? 0);
    $categoryId = (int)($input['category_id'] ?? 1);
    $stock = (int)($input['stock_quantity'] ?? 0);

    if (empty($name) || empty($sku) || $price <= 0) {
        ApiResponse::error('Name, SKU, and positive price are required', 422);
    }

    $slug = trim($input['slug'] ?? '');
    if (empty($slug)) {
        $slug = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $name)) . '-' . rand(100, 999);
    }

    $pairsCount = isset($input['pairs_count']) && $input['pairs_count'] !== '' ? (int)$input['pairs_count'] : null;

    $stmt = $pdo->prepare("
        INSERT INTO products (category_id, name, slug, short_description, description, mrp, price, cost_price, sku, stock_quantity, pairs_count, is_anti_tarnish, material, is_bestseller, video_url, is_active, meta_title, meta_description)
        VALUES (:cat, :name, :slug, :short_desc, :desc, :mrp, :price, :cost, :sku, :stock, :pairs, :anti, :mat, :best, :vid, :active, :meta_t, :meta_d)
    ");
    $stmt->execute([
        ':cat'        => $categoryId,
        ':name'       => $name,
        ':slug'       => $slug,
        ':short_desc' => $input['short_description'] ?? '',
        ':desc'       => $input['description'] ?? '',
        ':mrp'        => $mrp > 0 ? $mrp : $price,
        ':price'      => $price,
        ':cost'       => (float)($input['cost_price'] ?? 0),
        ':sku'        => $sku,
        ':stock'      => $stock,
        ':pairs'      => $pairsCount,
        ':anti'       => !empty($input['is_anti_tarnish']) ? 1 : 0,
        ':mat'        => $input['material'] ?? 'Stainless Steel / 18K Gold PVD',
        ':best'       => !empty($input['is_bestseller']) ? 1 : 0,
        ':vid'        => $input['video_url'] ?? null,
        ':active'     => isset($input['is_active']) ? (int)$input['is_active'] : 1,
        ':meta_t'     => $input['meta_title'] ?? ($name . ' | Valerie Jewels'),
        ':meta_d'     => $input['meta_description'] ?? ($input['short_description'] ?? ''),
    ]);

    $newId = $pdo->lastInsertId();

    // Insert Images if provided
    if (!empty($input['images']) && is_array($input['images'])) {
        $imgStmt = $pdo->prepare("INSERT INTO product_images (product_id, image_url, alt_text, display_order, is_primary) VALUES (?, ?, ?, ?, ?)");
        foreach ($input['images'] as $idx => $img) {
            $imgUrl = is_array($img) ? ($img['image_url'] ?? '') : $img;
            if (!empty($imgUrl)) {
                $imgStmt->execute([$newId, $imgUrl, $name, $idx, $idx === 0 ? 1 : 0]);
            }
        }
    }

    AdminAuth::logActivity($adminUser['id'], 'create_product', 'product', $newId, ['name' => $name, 'sku' => $sku]);

    ApiResponse::success(['id' => $newId, 'name' => $name, 'slug' => $slug], 'Product created successfully', 201);
}

// Handle Update (PUT or POST?action=update)
$isUpdateAction = ($method === 'PUT') 
    || ($method === 'POST' && in_array($action, ['update', 'update_product'], true))
    || ($method === 'POST' && in_array($input['action'] ?? '', ['update', 'update_product'], true))
    || ($method === 'POST' && ($input['_method'] ?? '') === 'PUT');

if ($isUpdateAction) {
    $id = (int)($input['id'] ?? ($_GET['id'] ?? 0));
    if ($id <= 0) {
        ApiResponse::error('Product ID is required for update', 422);
    }

    // Role check: Staff cannot edit price or MRP!
    $origStmt = $pdo->prepare("SELECT price, mrp FROM products WHERE id = ?");
    $origStmt->execute([$id]);
    $orig = $origStmt->fetch(PDO::FETCH_ASSOC);

    if (!$orig) {
        ApiResponse::error('Product not found', 404);
    }

    $newPrice = isset($input['price']) ? (float)$input['price'] : (float)$orig['price'];
    $newMrp = isset($input['mrp']) ? (float)$input['mrp'] : (float)$orig['mrp'];

    if ($adminUser['role'] === 'staff' && ($newPrice != (float)$orig['price'] || $newMrp != (float)$orig['mrp'])) {
        ApiResponse::error('Permission Denied: Staff accounts cannot modify product pricing or MRP.', 403);
    }

    $pairsCount = isset($input['pairs_count']) && $input['pairs_count'] !== '' ? (int)$input['pairs_count'] : null;

    $stmt = $pdo->prepare("
        UPDATE products SET
            name = :name,
            category_id = :cat,
            short_description = :short_desc,
            description = :desc,
            mrp = :mrp,
            price = :price,
            cost_price = :cost,
            sku = :sku,
            stock_quantity = :stock,
            pairs_count = :pairs,
            is_anti_tarnish = :anti,
            material = :mat,
            is_bestseller = :best,
            video_url = :vid,
            is_active = :active,
            meta_title = :meta_t,
            meta_description = :meta_d
        WHERE id = :id
    ");

    $stmt->execute([
        ':id'         => $id,
        ':name'       => $input['name'] ?? '',
        ':cat'        => (int)($input['category_id'] ?? 1),
        ':short_desc' => $input['short_description'] ?? '',
        ':desc'       => $input['description'] ?? '',
        ':mrp'        => $newMrp,
        ':price'      => $newPrice,
        ':cost'       => (float)($input['cost_price'] ?? 0),
        ':sku'        => $input['sku'] ?? '',
        ':stock'      => (int)($input['stock_quantity'] ?? 0),
        ':pairs'      => $pairsCount,
        ':anti'       => !empty($input['is_anti_tarnish']) ? 1 : 0,
        ':mat'        => $input['material'] ?? '',
        ':best'       => !empty($input['is_bestseller']) ? 1 : 0,
        ':vid'        => $input['video_url'] ?? null,
        ':active'     => isset($input['is_active']) ? (int)$input['is_active'] : 1,
        ':meta_t'     => $input['meta_title'] ?? '',
        ':meta_d'     => $input['meta_description'] ?? '',
    ]);

    // Update images if provided
    if (isset($input['images']) && is_array($input['images'])) {
        $pdo->prepare("DELETE FROM product_images WHERE product_id = ?")->execute([$id]);
        $imgStmt = $pdo->prepare("INSERT INTO product_images (product_id, image_url, alt_text, display_order, is_primary) VALUES (?, ?, ?, ?, ?)");
        foreach ($input['images'] as $idx => $img) {
            $imgUrl = is_array($img) ? ($img['image_url'] ?? '') : $img;
            if (!empty($imgUrl)) {
                $imgStmt->execute([$id, $imgUrl, $input['name'] ?? 'Product', $idx, $idx === 0 ? 1 : 0]);
            }
        }
    }

    AdminAuth::logActivity($adminUser['id'], 'update_product', 'product', $id, [
        'name' => $input['name'] ?? '',
        'price_changed' => $newPrice != (float)$orig['price'],
    ]);

    ApiResponse::success(['id' => $id], 'Product updated successfully');
}

// Handle Delete (DELETE or POST?action=delete)
$isDeleteAction = ($method === 'DELETE')
    || ($method === 'POST' && in_array($action, ['delete', 'delete_product'], true))
    || ($method === 'POST' && in_array($input['action'] ?? '', ['delete', 'delete_product'], true))
    || ($method === 'POST' && ($input['_method'] ?? '') === 'DELETE');

if ($isDeleteAction) {
    // Only admin can delete products
    if ($adminUser['role'] !== 'admin') {
        ApiResponse::error('Permission Denied: Only administrators can delete products.', 403);
    }

    $id = isset($_GET['id']) ? (int)$_GET['id'] : (int)($input['id'] ?? 0);
    if ($id <= 0) {
        ApiResponse::error('Product ID required', 422);
    }

    $checkStmt = $pdo->prepare("SELECT id, name FROM products WHERE id = ?");
    $checkStmt->execute([$id]);
    $product = $checkStmt->fetch();
    if (!$product) {
        ApiResponse::error('Product not found or already removed', 404);
    }

    try {
        // Check if product is referenced by existing customer orders
        $orderCheck = $pdo->prepare("SELECT COUNT(*) FROM order_items WHERE product_id = ?");
        $orderCheck->execute([$id]);
        $hasOrders = (int)$orderCheck->fetchColumn() > 0;

        if ($hasOrders) {
            // Soft-delete: mark inactive to maintain historical order integrity
            $pdo->prepare("UPDATE products SET is_active = 0 WHERE id = ?")->execute([$id]);
            AdminAuth::logActivity($adminUser['id'], 'archive_product', 'product', $id, [
                'name'   => $product['name'],
                'reason' => 'Product has existing orders; archived from active catalog',
            ]);
            ApiResponse::success([
                'id'       => $id,
                'archived' => true,
            ], "Product '{$product['name']}' has existing order records, so it has been archived and removed from active catalog.");
        } else {
            // Hard-delete: clean up any child records first
            $pdo->prepare("DELETE FROM product_images WHERE product_id = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM product_variants WHERE product_id = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM bundle_items WHERE product_id = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM reviews WHERE product_id = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM products WHERE id = ?")->execute([$id]);

            AdminAuth::logActivity($adminUser['id'], 'delete_product', 'product', $id, ['name' => $product['name']]);
            ApiResponse::success([
                'id'       => $id,
                'deleted'  => true,
            ], "Product '{$product['name']}' deleted successfully");
        }
    } catch (PDOException $e) {
        // If any foreign key constraint is encountered, safely soft delete
        if ($e->getCode() == '23000') {
            $pdo->prepare("UPDATE products SET is_active = 0 WHERE id = ?")->execute([$id]);
            AdminAuth::logActivity($adminUser['id'], 'archive_product', 'product', $id, ['name' => $product['name']]);
            ApiResponse::success([
                'id'       => $id,
                'archived' => true,
            ], "Product '{$product['name']}' is referenced by related store data, so it was archived.");
        } else {
            ApiResponse::error('Failed to delete product: ' . $e->getMessage(), 500);
        }
    }
}
