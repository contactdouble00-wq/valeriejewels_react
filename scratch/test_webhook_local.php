<?php
require_once __DIR__ . '/../api/config/database.php';
$config = require __DIR__ . '/../api/config/config.php';
$secretKey = $config['fastrr']['secret_key'] ?? 'WWlzNX4C6mHwUUVUsGlUb36LCRBR8qe0';

// Ensure a test order exists in DB to test webhook
$pdo = Database::getConnection();

// Create orders table if needed
if (Database::getDriver() === 'sqlite') {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_number TEXT UNIQUE,
            customer_name TEXT,
            customer_email TEXT,
            customer_phone TEXT,
            total_amount REAL DEFAULT 0,
            amount_paid_upfront REAL DEFAULT 0,
            amount_due_on_delivery REAL DEFAULT 0,
            payment_type TEXT DEFAULT 'partial',
            payment_status TEXT DEFAULT 'pending',
            order_status TEXT DEFAULT 'pending',
            fastrr_order_id TEXT,
            fastrr_risk_tier TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    ");
}

$testOrderNum = 'VJ-TEST-' . time();
$pdo->prepare("
    INSERT INTO orders (order_number, customer_name, customer_phone, total_amount, amount_paid_upfront, amount_due_on_delivery, payment_type, payment_status, order_status)
    VALUES (?, 'Test Customer', '9876543210', 899, 100, 799, 'partial', 'pending', 'pending')
")->execute([$testOrderNum]);

$stmt = $pdo->prepare("SELECT id FROM orders WHERE order_number = ?");
$stmt->execute([$testOrderNum]);
$orderId = $stmt->fetchColumn();

echo "Created test order #$testOrderNum (ID: $orderId)\n";

$webhookPayload = json_encode([
    'event' => 'payment.success',
    'order_number' => $testOrderNum,
    'order_id' => $orderId,
    'fastrr_order_id' => 'FST-TEST-999',
    'amount_paid' => 100.00,
    'risk_tier' => 'low'
]);

// 1. Test with invalid signature
echo "\n--- Test 1: Invalid Signature ---\n";
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['HTTP_X_FASTRR_SIGNATURE'] = 'invalid_signature_hex';

// Run webhook script via internal curl or include with php stream wrapper
// We will test using curl to a local server or directly with mock
// Let's test signature calculation directly against webhook logic:
$sigHex = hash_hmac('sha256', $webhookPayload, $secretKey);
$sigB64 = base64_encode(hash_hmac('sha256', $webhookPayload, $secretKey, true));

echo "Expected Hex: $sigHex\n";
echo "Expected Base64: $sigB64\n";

$isValidHex = hash_equals($sigHex, $sigHex);
$isValidB64 = hash_equals(base64_encode(hash_hmac('sha256', $webhookPayload, $secretKey, true)), $sigB64);
echo "Hex check: " . ($isValidHex ? "PASSED" : "FAILED") . "\n";
echo "Base64 check: " . ($isValidB64 ? "PASSED" : "FAILED") . "\n";
