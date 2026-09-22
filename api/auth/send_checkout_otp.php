<?php
/**
 * VALERIE JEWELS — Send Checkout OTP API
 * Dispatches real cellular SMS OTPs to Indian customer mobile numbers (like MadeWidLove)
 * Multi-Provider support: Fast2SMS, 2Factor.in, Twilio, Fastrr, with Sandbox fallback
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/utils/sms_gateway.php';

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
    ApiResponse::error('Please provide a valid 10-digit Indian mobile number.', 422);
}

try {
    $pdo = Database::getConnection();

    // Fetch site payment & SMS settings
    $settings = [];
    try {
        $stmt = $pdo->prepare("SELECT `value` FROM `site_settings` WHERE `key` = 'payment_settings' LIMIT 1");
        $stmt->execute();
        $raw = $stmt->fetchColumn();
        if ($raw) {
            $settings = json_decode($raw, true) ?: [];
        }
    } catch (Exception $e) {
        // Fallback default settings
    }

    $smsProvider = strtolower($settings['sms_provider'] ?? 'sandbox');
    $isSandbox = ($smsProvider === 'sandbox');

    // Generate random 6-digit OTP code (or 123456 if in sandbox mode)
    if ($isSandbox) {
        $otpCode = '123456';
    } else {
        $otpCode = str_pad((string)random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
    }

    // Dispatch SMS via SMS Gateway
    $smsResult = SmsGateway::sendOtp($cleanPhone, $otpCode, $settings);

    // If live provider failed (e.g. invalid API key or zero balance), gracefully fall back
    $isLiveDelivery = !empty($smsResult['is_live']) && !empty($smsResult['success']);
    if (!$isLiveDelivery && !$isSandbox) {
        // Fall back to sandbox demo OTP so customer checkout doesn't halt
        $otpCode = '123456';
    }

    $now = time();
    $expiresAt = $now + 600; // 10 minutes

    // Persist OTP in database table checkout_otps
    try {
        $saveStmt = $pdo->prepare("
            REPLACE INTO `checkout_otps` (`phone`, `otp_code`, `attempts`, `is_verified`, `expires_at`, `created_at`)
            VALUES (:phone, :otp, 0, 0, :exp, :created)
        ");
        $saveStmt->execute([
            ':phone'   => $cleanPhone,
            ':otp'     => $otpCode,
            ':exp'     => $expiresAt,
            ':created' => $now,
        ]);
    } catch (Exception $dbErr) {
        // Table fallback
    }

    // Also store in PHP session
    if (session_status() === PHP_SESSION_NONE) {
        @session_start();
    }
    $_SESSION['checkout_otp_' . $cleanPhone] = [
        'code'       => $otpCode,
        'expires_at' => $expiresAt,
        'attempts'   => 0
    ];

    ApiResponse::success([
        'phone'            => $cleanPhone,
        'provider'         => $smsResult['provider'] ?? $smsProvider,
        'is_live_delivery' => $isLiveDelivery,
        'sms_status'       => $smsResult['success'] ? 'sent' : 'failed_fallback',
        'gateway_message'  => $smsResult['message'] ?? '',
        // Only return demo_otp when running in sandbox or if live gateway fell back
        'demo_otp'         => (!$isLiveDelivery) ? $otpCode : null,
        'message'          => $isLiveDelivery
            ? "Real SMS OTP dispatched to +91 {$cleanPhone}."
            : ($smsResult['message'] ?? "Instant Verification: Enter code 123456 or click Auto-Fill to continue.")
    ], 'OTP processed.');

} catch (Exception $e) {
    // Ultimate offline fallback
    ApiResponse::success([
        'phone'            => $cleanPhone,
        'provider'         => 'sandbox',
        'is_live_delivery' => false,
        'demo_otp'         => '123456',
        'message'          => "Sandbox Mode: Use test OTP 123456 to continue."
    ], 'OTP initialized in sandbox mode.');
}
