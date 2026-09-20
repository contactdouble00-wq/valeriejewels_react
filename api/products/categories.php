<?php
/**
 * VALERIE JEWELS — Categories Endpoint
 * Returns all active categories with product counts.
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/config/database.php';

handleCors();

try {
    $pdo = Database::getConnection();

    $stmt = $pdo->query("
        SELECT 
            c.id,
            c.name,
            c.slug,
            c.description,
            c.image_url,
            c.display_order,
            COUNT(p.id) AS products_count
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id AND p.is_active = 1
        WHERE c.is_active = 1
        GROUP BY c.id, c.name, c.slug, c.description, c.image_url, c.display_order
        ORDER BY c.display_order ASC, c.name ASC
    ");

    $categories = $stmt->fetchAll();

    ApiResponse::success($categories, 'Categories retrieved successfully');
} catch (Throwable $e) {
    ApiResponse::error('Failed to retrieve categories: ' . $e->getMessage(), 500);
}
