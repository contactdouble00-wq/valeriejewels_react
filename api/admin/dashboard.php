<?php
/**
 * VALERIE JEWELS — Admin Dashboard & Reporting Endpoint
 * Includes executive KPIs and hero spotlight for the 4 Signature Jhumka Boxes.
 */

require_once dirname(__DIR__) . '/utils/admin_auth.php';

$adminUser = AdminAuth::authenticate(['admin', 'staff']);
$pdo = Database::getConnection();

try {
    // 1. Overall Revenue & Orders
    $overallStmt = $pdo->query("
        SELECT 
            COUNT(id) AS total_orders,
            COALESCE(SUM(CASE WHEN order_status != 'cancelled' THEN total_amount ELSE 0 END), 0) AS total_revenue,
            COALESCE(AVG(CASE WHEN order_status != 'cancelled' THEN total_amount ELSE NULL END), 0) AS average_order_value,
            COUNT(CASE WHEN order_status = 'cancelled' THEN 1 END) AS cancelled_orders,
            COUNT(CASE WHEN order_status = 'delivered' THEN 1 END) AS delivered_orders,
            COUNT(CASE WHEN payment_type = 'full_prepaid' THEN 1 END) AS prepaid_orders,
            COUNT(CASE WHEN payment_type = 'partial' THEN 1 END) AS partial_cod_orders,
            COUNT(CASE WHEN payment_type = 'cod' THEN 1 END) AS cod_orders
        FROM orders
    ");
    $stats = $overallStmt->fetch(PDO::FETCH_ASSOC);

    $totalOrders = (int)$stats['total_orders'];
    $rtoRate = $totalOrders > 0 ? round(($stats['cancelled_orders'] / $totalOrders) * 100, 1) : 0;
    $prepaidShare = $totalOrders > 0 ? round(($stats['prepaid_orders'] / $totalOrders) * 100, 1) : 0;

    // 2. HERO AD SPOTLIGHT: 4 Signature Jhumka Boxes Performance & Stock Health
    $jhumkaStmt = $pdo->query("
        SELECT 
            p.id,
            p.name,
            p.slug,
            p.sku,
            p.price,
            p.mrp,
            p.stock_quantity,
            (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS primary_image,
            COALESCE(SUM(oi.quantity), 0) AS units_sold,
            COALESCE(SUM(oi.total_price), 0) AS revenue_generated,
            CASE WHEN p.stock_quantity <= 25 THEN 1 ELSE 0 END AS is_low_stock
        FROM products p
        LEFT JOIN order_items oi ON oi.product_id = p.id
        WHERE p.category_id = (SELECT id FROM categories WHERE slug = 'jhumka-boxes' LIMIT 1)
           OR p.sku LIKE 'VJ-JHM%'
        GROUP BY p.id, p.name, p.slug, p.sku, p.price, p.mrp, p.stock_quantity
        ORDER BY p.id ASC
    ");
    $heroJhumkaBoxes = $jhumkaStmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. General Low-Stock Inventory Alerts
    $lowStockStmt = $pdo->query("
        SELECT id, name, sku, stock_quantity, price
        FROM products
        WHERE stock_quantity <= 25 AND is_active = 1
        ORDER BY stock_quantity ASC
        LIMIT 10
    ");
    $lowStockAlerts = $lowStockStmt->fetchAll(PDO::FETCH_ASSOC);

    // 4. Recent Orders Feed
    $recentStmt = $pdo->query("
        SELECT 
            o.id,
            o.order_number,
            o.customer_name,
            o.customer_phone,
            o.customer_email,
            o.total_amount,
            o.payment_type AS payment_method,
            o.payment_status,
            o.order_status,
            o.fastrr_risk_tier AS risk_tier,
            o.created_at,
            (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS items_count,
            (
                SELECT COUNT(*) 
                FROM order_items oi 
                JOIN products p ON oi.product_id = p.id 
                WHERE oi.order_id = o.id AND (p.sku LIKE 'VJ-JHM%' OR p.category_id = (SELECT id FROM categories WHERE slug = 'jhumka-boxes' LIMIT 1))
            ) AS has_jhumka_box
        FROM orders o
        ORDER BY o.id DESC
        LIMIT 10
    ");
    $recentOrders = $recentStmt->fetchAll(PDO::FETCH_ASSOC);

    // 5. Total Products Count
    $prodCount = (int)$pdo->query("SELECT COUNT(*) FROM products WHERE is_active = 1")->fetchColumn();
    $custCount = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'customer'")->fetchColumn();

    ApiResponse::success([
        'kpis' => [
            'total_revenue'         => (float)$stats['total_revenue'],
            'total_orders'          => $totalOrders,
            'average_order_value'   => round((float)$stats['average_order_value'], 2),
            'rto_cancellation_rate' => $rtoRate,
            'prepaid_share_percent' => $prepaidShare,
            'total_products'        => $prodCount,
            'total_customers'       => $custCount,
            'payment_split' => [
                'prepaid'     => (int)$stats['prepaid_orders'],
                'partial_cod' => (int)$stats['partial_cod_orders'],
                'cod'         => (int)$stats['cod_orders'],
            ],
        ],
        'hero_jhumka_boxes' => $heroJhumkaBoxes,
        'low_stock_alerts'  => $lowStockAlerts,
        'recent_orders'     => $recentOrders,
    ], 'Dashboard telemetry loaded successfully');

} catch (Throwable $e) {
    ApiResponse::error('Failed to generate dashboard reports: ' . $e->getMessage(), 500);
}
