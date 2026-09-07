<?php
/**
 * VALERIE JEWELS — Admin Endpoint to Update FAQs
 * Enforces admin/staff RBAC authorization and logs updates in admin_activity_log.
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
    ApiResponse::error('Invalid or empty FAQs JSON payload provided.', 400);
}

// Sanitize content
function sanitizeFaqPayload($input) {
    if (is_array($input)) {
        $clean = [];
        foreach ($input as $k => $v) {
            $clean[$k] = sanitizeFaqPayload($v);
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

$sanitizedData = sanitizeFaqPayload($data);

if (!isset($sanitizedData['meta']) || !is_array($sanitizedData['meta'])) {
    $sanitizedData['meta'] = [];
}
$sanitizedData['meta']['lastUpdated'] = date('F Y');

try {
    $pdo = Database::getConnection();

    // Ensure site_settings table exists
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `site_settings` (
            `key` VARCHAR(100) NOT NULL PRIMARY KEY,
            `value` LONGTEXT NOT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    $jsonValue = json_encode($sanitizedData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $stmt = $pdo->prepare("
        INSERT INTO `site_settings` (`key`, `value`, `updated_at`)
        VALUES ('site_faqs', :val, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE `value` = :val_upd, `updated_at` = CURRENT_TIMESTAMP
    ");
    $stmt->execute([
        ':val' => $jsonValue,
        ':val_upd' => $jsonValue
    ]);

    // Record audit trail
    try {
        $auditStmt = $pdo->prepare("
            INSERT INTO `admin_activity_log` (`admin_id`, `admin_name`, `action`, `details`, `ip_address`, `created_at`)
            VALUES (:admin_id, :admin_name, 'UPDATE_FAQS', :details, :ip, CURRENT_TIMESTAMP)
        ");
        $auditStmt->execute([
            ':admin_id' => $adminUser['id'] ?? null,
            ':admin_name' => $adminUser['name'] ?? 'Admin',
            ':details' => 'Updated Frequently Asked Questions (total: ' . (is_array($sanitizedData['faqs'] ?? null) ? count($sanitizedData['faqs']) : 0) . ')',
            ':ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);
    } catch (Exception $auditErr) {
        error_log('Audit log error on FAQs update: ' . $auditErr->getMessage());
    }

    ApiResponse::success($sanitizedData, 'Frequently Asked Questions published successfully.');

} catch (Exception $e) {
    ApiResponse::error('Failed to update FAQs: ' . $e->getMessage(), 500);
}
