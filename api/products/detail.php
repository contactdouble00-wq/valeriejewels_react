<?php
/**
 * VALERIE JEWELS — Product Detail Endpoint
 * Returns complete product data, multi-image gallery, variants, reviews, and related products.
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/config/database.php';

handleCors();

try {
    $pdo = Database::getConnection();

    $slug = trim($_GET['slug'] ?? '');
    $id   = isset($_GET['id']) ? (int)$_GET['id'] : null;

    if (empty($slug) && empty($id)) {
        ApiResponse::error('Please provide a product slug or id', 400);
    }

    // 1. Fetch Product
    if (!empty($slug)) {
        $stmt = $pdo->prepare("
            SELECT 
                p.*,
                c.name AS category_name,
                c.slug AS category_slug,
                ROUND(((p.mrp - p.price) / p.mrp) * 100) AS discount_percentage
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.slug = :slug AND p.is_active = 1
            LIMIT 1
        ");
        $stmt->execute([':slug' => $slug]);
        $product = $stmt->fetch();

        // Fallback: If not found by exact slug, try partial match or keyword search
        if (!$product) {
            $prefix = substr($slug, 0, 25) . '%';
            $kw = '%' . str_replace('-', '%', substr($slug, 0, 30)) . '%';
            $stmt = $pdo->prepare("
                SELECT 
                    p.*,
                    c.name AS category_name,
                    c.slug AS category_slug,
                    ROUND(((p.mrp - p.price) / p.mrp) * 100) AS discount_percentage
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE (p.slug LIKE :prefix OR p.slug LIKE :kw OR p.name LIKE :prefix) AND p.is_active = 1
                LIMIT 1
            ");
            $stmt->execute([':prefix' => $prefix, ':kw' => $kw]);
            $product = $stmt->fetch();
        }
    } else {
        $stmt = $pdo->prepare("
            SELECT 
                p.*,
                c.name AS category_name,
                c.slug AS category_slug,
                ROUND(((p.mrp - p.price) / p.mrp) * 100) AS discount_percentage
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = :id AND p.is_active = 1
            LIMIT 1
        ");
        $stmt->execute([':id' => $id]);
        $product = $stmt->fetch();
    }

    if (!$product) {
        ApiResponse::error('Product not found or inactive', 404);
    }

    $productId = (int)$product['id'];

    // 2. Fetch Multi-image Gallery
    $imgStmt = $pdo->prepare("
        SELECT id, image_url, alt_text, display_order, is_primary
        FROM product_images
        WHERE product_id = :product_id
        ORDER BY is_primary DESC, display_order ASC, id ASC
    ");
    $imgStmt->execute([':product_id' => $productId]);
    $images = $imgStmt->fetchAll();

    // 3. Fetch Product Variants
    $varStmt = $pdo->prepare("
        SELECT id, sku, title, option1_name, option1_value, mrp, price, stock_quantity, is_active
        FROM product_variants
        WHERE product_id = :product_id AND is_active = 1
        ORDER BY id ASC
    ");
    $varStmt->execute([':product_id' => $productId]);
    $variants = $varStmt->fetchAll();

    // 4. Fetch Reviews
    $revStmt = $pdo->prepare("
        SELECT id, reviewer_name, rating, title, comment, image_url, images, is_verified_buyer, created_at
        FROM reviews
        WHERE product_id = :product_id AND status = 'approved'
        ORDER BY id DESC
    ");
    $revStmt->execute([':product_id' => $productId]);
    $reviews = $revStmt->fetchAll();

    foreach ($reviews as &$rev) {
        if (!empty($rev['image_url'])) {
            $rev['image_url'] = preg_replace('#^(https?://[^/]+)?/uploads/#i', '$1/api/uploads/', $rev['image_url']);
        }
        if (!empty($rev['images'])) {
            $decoded = json_decode($rev['images'], true);
            if (is_array($decoded)) {
                $rev['images'] = array_map(function($u) {
                    return preg_replace('#^(https?://[^/]+)?/uploads/#i', '$1/api/uploads/', $u);
                }, $decoded);
            }
        }
    }
    unset($rev);

    // Dynamic rating: product override > review average > category default > 4.9
    $avgRating = 4.9;
    if (!empty($product['rating_avg']) && (float)$product['rating_avg'] > 0) {
        $avgRating = (float)$product['rating_avg'];
    } elseif (!empty($reviews)) {
        $totalRating = array_sum(array_column($reviews, 'rating'));
        $avgRating = round($totalRating / count($reviews), 1);
    }

    $reviewsCount = !empty($product['review_count']) && (int)$product['review_count'] > 0
        ? max(count($reviews), (int)$product['review_count'])
        : (count($reviews) > 0 ? count($reviews) : 128);

    // 5. Related Products in same category
    $relStmt = $pdo->prepare("
        SELECT 
            p.id,
            p.name,
            p.slug,
            p.mrp,
            p.price,
            p.rating_avg,
            p.review_count,
            ROUND(((p.mrp - p.price) / p.mrp) * 100) AS discount_percentage,
            COALESCE(
                (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 AND image_url NOT LIKE '%.mp4%' AND image_url NOT LIKE '%.webm%' LIMIT 1),
                (SELECT image_url FROM product_images WHERE product_id = p.id AND image_url NOT LIKE '%.mp4%' AND image_url NOT LIKE '%.webm%' ORDER BY display_order ASC, id ASC LIMIT 1),
                (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, display_order ASC, id ASC LIMIT 1)
            ) AS primary_image
        FROM products p
        WHERE p.category_id = :cat_id AND p.id != :prod_id AND p.is_active = 1
        ORDER BY p.is_bestseller DESC, p.id DESC
        LIMIT 4
    ");
    $relStmt->execute([
        ':cat_id'  => $product['category_id'],
        ':prod_id' => $productId,
    ]);
    $relatedProducts = $relStmt->fetchAll();

    foreach ($images as &$img) {
        if (!empty($img['image_url'])) {
            $img['image_url'] = preg_replace('#^(https?://[^/]+)?/uploads/#i', '$1/api/uploads/', $img['image_url']);
        }
    }
    unset($img);

    if (empty($product['video_url'])) {
        foreach ($images as $img) {
            if (!empty($img['image_url']) && (preg_match('/\.(mp4|webm|mov|ogg)(\?.*)?$/i', $img['image_url']) || str_contains($img['image_url'], 'video_'))) {
                $product['video_url'] = $img['image_url'];
                break;
            }
        }
    }

    if (!empty($product['video_url'])) {
        $product['video_url'] = preg_replace('#^(https?://[^/]+)?/uploads/#i', '$1/api/uploads/', $product['video_url']);
    }

    foreach ($relatedProducts as &$rel) {
        if (!empty($rel['primary_image'])) {
            $rel['primary_image'] = preg_replace('#^(https?://[^/]+)?/uploads/#i', '$1/api/uploads/', $rel['primary_image']);
        }
        $rel['rating'] = (!empty($rel['rating_avg']) && (float)$rel['rating_avg'] > 0) ? (float)$rel['rating_avg'] : 4.9;
    }
    unset($rel);

    $product['images']           = $images;
    $product['variants']         = $variants;
    $product['reviews']          = $reviews;
    $product['rating']           = $avgRating;
    $product['rating_avg']       = $avgRating;
    $product['rating_summary']   = [
        'average_rating' => $avgRating,
        'reviews_count'  => $reviewsCount,
    ];
    $product['related_products'] = $relatedProducts;

    ApiResponse::success($product, 'Product detail retrieved successfully');

} catch (Throwable $e) {
    ApiResponse::error('Failed to retrieve product details: ' . $e->getMessage(), 500);
}
