<?php
/**
 * VALERIE JEWELS — Bundles & Combo Offers Endpoint
 * Returns curated jewelry bundles with included products and bundle savings.
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/config/database.php';

handleCors();

try {
    $pdo = Database::getConnection();

    $stmt = $pdo->query("
        SELECT 
            b.id,
            b.title,
            b.slug,
            b.description,
            b.bundle_price,
            b.compare_price,
            b.badge_text,
            (b.compare_price - b.bundle_price) AS savings_amount,
            ROUND(((b.compare_price - b.bundle_price) / b.compare_price) * 100) AS discount_percentage
        FROM bundles b
        WHERE b.is_active = 1
        ORDER BY b.id DESC
    ");
    $bundles = $stmt->fetchAll();

    $itemStmt = $pdo->prepare("
        SELECT 
            bi.quantity,
            p.id AS product_id,
            p.name,
            p.slug,
            p.price,
            p.mrp,
            (
                SELECT image_url 
                FROM product_images 
                WHERE product_id = p.id 
                ORDER BY is_primary DESC, display_order ASC, id ASC 
                LIMIT 1
            ) AS primary_image
        FROM bundle_items bi
        JOIN products p ON bi.product_id = p.id
        WHERE bi.bundle_id = :bundle_id AND p.is_active = 1
    ");

    foreach ($bundles as &$bundle) {
        $itemStmt->execute([':bundle_id' => $bundle['id']]);
        $bundle['items'] = $itemStmt->fetchAll();
    }

    ApiResponse::success($bundles, 'Bundles retrieved successfully');

} catch (Throwable $e) {
    ApiResponse::error('Failed to retrieve bundles: ' . $e->getMessage(), 500);
}
