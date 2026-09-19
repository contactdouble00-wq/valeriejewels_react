<?php
/**
 * VALERIE JEWELS — Admin Endpoint to Update Homepage Banners & Text
 * Enforces admin/staff authorization and logs modifications to admin_activity_log.
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/utils/admin_auth.php';
require_once dirname(__DIR__) . '/config/database.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ApiResponse::error('Method not allowed. Use POST.', 405);
}

// 1. Enforce RBAC Authorization
$adminUser = AdminAuth::authenticate(['admin', 'staff']);

$rawInput = trim(file_get_contents('php://input'));
$rawInput = preg_replace('/^\xEF\xBB\xBF/', '', $rawInput); // strip UTF-8 BOM
if (!mb_check_encoding($rawInput, 'UTF-8')) {
    $rawInput = mb_convert_encoding($rawInput, 'UTF-8', 'ISO-8859-1, Windows-1252, ASCII');
}
$data = json_decode($rawInput, true);

if (!is_array($data) && !empty($_POST)) {
    $data = $_POST;
}

if (!is_array($data)) {
    ApiResponse::error('Invalid JSON payload provided: ' . json_last_error_msg(), 400);
}

// Clean and validate payload
function sanitizeContent($input) {
    if (is_array($input)) {
        $clean = [];
        foreach ($input as $k => $v) {
            $clean[$k] = sanitizeContent($v);
        }
        return $clean;
    }
    if (is_bool($input) || is_numeric($input)) {
        return $input;
    }
    if (is_string($input)) {
        return trim(strip_tags($input));
    }
    return $input;
}

$sanitizedData = sanitizeContent($data);

try {
    $pdo = Database::getConnection();
    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);

    // Ensure table exists compatible with active driver
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

    $jsonValue = json_encode($sanitizedData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

    // Support both MySQL ON DUPLICATE and SQLite ON CONFLICT
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

    // 2. Audit Trail
    AdminAuth::logActivity(
        $adminUser['id'],
        'update_homepage_banners',
        'site_settings',
        'homepage_content',
        json_encode(['user_email' => $adminUser['email'], 'time' => date('c')])
    );

    ApiResponse::success($sanitizedData, 'Homepage banners and text updated successfully.');
} catch (Throwable $e) {
    error_log('update.php error: ' . $e->getMessage());
    ApiResponse::error('Failed to update homepage settings: ' . $e->getMessage(), 500);
}
