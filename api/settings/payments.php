<?php
/**
 * VALERIE JEWELS — Payment, Fastrr & SMS Settings Endpoint
 * Supports GET (public checkout settings / admin credentials) and POST (admin update)
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/config/database.php';

handleCors();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$defaultSettings = [
    'gateway_mode'          => 'sandbox', // 'sandbox' | 'live'
    'fastrr_app_id'         => 'vj_fastrr_app_test',
    'fastrr_secret_key'     => 'vj_fastrr_secret_test_2026',
    'fastrr_webhook_secret' => 'vj_fastrr_whsec_test',
    'sms_provider'          => 'sandbox', // 'sandbox' | 'fast2sms' | 'twofactor' | 'twilio' | 'fastrr'
    'sms_fast2sms_api_key'  => '',
    'sms_2factor_api_key'   => '',
    'sms_twilio_sid'        => '',
    'sms_twilio_token'      => '',
    'sms_twilio_from'       => '',
    'sms_fastrr_auth_token' => '',
    'prepaid_discount'      => 50,
    'prepaid_gift_title'    => 'Free Zircon Necklace',
    'prepaid_gift_subtitle' => 'Included complimentary with all prepaid orders',
    'partial_cod_enabled'   => true,
    'partial_advance'       => 199,
    'cod_fee'               => 0,
    'cod_available'         => true,
    'checkout_banner_text'  => '🎁 Prepaid Orders = ₹50 OFF + Free Luxury Gift + ⚡ Priority Shipping',
    'exit_intent_enabled'   => true,
    'exit_intent_title'     => 'Wait! Are you sure you want to exit?',
    'exit_intent_message'   => 'High-demand handcrafted pieces in your bag might sell out before your next visit.',
    'testimonial_quote'     => '“The Korean earrings collection with velvet box is breathtaking! Quality feels like real 18K gold. Absolutely loved the free zircon gift.”',
    'testimonial_author'    => 'Ananya Sharma, Verified Buyer • New Delhi',
];

try {
    $pdo = Database::getConnection();

    // Ensure site_settings and checkout_otps tables exist
    if (Database::getDriver() === 'sqlite') {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS site_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS checkout_otps (
                phone TEXT PRIMARY KEY,
                otp_code TEXT NOT NULL,
                attempts INTEGER DEFAULT 0,
                is_verified INTEGER DEFAULT 0,
                expires_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL
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
            CREATE TABLE IF NOT EXISTS `checkout_otps` (
                `phone` VARCHAR(20) NOT NULL PRIMARY KEY,
                `otp_code` VARCHAR(10) NOT NULL,
                `attempts` INT DEFAULT 0,
                `is_verified` TINYINT DEFAULT 0,
                `expires_at` BIGINT NOT NULL,
                `created_at` BIGINT NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    if ($method === 'GET') {
        $stmt = $pdo->prepare("SELECT `value` FROM `site_settings` WHERE `key` = 'payment_settings' LIMIT 1");
        $stmt->execute();
        $raw = $stmt->fetchColumn();

        $settings = $defaultSettings;
        if ($raw) {
            $saved = json_decode($raw, true);
            if (is_array($saved)) {
                $settings = array_merge($defaultSettings, $saved);
            }
        }

        // Check if admin token is present in Authorization header
        $isAdmin = false;
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            require_once dirname(__DIR__) . '/utils/jwt.php';
            $payload = JwtUtil::decode($matches[1]);
            if ($payload && in_array($payload['role'] ?? '', ['admin', 'staff'])) {
                $isAdmin = true;
            }
        }

        // Mask secret keys if not admin
        if (!$isAdmin) {
            unset($settings['fastrr_secret_key']);
            unset($settings['fastrr_webhook_secret']);
            unset($settings['sms_fast2sms_api_key']);
            unset($settings['sms_2factor_api_key']);
            unset($settings['sms_twilio_token']);
            unset($settings['sms_fastrr_auth_token']);
        }

        ApiResponse::success($settings);
    }

    if ($method === 'POST') {
        require_once dirname(__DIR__) . '/utils/admin_auth.php';
        $adminUser = AdminAuth::authenticate(['admin']);

        $rawInput = trim(file_get_contents('php://input'));
        $data = json_decode($rawInput, true) ?: $_POST;

        if (!is_array($data)) {
            ApiResponse::error('Invalid settings payload', 400);
        }

        // Fetch current settings to preserve secrets if left blank
        $stmt = $pdo->prepare("SELECT `value` FROM `site_settings` WHERE `key` = 'payment_settings' LIMIT 1");
        $stmt->execute();
        $raw = $stmt->fetchColumn();
        $current = $defaultSettings;
        if ($raw) {
            $saved = json_decode($raw, true);
            if (is_array($saved)) $current = array_merge($defaultSettings, $saved);
        }

        $merged = array_merge($current, [
            'gateway_mode'          => in_array($data['gateway_mode'] ?? '', ['sandbox', 'live']) ? $data['gateway_mode'] : $current['gateway_mode'],
            'fastrr_app_id'         => !empty($data['fastrr_app_id']) ? trim($data['fastrr_app_id']) : $current['fastrr_app_id'],
            'fastrr_secret_key'     => !empty($data['fastrr_secret_key']) ? trim($data['fastrr_secret_key']) : $current['fastrr_secret_key'],
            'fastrr_webhook_secret' => !empty($data['fastrr_webhook_secret']) ? trim($data['fastrr_webhook_secret']) : $current['fastrr_webhook_secret'],
            'sms_provider'          => in_array($data['sms_provider'] ?? '', ['sandbox', 'fast2sms', 'twofactor', 'twilio', 'fastrr']) ? $data['sms_provider'] : $current['sms_provider'],
            'sms_fast2sms_api_key'  => isset($data['sms_fast2sms_api_key']) ? trim($data['sms_fast2sms_api_key']) : $current['sms_fast2sms_api_key'],
            'sms_2factor_api_key'   => isset($data['sms_2factor_api_key']) ? trim($data['sms_2factor_api_key']) : $current['sms_2factor_api_key'],
            'sms_twilio_sid'        => isset($data['sms_twilio_sid']) ? trim($data['sms_twilio_sid']) : $current['sms_twilio_sid'],
            'sms_twilio_token'      => isset($data['sms_twilio_token']) ? trim($data['sms_twilio_token']) : $current['sms_twilio_token'],
            'sms_twilio_from'       => isset($data['sms_twilio_from']) ? trim($data['sms_twilio_from']) : $current['sms_twilio_from'],
            'sms_fastrr_auth_token' => isset($data['sms_fastrr_auth_token']) ? trim($data['sms_fastrr_auth_token']) : $current['sms_fastrr_auth_token'],
            'prepaid_discount'      => max(0, (float)($data['prepaid_discount'] ?? $current['prepaid_discount'])),
            'prepaid_gift_title'    => trim($data['prepaid_gift_title'] ?? $current['prepaid_gift_title']),
            'prepaid_gift_subtitle' => trim($data['prepaid_gift_subtitle'] ?? $current['prepaid_gift_subtitle']),
            'partial_cod_enabled'   => isset($data['partial_cod_enabled']) ? (bool)$data['partial_cod_enabled'] : $current['partial_cod_enabled'],
            'partial_advance'       => max(0, (float)($data['partial_advance'] ?? $current['partial_advance'])),
            'cod_fee'               => max(0, (float)($data['cod_fee'] ?? $current['cod_fee'])),
            'cod_available'         => isset($data['cod_available']) ? (bool)$data['cod_available'] : $current['cod_available'],
            'checkout_banner_text'  => trim($data['checkout_banner_text'] ?? $current['checkout_banner_text']),
            'exit_intent_enabled'   => isset($data['exit_intent_enabled']) ? (bool)$data['exit_intent_enabled'] : $current['exit_intent_enabled'],
            'exit_intent_title'     => trim($data['exit_intent_title'] ?? $current['exit_intent_title']),
            'exit_intent_message'   => trim($data['exit_intent_message'] ?? $current['exit_intent_message']),
            'testimonial_quote'     => trim($data['testimonial_quote'] ?? $current['testimonial_quote']),
            'testimonial_author'    => trim($data['testimonial_author'] ?? $current['testimonial_author']),
        ]);

        $saveStmt = $pdo->prepare("
            REPLACE INTO `site_settings` (`key`, `value`)
            VALUES ('payment_settings', :val)
        ");
        $saveStmt->execute([':val' => json_encode($merged, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);

        // Log admin activity
        try {
            $logStmt = $pdo->prepare("
                INSERT INTO `admin_activity_log` (`admin_id`, `admin_name`, `action`, `entity_type`, `entity_id`, `details`, `ip_address`)
                VALUES (:aid, :aname, 'update', 'payment_settings', 'fastrr', :details, :ip)
            ");
            $logStmt->execute([
                ':aid'     => $adminUser['id'] ?? null,
                ':aname'   => $adminUser['name'] ?? 'Admin',
                ':details' => json_encode(['mode' => $merged['gateway_mode'], 'sms_provider' => $merged['sms_provider']]),
                ':ip'      => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
            ]);
        } catch (Exception $e) {
            // Non-fatal
        }

        ApiResponse::success($merged, 'Payment, Fastrr & SMS settings updated successfully');
    }

    ApiResponse::error('Method not allowed', 405);

} catch (Exception $e) {
    ApiResponse::error('Database error: ' . $e->getMessage(), 500);
}
