<?php
require_once __DIR__ . '/../api/config/database.php';
$config = require __DIR__ . '/../api/config/config.php';
$secretKey = $config['fastrr']['secret_key'] ?? 'WWlzNX4C6mHwUUVUsGlUb36LCRBR8qe0';

$pdo = Database::getConnection();

// Ensure test order exists
$testOrderNum = 'VJ-WH-' . time();
$pdo->prepare("
    INSERT INTO orders (order_number, customer_name, customer_email, customer_phone, shipping_address_line1, city, state, pincode, total_amount, amount_paid_upfront, amount_due_on_delivery, payment_type, payment_status, order_status)
    VALUES (?, 'Webhook Tester', 'test@valeriejewels.in', '9876543210', '123 Atelier Street', 'Rajkot', 'Gujarat', '360002', 999, 100, 899, 'partial', 'pending', 'pending')
")->execute([$testOrderNum]);

$stmt = $pdo->prepare("SELECT id FROM orders WHERE order_number = ?");
$stmt->execute([$testOrderNum]);
$orderId = $stmt->fetchColumn();

echo "Created test order #$testOrderNum (ID: $orderId)\n";

$payloadArray = [
    'event'           => 'payment.success',
    'order_number'    => $testOrderNum,
    'order_id'        => (int)$orderId,
    'fastrr_order_id' => 'FST-TEST-ORDER-' . time(),
    'amount_paid'     => 100.00,
    'risk_tier'       => 'low'
];
$payloadJson = json_encode($payloadArray);

// TEST 1: Invalid signature
echo "\n--- Test 1: Invalid Signature ---\n";
$ch = curl_init('http://127.0.0.1:8099/payments/webhook.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payloadJson);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'X-Fastrr-Signature: bad_signature_1234567890abcdef'
]);
$res = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
echo "HTTP Code: $code\n";
echo "Response: $res\n";

// TEST 2: Valid signature (Hex)
echo "\n--- Test 2: Valid Hex Signature ---\n";
$sigHex = hash_hmac('sha256', $payloadJson, $secretKey);
$ch2 = curl_init('http://127.0.0.1:8099/payments/webhook.php');
curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch2, CURLOPT_POST, true);
curl_setopt($ch2, CURLOPT_POSTFIELDS, $payloadJson);
curl_setopt($ch2, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'X-Fastrr-Signature: ' . $sigHex
]);
$res2 = curl_exec($ch2);
$code2 = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
echo "HTTP Code: $code2\n";
echo "Response: $res2\n";

// TEST 3: Valid signature (Base64)
echo "\n--- Test 3: Valid Base64 Signature ---\n";
$sigB64 = base64_encode(hash_hmac('sha256', $payloadJson, $secretKey, true));
$ch3 = curl_init('http://127.0.0.1:8099/payments/webhook.php');
curl_setopt($ch3, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch3, CURLOPT_POST, true);
curl_setopt($ch3, CURLOPT_POSTFIELDS, $payloadJson);
curl_setopt($ch3, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'X-Fastrr-Signature: ' . $sigB64
]);
$res3 = curl_exec($ch3);
$code3 = curl_getinfo($ch3, CURLINFO_HTTP_CODE);
echo "HTTP Code: $code3\n";
echo "Response: $res3\n";

// Verify DB order status was updated
$checkStmt = $pdo->prepare("SELECT order_number, payment_status, order_status, fastrr_order_id, amount_paid_upfront, amount_due_on_delivery FROM orders WHERE id = ?");
$checkStmt->execute([$orderId]);
$updatedOrder = $checkStmt->fetch(PDO::FETCH_ASSOC);
echo "\nUpdated Order in DB:\n";
print_r($updatedOrder);
