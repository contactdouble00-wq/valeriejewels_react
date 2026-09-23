<?php
$loginCh = curl_init('https://valeriejewels.in/api/auth/login.php');
curl_setopt($loginCh, CURLOPT_RETURNTRANSFER, true);
curl_setopt($loginCh, CURLOPT_POST, true);
curl_setopt($loginCh, CURLOPT_POSTFIELDS, json_encode([
    'email' => 'admin@valeriejewels.com',
    'password' => 'Admin@Valerie2026!'
]));
curl_setopt($loginCh, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($loginCh, CURLOPT_SSL_VERIFYPEER, false);
$loginRes = curl_exec($loginCh);
$loginData = json_decode($loginRes, true);
$token = $loginData['data']['token'] ?? null;

$ch = curl_init('https://valeriejewels.in/api/settings/payments.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $token
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$res = curl_exec($ch);
echo "Settings with Admin Auth:\n";
echo $res . "\n";
