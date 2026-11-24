<?php
/**
 * VALERIE JEWELS — Admin Dashboard & Reporting Endpoint
 * Includes executive KPIs and hero spotlight for the 4 Signature Jhumka Boxes.
 * Uses shared payment/fulfillment eligibility and inclusive order-date filtering.
 * Revenue is eligible order value less refunds, not cash collected.
 */

require_once dirname(__DIR__) . '/utils/admin_auth.php';
require_once dirname(__DIR__) . '/utils/dashboard_metrics.php';

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
    $range = dashboardDateRange($_GET);
    $rtoWarning = null;
    // Use the same confirmed-RTO feed as the panel, across the store's full history.
    try {
        require_once dirname(__DIR__) . '/shipping/DeliveryProviderFactory.php';
        require_once dirname(__DIR__) . '/utils/carrier_reconciliation.php';
        $firstOrder = $pdo->query('SELECT MIN(created_at) FROM orders')->fetchColumn();
        if ($firstOrder) {
            $rtoFeed = DeliveryProviderFactory::getProvider('justshyp')->listNdr([
                'ndr_type' => 'rto', 'from_date' => substr($firstOrder, 0, 10), 'to_date' => date('Y-m-d'),
            ]);
            if (empty($rtoFeed['success'])) throw new RuntimeException('RTO feed unavailable');
            reconcileJustShypRtoList($pdo, $rtoFeed['ndr_shipments']);
        }
    } catch (Throwable $e) {
        $rtoWarning = 'JustShyp RTO refresh unavailable. Showing saved records; the count may be incomplete.';
    }
    $kpis = dashboardMetrics($pdo, $range);
    $kpis['rto_sync_warning'] = $rtoWarning;
    $processed = dashboardConditions()['processed'];
    $dateCondition = $range['sql'];

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
        $jhumkaStmt = $pdo->prepare("
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
            LEFT JOIN orders o ON oi.order_id = o.id AND $processed AND ($dateCondition)
            WHERE p.id IN ($idListStr)
            GROUP BY p.id, p.name, p.slug, p.sku, p.price, p.mrp, p.stock_quantity
        ");
        $jhumkaStmt->execute($range['params']);
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
        $jhumkaStmt = $pdo->prepare("
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
            LEFT JOIN orders o ON oi.order_id = o.id AND $processed AND ($dateCondition)
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
        $jhumkaStmt->execute($range['params']);
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
    $recentStmt = $pdo->prepare("
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
        WHERE $processed AND ($dateCondition)
        ORDER BY o.id DESC
        LIMIT 10
    ");
    $recentStmt->execute($range['params']);
    $recentOrders = $recentStmt->fetchAll(PDO::FETCH_ASSOC);

    // 5. Total Products Count
    $prodCount = (int)$pdo->query("SELECT COUNT(*) FROM products WHERE is_active = 1")->fetchColumn();
    $custCount = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'customer'")->fetchColumn();

    ApiResponse::success([
        'kpis' => array_merge($kpis, ['total_products' => $prodCount, 'total_customers' => $custCount]),
        'date_range' => ['start_date' => $range['start_date'], 'end_date' => $range['end_date']],
        'featured_box_ids'  => !empty($featuredBoxIds) ? $featuredBoxIds : array_map(function($b) { return (int)$b['id']; }, $heroJhumkaBoxes),
        'hero_jhumka_boxes' => $heroJhumkaBoxes,
        'low_stock_alerts'  => $lowStockAlerts,
        'recent_orders'     => $recentOrders,
    ], 'Dashboard telemetry loaded successfully');

} catch (InvalidArgumentException $e) {
    ApiResponse::error($e->getMessage(), 422);
} catch (Throwable $e) {
    ApiResponse::error('Failed to generate dashboard reports: ' . $e->getMessage(), 500);
}
