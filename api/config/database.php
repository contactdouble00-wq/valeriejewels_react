<?php
/**
 * Valerie Jewels - Database Connection Manager (PDO)
 * Industry-standard singleton wrapper with prepared statement enforcement.
 */

class Database {
    private static ?PDO $instance = null;
    private static array $config = [];
    private static string $driver = 'mysql';
    private static bool $sqliteTablesChecked = false;

    /**
     * Retrieve the active PDO database connection singleton.
     * Tries MySQL first (with Hostinger auto-detection), falls back to SQLite if unreachable.
     * Uses sub-50ms socket check and local caching to eliminate the 5-second blocking timeout when MySQL is offline.
     *
     * @throws PDOException
     * @return PDO
     */
    public static function getConnection(): PDO {
        if (self::$instance === null) {
            self::loadConfig();

            $db = self::$config['db'] ?? [];
            $host = $db['host'] ?? '127.0.0.1';
            $port = (int)($db['port'] ?? 3306);
            $database = $db['database'] ?? 'valerie_jewels';
            $charset = $db['charset'] ?? 'utf8mb4';

            $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $host, $port, $database, $charset);
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::ATTR_TIMEOUT            => 2,
            ];

            // Fast connection probe for local dev environment
            // When MySQL is not running locally, fsockopen with a 0.05s timeout fails in ~60ms
            // instead of letting PDO block for 2-5+ seconds per request!
            $isLocalDev = (PHP_OS_FAMILY === 'Windows') || in_array($_SERVER['HTTP_HOST'] ?? '', ['localhost:8000', '127.0.0.1:8000', 'localhost:5173', '127.0.0.1:5173'], true);
            $shouldTryMysql = true;

            $cacheFile = sys_get_temp_dir() . '/vj_mysql_alive.cache';
            if ($isLocalDev) {
                if (file_exists($cacheFile) && (time() - filemtime($cacheFile) < 30)) {
                    $cached = @file_get_contents($cacheFile);
                    if ($cached === '0') {
                        $shouldTryMysql = false;
                    }
                } else {
                    $errno = 0;
                    $errstr = '';
                    $socket = @fsockopen($host, $port, $errno, $errstr, 0.05);
                    if ($socket) {
                        fclose($socket);
                        @file_put_contents($cacheFile, '1');
                    } else {
                        @file_put_contents($cacheFile, '0');
                        $shouldTryMysql = false;
                    }
                }
            }

            if ($shouldTryMysql) {
                try {
                    self::$instance = new PDO($dsn, $db['username'] ?? 'root', $db['password'] ?? '', $options);
                    self::$driver = 'mysql';
                    if ($isLocalDev) {
                        @file_put_contents($cacheFile, '1');
                    }
                    self::ensureTablesExist(self::$instance);
                    return self::$instance;
                } catch (Throwable $e) {
                    if ($isLocalDev) {
                        @file_put_contents($cacheFile, '0');
                    }
                    // MySQL failed, proceed to SQLite fallback
                }
            }

            // SQLite fallback
            if (in_array('sqlite', PDO::getAvailableDrivers(), true)) {
                $sqliteDir = dirname(__DIR__) . '/database';
                if (!is_dir($sqliteDir)) {
                    @mkdir($sqliteDir, 0755, true);
                }
                $sqliteFile = $sqliteDir . '/valerie_jewels.sqlite';
                self::$instance = new PDO('sqlite:' . $sqliteFile, null, null, [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_TIMEOUT            => 5,
                ]);
                self::$driver = 'sqlite';
                self::ensureSqliteTablesExist(self::$instance);
            } else {
                throw new Exception("Database connection failed: MySQL unreachable and SQLite driver not available.");
            }
        }

        return self::$instance;
    }

    /**
     * Ensure MySQL tables and default admin account exist
     */
    private static function ensureTablesExist(PDO $pdo): void {
        try {
            $check = $pdo->query("SHOW TABLES LIKE 'users'")->fetch();
            if (!$check) {
                $schemaFile = dirname(__DIR__) . '/database/schema.sql';
                if (file_exists($schemaFile)) {
                    $sql = file_get_contents($schemaFile);
                    // Strip CREATE DATABASE / USE queries for shared hosting safety
                    $sql = preg_replace('/CREATE\s+DATABASE\s+[^;]+;/i', '', $sql);
                    $sql = preg_replace('/USE\s+[^;]+;/i', '', $sql);
                    $pdo->exec($sql);
                }
            }

            // Always ensure default admin account exists
            self::seedAdminUser($pdo);

            // Ensure pairs_count column exists in products table
            try {
                $pdo->exec("ALTER TABLE `products` ADD COLUMN `pairs_count` INT UNSIGNED DEFAULT NULL AFTER `stock_quantity`");
            } catch (Throwable $e) {
                // Column already exists or already migrated
            }

            // Ensure site_settings table exists
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS `site_settings` (
                    `key` VARCHAR(100) NOT NULL PRIMARY KEY,
                    `value` LONGTEXT NOT NULL,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ");
            self::seedDefaultSiteSettings($pdo);

            // Auto-populate full catalog if products table is empty
            $prodCount = (int)$pdo->query("SELECT COUNT(*) FROM `products`")->fetchColumn();
            if ($prodCount === 0) {
                $seedFile = dirname(__DIR__) . '/database/seed.php';
                if (file_exists($seedFile)) {
                    ob_start();
                    try {
                        require $seedFile;
                    } catch (Throwable $se) {
                        error_log('Auto-seed catalog failed: ' . $se->getMessage());
                    }
                    ob_end_clean();
                }
            }
        } catch (Throwable $e) {
            error_log('ensureTablesExist error: ' . $e->getMessage());
        }
    }

    /**
     * Ensure SQLite tables and default admin account exist
     */
    private static function ensureSqliteTablesExist(PDO $pdo): void {
        if (self::$sqliteTablesChecked) {
            return;
        }

        try {
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE,
                    phone TEXT,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'customer',
                    is_blocked_rto INTEGER NOT NULL DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    slug TEXT NOT NULL UNIQUE,
                    description TEXT,
                    image_url TEXT,
                    display_order INTEGER NOT NULL DEFAULT 0,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    category_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    slug TEXT NOT NULL UNIQUE,
                    short_description TEXT,
                    description TEXT,
                    mrp REAL NOT NULL,
                    price REAL NOT NULL,
                    cost_price REAL,
                    sku TEXT NOT NULL UNIQUE,
                    stock_quantity INTEGER NOT NULL DEFAULT 0,
                    pairs_count INTEGER DEFAULT NULL,
                    is_anti_tarnish INTEGER NOT NULL DEFAULT 1,
                    material TEXT NOT NULL DEFAULT '18K Gold Plated Stainless Steel',
                    is_bestseller INTEGER NOT NULL DEFAULT 0,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS product_images (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER NOT NULL,
                    image_url TEXT NOT NULL,
                    alt_text TEXT,
                    display_order INTEGER NOT NULL DEFAULT 0,
                    is_primary INTEGER NOT NULL DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS product_variants (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER NOT NULL,
                    sku TEXT NOT NULL UNIQUE,
                    title TEXT NOT NULL,
                    option1_name TEXT DEFAULT 'Size',
                    option1_value TEXT,
                    mrp REAL,
                    price REAL,
                    stock_quantity INTEGER NOT NULL DEFAULT 0,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS bundles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    slug TEXT NOT NULL UNIQUE,
                    description TEXT,
                    bundle_price REAL NOT NULL,
                    compare_price REAL NOT NULL,
                    badge_text TEXT NOT NULL DEFAULT 'Curated Combo Set',
                    is_active INTEGER NOT NULL DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS bundle_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    bundle_id INTEGER NOT NULL,
                    product_id INTEGER NOT NULL,
                    quantity INTEGER NOT NULL DEFAULT 1
                );
                CREATE TABLE IF NOT EXISTS coupons (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    code TEXT NOT NULL UNIQUE,
                    discount_type TEXT NOT NULL DEFAULT 'percentage',
                    discount_value REAL NOT NULL,
                    min_order_amount REAL NOT NULL DEFAULT 0.0,
                    max_discount_amount REAL,
                    usage_limit INTEGER,
                    used_count INTEGER NOT NULL DEFAULT 0,
                    valid_from DATETIME,
                    valid_until DATETIME,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS reviews (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER NOT NULL,
                    user_id INTEGER,
                    reviewer_name TEXT NOT NULL,
                    rating INTEGER NOT NULL,
                    title TEXT,
                    comment TEXT,
                    is_verified_buyer INTEGER NOT NULL DEFAULT 1,
                    status TEXT NOT NULL DEFAULT 'approved',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS rate_limits (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    rate_key TEXT NOT NULL,
                    hits INTEGER DEFAULT 1,
                    expires_at DATETIME NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS token_blacklist (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    token_hash TEXT NOT NULL UNIQUE,
                    user_id INTEGER DEFAULT 0,
                    expires_at INTEGER NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS admin_activity_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    admin_id INTEGER NOT NULL,
                    action TEXT NOT NULL,
                    target_entity TEXT NOT NULL,
                    target_id TEXT,
                    details TEXT,
                    ip_address TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS site_settings (
                    key TEXT NOT NULL PRIMARY KEY,
                    value TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS email_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_id INTEGER NOT NULL,
                    email_type TEXT NOT NULL,
                    recipient_email TEXT NOT NULL,
                    recipient_name TEXT,
                    subject TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'pending',
                    error_message TEXT,
                    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS order_tracking_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_id INTEGER NOT NULL,
                    status TEXT NOT NULL DEFAULT 'confirmed',
                    status_milestone TEXT NOT NULL DEFAULT 'confirmed',
                    title TEXT NOT NULL,
                    description TEXT,
                    location TEXT DEFAULT 'Mumbai Fulfillment Atelier',
                    courier_partner TEXT,
                    awb_code TEXT,
                    occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_number TEXT NOT NULL UNIQUE,
                    user_id INTEGER DEFAULT NULL,
                    customer_name TEXT NOT NULL,
                    customer_email TEXT NOT NULL,
                    customer_phone TEXT NOT NULL,
                    shipping_address_line1 TEXT NOT NULL,
                    shipping_address_line2 TEXT,
                    city TEXT NOT NULL,
                    state TEXT NOT NULL,
                    pincode TEXT NOT NULL,
                    payment_type TEXT NOT NULL DEFAULT 'cod',
                    payment_status TEXT NOT NULL DEFAULT 'pending',
                    order_status TEXT NOT NULL DEFAULT 'pending',
                    subtotal REAL NOT NULL DEFAULT 0.0,
                    discount_amount REAL NOT NULL DEFAULT 0.0,
                    shipping_fee REAL NOT NULL DEFAULT 0.0,
                    total_amount REAL NOT NULL DEFAULT 0.0,
                    amount_paid_upfront REAL NOT NULL DEFAULT 0.0,
                    amount_due_on_delivery REAL NOT NULL DEFAULT 0.0,
                    fastrr_risk_tier TEXT NOT NULL DEFAULT 'low',
                    fastrr_order_id TEXT,
                    shiprocket_order_id TEXT,
                    shiprocket_shipment_id TEXT,
                    shiprocket_awb TEXT,
                    courier_name TEXT DEFAULT 'Bluedart Express',
                    tracking_url TEXT,
                    estimated_delivery_date TEXT,
                    cancelled_at DATETIME,
                    cancellation_reason TEXT,
                    refund_amount REAL DEFAULT 0.0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS order_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_id INTEGER NOT NULL,
                    product_id INTEGER DEFAULT NULL,
                    variant_id INTEGER DEFAULT NULL,
                    product_name TEXT NOT NULL,
                    variant_title TEXT,
                    quantity INTEGER NOT NULL DEFAULT 1,
                    unit_price REAL NOT NULL DEFAULT 0.0,
                    total_price REAL NOT NULL DEFAULT 0.0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            ");

            // Safe column additions for existing SQLite database files
            $migrations = [
                "ALTER TABLE products ADD COLUMN pairs_count INTEGER DEFAULT NULL",
                "ALTER TABLE products ADD COLUMN meta_title TEXT DEFAULT NULL",
                "ALTER TABLE products ADD COLUMN meta_description TEXT DEFAULT NULL",
                "ALTER TABLE products ADD COLUMN video_url TEXT DEFAULT NULL",
                "ALTER TABLE orders ADD COLUMN user_id INTEGER DEFAULT NULL",
                "ALTER TABLE orders ADD COLUMN fastrr_risk_tier TEXT NOT NULL DEFAULT 'low'",
                "ALTER TABLE orders ADD COLUMN fastrr_order_id TEXT DEFAULT NULL",
                "ALTER TABLE orders ADD COLUMN shiprocket_order_id TEXT DEFAULT NULL",
                "ALTER TABLE orders ADD COLUMN shiprocket_shipment_id TEXT DEFAULT NULL",
                "ALTER TABLE orders ADD COLUMN cancelled_at DATETIME DEFAULT NULL",
                "ALTER TABLE order_items ADD COLUMN variant_id INTEGER DEFAULT NULL",
                "ALTER TABLE order_tracking_events ADD COLUMN status TEXT DEFAULT 'confirmed'",
                "ALTER TABLE order_tracking_events ADD COLUMN occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP",
            ];

            foreach ($migrations as $migrationSql) {
                try {
                    $pdo->exec($migrationSql);
                } catch (Throwable $e) {
                    // Column already exists or table structure already migrated
                }
            }

            self::seedAdminUser($pdo);
            self::seedDefaultSiteSettings($pdo);
            self::seedDefaultCatalogSqlite($pdo);
            self::seedDefaultImagesSqlite($pdo);
            self::seedDefaultCouponsSqlite($pdo);
            self::seedDefaultBundlesSqlite($pdo);

            self::$sqliteTablesChecked = true;
        } catch (Throwable $e) {
            error_log('ensureSqliteTablesExist error: ' . $e->getMessage());
        }
    }

    /**
     * Seed or ensure default homepage settings exist
     */
    public static function seedDefaultSiteSettings(PDO $pdo): void {
        try {
            $stmt = $pdo->prepare("SELECT `value` FROM `site_settings` WHERE `key` = ? LIMIT 1");
            $stmt->execute(['homepage_content']);
            if (!$stmt->fetch()) {
                $defaults = [
                    'topRibbon' => [
                        'enabled'         => true,
                        'text'            => 'COMPLIMENTARY EXPRESS DELIVERY ON ALL ORDERS ABOVE',
                        'highlightAmount' => '₹999',
                        'suffix'          => '• 18K GOLD PVD ANTI-TARNISH',
                    ],
                    'heroBanner' => [
                        'badgeText'       => '18K PVD Anti-Tarnish Everyday Luxury',
                        'headline'        => 'Curated everyday jewelry,',
                        'accentText'      => 'designed to shine forever.',
                        'subtitle'        => 'Waterproof, shower-safe, and hypoallergenic accessories crafted in premium 316L stainless steel and 18K gold. Priced honestly from ₹500 to ₹1,500.',
                        'primaryBtnText'  => 'Shop 4 Jhumka Boxes',
                        'primaryBtnLink'  => '#jhumka-boxes',
                        'secondaryBtnText'=> 'All Everyday Jewelry',
                        'secondaryBtnLink'=> '#catalog',
                        'rightImageUrl'   => '/hero-jewelry-model.jpg',
                    ],
                    'jhumkaHero' => [
                        'badgeText'  => '#1 Ad Bestseller Collection • 12,000+ Delivered',
                        'titleLine1' => 'The 4 Signature',
                        'titleLine2' => 'Jhumka Treasure Boxes',
                        'subtitle'   => 'Our most viral handcrafted collections. Each box brings 5 to 6 curated jhumka pairs inside a luxury keepsake box with anti-tarnish micro gold polish and lightweight comfort.',
                        'pill1'      => '5–6 Curated Pairs Per Box',
                        'pill2'      => 'Zero Earache • Featherlight',
                        'pill3'      => 'Save up to 50% vs Single Pairs',
                    ],
                    'catalogHeader' => [
                        'eyebrow' => 'Curated Catalog',
                        'title'   => 'Discover Everyday Fine Jewelry',
                    ],
                    'combosHeader' => [
                        'eyebrow'  => 'Curated Pairings',
                        'title'    => 'Jewelry Combo Sets & Duos',
                        'subtitle' => 'Expertly styled layered pairings with bundle-exclusive discounts up to 45%.',
                    ],
                    'festivalOffer' => [
                        'enabled'             => true,
                        'badgeText'           => '✨ GRAND FESTIVE CELEBRATION • LIMITED EDITION',
                        'headline'            => 'The Royal Festive Edit',
                        'subtitle'            => 'Celebrate auspicious traditions with 18K gold PVD anti-tarnish jewelry. Handcrafted for festivities, weddings, and every luminous moment.',
                        'countdownEnabled'    => true,
                        'countdownEndDate'    => '2026-11-15T23:59:59',
                        'countdownLabel'      => 'FESTIVE CELEBRATION OFFERS END IN:',
                        'couponCode'          => 'FESTIVE20',
                        'couponDiscount'      => 'FLAT 20% OFF',
                        'couponDescription'   => 'Applicable on all handcrafted festive jhumka boxes & fine jewelry above ₹999.',
                        'perk1Title'          => 'Free Velvet Keepsake Box',
                        'perk1Desc'           => 'Luxury royal unboxing packaging included complimentary with all festive orders.',
                        'perk2Title'          => 'Extra ₹50 OFF + Free Gift',
                        'perk2Desc'           => 'Instant discount & complimentary zircon necklace on 1-Click Fastrr Prepaid.',
                        'perk3Title'          => 'Shiprocket Priority Express',
                        'perk3Desc'           => 'Priority dispatch & insured delivery across 29,000+ Indian pincodes.',
                    ],
                    'trustStrip' => [
                        [
                            'id'    => 'pillar1',
                            'title' => '100% Anti-Tarnish',
                            'desc'  => 'High-grade 18K PVD coating guaranteed not to fade or tarnish.',
                        ],
                        [
                            'id'    => 'pillar2',
                            'title' => 'Water & Sweat Proof',
                            'desc'  => 'Wear comfortably in the shower, gym, or pool with zero worry.',
                        ],
                        [
                            'id'    => 'pillar3',
                            'title' => 'Hypoallergenic Skin-Safe',
                            'desc'  => 'Zero nickel, zero lead. Designed for the most sensitive skin.',
                        ],
                        [
                            'id'    => 'pillar4',
                            'title' => 'Shiprocket Express',
                            'desc'  => 'Dispatched via premium couriers across 29,000+ Indian pincodes.',
                        ],
                    ],
                    'telemetryBanner' => [
                        'enabled'  => false,
                        'title'    => 'Phase 4 Authentication & Guest Mode Active',
                        'subtitle' => 'Guest checkout supported • Customer JWT optional • Secure staff role partitioning active.',
                    ],
                ];

                $ins = $pdo->prepare("INSERT INTO `site_settings` (`key`, `value`) VALUES (?, ?)");
                $ins->execute(['homepage_content', json_encode($defaults, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)]);
            }
        } catch (Throwable $e) {
            error_log('seedDefaultSiteSettings error: ' . $e->getMessage());
        }
    }

    /**
     * Seed default catalog categories and products for SQLite fallback
     */
    private static function seedDefaultCatalogSqlite(PDO $pdo): void {
        try {
            $count = (int)$pdo->query("SELECT COUNT(*) FROM products")->fetchColumn();
            if ($count > 0) {
                return;
            }

            $categories = [
                ['Jhumka Boxes', 'jhumka-boxes', 'Our viral 4 signature curated jhumka boxes designed for weddings, festivities, and daily wear.', 1],
                ['Necklaces', 'necklaces', 'Everyday statement pendants, chokers, and layered chains.', 2],
                ['Rings', 'rings', 'Stackable rings, solitaire bands, and statement signets.', 3],
                ['Earrings', 'earrings', 'Waterproof huggies, hoops, drops, and delicate studs.', 4],
                ['Bracelets', 'bracelets', 'Tennis bracelets, twisted bangles, and dainty link chains.', 5],
                ['Combos & Sets', 'combos', 'Curated jewelry bundles with exclusive savings up to 45%.', 6],
            ];

            $catStmt = $pdo->prepare("INSERT OR IGNORE INTO categories (name, slug, description, display_order, is_active) VALUES (?, ?, ?, ?, 1)");
            foreach ($categories as $cat) {
                $catStmt->execute($cat);
            }

            $jhumkaCatId = (int)$pdo->query("SELECT id FROM categories WHERE slug = 'jhumka-boxes'")->fetchColumn() ?: 1;
            $necklaceCatId = (int)$pdo->query("SELECT id FROM categories WHERE slug = 'necklaces'")->fetchColumn() ?: 2;

            $products = [
                [$jhumkaCatId, 'The Royal Noor Jhumka Box (6 Pair Festive Edition)', 'royal-noor-jhumka-box', 'Handcrafted royal temple jhumkas featuring micro-pearl drops, kundan craftsmanship, and antique 18K matte gold finish.', 3499, 1799, 'VJ-BX-001', 50, 1],
                [$jhumkaCatId, 'The Gulabi Mehal Pastel Jhumka Box (6 Pair Artisanal Edition)', 'gulabi-mehal-pastel-jhumka-box', 'Subtle pastel meenakari craftsmanship with mint green, baby pink, and lavender accents.', 3499, 1899, 'VJ-BX-002', 45, 1],
                [$jhumkaCatId, 'The Shahi Kundan Chandbali & Jhumka Box (5 Pair Heritage Set)', 'shahi-kundan-chandbali-box', 'Heritage bridal box pairing majestic crescent chandbalis with tiered jhumkas.', 3999, 2199, 'VJ-BX-003', 35, 1],
                [$jhumkaCatId, 'The Roohani Daily Wear Jhumka Box (6 Pair Lightweight Set)', 'roohani-daily-wear-jhumka-box', 'Featherlight anti-tarnish everyday floral and filigree drops for work and college.', 2999, 1499, 'VJ-BX-004', 60, 1],
                [$necklaceCatId, 'Aurelia 18K Solitaire Pendant Necklace', 'aurelia-solitaire-necklace', 'Minimalist brilliant-cut cubic zirconia solitaire on waterproof 18K gold cable chain.', 1999, 999, 'VJ-NK-001', 100, 1],
            ];

            $prodStmt = $pdo->prepare("
                INSERT OR IGNORE INTO products (category_id, name, slug, short_description, mrp, price, sku, stock_quantity, is_active, is_bestseller)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            ");
            foreach ($products as $p) {
                $prodStmt->execute($p);
            }
        } catch (Throwable $e) {
            error_log('seedDefaultCatalogSqlite error: ' . $e->getMessage());
        }
    }

    /**
     * Seed primary and gallery images for SQLite products
     */
    private static function seedDefaultImagesSqlite(PDO $pdo): void {
        try {
            $imgCount = (int)$pdo->query("SELECT COUNT(*) FROM product_images")->fetchColumn();
            if ($imgCount > 0) {
                return;
            }

            $imgMap = [
                'VJ-BX-001' => [
                    'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80',
                    'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=800&q=80',
                ],
                'VJ-BX-002' => [
                    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80',
                    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80',
                ],
                'VJ-BX-003' => [
                    'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=800&q=80',
                    'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80',
                ],
                'VJ-BX-004' => [
                    'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=800&q=80',
                    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80',
                ],
                'VJ-NK-001' => [
                    'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
                    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80',
                ],
            ];

            $prods = $pdo->query("SELECT id, name, sku FROM products")->fetchAll(PDO::FETCH_ASSOC);
            $stmt = $pdo->prepare("INSERT INTO product_images (product_id, image_url, alt_text, display_order, is_primary) VALUES (?, ?, ?, ?, ?)");

            foreach ($prods as $p) {
                $sku = $p['sku'];
                $images = $imgMap[$sku] ?? [
                    'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80',
                ];
                foreach ($images as $idx => $url) {
                    $stmt->execute([
                        $p['id'],
                        $url,
                        $p['name'],
                        $idx,
                        ($idx === 0) ? 1 : 0,
                    ]);
                }
            }
        } catch (Throwable $e) {
            error_log('seedDefaultImagesSqlite error: ' . $e->getMessage());
        }
    }

    /**
     * Seed initial promotional coupons for SQLite
     */
    private static function seedDefaultCouponsSqlite(PDO $pdo): void {
        try {
            $count = (int)$pdo->query("SELECT COUNT(*) FROM coupons")->fetchColumn();
            if ($count > 0) {
                return;
            }

            $coupons = [
                ['WELCOME10', 'percentage', 10, 999, 500, 1000],
                ['FIRSTORDER', 'fixed', 200, 1299, null, 500],
                ['VALERIEVIP', 'percentage', 15, 1999, 1000, 200],
            ];
            $stmt = $pdo->prepare("INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)");
            foreach ($coupons as $c) {
                $stmt->execute($c);
            }
        } catch (Throwable $e) {
            error_log('seedDefaultCouponsSqlite error: ' . $e->getMessage());
        }
    }

    /**
     * Seed initial combo bundles for SQLite
     */
    private static function seedDefaultBundlesSqlite(PDO $pdo): void {
        try {
            $count = (int)$pdo->query("SELECT COUNT(*) FROM bundles")->fetchColumn();
            if ($count > 0) {
                return;
            }

            $bundles = [
                ['The Royal Heritage Duo', 'royal-heritage-duo', 'Curated combo pairing The Royal Noor Jhumka Box with the Aurelia Solitaire Pendant.', 2499, 4498, 'Best Value Combo'],
                ['Pastel Festive Gift Box', 'pastel-festive-gift-box', 'The Gulabi Mehal Box paired with lightweight festive ear jewelry.', 2199, 3998, 'Trending Duo'],
            ];
            $stmt = $pdo->prepare("INSERT INTO bundles (title, slug, description, bundle_price, compare_price, badge_text, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)");
            foreach ($bundles as $b) {
                $stmt->execute($b);
            }
        } catch (Throwable $e) {
            error_log('seedDefaultBundlesSqlite error: ' . $e->getMessage());
        }
    }

    /**
     * Seed or update the primary Valerie Jewels Admin account
     */
    private static function seedAdminUser(PDO $pdo): void {
        try {
            $hash = password_hash('Admin@Valerie2026!', PASSWORD_BCRYPT);
            $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
            $stmt->execute(['admin@valeriejewels.com']);
            $existing = $stmt->fetch();

            if (!$existing) {
                $ins = $pdo->prepare("
                    INSERT INTO users (name, email, phone, password_hash, role, is_blocked_rto)
                    VALUES (?, ?, ?, ?, 'admin', 0)
                ");
                $ins->execute(['Valerie Jewels Admin', 'admin@valeriejewels.com', '+91 98765 43210', $hash]);
            } else {
                $upd = $pdo->prepare("UPDATE users SET password_hash = ?, role = 'admin' WHERE id = ?");
                $upd->execute([$hash, $existing['id']]);
            }
        } catch (Throwable $e) {
            error_log('seedAdminUser error: ' . $e->getMessage());
        }
    }

    /**
     * Check if the database is reachable without throwing unhandled exceptions.
     *
     * @return array ['connected' => bool, 'driver' => string, 'message' => string, 'version' => ?string]
     */
    public static function checkConnection(): array {
        try {
            $pdo = self::getConnection();
            $version = self::$driver === 'sqlite' ? $pdo->query('SELECT sqlite_version()')->fetchColumn() : $pdo->query('SELECT VERSION()')->fetchColumn();
            return [
                'connected' => true,
                'driver'    => self::$driver,
                'message'   => strtoupper(self::$driver) . ' connection active',
                'version'   => $version ?: 'Unknown',
                'stats'     => self::getStats(),
            ];
        } catch (Throwable $e) {
            return [
                'connected' => false,
                'driver'    => self::$driver,
                'message'   => $e->getMessage(),
                'version'   => null,
                'stats'     => null,
            ];
        }
    }

    /**
     * Retrieve summary counts of core catalog tables.
     */
    public static function getStats(): array {
        try {
            $pdo = self::getConnection();
            $products = (int)$pdo->query('SELECT COUNT(*) FROM `products`')->fetchColumn();
            $categories = (int)$pdo->query('SELECT COUNT(*) FROM `categories`')->fetchColumn();
            $users = (int)$pdo->query('SELECT COUNT(*) FROM `users`')->fetchColumn();

            return [
                'products_count'   => $products,
                'categories_count' => $categories,
                'users_count'      => $users,
                'seeded'           => ($products > 0),
            ];
        } catch (Throwable $e) {
            return [
                'error'  => $e->getMessage(),
                'seeded' => false,
            ];
        }
    }

    /**
     * Load configuration safely from config.php or fallback to config.sample.php
     */
    private static function loadConfig(): void {
        if (!empty(self::$config)) {
            return;
        }

        $configFile = __DIR__ . '/config.php';
        if (file_exists($configFile)) {
            self::$config = require $configFile;
        } else {
            self::$config = require __DIR__ . '/config.sample.php';
        }
    }
}
