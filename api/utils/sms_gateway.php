<?php
/**
 * VALERIE JEWELS — Multi-Provider SMS Gateway Dispatcher
 * Dispatches real cellular SMS OTPs to Indian mobile numbers (like MadeWidLove)
 * Supports: Fast2SMS, 2Factor.in, Twilio, and Fastrr
 */

@error_reporting(E_ALL & ~E_DEPRECATED);

class SmsGateway {

    /**
     * Dispatch real SMS to phone number
     * 
     * @param string $phone 10-digit Indian phone number
     * @param string $otp 6-digit OTP code
     * @param array $settings Store settings array
     * @return array ['success' => bool, 'provider' => string, 'message' => string, 'raw' => mixed]
     */
    public static function sendOtp(string $phone, string $otp, array $settings = []): array {
        $cleanPhone = preg_replace('/\D/', '', $phone);
        if (strlen($cleanPhone) === 12 && str_starts_with($cleanPhone, '91')) {
            $cleanPhone = substr($cleanPhone, 2);
        }

        $provider = strtolower($settings['sms_provider'] ?? 'sandbox');

        // Sandbox / Demo mode
        if ($provider === 'sandbox') {
            return [
                'success'  => true,
                'is_live'  => false,
                'provider' => 'sandbox',
                'otp'      => '123456',
                'message'  => "Sandbox mode: Test OTP is 123456 (physical SMS not sent in sandbox)."
            ];
        }

        // Provider 1: Fast2SMS (Pre-approved Indian OTP Route)
        if ($provider === 'fast2sms') {
            $apiKey = trim($settings['sms_fast2sms_api_key'] ?? '');
            if (empty($apiKey)) {
                return [
                    'success'  => false,
                    'is_live'  => false,
                    'provider' => 'fast2sms',
                    'message'  => 'Fast2SMS API Key is not configured in Admin Settings.'
                ];
            }

            return self::sendViaFast2Sms($cleanPhone, $otp, $apiKey);
        }

        // Provider 2: 2Factor.in (Specialized Indian OTP SMS Gateway)
        if ($provider === 'twofactor' || $provider === '2factor') {
            $apiKey = trim($settings['sms_2factor_api_key'] ?? '');
            if (empty($apiKey)) {
                return [
                    'success'  => false,
                    'is_live'  => false,
                    'provider' => '2factor',
                    'message'  => '2Factor.in API Key is not configured in Admin Settings.'
                ];
            }

            return self::sendVia2Factor($cleanPhone, $otp, $apiKey);
        }

        // Provider 3: Twilio
        if ($provider === 'twilio') {
            $sid   = trim($settings['sms_twilio_sid'] ?? '');
            $token = trim($settings['sms_twilio_token'] ?? '');
            $from  = trim($settings['sms_twilio_from'] ?? '');

            if (empty($sid) || empty($token) || empty($from)) {
                return [
                    'success'  => false,
                    'is_live'  => false,
                    'provider' => 'twilio',
                    'message'  => 'Twilio SID, Token, or Sender Number missing in Admin Settings.'
                ];
            }

            return self::sendViaTwilio($cleanPhone, $otp, $sid, $token, $from);
        }

        // Provider 4: Fastrr Headless API (Shiprocket Fastrr)
        if ($provider === 'fastrr') {
            $appId  = trim($settings['fastrr_app_id'] ?? '');
            $secret = trim($settings['fastrr_secret_key'] ?? '');
            $token  = trim($settings['sms_fastrr_auth_token'] ?? '');
            $srEmail = trim($settings['shiprocket_email'] ?? '');
            $srPassword = trim($settings['shiprocket_password'] ?? '');

            if (empty($token) && (empty($srEmail) || empty($srPassword))) {
                return [
                    'success'  => false,
                    'is_live'  => false,
                    'provider' => 'fastrr',
                    'message'  => 'Please enter your Shiprocket API User Email and Password in the fields above.'
                ];
            }

            return self::sendViaFastrr($cleanPhone, $otp, $appId, $secret, $token, $settings);
        }

        return [
            'success'  => false,
            'is_live'  => false,
            'provider' => $provider,
            'message'  => "Unsupported SMS provider '{$provider}'."
        ];
    }

    /**
     * Fast2SMS Quick OTP API
     * Delivers in 2-5 seconds across Indian telecom networks
     */
    private static function sendViaFast2Sms(string $phone, string $otp, string $apiKey): array {
        $cleanApiKey = trim($apiKey);
        $cleanApiKey = preg_replace('/^authorization:\s*/i', '', $cleanApiKey);
        $cleanApiKey = trim($cleanApiKey, " \t\n\r\0\x0B\"'");

        $postData = [
            'route'            => 'otp',
            'variables_values' => $otp,
            'numbers'          => $phone,
        ];

        $url = 'https://www.fast2sms.com/dev/bulkV2?authorization=' . urlencode($cleanApiKey);
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "authorization: {$cleanApiKey}",
            "Content-Type: application/json",
            "Accept: application/json"
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

        $response = curl_exec($ch);
        $err = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if (PHP_VERSION_ID < 80000) {
            @curl_close($ch);
        }

        if ($err) {
            return [
                'success'  => false,
                'is_live'  => true,
                'provider' => 'fast2sms',
                'message'  => "cURL network error connecting to Fast2SMS: {$err}"
            ];
        }

        $decoded = json_decode($response, true);
        if ($httpCode === 200 && !empty($decoded['return'])) {
            return [
                'success'  => true,
                'is_live'  => true,
                'provider' => 'fast2sms',
                'message'  => "Real SMS delivered to +91 {$phone} via Fast2SMS.",
                'request_id' => $decoded['request_id'] ?? null,
                'raw'      => $decoded
            ];
        }

        // Auto-try fallback to Quick SMS (route=q) if OTP route requires website verification
        if (($decoded['status_code'] ?? 0) === 996) {
            $qData = [
                'route'    => 'q',
                'message'  => "Your Valerie Jewels verification code is {$otp}. Valid for 10 minutes.",
                'language' => 'english',
                'flash'    => 0,
                'numbers'  => $phone,
            ];
            $chQ = curl_init('https://www.fast2sms.com/dev/bulkV2');
            curl_setopt($chQ, CURLOPT_HTTPHEADER, [
                "authorization: {$cleanApiKey}",
                "Content-Type: application/json"
            ]);
            curl_setopt($chQ, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($chQ, CURLOPT_POST, true);
            curl_setopt($chQ, CURLOPT_POSTFIELDS, json_encode($qData));
            curl_setopt($chQ, CURLOPT_TIMEOUT, 10);
            curl_setopt($chQ, CURLOPT_SSL_VERIFYPEER, false);
            $qRes = curl_exec($chQ);
            if (PHP_VERSION_ID < 80000) {
                @curl_close($chQ);
            }
            $qDecoded = json_decode($qRes, true);
            if (!empty($qDecoded['return'])) {
                return [
                    'success'  => true,
                    'is_live'  => true,
                    'provider' => 'fast2sms',
                    'message'  => "Real SMS delivered to +91 {$phone} via Fast2SMS.",
                    'request_id' => $qDecoded['request_id'] ?? null,
                    'raw'      => $qDecoded
                ];
            }
            if (!empty($qDecoded['message'])) {
                $decoded = $qDecoded;
            }
        }

        $rawMessage = $decoded['message'] ?? null;
        if (is_array($rawMessage)) {
            $errorMsg = implode(', ', $rawMessage);
        } elseif (is_string($rawMessage) && strlen($rawMessage) > 0) {
            $errorMsg = $rawMessage;
        } else {
            $errorMsg = "HTTP {$httpCode} Fast2SMS error";
        }

        if (($decoded['status_code'] ?? 0) === 999) {
            $errorMsg = "Fast2SMS requires a one-time ₹100 wallet recharge to unlock the programmatic API route under TRAI regulations. Please add ₹100 in fast2sms.com wallet.";
        }

        return [
            'success'  => false,
            'is_live'  => true,
            'provider' => 'fast2sms',
            'message'  => "Fast2SMS: {$errorMsg}",
            'raw'      => $decoded
        ];
    }

    /**
     * 2Factor.in SMS Gateway API
     */
    private static function sendVia2Factor(string $phone, string $otp, string $apiKey): array {
        $url = "https://2factor.in/API/V1/{$apiKey}/SMS/+91{$phone}/{$otp}/VALERIE";

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

        $response = curl_exec($ch);
        $err = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if (PHP_VERSION_ID < 80000) {
            @curl_close($ch);
        }

        if ($err) {
            return [
                'success'  => false,
                'is_live'  => true,
                'provider' => '2factor',
                'message'  => "2Factor network error: {$err}"
            ];
        }

        $decoded = json_decode($response, true);
        if ($httpCode === 200 && ($decoded['Status'] ?? '') === 'Success') {
            return [
                'success'    => true,
                'is_live'    => true,
                'provider'   => '2factor',
                'session_id' => $decoded['Details'] ?? null,
                'message'    => "Real SMS dispatched to +91 {$phone} via 2Factor.",
                'raw'        => $decoded
            ];
        }

        return [
            'success'  => false,
            'is_live'  => true,
            'provider' => '2factor',
            'message'  => "2Factor error: " . ($decoded['Details'] ?? "HTTP {$httpCode}"),
            'raw'      => $decoded
        ];
    }

    /**
     * Twilio SMS REST API
     */
    private static function sendViaTwilio(string $phone, string $otp, string $sid, string $token, string $from): array {
        $url = "https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json";
        $to = '+91' . $phone;
        $body = "Your Valerie Jewels verification code is {$otp}. Valid for 10 minutes.";

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERPWD, "{$sid}:{$token}");
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
            'From' => $from,
            'To'   => $to,
            'Body' => $body
        ]));
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

        $response = curl_exec($ch);
        $err = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if (PHP_VERSION_ID < 80000) {
            @curl_close($ch);
        }

        if ($err) {
            return [
                'success'  => false,
                'is_live'  => true,
                'provider' => 'twilio',
                'message'  => "Twilio connection error: {$err}"
            ];
        }

        $decoded = json_decode($response, true);
        if ($httpCode >= 200 && $httpCode < 300) {
            return [
                'success'  => true,
                'is_live'  => true,
                'provider' => 'twilio',
                'sid'      => $decoded['sid'] ?? null,
                'message'  => "Real SMS dispatched to {$to} via Twilio.",
                'raw'      => $decoded
            ];
        }

        return [
            'success'  => false,
            'is_live'  => true,
            'provider' => 'twilio',
            'message'  => "Twilio error: " . ($decoded['message'] ?? "HTTP {$httpCode}"),
            'raw'      => $decoded
        ];
    }

    /**
     * Fastrr / Shiprocket Checkout OTP Engine
     */
    private static function sendViaFastrr(string $phone, string $otp, string $appId, string $secret, string $token, array $settings = []): array {
        // If Bearer token is not provided but Shiprocket API User credentials exist, generate token
        $srEmail = trim($settings['shiprocket_email'] ?? '');
        $srPassword = trim($settings['shiprocket_password'] ?? '');

        if (empty($token) && !empty($srEmail) && !empty($srPassword)) {
            $loginCh = curl_init('https://apiv2.shiprocket.in/v1/external/auth/login');
            curl_setopt($loginCh, CURLOPT_POST, true);
            curl_setopt($loginCh, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($loginCh, CURLOPT_POSTFIELDS, json_encode([
                'email'    => $srEmail,
                'password' => $srPassword
            ]));
            curl_setopt($loginCh, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($loginCh, CURLOPT_TIMEOUT, 8);
            curl_setopt($loginCh, CURLOPT_SSL_VERIFYPEER, false);
            $loginRes = curl_exec($loginCh);
            if (PHP_VERSION_ID < 80000) {
                @curl_close($loginCh);
            }

            $loginData = json_decode($loginRes, true);
            if (!empty($loginData['token'])) {
                $token = $loginData['token'];
            }
        }

        // 1. Try Fastrr Checkout API Endpoint
        $url = 'https://api.fastrr.com/v1/auth/otp/send';
        $postData = [
            'phone'       => '+91' . $phone,
            'channel_id'  => $appId ?: 'valerie_store',
            'order_type'  => 'checkout'
        ];

        $headers = ['Content-Type: application/json'];
        if (!empty($appId)) $headers[] = "x-app-id: {$appId}";
        if (!empty($secret)) $headers[] = "x-secret-key: {$secret}";
        if (!empty($token)) $headers[] = "Authorization: Bearer {$token}";

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

        $response = curl_exec($ch);
        $err = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if (PHP_VERSION_ID < 80000) {
            @curl_close($ch);
        }

        $decoded = json_decode($response, true);
        if ($httpCode === 200 || $httpCode === 201) {
            return [
                'success'  => true,
                'is_live'  => true,
                'provider' => 'fastrr',
                'message'  => "Real SMS dispatched via Shiprocket Fastrr network to +91 {$phone}.",
                'raw'      => $decoded
            ];
        }

        // Return clear diagnostic details
        $errMsg = $decoded['message'] ?? $decoded['error'] ?? "Fastrr API returned HTTP {$httpCode}";
        return [
            'success'  => false,
            'is_live'  => true,
            'provider' => 'fastrr',
            'message'  => "Fastrr (Shiprocket) Error: {$errMsg}. (Check your Fastrr/Shiprocket API credentials in Admin Settings)",
            'raw'      => $decoded ?: $response
        ];
    }
}
