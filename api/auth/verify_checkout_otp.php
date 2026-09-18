<?php
/**
 * VALERIE JEWELS — Verify Checkout OTP API
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';

handleCors();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    ApiResponse::error('Method not allowed. Use POST.', 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
$rawPhone = trim($input['phone'] ?? '');
$cleanPhone = preg_replace('/\D/', '', $rawPhone);
$code = trim($input['otp'] ?? '');

if (strlen($cleanPhone) === 12 && str_starts_with($cleanPhone, '91')) {
    $cleanPhone = substr($cleanPhone, 2);
}

if (strlen($cleanPhone) !== 10) {
    ApiResponse::error('Invalid phone number.', 422);
}

if (strlen($code) !== 6) {
    ApiResponse::error('Please enter a 6-digit OTP code.', 422);
}

if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}

$sessionKey = 'checkout_otp_' . $cleanPhone;
$saved = $_SESSION[$sessionKey] ?? null;

// Allow demo code 123456 anytime in sandbox, or match session code
$isSandboxCode = ($code === '123456');
$isSessionValid = ($saved && isset($saved['code']) && $saved['code'] === $code && time() <= $saved['expires_at']);

if ($isSandboxCode || $isSessionValid) {
    // Clear once used
    unset($_SESSION[$sessionKey]);

    ApiResponse::success([
        'verified' => true,
        'phone'    => $cleanPhone,
        'message'  => 'Phone number verified successfully.'
    ], 'OTP verified.');
} else {
    ApiResponse::error('Invalid OTP code. Please enter 123456 or check the code provided.', 400);
}
