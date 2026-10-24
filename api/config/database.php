<?php
/**
 * Valerie Jewels - Database Connection Manager (PDO)
 * Industry-standard singleton wrapper with prepared statement enforcement.
 */

class Database {
    private static ?PDO $instance = null;
    private static array $config = [];
    private static string $driver = 'mysql';
    private static ?string $activeSqliteFile = null;
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
                    try {
                        self::$instance->exec("SET time_zone = '+05:30'");
                    } catch (Throwable $tzErr) {}
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
                    @mkdir($sqliteDir, 0777, true);
                }
                @chmod($sqliteDir, 0777);

                $liveSqlite = $sqliteDir . '/vj_live_store.sqlite';
                $legacySqlite = $sqliteDir . '/valerie_jewels.sqlite';

                if (file_exists($liveSqlite) && filesize($liveSqlite) > 0) {
                    $sqliteFile = $liveSqlite;
                } elseif (file_exists($legacySqlite) && filesize($legacySqlite) > 0) {
                    @copy($legacySqlite, $liveSqlite);
                    $sqliteFile = (file_exists($liveSqlite) && filesize($liveSqlite) > 0) ? $liveSqlite : $legacySqlite;
                } else {
                    $sqliteFile = $liveSqlite;
                }

                if (file_exists($sqliteFile)) {
                    @chmod($sqliteFile, 0666);
                }
                self::$activeSqliteFile = $sqliteFile;
                self::$instance = new PDO('sqlite:' . $sqliteFile, null, null, [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_TIMEOUT            => 10,
                ]);
                try {
                    self::$instance->exec('PRAGMA journal_mode = WAL;');
                    self::$instance->exec('PRAGMA synchronous = NORMAL;');
                } catch (Throwable $e) {}
                self::$driver = 'sqlite';
                self::ensureSqliteTablesExist(self::$instance);
            } else {
                throw new Exception("Database connection failed: MySQL unreachable and SQLite driver not available.");
            }
        }

        return self::$instance;
    }

    /**
     * Get active database driver name ('mysql' | 'sqlite')
     */
    public static function getDriver(): string {
        if (self::$instance === null) {
            self::getConnection();
        }
        return self::$driver;
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

            // Ensure pairs_count and SEO/video columns exist in products table
            $productCols = [
                "ALTER TABLE `products` ADD COLUMN `pairs_count` INT UNSIGNED DEFAULT NULL AFTER `stock_quantity`",
                "ALTER TABLE `products` ADD COLUMN `meta_title` VARCHAR(255) DEFAULT NULL AFTER `is_active`",
                "ALTER TABLE `products` ADD COLUMN `meta_description` TEXT DEFAULT NULL AFTER `meta_title`",
                "ALTER TABLE `products` ADD COLUMN `video_url` VARCHAR(255) DEFAULT NULL AFTER `meta_description`",
                "ALTER TABLE `products` ADD COLUMN `rating_avg` DECIMAL(3,2) DEFAULT NULL AFTER `video_url`",
                "ALTER TABLE `products` ADD COLUMN `review_count` INT UNSIGNED DEFAULT NULL AFTER `rating_avg`",
            ];
            foreach ($productCols as $sql) {
                try { $pdo->exec($sql); } catch (Throwable $e) {}
            }

            // Ensure reviews table has image columns
            $reviewCols = [
                "ALTER TABLE `reviews` ADD COLUMN `image_url` VARCHAR(500) DEFAULT NULL AFTER `comment`",
                "ALTER TABLE `reviews` ADD COLUMN `images` TEXT DEFAULT NULL AFTER `image_url`",
            ];
            foreach ($reviewCols as $sql) {
                try { $pdo->exec($sql); } catch (Throwable $e) {}
            }

            // Ensure categories has rating_avg column
            try {
                $pdo->exec("ALTER TABLE `categories` ADD COLUMN `rating_avg` DECIMAL(3,2) DEFAULT NULL AFTER `display_order`");
            } catch (Throwable $e) {}

            // Ensure order_tracking_events columns exist in MySQL
            $trackingCols = [
                "ALTER TABLE `order_tracking_events` ADD COLUMN `status_milestone` VARCHAR(50) DEFAULT 'confirmed' AFTER `status`",
                "ALTER TABLE `order_tracking_events` ADD COLUMN `courier_partner` VARCHAR(80) DEFAULT NULL AFTER `location`",
                "ALTER TABLE `order_tracking_events` ADD COLUMN `awb_code` VARCHAR(100) DEFAULT NULL AFTER `courier_partner`",
            ];
            foreach ($trackingCols as $sql) {
                try { $pdo->exec($sql); } catch (Throwable $e) {}
            }

            // Ensure email_logs columns and indexes support all recovery email types
            $emailLogCols = [
                "ALTER TABLE `email_logs` MODIFY COLUMN `email_type` VARCHAR(100) NOT NULL",
                "ALTER TABLE `email_logs` DROP INDEX `uq_order_email`",
            ];
            foreach ($emailLogCols as $sql) {
                try { $pdo->exec($sql); } catch (Throwable $e) {}
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
            self::seedDefaultFinanceData($pdo);

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
                    material TEXT NOT NULL DEFAULT 'Lightweight Stainless Steel',
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
                    image_url TEXT,
                    images TEXT,
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
                "ALTER TABLE products ADD COLUMN rating_avg REAL DEFAULT NULL",
                "ALTER TABLE products ADD COLUMN review_count INTEGER DEFAULT NULL",
                "ALTER TABLE categories ADD COLUMN rating_avg REAL DEFAULT NULL",
                "ALTER TABLE reviews ADD COLUMN image_url TEXT DEFAULT NULL",
                "ALTER TABLE reviews ADD COLUMN images TEXT DEFAULT NULL",
                "ALTER TABLE orders ADD COLUMN user_id INTEGER DEFAULT NULL",
                "ALTER TABLE orders ADD COLUMN fastrr_risk_tier TEXT NOT NULL DEFAULT 'low'",
                "ALTER TABLE orders ADD COLUMN fastrr_order_id TEXT DEFAULT NULL",
                "ALTER TABLE orders ADD COLUMN shiprocket_order_id TEXT DEFAULT NULL",
                "ALTER TABLE orders ADD COLUMN shiprocket_shipment_id TEXT DEFAULT NULL",
                "ALTER TABLE orders ADD COLUMN cancelled_at DATETIME DEFAULT NULL",
                "ALTER TABLE order_items ADD COLUMN variant_id INTEGER DEFAULT NULL",
                "ALTER TABLE order_tracking_events ADD COLUMN status TEXT DEFAULT 'confirmed'",
                "ALTER TABLE order_tracking_events ADD COLUMN status_milestone TEXT DEFAULT 'confirmed'",
                "ALTER TABLE order_tracking_events ADD COLUMN courier_partner TEXT DEFAULT NULL",
                "ALTER TABLE order_tracking_events ADD COLUMN awb_code TEXT DEFAULT NULL",
                "ALTER TABLE order_tracking_events ADD COLUMN occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP",
            ];

            foreach ($migrations as $migrationSql) {
                try {
                    $pdo->exec($migrationSql);
                } catch (Throwable $e) {
                    // Column already exists or table structure already migrated
                }
            }

            // Auto-migrate any legacy /uploads/ paths to /api/uploads/ in SQLite database
            try {
                $migratedUploads = $pdo->query("SELECT value FROM site_settings WHERE key = 'uploads_path_migrated_v2'")->fetchColumn();
                if ($migratedUploads !== '1') {
                    $pdo->exec("UPDATE product_images SET image_url = REPLACE(image_url, '/uploads/', '/api/uploads/') WHERE image_url LIKE '%/uploads/%' AND image_url NOT LIKE '%/api/uploads/%'");
                    $pdo->exec("UPDATE products SET video_url = REPLACE(video_url, '/uploads/', '/api/uploads/') WHERE video_url LIKE '%/uploads/%' AND video_url NOT LIKE '%/api/uploads/%'");
                    $pdo->exec("UPDATE site_settings SET value = REPLACE(value, '/uploads/', '/api/uploads/') WHERE value LIKE '%/uploads/%' AND value NOT LIKE '%/api/uploads/%'");

                    // Fix primary image for products where video was wrongly assigned as is_primary = 1
                    $allProductIds = $pdo->query("SELECT id FROM products")->fetchAll(PDO::FETCH_COLUMN);
                    foreach ($allProductIds as $pId) {
                        $prim = $pdo->query("SELECT id, image_url FROM product_images WHERE product_id = {$pId} AND is_primary = 1 LIMIT 1")->fetch();
                        if ($prim && preg_match('/\.(mp4|webm|mov|ogg)(\?.*)?$/i', $prim['image_url'])) {
                            // Demote video
                            $pdo->exec("UPDATE product_images SET is_primary = 0 WHERE id = {$prim['id']}");
                            // Promote first non-video photo
                            $firstPhoto = $pdo->query("SELECT id FROM product_images WHERE product_id = {$pId} AND image_url NOT LIKE '%.mp4%' AND image_url NOT LIKE '%.webm%' AND image_url NOT LIKE '%.mov%' ORDER BY display_order ASC, id ASC LIMIT 1")->fetch();
                            if ($firstPhoto) {
                                $pdo->exec("UPDATE product_images SET is_primary = 1 WHERE id = {$firstPhoto['id']}");
                            }
                        }
                    }
                    $pdo->exec("INSERT OR REPLACE INTO site_settings (key, value) VALUES ('uploads_path_migrated_v2', '1')");
                }
            } catch (Throwable $me) {
                error_log('Uploads migration notice: ' . $me->getMessage());
            }

            // Ensure demo showcase videos are populated for sample products with local verified reels
            try {
                $pdo->exec("UPDATE products SET video_url = '/api/uploads/sample_jewelry_reel_1.mp4' WHERE id = 1 OR slug LIKE '%royal-noor%' OR sku = 'VJ-BX-001' OR video_url LIKE '%mixkit%'");
                $pdo->exec("UPDATE products SET video_url = '/api/uploads/sample_jewelry_reel_2.mp4' WHERE id = 2 OR slug LIKE '%gulabi-mehal%' OR sku = 'VJ-BX-002'");
                $pdo->exec("UPDATE products SET video_url = '/api/uploads/sample_jewelry_reel_1.mp4' WHERE id = 3 OR slug LIKE '%shahi-kundan%' OR sku = 'VJ-BX-003'");
                $pdo->exec("UPDATE products SET video_url = '/api/uploads/sample_jewelry_reel_2.mp4' WHERE id = 4 OR slug LIKE '%roohani%' OR sku = 'VJ-BX-004'");
                $pdo->exec("UPDATE products SET video_url = '/api/uploads/sample_jewelry_reel_1.mp4' WHERE id = 5 OR slug LIKE '%aurelia%' OR sku = 'VJ-NK-001'");
            } catch (Throwable $e) {}

            self::seedAdminUser($pdo);
            self::seedDefaultSiteSettings($pdo);
            self::seedDefaultCatalogSqlite($pdo);
            self::seedDefaultImagesSqlite($pdo);
            self::seedDefaultCouponsSqlite($pdo);
            self::seedDefaultBundlesSqlite($pdo);
            self::seedDefaultFinanceData($pdo);

            self::$sqliteTablesChecked = true;
        } catch (Throwable $e) {
            error_log('ensureSqliteTablesExist error: ' . $e->getMessage());
        }
    }

    /**
     * Seed or ensure default finance tables and partner ledgers exist
     */
    public static function seedDefaultFinanceData(PDO $pdo): void {
        $driver = self::$driver;
        try {
            if ($driver === 'sqlite') {
                $pdo->exec("
                    CREATE TABLE IF NOT EXISTS finance_partners (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL UNIQUE,
                        color TEXT NOT NULL DEFAULT '#6B21A8',
                        share_percent REAL NOT NULL DEFAULT 33.33,
                        is_active INTEGER NOT NULL DEFAULT 1,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE TABLE IF NOT EXISTS finance_entries (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        partner_id INTEGER NOT NULL,
                        date TEXT NOT NULL,
                        description TEXT NOT NULL,
                        amount REAL NOT NULL,
                        type TEXT NOT NULL DEFAULT 'EXPENSE',
                        status TEXT NOT NULL DEFAULT 'PAID',
                        category TEXT NOT NULL DEFAULT 'Other',
                        counterparty_partner_id INTEGER DEFAULT NULL,
                        notes TEXT DEFAULT NULL,
                        created_by INTEGER DEFAULT NULL,
                        deleted_at DATETIME DEFAULT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE TABLE IF NOT EXISTS finance_marketing_campaigns (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        date TEXT NOT NULL,
                        campaign_name TEXT NOT NULL,
                        budget_amount REAL NOT NULL,
                        charge_percent REAL NOT NULL DEFAULT 20.0,
                        charge_amount REAL NOT NULL,
                        total_cost REAL NOT NULL,
                        charge_status TEXT NOT NULL DEFAULT 'PENDING',
                        status TEXT NOT NULL DEFAULT 'PENDING',
                        ledger_entry_id INTEGER DEFAULT NULL,
                        notes TEXT DEFAULT NULL,
                        created_by INTEGER DEFAULT NULL,
                        deleted_at DATETIME DEFAULT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE TABLE IF NOT EXISTS finance_audit_log (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER DEFAULT NULL,
                        entity_type TEXT NOT NULL,
                        entity_id INTEGER DEFAULT NULL,
                        action TEXT NOT NULL,
                        old_values TEXT DEFAULT NULL,
                        new_values TEXT DEFAULT NULL,
                        ip_address TEXT DEFAULT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );
                ");
            } else {
                $pdo->exec("
                    CREATE TABLE IF NOT EXISTS `finance_partners` (
                        `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                        `name` VARCHAR(50) NOT NULL UNIQUE,
                        `color` VARCHAR(30) NOT NULL DEFAULT '#6B21A8',
                        `share_percent` DECIMAL(5,2) NOT NULL DEFAULT 33.33,
                        `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                    CREATE TABLE IF NOT EXISTS `finance_entries` (
                        `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                        `partner_id` INT UNSIGNED NOT NULL,
                        `date` DATE NOT NULL,
                        `description` VARCHAR(255) NOT NULL,
                        `amount` DECIMAL(12,2) NOT NULL,
                        `type` ENUM('EXPENSE', 'CONTRIBUTION', 'REIMBURSEMENT', 'TRANSFER_OUT', 'TRANSFER_IN') NOT NULL DEFAULT 'EXPENSE',
                        `status` ENUM('PAID', 'PENDING', 'RECEIVED') NOT NULL DEFAULT 'PAID',
                        `category` VARCHAR(50) NOT NULL DEFAULT 'Other',
                        `counterparty_partner_id` INT UNSIGNED DEFAULT NULL,
                        `notes` TEXT DEFAULT NULL,
                        `created_by` BIGINT UNSIGNED DEFAULT NULL,
                        `deleted_at` DATETIME DEFAULT NULL,
                        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX `idx_fin_partner_date` (`partner_id`, `date`),
                        INDEX `idx_fin_status` (`status`),
                        INDEX `idx_fin_deleted` (`deleted_at`)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                    CREATE TABLE IF NOT EXISTS `finance_marketing_campaigns` (
                        `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                        `date` DATE NOT NULL,
                        `campaign_name` VARCHAR(255) NOT NULL,
                        `budget_amount` DECIMAL(12,2) NOT NULL,
                        `charge_percent` DECIMAL(5,2) NOT NULL DEFAULT 20.00,
                        `charge_amount` DECIMAL(12,2) NOT NULL,
                        `total_cost` DECIMAL(12,2) NOT NULL,
                        `charge_status` ENUM('PENDING', 'PAID') NOT NULL DEFAULT 'PENDING',
                        `status` ENUM('PENDING', 'PAID') NOT NULL DEFAULT 'PENDING',
                        `ledger_entry_id` BIGINT UNSIGNED DEFAULT NULL,
                        `notes` TEXT DEFAULT NULL,
                        `created_by` BIGINT UNSIGNED DEFAULT NULL,
                        `deleted_at` DATETIME DEFAULT NULL,
                        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                    CREATE TABLE IF NOT EXISTS `finance_audit_log` (
                        `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                        `user_id` BIGINT UNSIGNED DEFAULT NULL,
                        `entity_type` VARCHAR(50) NOT NULL,
                        `entity_id` BIGINT UNSIGNED DEFAULT NULL,
                        `action` VARCHAR(50) NOT NULL,
                        `old_values` LONGTEXT DEFAULT NULL,
                        `new_values` LONGTEXT DEFAULT NULL,
                        `ip_address` VARCHAR(45) DEFAULT NULL,
                        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                ");
            }

            // Seed 3 Partners: Yash, Dhruvik, Jeel
            $partnerCheck = (int)$pdo->query("SELECT COUNT(*) FROM finance_partners")->fetchColumn();
            if ($partnerCheck === 0) {
                $pStmt = $pdo->prepare("INSERT INTO finance_partners (name, color, share_percent, is_active) VALUES (?, ?, ?, 1)");
                $pStmt->execute(['Yash', '#6B21A8', 33.34]);
                $pStmt->execute(['Dhruvik', '#0284C7', 33.33]);
                $pStmt->execute(['Jeel', '#059669', 33.33]);
            }

            // Seed realistic demo entries if table is completely empty
            $entryCheck = (int)$pdo->query("SELECT COUNT(*) FROM finance_entries")->fetchColumn();
            if ($entryCheck === 0) {
                $partnerRows = $pdo->query("SELECT id, name FROM finance_partners ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);
                $partnerMap = [];
                foreach ($partnerRows as $row) {
                    $partnerMap[$row['name']] = (int)$row['id'];
                }

                $yashId = $partnerMap['Yash'] ?? 1;
                $dhruvikId = $partnerMap['Dhruvik'] ?? 2;
                $jeelId = $partnerMap['Jeel'] ?? 3;

                $insEntry = $pdo->prepare("
                    INSERT INTO finance_entries (partner_id, date, description, amount, type, status, category, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ");

                $exactRows = [
                    // Yash (Sum: 24,700)
                    [$yashId, '', 'Hostinger', 2790.0, 'EXPENSE', 'Paid', 'Hosting', ''],
                    [$yashId, '', 'Shiprocket (Initial)', 200.0, 'EXPENSE', 'Paid', 'Shiprocket', ''],
                    [$yashId, '', 'Shiprocket Business Plan', 200.0, 'EXPENSE', 'Paid', 'Shiprocket', ''],
                    [$yashId, '', 'To Dhruvik for Marketing', 1810.0, 'TRANSFER_OUT', 'paid', 'Marketing', ''],
                    [$yashId, '', 'To Dhruvik for Marketing', 2000.0, 'TRANSFER_OUT', 'Paid', 'Marketing', ''],
                    [$yashId, '2026-10-08', 'Shiprocket Recharge', 500.0, 'EXPENSE', 'paid', 'Shiprocket', 'Original: 8-10-2026'],
                    [$yashId, '2026-08-18', 'Shiprocket Recharge', 1000.0, 'EXPENSE', 'paid', 'Shiprocket', 'Original: 18-8-2026'],
                    [$yashId, '2026-08-21', 'Shiprocket Recharge', 500.0, 'EXPENSE', 'paid', 'Shiprocket', 'Original: 21-8-2026'],
                    [$yashId, '2026-08-21', 'marketing', 4000.0, 'EXPENSE', 'paid', 'Marketing', 'Original: 21-8-2026'],
                    [$yashId, '2026-08-22', 'Shiprocket Recharge', 500.0, 'EXPENSE', 'paid', 'Shiprocket', 'Original: 22-8-2026'],
                    [$yashId, '2026-08-28', 'Shiprocket Recharge', 500.0, 'EXPENSE', 'paid', 'Shiprocket', 'Original: 28-8-2026'],
                    [$yashId, '2026-08-29', 'To Harshbhai for marketing', 1800.0, 'EXPENSE', 'paid', 'Marketing', 'Original: 29-8-2026'],
                    [$yashId, '2026-08-31', 'From Dhruvik for Meta ads', -5000.0, 'REIMBURSEMENT', 'received', 'Marketing', 'Original: 31-8-2026'],
                    [$yashId, '2026-08-07', 'Shiprocket Recharge', 1000.0, 'EXPENSE', 'paid', 'Shiprocket', 'Original: 7-8-2026'],
                    [$yashId, '2026-09-07', 'To Harshbhai for Prepaid orders marketing', 1100.0, 'EXPENSE', 'paid', 'Marketing', 'Original: 7-9-2026'],
                    [$yashId, '2026-09-09', 'Shiprocket Recharge', 500.0, 'EXPENSE', 'paid', 'Shiprocket', 'Original: 9-9-2026'],
                    [$yashId, '2026-09-12', 'To Richi (Influencer)', 1800.0, 'EXPENSE', 'paid', 'Influencer', 'Original: 12-9-2026'],
                    [$yashId, '2026-09-29', 'Shiprocket Recharge', 500.0, 'EXPENSE', 'paid', 'Shiprocket', 'Original: 29-9-2026'],
                    [$yashId, '2026-08-01', 'Shiprocket Recharge', 1000.0, 'EXPENSE', 'paid', 'Shiprocket', 'Original: 1-8-2026'],
                    [$yashId, '2026-10-03', 'Shiprocket Recharge', 500.0, 'EXPENSE', 'paid', 'Shiprocket', 'Original: 3-10-2026'],
                    [$yashId, '2026-10-09', 'Shiprocket Recharge', 1000.0, 'EXPENSE', 'paid', 'Shiprocket', 'Original: 9-10-2026'],
                    [$yashId, '2026-10-18', 'To krupal for meta manager', 3500.0, 'EXPENSE', 'paid', 'Marketing', 'Original: 18-10-2026'],
                    [$yashId, '2026-10-20', 'Meta Fund added', 1000.0, 'EXPENSE', 'paid', 'Marketing', 'Original: 20-10-2026'],
                    [$yashId, '2026-10-23', 'Meta Fund added', 2000.0, 'EXPENSE', 'paid', 'Marketing', 'Original: 23-10-2026'],

                    // Dhruvik (Sum: 39,520)
                    [$dhruvikId, '', 'Capital Contribution', 5000.0, 'CONTRIBUTION', 'Paid', 'Other', ''],
                    [$dhruvikId, '2026-08-08', 'Shiprocket charges', 500.0, 'EXPENSE', 'paid', 'Shiprocket', 'Original: 8-8-2026'],
                    [$dhruvikId, '2026-08-02', 'Shiprocket charges', 500.0, 'EXPENSE', 'paid', 'Shiprocket', 'Original: 2-8-2026'],
                    [$dhruvikId, '', 'Shiprocket charges', 500.0, 'EXPENSE', 'paid', 'Shiprocket', 'date unclear - keep raw text: -'],
                    [$dhruvikId, '2026-08-11', 'Shiprocket charges', 1000.0, 'EXPENSE', 'paid', 'Shiprocket', 'Original: 11-8-2026'],
                    [$dhruvikId, '2026-08-20', 'Reel 2 location rent', 1100.0, 'EXPENSE', 'paid', 'Marketing', 'Original: 20-8-2026'],
                    [$dhruvikId, '', 'marketing', 4000.0, 'EXPENSE', 'paid', 'Marketing', ''],
                    [$dhruvikId, '', 'marketing', 1000.0, 'EXPENSE', 'paid', 'Marketing', ''],
                    [$dhruvikId, '', 'From Jeel', -1750.0, 'REIMBURSEMENT', 'paid', 'Other', ''],
                    [$dhruvikId, '', 'From Yash', -1810.0, 'REIMBURSEMENT', 'paid', 'Other', ''],
                    [$dhruvikId, '2026-08-21', 'marketing', 4000.0, 'EXPENSE', 'paid', 'Marketing', 'Original: 21-8-2026'],
                    [$dhruvikId, '2026-08-27', 'Shiprocket charges', 500.0, 'EXPENSE', 'paid', 'Shiprocket', 'Original: 27-8-2026'],
                    [$dhruvikId, '2026-08-31', 'To Yash for Meta ads', 5000.0, 'TRANSFER_OUT', 'paid', 'Marketing', 'Original: 31-8-2026'],
                    [$dhruvikId, '', 'krupal---------', 0.0, 'EXPENSE', '', 'Other', 'Note row in sheet'],
                    [$dhruvikId, '2026-09-29', 'Shiprocket charges', 1500.0, 'EXPENSE', 'paid', 'Shiprocket', 'Original: 29-9-2026'],
                    [$dhruvikId, '2026-09-30', 'Honey comb packaging', 800.0, 'EXPENSE', 'paid', 'Packaging', 'Original: 30-9-2026'],
                    [$dhruvikId, '2026-10-02', 'amazon order 3x', 2640.0, 'EXPENSE', 'paid', 'Order Cost', 'Original: 2-10-2026'],
                    [$dhruvikId, '2026-10-14', 'ashlesha ( influencer)', 350.0, 'EXPENSE', 'paid', 'Influencer', 'Original: 14/10/2026'],
                    [$dhruvikId, '2026-10-14', 'Meta ads', 5000.0, 'EXPENSE', 'paid', 'Marketing', 'Original: 14/10/2026'],
                    [$dhruvikId, '2026-10-18', 'parthbhai', 4000.0, 'EXPENSE', 'paid', 'Marketing', 'Original: 18-10-2026'],
                    [$dhruvikId, '2026-10-21', 'meta fund', 2000.0, 'EXPENSE', 'paid', 'Marketing', 'Original: 21-10-2026'],
                    [$dhruvikId, '2026-10-23', 'harsh bhai meta', 3690.0, 'EXPENSE', 'paid', 'Marketing', 'Original: 23-10-2026'],

                    // Jeel (Sum: 56,970)
                    [$jeelId, '', 'Contribution', 2000.0, 'CONTRIBUTION', 'Paid', 'Other', ''],
                    [$jeelId, '', 'Additional Contribution', 1250.0, 'CONTRIBUTION', 'Paid', 'Other', ''],
                    [$jeelId, '', 'To Dhruvik', 1750.0, 'TRANSFER_OUT', 'paid', 'Other', ''],
                    [$jeelId, '2026-08-07', 'To Khushi', 1500.0, 'EXPENSE', 'paid', 'Marketing', 'Original: 7-8-2026'],
                    [$jeelId, '2026-08-08', 'To Richi (first time)', 1500.0, 'EXPENSE', 'paid', 'Influencer', 'Original: 8-8-2026'],
                    [$jeelId, '2026-08-07', 'ORDER', 260.0, 'EXPENSE', 'Pending', 'Order Cost', 'Original: 7-8-2026'],
                    [$jeelId, '2026-08-08', 'ORDER', 370.0, 'EXPENSE', 'Pending', 'Order Cost', 'Original: 8-8-2026'],
                    [$jeelId, '2026-08-10', 'ORDER', 1844.0, 'EXPENSE', 'Pending', 'Order Cost', 'Original: 10-8-2026'],
                    [$jeelId, '2026-08-11', 'ORDER', 1150.0, 'EXPENSE', 'Pending', 'Order Cost', 'Original: 11-8-2026'],
                    [$jeelId, '2026-08-17', 'ORDER', 1110.0, 'EXPENSE', 'Pending', 'Order Cost', 'Original: 17-8-2026'],
                    [$jeelId, '2026-08-18', 'ORDER', 630.0, 'EXPENSE', 'Pending', 'Order Cost', 'Original: 18-8-2026'],
                    [$jeelId, '2026-08-19', 'ORDER', 1127.0, 'EXPENSE', 'Pending', 'Order Cost', 'Original: 19-8-2026'],
                    [$jeelId, '2026-08-20', 'ORDER', 1867.0, 'EXPENSE', 'Pending', 'Order Cost', 'Original: 20-8-2026'],
                    [$jeelId, '2026-08-21', 'marketing', 4000.0, 'EXPENSE', 'paid', 'Marketing', 'Original: 21-8-2026'],
                    [$jeelId, '2024-09-13', 'Trademark', 12000.0, 'EXPENSE', 'paid', 'Legal/Trademark', 'year is 2024 in sheet - keep exactly, ask owner to verify'],
                    [$jeelId, '2026-09-29', 'marketing', 7000.0, 'EXPENSE', 'paid', 'Marketing', 'Original: 29-09-2026'],
                    [$jeelId, '', 'razerpay', -9189.0, 'REIMBURSEMENT', 'Pending', 'Other', ''],
                    [$jeelId, '', 'odertill15-10-26', 7041.0, 'EXPENSE', 'Pending', 'Order Cost', ''],
                    [$jeelId, '', 'mysterybox', 5600.0, 'EXPENSE', 'Pending', 'Order Cost', ''],
                    [$jeelId, '2026-10-19', 'Shiprocket Recharge', 2000.0, 'EXPENSE', 'paid', 'Shiprocket', 'Original: 19-10-2026'],
                    [$jeelId, '2026-10-20', 'mysterybox', 3800.0, 'EXPENSE', 'Pending', 'Order Cost', 'Original: 20-10-26'],
                    [$jeelId, '2026-10-21', 'order', 6360.0, 'EXPENSE', 'Pending', 'Order Cost', 'Original: 21-10-26'],
                    [$jeelId, '', 'ORDER', 1000.0, 'EXPENSE', 'Pending', 'Order Cost', 'date unclear - keep raw text: 22-1026'],
                    [$jeelId, '2026-10-19', 'META', 1000.0, 'EXPENSE', 'Pending', 'Marketing', 'Original: 19-10-26'],
                ];

                foreach ($exactRows as $r) {
                    $insEntry->execute($r);
                }

                // Seed marketing campaigns
                $insCamp = $pdo->prepare("
                    INSERT INTO finance_marketing_campaigns (date, campaign_name, budget_amount, charge_percent, charge_amount, total_cost, charge_status, status, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $insCamp->execute(['2026-10-08', 'Diwali 4-Jhumka Box Festive Campaign', 12000.00, 20.00, 2400.00, 14400.00, 'PAID', 'PAID', 'Main festive ad campaign']);
                $insCamp->execute(['2026-10-16', 'Signature Emerald Clover & Mystery Jar Ads', 8000.00, 20.00, 1600.00, 9600.00, 'PENDING', 'PENDING', 'High ROAS scaling campaign']);
            }
        } catch (Throwable $e) {
            error_log('seedDefaultFinanceData error: ' . $e->getMessage());
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
                        'text'            => 'FREE DELIVERY ACROSS ALL INDIA (5-7 WORKING DAYS)',
                        'highlightAmount' => '',
                        'suffix'          => '',
                    ],
                    'heroBanner' => [
                        'badgeText'       => 'Everyday Luxury Fine Jewelry',
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
                        'subtitle'            => 'Celebrate auspicious traditions with handcrafted fine jewelry. Handcrafted for festivities, weddings, and every luminous moment.',
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
                            'desc'  => 'High-grade protective coating guaranteed not to fade or tarnish.',
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
            // Check if catalog has already been seeded in history
            try {
                $seeded = $pdo->query("SELECT `value` FROM `site_settings` WHERE `key` = 'catalog_seeded' LIMIT 1")->fetchColumn();
                if ($seeded === '1') {
                    // Catalog already seeded once; NEVER resurrect deleted products on refresh!
                    return;
                }
            } catch (Throwable $e) {}

            $count = (int)$pdo->query("SELECT COUNT(*) FROM products")->fetchColumn();
            if ($count > 0) {
                try {
                    $pdo->exec("INSERT OR REPLACE INTO `site_settings` (`key`, `value`) VALUES ('catalog_seeded', '1')");
                } catch (Throwable $e) {}
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

            try {
                $pdo->exec("INSERT OR REPLACE INTO `site_settings` (`key`, `value`) VALUES ('catalog_seeded', '1')");
            } catch (Throwable $e) {}
        } catch (Throwable $e) {
            error_log('seedDefaultCatalogSqlite error: ' . $e->getMessage());
        }
    }

    /**
     * Seed primary and gallery images for SQLite products
     */
    private static function seedDefaultImagesSqlite(PDO $pdo): void {
        try {
            try {
                $seeded = $pdo->query("SELECT `value` FROM `site_settings` WHERE `key` = 'images_seeded' LIMIT 1")->fetchColumn();
                if ($seeded === '1') {
                    return;
                }
            } catch (Throwable $e) {}

            $imgCount = (int)$pdo->query("SELECT COUNT(*) FROM product_images")->fetchColumn();
            if ($imgCount > 0) {
                try {
                    $pdo->exec("INSERT OR REPLACE INTO `site_settings` (`key`, `value`) VALUES ('images_seeded', '1')");
                } catch (Throwable $e) {}
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

            try {
                $pdo->exec("INSERT OR REPLACE INTO `site_settings` (`key`, `value`) VALUES ('images_seeded', '1')");
            } catch (Throwable $e) {}
        } catch (Throwable $e) {
            error_log('seedDefaultImagesSqlite error: ' . $e->getMessage());
        }
    }

    /**
     * Seed initial promotional coupons for SQLite
     */
    private static function seedDefaultCouponsSqlite(PDO $pdo): void {
        try {
            try {
                $seeded = $pdo->query("SELECT `value` FROM `site_settings` WHERE `key` = 'coupons_seeded' LIMIT 1")->fetchColumn();
                if ($seeded === '1') {
                    return;
                }
            } catch (Throwable $e) {}

            $count = (int)$pdo->query("SELECT COUNT(*) FROM coupons")->fetchColumn();
            if ($count > 0) {
                try {
                    $pdo->exec("INSERT OR REPLACE INTO `site_settings` (`key`, `value`) VALUES ('coupons_seeded', '1')");
                } catch (Throwable $e) {}
                return;
            }

            $coupons = [
                ['VALERIE10', 'fixed', 50, 0, 50, 10000],
                ['WELCOME10', 'percentage', 10, 999, 500, 1000],
                ['FIRSTORDER', 'fixed', 200, 1299, null, 500],
                ['VALERIEVIP', 'percentage', 15, 1999, 1000, 200],
            ];
            $stmt = $pdo->prepare("INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)");
            foreach ($coupons as $c) {
                $stmt->execute($c);
            }

            try {
                $pdo->exec("INSERT OR REPLACE INTO `site_settings` (`key`, `value`) VALUES ('coupons_seeded', '1')");
            } catch (Throwable $e) {}
        } catch (Throwable $e) {
            error_log('seedDefaultCouponsSqlite error: ' . $e->getMessage());
        }
    }

    /**
     * Seed initial combo bundles for SQLite
     */
    private static function seedDefaultBundlesSqlite(PDO $pdo): void {
        try {
            try {
                $seeded = $pdo->query("SELECT `value` FROM `site_settings` WHERE `key` = 'bundles_seeded' LIMIT 1")->fetchColumn();
                if ($seeded === '1') {
                    return;
                }
            } catch (Throwable $e) {}

            $count = (int)$pdo->query("SELECT COUNT(*) FROM bundles")->fetchColumn();
            if ($count > 0) {
                try {
                    $pdo->exec("INSERT OR REPLACE INTO `site_settings` (`key`, `value`) VALUES ('bundles_seeded', '1')");
                } catch (Throwable $e) {}
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

            try {
                $pdo->exec("INSERT OR REPLACE INTO `site_settings` (`key`, `value`) VALUES ('bundles_seeded', '1')");
            } catch (Throwable $e) {}
        } catch (Throwable $e) {
            error_log('seedDefaultBundlesSqlite error: ' . $e->getMessage());
        }
    }

    /**
     * Seed or update the primary Valerie Jewels Admin account
     */
    private static function seedAdminUser(PDO $pdo): void {
        try {
            $newEmail = 'contact.valeriejewels@gmail.com';
            $hash = password_hash('secure@VALERIE11_', PASSWORD_BCRYPT);

            // Check if target admin account exists
            $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
            $stmt->execute([$newEmail]);
            $existing = $stmt->fetch();

            if (!$existing) {
                // If legacy admin exists, update it to the new credentials
                $stmtOld = $pdo->prepare("SELECT id FROM users WHERE email = 'admin@valeriejewels.com' LIMIT 1");
                $stmtOld->execute();
                $oldExisting = $stmtOld->fetch();

                if ($oldExisting) {
                    $upd = $pdo->prepare("UPDATE users SET email = ?, password_hash = ?, role = 'admin' WHERE id = ?");
                    $upd->execute([$newEmail, $hash, $oldExisting['id']]);
                } else {
                    $ins = $pdo->prepare("
                        INSERT INTO users (name, email, phone, password_hash, role, is_blocked_rto)
                        VALUES (?, ?, ?, ?, 'admin', 0)
                    ");
                    $ins->execute(['Valerie Jewels Admin', $newEmail, '+91 98765 43210', $hash]);
                }
            } else {
                $upd = $pdo->prepare("UPDATE users SET password_hash = ?, role = 'admin' WHERE id = ?");
                $upd->execute([$hash, $existing['id']]);

                // Clean up legacy admin if separate row
                $pdo->prepare("DELETE FROM users WHERE email = 'admin@valeriejewels.com' AND id != ?")->execute([$existing['id']]);
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
                'storage'   => self::$driver === 'sqlite' ? basename(self::$activeSqliteFile ?? 'vj_live_store.sqlite') : 'mysql',
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
