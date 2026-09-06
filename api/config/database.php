<?php
/**
 * Valerie Jewels - Database Connection Manager (PDO)
 * Industry-standard singleton wrapper with prepared statement enforcement.
 */

class Database {
    private static ?PDO $instance = null;
    private static array $config = [];
    private static string $driver = 'mysql';

    /**
     * Retrieve the active PDO database connection singleton.
     * Tries MySQL first (with Hostinger auto-detection), falls back to SQLite if unreachable.
     *
     * @throws PDOException
     * @return PDO
     */
    public static function getConnection(): PDO {
        if (self::$instance === null) {
            self::loadConfig();

            $db = self::$config['db'] ?? [];
            $host = $db['host'] ?? '127.0.0.1';
            $port = $db['port'] ?? 3306;
            $database = $db['database'] ?? 'valerie_jewels';
            $charset = $db['charset'] ?? 'utf8mb4';

            $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $host, $port, $database, $charset);
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::ATTR_TIMEOUT            => 5,
            ];

            try {
                self::$instance = new PDO($dsn, $db['username'] ?? 'root', $db['password'] ?? '', $options);
                self::$driver = 'mysql';
                self::ensureTablesExist(self::$instance);
            } catch (Throwable $e) {
                // If MySQL fails (e.g. Access denied, missing credentials on live host),
                // fall back to self-contained SQLite to prevent 500 crashes
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
                    throw $e;
                }
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
        } catch (Throwable $e) {
            error_log('ensureTablesExist error: ' . $e->getMessage());
        }
    }

    /**
     * Ensure SQLite tables and default admin account exist
     */
    private static function ensureSqliteTablesExist(PDO $pdo): void {
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
                    is_anti_tarnish INTEGER NOT NULL DEFAULT 1,
                    material TEXT NOT NULL DEFAULT '18K Gold Plated Stainless Steel',
                    is_bestseller INTEGER NOT NULL DEFAULT 0,
                    is_active INTEGER NOT NULL DEFAULT 1,
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
            ");

            self::seedAdminUser($pdo);
            self::seedDefaultCatalogSqlite($pdo);
        } catch (Throwable $e) {
            error_log('ensureSqliteTablesExist error: ' . $e->getMessage());
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
