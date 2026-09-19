<?php
/**
 * VALERIE JEWELS — Admin Endpoint to Update Legal Policies
 * Enforces admin/staff authorization and records changes in admin_activity_log.
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

if (!is_array($data) || empty($data)) {
    ApiResponse::error('Invalid or empty policies JSON payload provided.', 400);
}

// Sanitize content preserving newlines and punctuation
function sanitizePolicyPayload($input) {
    if (is_array($input)) {
        $clean = [];
        foreach ($input as $k => $v) {
            $clean[$k] = sanitizePolicyPayload($v);
        }
        return $clean;
    }
    if (is_bool($input) || is_numeric($input)) {
        return $input;
    }
    if (is_string($input)) {
        // Strip dangerous HTML/scripts but keep clean text
        return trim(strip_tags($input));
    }
    return $input;
}

$sanitizedData = sanitizePolicyPayload($data);

// Stamp updated timestamp in meta
if (!isset($sanitizedData['meta']) || !is_array($sanitizedData['meta'])) {
    $sanitizedData['meta'] = [];
}
$sanitizedData['meta']['lastUpdated'] = date('F Y');

try {
    $pdo = Database::getConnection();

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

    $jsonValue = json_encode($sanitizedData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

    if ($driver === 'sqlite') {
        $stmt = $pdo->prepare("
            INSERT INTO site_settings (key, value, updated_at)
            VALUES ('legal_policies', ?, datetime('now'))
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
        ");
        $stmt->execute([$jsonValue]);
    } else {
        $stmt = $pdo->prepare("
            INSERT INTO `site_settings` (`key`, `value`)
            VALUES ('legal_policies', ?)
            ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), `updated_at` = NOW()
        ");
        $stmt->execute([$jsonValue]);
    }

    // 2. Audit Trail
    AdminAuth::logActivity(
        $adminUser['id'],
        'update_legal_policies',
        'site_settings',
        'legal_policies',
        json_encode([
            'user_email' => $adminUser['email'],
            'time' => date('c'),
            'updated_sections' => array_keys($sanitizedData)
        ])
    );

    ApiResponse::success($sanitizedData, 'Legal policies updated successfully in database.');
} catch (Throwable $e) {
    error_log('policies/update.php error: ' . $e->getMessage());
    ApiResponse::error('Failed to update legal policies: ' . $e->getMessage(), 500);
}
