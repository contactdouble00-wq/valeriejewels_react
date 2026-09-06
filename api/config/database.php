<?php
/**
 * Valerie Jewels - Database Connection Manager (PDO)
 * Industry-standard singleton wrapper with prepared statement enforcement.
 */

class Database {
    private static ?PDO $instance = null;
    private static array $config = [];

    /**
     * Retrieve the active PDO database connection singleton.
     *
     * @throws PDOException
     * @return PDO
     */
    public static function getConnection(): PDO {
        if (self::$instance === null) {
            self::loadConfig();

            $db = self::$config['db'];
            $dsn = sprintf(
                'mysql:host=%s;port=%d;dbname=%s;charset=%s',
                $db['host'],
                $db['port'] ?? 3306,
                $db['database'],
                $db['charset'] ?? 'utf8mb4'
            );

            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::ATTR_TIMEOUT            => 5,
            ];

            self::$instance = new PDO($dsn, $db['username'], $db['password'], $options);
        }

        return self::$instance;
    }

    /**
     * Check if the database is reachable without throwing unhandled exceptions.
     *
     * @return array ['connected' => bool, 'message' => string, 'version' => ?string]
     */
    public static function checkConnection(): array {
        try {
            $pdo = self::getConnection();
            $version = $pdo->query('SELECT VERSION()')->fetchColumn();
            return [
                'connected' => true,
                'message'   => 'MySQL connection established successfully',
                'version'   => $version ?: 'Unknown',
                'stats'     => self::getStats(),
            ];
        } catch (Throwable $e) {
            return [
                'connected' => false,
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
            $bundles = (int)$pdo->query('SELECT COUNT(*) FROM `bundles`')->fetchColumn();
            $coupons = (int)$pdo->query('SELECT COUNT(*) FROM `coupons`')->fetchColumn();
            $users = (int)$pdo->query('SELECT COUNT(*) FROM `users`')->fetchColumn();

            return [
                'products_count'   => $products,
                'categories_count' => $categories,
                'bundles_count'    => $bundles,
                'coupons_count'    => $coupons,
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
