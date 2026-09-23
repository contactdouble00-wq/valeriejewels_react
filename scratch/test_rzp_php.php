<?php
$key = 'rzp_live_Tf7Bar4fWloC2y';
$secret = 'u8xu0HfY01b0wkwWwiYfEBRN';

$ch = curl_init('https://api.razorpay.com/v1/orders');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_USERPWD, $key . ':' . $secret);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'amount' => 10000,
    'currency' => 'INR',
    'receipt' => 'TEST-001'
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$res = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

echo "HTTP Code: $code\n";
echo "Response: $res\n";
