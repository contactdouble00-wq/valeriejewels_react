<?php
$ch = curl_init('https://valeriejewels.in/api/payments/initiate.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'customer_name' => 'QA Tester',
    'customer_email' => 'test@valerieclient.in',
    'customer_phone' => '9023422392',
    'shipping_address_line1' => 'Flat 402 Royal Palms',
    'city' => 'Bengaluru',
    'state' => 'Karnataka',
    'pincode' => '560038',
    'payment_type' => 'full_prepaid',
    'items' => [
        [
            'id' => 20,
            'quantity' => 1
        ]
    ]
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$res = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
echo "HTTP Code: $code\n";
echo "Response: $res\n";
