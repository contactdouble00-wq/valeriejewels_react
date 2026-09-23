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

if (!$token) {
    echo "Login failed: $loginRes\n";
    exit;
}

echo "Admin logged in successfully!\n";

$ordersCh = curl_init('https://valeriejewels.in/api/admin/orders.php?limit=15');
curl_setopt($ordersCh, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ordersCh, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $token
]);
curl_setopt($ordersCh, CURLOPT_SSL_VERIFYPEER, false);
$ordersRes = curl_exec($ordersCh);
$ordersData = json_decode($ordersRes, true);

echo "Total Orders Count: " . count($ordersData['data']['orders'] ?? []) . "\n";
foreach (array_slice($ordersData['data']['orders'] ?? [], 0, 10) as $ord) {
    echo sprintf(
        "Order #%s | %s | %s | Type: %s | Status: %s | ₹%s | %s\n",
        $ord['order_number'],
        $ord['customer_name'] ?? 'N/A',
        $ord['customer_phone'] ?? 'N/A',
        $ord['payment_type'],
        $ord['payment_status'],
        $ord['total_amount'],
        $ord['created_at']
    );
}
