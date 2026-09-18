<?php
/**
 * VALERIE JEWELS — Multi-Provider SMS Gateway Dispatcher
 * Dispatches real cellular SMS OTPs to Indian mobile numbers (like MadeWidLove)
 * Supports: Fast2SMS, 2Factor.in, Twilio, and Fastrr
 */

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

            return self::sendViaFastrr($cleanPhone, $otp, $appId, $secret, $token);
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
        $postData = [
            'route'            => 'otp',
            'variables_values' => $otp,
            'numbers'          => $phone,
        ];

        $ch = curl_init('https://www.fast2sms.com/dev/bulkV2');
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "authorization: {$apiKey}",
            "Content-Type: application/json"
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

        $response = curl_exec($ch);
        $err = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

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

        $errorMsg = $decoded['message'][0] ?? $decoded['message'] ?? "HTTP {$httpCode} Fast2SMS error";
        return [
            'success'  => false,
            'is_live'  => true,
            'provider' => 'fast2sms',
            'message'  => "Fast2SMS Error: {$errorMsg}",
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
        curl_close($ch);

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
        curl_close($ch);

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
     * Fastrr Headless OTP endpoint (Shiprocket Fastrr)
     */
    private static function sendViaFastrr(string $phone, string $otp, string $appId, string $secret, string $token): array {
        $url = 'https://api.fastrr.com/v1/auth/otp/send';
        $postData = ['phone' => '+91' . $phone];

        $headers = [
            'Content-Type: application/json',
            "x-app-id: {$appId}",
            "x-secret-key: {$secret}"
        ];
        if (!empty($token)) {
            $headers[] = "Authorization: Bearer {$token}";
        }

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $decoded = json_decode($response, true);
        if ($httpCode === 200) {
            return [
                'success'  => true,
                'is_live'  => true,
                'provider' => 'fastrr',
                'message'  => "Real SMS dispatched via Fastrr network to +91 {$phone}.",
                'raw'      => $decoded
            ];
        }

        return [
            'success'  => false,
            'is_live'  => true,
            'provider' => 'fastrr',
            'message'  => "Fastrr OTP API error: " . ($decoded['message'] ?? "HTTP {$httpCode}"),
            'raw'      => $decoded
        ];
    }
}
