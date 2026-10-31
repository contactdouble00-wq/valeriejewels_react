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

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Handle updating the 4 Showcase Boxes from the dashboard modal
if ($action === 'save_showcase_boxes') {
    $rawInput = trim(file_get_contents('php://input'));
    $data = json_decode($rawInput, true);
    if (!is_array($data) && !empty($_POST)) {
        $data = $_POST;
    }
    $productIds = $data['product_ids'] ?? [];
    if (!is_array($productIds)) {
        ApiResponse::error('Invalid product IDs payload', 400);
    }

    $cleanIds = array_values(array_filter(array_map('intval', $productIds), function($id) {
        return $id > 0;
    }));

    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
    if ($driver === 'sqlite') {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS site_settings (
                key TEXT NOT NULL PRIMARY KEY,
                value TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        ");
    } else {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `site_settings` (
                `key` VARCHAR(100) NOT NULL PRIMARY KEY,
                `value` LONGTEXT NOT NULL,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    $stmt = $pdo->prepare("SELECT `value` FROM `site_settings` WHERE `key` = 'homepage_content' LIMIT 1");
    $stmt->execute();
    $raw = $stmt->fetchColumn();
    $content = $raw ? json_decode($raw, true) : [];
    if (!is_array($content)) {
        $content = [];
    }
    if (!isset($content['jhumkaHero']) || !is_array($content['jhumkaHero'])) {
        $content['jhumkaHero'] = [];
    }
    $content['jhumkaHero']['featuredProductIds'] = $cleanIds;

    $jsonValue = json_encode($content, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

    if ($driver === 'sqlite') {
        $saveStmt = $pdo->prepare("
            INSERT INTO site_settings (key, value, updated_at)
            VALUES ('homepage_content', ?, datetime('now'))
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
        ");
        $saveStmt->execute([$jsonValue]);
    } else {
        $saveStmt = $pdo->prepare("
            INSERT INTO `site_settings` (`key`, `value`)
            VALUES ('homepage_content', ?)
            ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), `updated_at` = CURRENT_TIMESTAMP
        ");
        $saveStmt->execute([$jsonValue]);
    }

    ApiResponse::success([
        'featured_box_ids' => $cleanIds,
        'count' => count($cleanIds),
    ], 'Showcase boxes updated successfully');
    exit;
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

    // 2. HERO AD SPOTLIGHT: 4 Signature Showcase Boxes Performance
    // Check if explicit showcase box IDs are saved in site_settings
    $featuredBoxIds = [];
    try {
        $settingsStmt = $pdo->prepare("SELECT `value` FROM `site_settings` WHERE `key` = 'homepage_content' LIMIT 1");
        $settingsStmt->execute();
        $rawSettings = $settingsStmt->fetchColumn();
        if ($rawSettings) {
            $contentData = json_decode($rawSettings, true);
            if (isset($contentData['jhumkaHero']['featuredProductIds']) && is_array($contentData['jhumkaHero']['featuredProductIds'])) {
                $featuredBoxIds = array_values(array_filter(array_map('intval', $contentData['jhumkaHero']['featuredProductIds']), function($id) {
                    return $id > 0;
                }));
            }
        }
    } catch (Throwable $se) {
        $featuredBoxIds = [];
    }

    $heroJhumkaBoxes = [];
    if (!empty($featuredBoxIds)) {
        $idListStr = implode(',', $featuredBoxIds);
        $jhumkaStmt = $pdo->query("
            SELECT 
                p.id,
                p.name,
                p.slug,
                p.sku,
                p.price,
                p.mrp,
                p.stock_quantity,
                COALESCE(
                    (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1),
                    (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY display_order ASC, id ASC LIMIT 1)
                ) AS primary_image,
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
            WHERE p.id IN ($idListStr)
            GROUP BY p.id, p.name, p.slug, p.sku, p.price, p.mrp, p.stock_quantity
        ");
        $fetchedBoxes = $jhumkaStmt->fetchAll(PDO::FETCH_ASSOC);
        $boxMap = [];
        foreach ($fetchedBoxes as $fb) {
            $boxMap[(int)$fb['id']] = $fb;
        }
        foreach ($featuredBoxIds as $bid) {
            if (isset($boxMap[$bid])) {
                $heroJhumkaBoxes[] = $boxMap[$bid];
            }
        }
    }

    // Fallback if not configured yet
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
                COALESCE(
                    (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1),
                    (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY display_order ASC, id ASC LIMIT 1)
                ) AS primary_image,
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
            WHERE (p.category_id IN (SELECT id FROM categories WHERE slug IN ('jhumka-boxes', 'jhumkha-box', 'jhumka-box'))
               OR p.sku LIKE 'VJ-JHM%'
               OR p.sku IN ('16 PSC OXODISE', 'jhumkhaa')
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
                WHERE oi.order_id = o.id AND (
                    p.sku LIKE 'VJ-JHM%' 
                    OR p.sku IN ('16 PSC OXODISE', 'jhumkhaa') 
                    OR p.category_id IN (SELECT id FROM categories WHERE slug IN ('jhumka-boxes', 'jhumkha-box', 'jhumka-box'))
                )
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
        'featured_box_ids'  => !empty($featuredBoxIds) ? $featuredBoxIds : array_map(function($b) { return (int)$b['id']; }, $heroJhumkaBoxes),
        'hero_jhumka_boxes' => $heroJhumkaBoxes,
        'low_stock_alerts'  => $lowStockAlerts,
        'recent_orders'     => $recentOrders,
    ], 'Dashboard telemetry loaded successfully');

} catch (Throwable $e) {
    ApiResponse::error('Failed to generate dashboard reports: ' . $e->getMessage(), 500);
}
