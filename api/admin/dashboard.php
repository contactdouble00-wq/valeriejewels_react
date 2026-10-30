<?php
/**
 * VALERIE JEWELS — Admin Dashboard & Reporting Endpoint
 * Includes executive KPIs and hero spotlight for the 4 Signature Jhumka Boxes.
 * Strictly counts confirmed orders with successful payment (full prepaid paid,
 * partial COD advance paid, or confirmed COD).
 */

require_once dirname(__DIR__) . '/utils/admin_auth.php';

$adminUser = AdminAuth::authenticate(['admin', 'staff']);
$pdo = Database::getConnection();

try {
    // 1. Strict definition of Processed & Confirmed Orders:
    // - Order must NOT be cancelled, failed, or rto.
    // - Status must be in active fulfillment pipeline (confirmed, processing, in_transit, out_for_delivery, shipped, delivered)
    //   OR payment must be secured (paid or partial_paid advance).
    // - Payment must be valid:
    //   * Prepaid: payment_status = 'paid'
    //   * Partial COD: payment_status IN ('partial_paid', 'paid') (advance deposit secured) OR confirmed in fulfillment
    //   * Full COD: confirmed by operations, payment_status != 'failed'
    $confirmedCondition = "
        (order_status NOT IN ('cancelled', 'failed', 'rto')
        AND (
            (payment_type IN ('full_prepaid', 'prepaid') AND payment_status = 'paid')
            OR (payment_type = 'partial' AND (payment_status IN ('partial_paid', 'paid') OR order_status IN ('confirmed', 'processing', 'in_transit', 'out_for_delivery', 'shipped', 'delivered')))
            OR (payment_type = 'cod' AND payment_status != 'failed' AND order_status IN ('confirmed', 'processing', 'in_transit', 'out_for_delivery', 'shipped', 'delivered'))
            OR (order_status IN ('confirmed', 'processing', 'in_transit', 'out_for_delivery', 'shipped', 'delivered') AND payment_status IN ('paid', 'partial_paid'))
        ))
    ";

    // Overall Revenue & Confirmed Orders
    $overallStmt = $pdo->query("
        SELECT 
            -- Orders Processed & Confirmed Revenue
            COUNT(CASE WHEN $confirmedCondition THEN id ELSE NULL END) AS total_orders,
            COALESCE(SUM(CASE WHEN $confirmedCondition THEN total_amount ELSE 0 END), 0) AS total_revenue,
            COALESCE(AVG(CASE WHEN $confirmedCondition THEN total_amount ELSE NULL END), 0) AS average_order_value,

            -- Payment Breakdown strictly among confirmed orders
            COUNT(CASE WHEN $confirmedCondition AND payment_type IN ('full_prepaid', 'prepaid') THEN 1 ELSE NULL END) AS prepaid_orders,
            COUNT(CASE WHEN $confirmedCondition AND payment_type = 'partial' THEN 1 ELSE NULL END) AS partial_cod_orders,
            COUNT(CASE WHEN $confirmedCondition AND payment_type = 'cod' THEN 1 ELSE NULL END) AS cod_orders,

            -- Fulfillment & Cancellations
            COUNT(CASE WHEN order_status = 'delivered' THEN 1 ELSE NULL END) AS delivered_orders,
            COUNT(CASE WHEN order_status = 'cancelled' OR order_status = 'rto' THEN 1 ELSE NULL END) AS cancelled_orders,

            -- Unpaid / Abandoned checkouts (not included in orders processed)
            COUNT(CASE WHEN order_status = 'pending' OR (payment_type != 'cod' AND payment_status = 'pending') THEN 1 ELSE NULL END) AS abandoned_orders_count,
            COALESCE(SUM(CASE WHEN order_status = 'pending' OR (payment_type != 'cod' AND payment_status = 'pending') THEN total_amount ELSE 0 END), 0) AS abandoned_orders_value
        FROM orders
    ");
    $stats = $overallStmt->fetch(PDO::FETCH_ASSOC);

    $totalOrders = (int)$stats['total_orders'];
    $cancelledOrders = (int)$stats['cancelled_orders'];
    $totalCompletedAndCancelled = $totalOrders + $cancelledOrders;

    $rtoRate = $totalCompletedAndCancelled > 0 ? round(($cancelledOrders / $totalCompletedAndCancelled) * 100, 1) : 0;

    // Upfront Payment / Token Secured Rate:
    // Both 100% Prepaid and Partial COD advance deposits secure funds upfront to minimize RTO loss
    $upfrontPaidOrders = (int)$stats['prepaid_orders'] + (int)$stats['partial_cod_orders'];
    $prepaidShare = $totalOrders > 0 ? round(($upfrontPaidOrders / $totalOrders) * 100, 1) : 0;

    // 2. HERO AD SPOTLIGHT: 4 Signature Jhumka Boxes Performance (strictly from confirmed orders)
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
            COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.quantity ELSE 0 END), 0) AS units_sold,
            COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.total_price ELSE 0 END), 0) AS revenue_generated,
            CASE WHEN p.stock_quantity <= 25 THEN 1 ELSE 0 END AS is_low_stock
        FROM products p
        LEFT JOIN order_items oi ON oi.product_id = p.id
        LEFT JOIN orders o ON oi.order_id = o.id AND (
            o.order_status NOT IN ('cancelled', 'failed', 'rto')
            AND (
                (o.payment_type IN ('full_prepaid', 'prepaid') AND o.payment_status = 'paid')
                OR (o.payment_type = 'partial' AND (o.payment_status IN ('partial_paid', 'paid') OR o.order_status IN ('confirmed', 'processing', 'in_transit', 'out_for_delivery', 'shipped', 'delivered')))
                OR (o.payment_type = 'cod' AND o.payment_status != 'failed' AND o.order_status IN ('confirmed', 'processing', 'in_transit', 'out_for_delivery', 'shipped', 'delivered'))
                OR (o.order_status IN ('confirmed', 'processing', 'in_transit', 'out_for_delivery', 'shipped', 'delivered') AND o.payment_status IN ('paid', 'partial_paid'))
            )
        )
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

    // 4. Recent Orders Feed (Shows verified & confirmed orders)
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
        WHERE o.order_status IN ('confirmed', 'processing', 'in_transit', 'out_for_delivery', 'shipped', 'delivered')
           OR o.payment_status IN ('paid', 'partial_paid')
        ORDER BY o.id DESC
        LIMIT 10
    ");
    $recentOrders = $recentStmt->fetchAll(PDO::FETCH_ASSOC);

    // 5. Total Products Count
    $prodCount = (int)$pdo->query("SELECT COUNT(*) FROM products WHERE is_active = 1")->fetchColumn();
    $custCount = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'customer'")->fetchColumn();

    ApiResponse::success([
        'kpis' => [
            'total_revenue'             => (float)$stats['total_revenue'],
            'total_orders'              => $totalOrders,
            'average_order_value'       => round((float)$stats['average_order_value'], 2),
            'rto_cancellation_rate'     => $rtoRate,
            'prepaid_share_percent'     => $prepaidShare,
            'total_products'            => $prodCount,
            'total_customers'           => $custCount,
            'payment_split' => [
                'prepaid'     => (int)$stats['prepaid_orders'],
                'partial_cod' => (int)$stats['partial_cod_orders'],
                'cod'         => (int)$stats['cod_orders'],
            ],
            'abandoned_checkouts_count' => (int)$stats['abandoned_orders_count'],
            'abandoned_checkouts_value' => (float)$stats['abandoned_orders_value'],
        ],
        'hero_jhumka_boxes' => $heroJhumkaBoxes,
        'low_stock_alerts'  => $lowStockAlerts,
        'recent_orders'     => $recentOrders,
    ], 'Dashboard telemetry loaded successfully');

} catch (Throwable $e) {
    ApiResponse::error('Failed to generate dashboard reports: ' . $e->getMessage(), 500);
}
