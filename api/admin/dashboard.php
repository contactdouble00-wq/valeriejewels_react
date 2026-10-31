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

// Handle saving custom showcase products
if ($_SERVER['REQUEST_METHOD'] === 'POST' || ($_GET['action'] ?? '') === 'save_showcase_boxes') {
    try {
        $rawInput = file_get_contents('php://input');
        $payload = json_decode($rawInput, true);

        $productIds = [];
        if (isset($payload['product_ids']) && is_array($payload['product_ids'])) {
            $productIds = $payload['product_ids'];
        } elseif (isset($payload['featured_product_ids']) && is_array($payload['featured_product_ids'])) {
            $productIds = $payload['featured_product_ids'];
        } elseif (is_array($payload)) {
            $productIds = $payload;
        }

        $cleanIds = array_values(array_filter(array_map('intval', $productIds), fn($id) => $id > 0));

        // Fetch current homepage_content
        $settingStmt = $pdo->query("SELECT `value` FROM site_settings WHERE `key` = 'homepage_content' LIMIT 1");
        $currentData = [];
        if ($settingStmt) {
            $val = $settingStmt->fetchColumn();
            if ($val) {
                $currentData = json_decode($val, true) ?: [];
            }
        }

        if (!isset($currentData['jhumkaHero']) || !is_array($currentData['jhumkaHero'])) {
            $currentData['jhumkaHero'] = [];
        }
        $currentData['jhumkaHero']['featuredProductIds'] = $cleanIds;

        $jsonValue = json_encode($currentData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);

        if ($driver === 'sqlite') {
            $stmt = $pdo->prepare("
                INSERT INTO site_settings (key, value, updated_at)
                VALUES ('homepage_content', ?, datetime('now'))
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
            ");
            $stmt->execute([$jsonValue]);
        } else {
            $stmt = $pdo->prepare("
                INSERT INTO `site_settings` (`key`, `value`)
                VALUES ('homepage_content', ?)
                ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), `updated_at` = NOW()
            ");
            $stmt->execute([$jsonValue]);
        }

        AdminAuth::logActivity(
            $adminUser['id'],
            'save_showcase_boxes',
            'site_settings',
            'homepage_content',
            json_encode(['featured_product_ids' => $cleanIds, 'user' => $adminUser['email']])
        );

        ApiResponse::success([
            'featured_product_ids' => $cleanIds
        ], 'Showcase boxes saved successfully');
        exit;
    } catch (Throwable $e) {
        ApiResponse::error('Failed to save showcase boxes: ' . $e->getMessage(), 500);
        exit;
    }
}

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
    // Read featured showcase box IDs from site_settings if configured
    $showcaseIds = [];
    $settingStmt = $pdo->query("SELECT `value` FROM site_settings WHERE `key` = 'homepage_content' LIMIT 1");
    if ($settingStmt) {
        $rawSetting = $settingStmt->fetchColumn();
        if ($rawSetting) {
            $parsedSetting = json_decode($rawSetting, true);
            if (!empty($parsedSetting['jhumkaHero']['featuredProductIds']) && is_array($parsedSetting['jhumkaHero']['featuredProductIds'])) {
                $showcaseIds = array_values(array_filter(array_map('intval', $parsedSetting['jhumkaHero']['featuredProductIds']), fn($id) => $id > 0));
            }
        }
    }

    $heroJhumkaBoxes = [];
    if (!empty($showcaseIds)) {
        // Query explicit products chosen for the showcase, preserving the exact slot ordering
        $placeholders = implode(',', array_fill(0, count($showcaseIds), '?'));
        
        // Build CASE statement for exact slot ordering: CASE p.id WHEN ? THEN 1 WHEN ? THEN 2 ... END
        $caseClauses = [];
        $orderParams = [];
        foreach ($showcaseIds as $idx => $id) {
            $caseClauses[] = "WHEN ? THEN " . ($idx + 1);
            $orderParams[] = $id;
        }
        $caseOrderSql = "CASE p.id " . implode(' ', $caseClauses) . " ELSE 9999 END ASC";

        $jhumkaSql = "
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
            WHERE p.id IN ($placeholders)
            GROUP BY p.id, p.name, p.slug, p.sku, p.price, p.mrp, p.stock_quantity
            ORDER BY $caseOrderSql
        ";
        $jhumkaStmt = $pdo->prepare($jhumkaSql);
        $queryParams = array_merge($showcaseIds, $orderParams);
        $jhumkaStmt->execute($queryParams);
        $heroJhumkaBoxes = $jhumkaStmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Fallback if no explicit showcase IDs configured or none found
    if (empty($heroJhumkaBoxes)) {
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
            WHERE (p.category_id = (SELECT id FROM categories WHERE slug = 'jhumka-boxes' LIMIT 1)
               OR p.sku LIKE 'VJ-JHM%'
               OR p.name LIKE '%Jhumka%')
              AND p.slug NOT LIKE '%mystery%'
              AND p.name NOT LIKE '%Mystery%'
            GROUP BY p.id, p.name, p.slug, p.sku, p.price, p.mrp, p.stock_quantity
            ORDER BY p.id ASC
            LIMIT 4
        ");
        $heroJhumkaBoxes = $jhumkaStmt->fetchAll(PDO::FETCH_ASSOC);
    }

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
        'featured_box_ids'  => $showcaseIds,
        'hero_jhumka_boxes' => $heroJhumkaBoxes,
        'low_stock_alerts'  => $lowStockAlerts,
        'recent_orders'     => $recentOrders,
    ], 'Dashboard telemetry loaded successfully');

} catch (Throwable $e) {
    ApiResponse::error('Failed to generate dashboard reports: ' . $e->getMessage(), 500);
}
