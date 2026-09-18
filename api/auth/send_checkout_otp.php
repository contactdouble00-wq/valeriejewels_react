<?php
/**
 * VALERIE JEWELS — Send Checkout OTP API
 * Supports Sandbox Mode (demo OTP 123456) and Live SMS Delivery (Fast2SMS / Twilio)
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/config/database.php';

handleCors();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    ApiResponse::error('Method not allowed. Use POST.', 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
$rawPhone = trim($input['phone'] ?? '');
$cleanPhone = preg_replace('/\D/', '', $rawPhone);

// Allow 10-digit Indian numbers or 12-digit with 91 prefix
if (strlen($cleanPhone) === 12 && str_starts_with($cleanPhone, '91')) {
    $cleanPhone = substr($cleanPhone, 2);
}

if (strlen($cleanPhone) !== 10) {
    ApiResponse::error('Please provide a valid 10-digit mobile number.', 422);
}

try {
    $pdo = Database::getConnection();

    // Fetch site payment & SMS settings
    $settings = [];
    try {
        $stmt = $pdo->query("SELECT setting_key, setting_value FROM site_settings WHERE setting_key LIKE 'payment_%' OR setting_key LIKE 'sms_%'");
        while ($row = $stmt->fetch()) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
    } catch (Exception $e) {
        // Fallback default settings
    }

    $gatewayMode = $settings['payment_gateway_mode'] ?? 'sandbox';
    $smsProvider = $settings['sms_provider'] ?? 'sandbox'; // sandbox | fast2sms | twilio
    $fast2smsKey = $settings['sms_fast2sms_api_key'] ?? '';

    // In sandbox mode or default: Use deterministic test OTP for effortless testing
    $otpCode = '123456';
    $isLiveDelivery = false;
    $smsStatus = 'sandbox_simulated';

    // If live SMS gateway is configured (e.g. Fast2SMS for Indian numbers)
    if ($gatewayMode === 'live' && $smsProvider === 'fast2sms' && !empty($fast2smsKey)) {
        // Generate random 6-digit OTP for real dispatch
        $otpCode = str_pad((string)random_int(100000, 999999), 6, '0', STR_PAD_LEFT);

        $postData = [
            'variables_values' => $otpCode,
            'route'            => 'otp',
            'numbers'          => $cleanPhone,
        ];

        $ch = curl_init('https://www.fast2sms.com/dev/bulkV2');
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "authorization: {$fast2smsKey}",
            "Content-Type: application/json"
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200) {
            $isLiveDelivery = true;
            $smsStatus = 'dispatched';
        } else {
            $smsStatus = 'gateway_failed_fallback_to_sandbox';
        }
    }

    // Store OTP in session or transient cache (keyed by phone)
    if (session_status() === PHP_SESSION_NONE) {
        @session_start();
    }
    $_SESSION['checkout_otp_' . $cleanPhone] = [
        'code'       => $otpCode,
        'expires_at' => time() + 600, // 10 minutes
        'attempts'   => 0
    ];

    ApiResponse::success([
        'phone'            => $cleanPhone,
        'mode'             => $gatewayMode,
        'is_live_delivery' => $isLiveDelivery,
        'sms_status'       => $smsStatus,
        'demo_otp'         => ($gatewayMode === 'sandbox' || !$isLiveDelivery) ? $otpCode : null,
        'message'          => $isLiveDelivery 
            ? "Live OTP dispatched to +91 {$cleanPhone} via SMS."
            : "Sandbox Mode: Real SMS is not sent on localhost. Use test OTP: {$otpCode} (or click Quick Auto-Fill)."
    ], 'OTP processed successfully.');

} catch (Exception $e) {
    // Graceful fallback for offline / disconnected DB
    ApiResponse::success([
        'phone'            => $cleanPhone,
        'mode'             => 'sandbox',
        'is_live_delivery' => false,
        'sms_status'       => 'offline_sandbox',
        'demo_otp'         => '123456',
        'message'          => "Sandbox Mode: Use test OTP 123456 to continue checkout."
    ], 'OTP initialized in sandbox mode.');
}
