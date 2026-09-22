<?php
/**
 * VALERIE JEWELS — Product Listing Endpoint
 * Supports category filtering, price bounds, sorting, search, and pagination.
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/config/database.php';

handleCors();

try {
    $pdo = Database::getConnection();

    // Query parameters
    $category   = trim($_GET['category'] ?? '');
    $minPrice   = isset($_GET['min_price']) && is_numeric($_GET['min_price']) ? (float)$_GET['min_price'] : null;
    $maxPrice   = isset($_GET['max_price']) && is_numeric($_GET['max_price']) ? (float)$_GET['max_price'] : null;
    $bestseller = isset($_GET['bestseller']) ? (int)$_GET['bestseller'] : null;
    $search     = trim($_GET['search'] ?? '');
    $sort       = trim($_GET['sort'] ?? 'popular');
    $page       = max(1, (int)($_GET['page'] ?? 1));
    $limit      = min(50, max(1, (int)($_GET['limit'] ?? 12)));
    $offset     = ($page - 1) * $limit;

    // Base WHERE conditions
    $where = ['p.is_active = 1', 'c.is_active = 1'];
    $params = [];

    // Filter by Category (slug or id)
    if (!empty($category) && $category !== 'all') {
        if (is_numeric($category)) {
            $where[] = 'p.category_id = :category_id';
            $params[':category_id'] = (int)$category;
        } else {
            $where[] = 'c.slug = :category_slug';
            $params[':category_slug'] = $category;
        }
    }

    // Filter by Price range
    if ($minPrice !== null) {
        $where[] = 'p.price >= :min_price';
        $params[':min_price'] = $minPrice;
    }
    if ($maxPrice !== null) {
        $where[] = 'p.price <= :max_price';
        $params[':max_price'] = $maxPrice;
    }

    // Filter by Bestseller
    if ($bestseller !== null) {
        $where[] = 'p.is_bestseller = :bestseller';
        $params[':bestseller'] = $bestseller;
    }

    // Search query
    if (!empty($search)) {
        $where[] = '(p.name LIKE :search_term OR p.short_description LIKE :search_term OR p.description LIKE :search_term)';
        $params[':search_term'] = '%' . $search . '%';
    }

    $whereSql = implode(' AND ', $where);

    // Sorting options
    $orderBy = match ($sort) {
        'price_low'  => 'p.price ASC, p.id DESC',
        'price_high' => 'p.price DESC, p.id DESC',
        'newest'     => 'p.id DESC',
        default      => 'p.is_bestseller DESC, p.id DESC', // 'popular'
    };

    // 1. Get Total Count
    $countSql = "
        SELECT COUNT(*)
        FROM products p
        JOIN categories c ON p.category_id = c.id
        WHERE {$whereSql}
    ";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $totalItems = (int)$countStmt->fetchColumn();
    $totalPages = (int)ceil($totalItems / $limit);

    // 2. Fetch Paginated Products
    $sql = "
        SELECT 
            p.id,
            p.category_id,
            c.name AS category_name,
            c.slug AS category_slug,
            p.name,
            p.slug,
            p.short_description,
            p.mrp,
            p.price,
            p.sku,
            p.stock_quantity,
            p.pairs_count,
            p.is_anti_tarnish,
            p.material,
            p.is_bestseller,
            COALESCE(
                p.video_url,
                (SELECT image_url FROM product_images WHERE product_id = p.id AND (image_url LIKE '%.mp4%' OR image_url LIKE '%.webm%' OR image_url LIKE '%.mov%' OR image_url LIKE '%video_%') LIMIT 1)
            ) AS video_url,
            p.created_at,
            ROUND(((p.mrp - p.price) / p.mrp) * 100) AS discount_percentage,
            COALESCE(
                (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 AND image_url NOT LIKE '%.mp4%' AND image_url NOT LIKE '%.webm%' LIMIT 1),
                (SELECT image_url FROM product_images WHERE product_id = p.id AND image_url NOT LIKE '%.mp4%' AND image_url NOT LIKE '%.webm%' ORDER BY display_order ASC, id ASC LIMIT 1),
                (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, display_order ASC, id ASC LIMIT 1)
            ) AS primary_image
        FROM products p
        JOIN categories c ON p.category_id = c.id
        WHERE {$whereSql}
        ORDER BY {$orderBy}
        LIMIT :limit OFFSET :offset
    ";

    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $val) {
        $stmt->bindValue($key, $val);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $products = $stmt->fetchAll();

    foreach ($products as &$prod) {
        if (empty($prod['pairs_count'])) {
            if (preg_match('/(\d+)\s*Pair/i', $prod['name'] . ' ' . ($prod['short_description'] ?? ''), $m)) {
                $prod['pairs_count'] = (int)$m[1];
            } else if (($prod['category_slug'] ?? '') === 'jhumka-boxes' || str_contains(strtolower($prod['name']), 'jhumka')) {
                $prod['pairs_count'] = 6;
            } else {
                $prod['pairs_count'] = null;
            }
        } else {
            $prod['pairs_count'] = (int)$prod['pairs_count'];
        }

        if (!empty($prod['primary_image'])) {
            $prod['primary_image'] = preg_replace('#^(https?://[^/]+)?/uploads/#i', '$1/api/uploads/', $prod['primary_image']);
        }
        if (!empty($prod['video_url'])) {
            $prod['video_url'] = preg_replace('#^(https?://[^/]+)?/uploads/#i', '$1/api/uploads/', $prod['video_url']);
        }
    }
    unset($prod);

    $meta = [
        'page'        => $page,
        'limit'       => $limit,
        'total_items' => $totalItems,
        'total_pages' => $totalPages,
    ];

    ApiResponse::success($products, 'Products retrieved successfully', 200, $meta);

} catch (Throwable $e) {
    ApiResponse::error('Failed to retrieve products: ' . $e->getMessage(), 500);
}
