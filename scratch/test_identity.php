<?php
// Generate a fresh session token first
require_once __DIR__ . '/../api/config/database.php';

$apiKey = 'TAlJIqacN8rB0njv';
$secretKey = 'WWlzNX4C6mHwUUVUsGlUb36LCRBR8qe0';

$cartData = [
    'items' => [
        [
            'variant_id' => '1',
            'quantity' => 1,
            'catalog_data' => [
                'price' => 899.00,
                'name' => 'Royal Noor Jhumka Box',
                'image_url' => 'https://valeriejewels.in/hero-jewelry-model.jpg'
            ]
        ]
    ],
    'custom_attributes' => (object)[],
    'mobile_app' => false
];

$payload = [
    'cart_data' => $cartData,
    'redirect_url' => 'https://valeriejewels.in/#checkout-success',
    'timestamp' => gmdate('Y-m-d\TH:i:s.u\Z')
];

$jsonPayload = json_encode($payload, JSON_UNESCAPED_SLASHES);
$hmac = base64_encode(hash_hmac('sha256', $jsonPayload, $secretKey, true));

$ch = curl_init('https://checkout-api.shiprocket.com/api/v1/access-token/checkout');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'X-Api-Key: ' . $apiKey,
    'X-Api-HMAC-SHA256: ' . $hmac
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonPayload);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$res = curl_exec($ch);
$tokenData = json_decode($res, true);
$token = $tokenData['result']['token'] ?? null;
echo "Token: $token\n";

if ($token) {
    // Test GET / POST to https://edge.pickrr.com/identity-service/api/ve1/seller-customer-token/ui/access-token/checkout/data
    $url = "https://edge.pickrr.com/identity-service/api/ve1/seller-customer-token/ui/access-token/checkout/data?customCheckoutToken=" . urlencode($token);
    $ch2 = curl_init($url);
    curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch2, CURLOPT_SSL_VERIFYPEER, false);
    $res2 = curl_exec($ch2);
    $code2 = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
    echo "GET Status: $code2\nResponse: $res2\n";

    // Test POST
    $ch3 = curl_init("https://edge.pickrr.com/identity-service/api/ve1/seller-customer-token/ui/access-token/checkout/data");
    curl_setopt($ch3, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch3, CURLOPT_POST, true);
    curl_setopt($ch3, CURLOPT_POSTFIELDS, json_encode(['customCheckoutToken' => $token, 'token' => $token]));
    curl_setopt($ch3, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch3, CURLOPT_SSL_VERIFYPEER, false);
    $res3 = curl_exec($ch3);
    $code3 = curl_getinfo($ch3, CURLINFO_HTTP_CODE);
    echo "POST Status: $code3\nResponse: $res3\n";
}
