<?php
/**
 * VALERIE JEWELS — Shiprocket Fastrr Checkout: Create Access Token Session
 * Conforms to Shiprocket Checkout Custom Integration Specification (Page 5-6)
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/config/database.php';

handleCors();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    ApiResponse::error('Method not allowed. Use POST.', 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
$items = $input['items'] ?? [];

if (empty($items)) {
    ApiResponse::error('Cart is empty. Add products before checking out.', 422);
}

try {
    $pdo = Database::getConnection();

    // Fetch site settings
    $settings = [];
    try {
        $stmt = $pdo->prepare("SELECT `value` FROM `site_settings` WHERE `key` = 'payment_settings' LIMIT 1");
        $stmt->execute();
        $raw = $stmt->fetchColumn();
        if ($raw) {
            $settings = json_decode($raw, true) ?: [];
        }
    } catch (Exception $e) {}

    // Load credentials strictly from environment / config
    $config = require dirname(__DIR__) . '/config/config.php';
    $apiKey = getenv('FASTRR_APP_ID') ?: (!empty($config['fastrr']['app_id']) ? $config['fastrr']['app_id'] : ($settings['fastrr_app_id'] ?? ''));
    $secretKey = getenv('FASTRR_SECRET_KEY') ?: (!empty($config['fastrr']['secret_key']) ? $config['fastrr']['secret_key'] : ($settings['fastrr_secret_key'] ?? ''));

    if (empty($apiKey) || empty($secretKey)) {
        error_log('[CRITICAL] Fastrr Session: Cannot create checkout session. FASTRR_APP_ID or FASTRR_SECRET_KEY is missing from environment.');
        ApiResponse::error('Fastrr checkout is temporarily unconfigured. Please configure FASTRR_APP_ID and FASTRR_SECRET_KEY in environment.', 503);
    }

    // Dynamic payment settings from database
    $partialCodEnabled = isset($settings['partial_cod_enabled']) ? (bool)$settings['partial_cod_enabled'] : true;
    $partialAdvance    = isset($settings['partial_advance']) ? (int)$settings['partial_advance'] : 100;
    $codAvailable      = isset($settings['cod_available']) ? (bool)$settings['cod_available'] : false;

    $formattedItems = [];
    $totalAmount = 0.0;

    foreach ($items as $item) {
        $pId = (string)($item['variant_id'] ?? $item['id'] ?? '1');
        $qty = max(1, (int)($item['quantity'] ?? 1));
        $price = (float)($item['price'] ?? 0);
        $name = trim($item['name'] ?? $item['title'] ?? 'Valerie Fine Jewelry');
        $img = trim($item['image'] ?? $item['image_url'] ?? 'https://valeriejewels.in/hero-jewelry-model.jpg');

        if (str_starts_with($img, '/')) {
            $img = 'https://valeriejewels.in' . $img;
        }

        $formattedItems[] = [
            'variant_id'   => $pId,
            'quantity'     => $qty,
            'catalog_data' => [
                'price'     => round($price, 2),
                'name'      => $name,
                'image_url' => $img
            ]
        ];

        $totalAmount += ($price * $qty);
    }

    $cartData = [
        'items'               => $formattedItems,
        'custom_attributes'   => [
            'partial_cod_enabled' => $partialCodEnabled,
            'partial_advance'     => $partialAdvance,
            'cod_available'       => $codAvailable,
        ],
        'partial_cod_enabled' => $partialCodEnabled,
        'partial_advance'     => $partialAdvance,
        'cod_available'       => $codAvailable,
        'mobile_app'          => false
    ];

    // Optional coupon discount
    $couponCode = trim($input['coupon_code'] ?? '');
    $discountAmount = (float)($input['discount_amount'] ?? 0);
    if (!empty($couponCode) && $discountAmount > 0) {
        $cartData['cart_discount'] = [
            'coupon_code' => $couponCode,
            'amount'      => round($discountAmount, 2)
        ];
    }

    $payload = [
        'cart_data'    => $cartData,
        'redirect_url' => 'https://valeriejewels.in/#checkout-success',
        'timestamp'    => gmdate('Y-m-d\TH:i:s.u\Z')
    ];

    // Clear logging for outgoing session payload
    error_log(sprintf(
        "[Fastrr Checkout] Outgoing session payload: items=%d, partial_cod_enabled=%s, partial_advance=%d, cod_available=%s",
        count($formattedItems),
        $partialCodEnabled ? 'true' : 'false',
        $partialAdvance,
        $codAvailable ? 'true' : 'false'
    ));


    $jsonPayload = json_encode($payload, JSON_UNESCAPED_SLASHES);
    $hmac = base64_encode(hash_hmac('sha256', $jsonPayload, $secretKey, true));

    $endpoint = 'https://checkout-api.shiprocket.com/api/v1/access-token/checkout';

    $ch = curl_init($endpoint);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'X-Api-Key: ' . $apiKey,
        'X-Api-HMAC-SHA256: ' . $hmac
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonPayload);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 12);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);

    $decoded = json_decode($response, true);

    if ($httpCode === 200 && !empty($decoded['ok']) && !empty($decoded['result']['token'])) {
        ApiResponse::success([
            'token'      => $decoded['result']['token'],
            'order_id'   => $decoded['result']['data']['order_id'] ?? null,
            'expires_at' => $decoded['result']['expires_at'] ?? null,
            'provider'   => 'shiprocket_fastrr',
        ], 'Checkout token generated successfully.');
    }

    // Fastrr API error detail
    $errMsg = $decoded['error']['message'] ?? $decoded['message'] ?? $curlErr ?? "HTTP {$httpCode} error initiating Fastrr checkout.";
    ApiResponse::error($errMsg, 502, ['fastrr_raw' => $decoded]);

} catch (Throwable $e) {
    ApiResponse::error('Checkout session creation failed: ' . $e->getMessage(), 500);
}
