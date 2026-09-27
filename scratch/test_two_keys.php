<?php
function testKey($name, $apiKey, $secretKey) {
    echo "--- Testing $name ---\n";
    echo "API Key: $apiKey\n";

    $payload = [
        'cart_data' => [
            'items' => [
                [
                    'variant_id' => '20',
                    'quantity' => 1,
                    'catalog_data' => [
                        'price' => 799,
                        'name' => '12-Pair Multicolor Oxidized Earrings Set',
                        'image_url' => 'https://valeriejewels.in/api/uploads/img_2b20d2905362a4ab5f453847f912f317.png'
                    ]
                ]
            ],
            'custom_attributes' => [
                'partial_cod_enabled' => true,
                'partial_advance' => 100,
                'cod_available' => false
            ],
            'partial_cod_enabled' => true,
            'partial_advance' => 100,
            'cod_available' => false,
            'mobile_app' => false
        ],
        'redirect_url' => 'https://valeriejewels.in/',
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
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    echo "HTTP Code: $code\n";
    echo "Response: $res\n\n";
}

testKey('KEY 1 (Old pinned in create_session)', 'TAlJIqacN8rB0njv', 'WWlzNX4C6mHwUUVUsGlUb36LCRBR8qe0');
testKey('KEY 2 (Generated in user screenshot media_1790443521696.png)', 'ZLYHnvhztrR6MmpF', 'v1v2OiQCA3b7R3ouwmPYSQ6xyq4Pct60');
