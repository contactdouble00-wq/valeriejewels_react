<?php
$ch = curl_init('https://valeriejewels.in/api/fastrr/create_session.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'items' => [
        [
            'id' => 1,
            'name' => 'Royal Noor Jhumka Box',
            'price' => 1799,
            'quantity' => 1,
            'image' => 'https://valeriejewels.in/hero-jewelry-model.jpg'
        ]
    ]
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$res = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
echo "Fastrr Create Session HTTP Code: $code\n";
echo "Response: $res\n";
