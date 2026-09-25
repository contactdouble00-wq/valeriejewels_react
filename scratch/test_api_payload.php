<?php
$apiKey = 'TAlJIqacN8rB0njv';
$secretKey = 'WWlzNX4C6mHwUUVUsGlUb36LCRBR8qe0';

function testPayload($extraData = []) {
    global $apiKey, $secretKey;

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
        'custom_attributes' => [
            'cod_available' => true,
            'partial_cod_enabled' => true,
            'partial_advance' => 100,
        ],
        'cod_available' => true,
        'partial_cod_enabled' => true,
        'partial_advance' => 100,
        'mobile_app' => false
    ];

    $payload = [
        'cart_data' => $cartData,
        'redirect_url' => 'https://valeriejewels.in/#checkout-success',
        'timestamp' => gmdate('Y-m-d\TH:i:s.u\Z')
    ];

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
    echo "HTTP: $httpCode\n";
    echo "Response: $response\n";
}

echo "Testing with payment settings in cart_data and custom_attributes:\n";
testPayload();
