<?php
/**
 * VALERIE JEWELS — Admin Direct SMS Diagnostic Test Endpoint
 * Allows testing real SMS dispatch to the admin's personal phone number
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/utils/admin_auth.php';
require_once dirname(__DIR__) . '/utils/sms_gateway.php';
require_once dirname(__DIR__) . '/config/database.php';

handleCors();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    ApiResponse::error('Method not allowed. Use POST.', 405);
}

// Authenticate Admin
$adminUser = AdminAuth::authenticate(['admin', 'staff']);

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
$rawPhone = trim($input['phone'] ?? '');
$cleanPhone = preg_replace('/\D/', '', $rawPhone);

if (strlen($cleanPhone) === 12 && str_starts_with($cleanPhone, '91')) {
    $cleanPhone = substr($cleanPhone, 2);
}

if (strlen($cleanPhone) !== 10) {
    ApiResponse::error('Please enter a valid 10-digit mobile number to send the test SMS.', 422);
}

// Use passed settings or load saved settings from database
$pdo = Database::getConnection();
$settings = [];
try {
    $stmt = $pdo->prepare("SELECT `value` FROM `site_settings` WHERE `key` = 'payment_settings' LIMIT 1");
    $stmt->execute();
    $raw = $stmt->fetchColumn();
    if ($raw) {
        $settings = json_decode($raw, true) ?: [];
    }
} catch (Exception $e) {}

// Allow override from input
if (!empty($input['sms_provider'])) {
    $settings['sms_provider'] = $input['sms_provider'];
}
if (!empty($input['sms_fast2sms_api_key'])) {
    $settings['sms_fast2sms_api_key'] = $input['sms_fast2sms_api_key'];
}
if (!empty($input['sms_2factor_api_key'])) {
    $settings['sms_2factor_api_key'] = $input['sms_2factor_api_key'];
}
if (!empty($input['sms_twilio_sid'])) {
    $settings['sms_twilio_sid'] = $input['sms_twilio_sid'];
}
if (!empty($input['sms_twilio_token'])) {
    $settings['sms_twilio_token'] = $input['sms_twilio_token'];
}
if (!empty($input['sms_twilio_from'])) {
    $settings['sms_twilio_from'] = $input['sms_twilio_from'];
}

$testOtp = (string)random_int(100000, 999999);
$result = SmsGateway::sendOtp($cleanPhone, $testOtp, $settings);

if ($result['success']) {
    ApiResponse::success([
        'phone'      => $cleanPhone,
        'otp_sent'   => $testOtp,
        'provider'   => $result['provider'],
        'is_live'    => $result['is_live'],
        'message'    => $result['message'],
        'raw_output' => $result['raw'] ?? null
    ], 'Test SMS dispatched successfully.');
} else {
    ApiResponse::error("SMS Dispatch Failed: " . ($result['message'] ?? 'Unknown error'), 400, [
        'provider'   => $result['provider'] ?? 'unknown',
        'raw_output' => $result['raw'] ?? null
    ]);
}
