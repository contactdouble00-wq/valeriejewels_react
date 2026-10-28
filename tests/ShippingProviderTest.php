<?php
/**
 * Automated Verification Tests for Multi-Provider Delivery System (Shiprocket + JustShyp)
 * Run via CLI: php tests/ShippingProviderTest.php
 */

require_once __DIR__ . '/../api/config/database.php';
require_once __DIR__ . '/../api/shipping/DeliveryProviderInterface.php';
require_once __DIR__ . '/../api/shipping/DeliveryProviderFactory.php';
require_once __DIR__ . '/../api/shipping/providers/ShiprocketProvider.php';
require_once __DIR__ . '/../api/shipping/providers/JustShypProvider.php';

class TestRunner
{
    private int $passed = 0;
    private int $failed = 0;
    private array $errors = [];

    public function assert(bool $condition, string $testName, string $detail = ''): void
    {
        if ($condition) {
            $this->passed++;
            echo "  [PASS] {$testName}\n";
        } else {
            $this->failed++;
            $msg = "  [FAIL] {$testName}" . ($detail ? " — {$detail}" : "");
            echo "{$msg}\n";
            $this->errors[] = $msg;
        }
    }

    public function report(): bool
    {
        echo "\n============================================\n";
        echo "TEST SUMMARY: {$this->passed} Passed, {$this->failed} Failed\n";
        echo "============================================\n";
        if ($this->failed > 0) {
            echo "Failures:\n";
            foreach ($this->errors as $err) {
                echo "  {$err}\n";
            }
            return false;
        }
        return true;
    }
}

$t = new TestRunner();

echo "Running Valerie Jewels Multi-Provider Delivery System Tests...\n\n";

// -------------------------------------------------------------
// Test 1: DeliveryProviderFactory Instantiation & Strategy Pattern
// -------------------------------------------------------------
echo "1. Testing DeliveryProviderFactory Strategy Resolution:\n";

$sr = DeliveryProviderFactory::getProvider('shiprocket');
$t->assert($sr instanceof ShiprocketProvider, 'Factory resolves ShiprocketProvider');
$t->assert($sr->getName() === 'shiprocket', 'ShiprocketProvider getName() is shiprocket');

$js = DeliveryProviderFactory::getProvider('justshyp');
$t->assert($js instanceof JustShypProvider, 'Factory resolves JustShypProvider');
$t->assert($js->getName() === 'justshyp', 'JustShypProvider getName() is justshyp');

$default = DeliveryProviderFactory::getDefaultProvider();
$t->assert($default instanceof DeliveryProviderInterface, 'Factory resolves valid default provider');

// -------------------------------------------------------------
// Test 2: JustShyp Status Mapping to Valerie Jewels internal statuses
// -------------------------------------------------------------
echo "\n2. Testing JustShyp Status Mapping Table:\n";

$statusCases = [
    'order_created'       => 'processing',
    'created'             => 'processing',
    'manifest_generated'  => 'processing',
    'pickup_scheduled'    => 'processing',
    'packed'              => 'processing',
    'in_transit'          => 'shipped',
    'shipped'             => 'shipped',
    'reached_hub'         => 'shipped',
    'out_for_delivery'    => 'out_for_delivery',
    'dispatched'          => 'shipped',
    'delivered'           => 'delivered',
    'closed'              => 'delivered',
    'cancelled'           => 'cancelled',
    'rto_initiated'       => 'rto',
    'rto_delivered'       => 'rto',
    'undelivered'         => 'processing',
];

foreach ($statusCases as $input => $expected) {
    $mapped = JustShypProvider::mapStatus($input);
    $t->assert($mapped === $expected, "Status '{$input}' maps to '{$expected}'", "Got '{$mapped}'");
}

// -------------------------------------------------------------
// Test 3: JustShyp Settings & Token Handling
// -------------------------------------------------------------
echo "\n3. Testing JustShyp Configuration & Settings Loader:\n";

$settings = JustShypProvider::getSettings();
$t->assert(is_array($settings), 'getSettings() returns an array');
$t->assert(isset($settings['base_url']), 'Settings includes base_url');
$t->assert(!empty($settings['base_url']), 'Default base_url is not empty (' . $settings['base_url'] . ')');
$t->assert(isset($settings['access_token']), 'Settings includes access_token field');

// Test override token
$testToken = 'test_token_v3_secure_12345';
$retrievedToken = JustShypProvider::getAccessToken($testToken);
$t->assert($retrievedToken === $testToken, 'getAccessToken() respects direct parameter overrides');

// -------------------------------------------------------------
// Test 4: Database Schema Verification
// -------------------------------------------------------------
echo "\n4. Testing Database Schema & Order Table Provider Columns:\n";

try {
    $pdo = Database::getConnection();
    $driver = Database::getDriver();
    $t->assert(true, "Database connection established ({$driver})");

    if ($driver === 'sqlite') {
        $colsStmt = $pdo->query("PRAGMA table_info(orders)");
        $cols = array_column($colsStmt->fetchAll(PDO::FETCH_ASSOC), 'name');
    } else {
        $colsStmt = $pdo->query("DESCRIBE orders");
        $cols = array_column($colsStmt->fetchAll(PDO::FETCH_ASSOC), 'Field');
    }

    $requiredColumns = [
        'delivery_provider',
        'provider_order_id',
        'provider_shipment_id',
        'provider_awb',
        'shipping_label_url',
        'shipping_invoice_url',
        'shiprocket_order_id',
        'shiprocket_awb',
    ];

    foreach ($requiredColumns as $col) {
        $t->assert(in_array($col, $cols, true), "Column '{$col}' exists on orders table");
    }

    // Check warehouse_mappings table
    if ($driver === 'sqlite') {
        $tblCheck = $pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name='warehouse_mappings'")->fetchColumn();
    } else {
        $tblCheck = $pdo->query("SHOW TABLES LIKE 'warehouse_mappings'")->fetchColumn();
    }
    $t->assert(!empty($tblCheck), "Table 'warehouse_mappings' exists in database");

} catch (Throwable $e) {
    $t->assert(false, 'Database schema test exception', $e->getMessage());
}

// -------------------------------------------------------------
// Test 5: Order-Aware Provider Routing (Backwards Compatibility)
// -------------------------------------------------------------
echo "\n5. Testing Order-Aware Provider Routing (Zero Shiprocket Regression):\n";

try {
    $pdo = Database::getConnection();
    $now = date('Y-m-d H:i:s');

    // Create a mock Shiprocket order
    $pdo->prepare("
        INSERT INTO orders (order_number, customer_name, customer_email, customer_phone, shipping_address_line1, city, state, pincode, subtotal, total_amount, payment_type, payment_status, order_status, delivery_provider, shiprocket_order_id, shiprocket_awb, created_at, updated_at)
        VALUES ('TEST-SR-001', 'Test Shiprocket Customer', 'test.sr@example.com', '9876543210', '123 Atelier Street', 'Mumbai', 'Maharashtra', '400096', 500, 500, 'prepaid', 'paid', 'confirmed', 'shiprocket', 'SR-TEST-12345', 'AWB-SR-99999', '{$now}', '{$now}')
    ")->execute();
    $srOrderId = (int)$pdo->lastInsertId();

    $resolvedSrProvider = DeliveryProviderFactory::getProviderForOrder($srOrderId);
    $t->assert($resolvedSrProvider instanceof ShiprocketProvider, 'Order with delivery_provider=shiprocket routes to ShiprocketProvider');

    // Create a mock JustShyp order
    $pdo->prepare("
        INSERT INTO orders (order_number, customer_name, customer_email, customer_phone, shipping_address_line1, city, state, pincode, subtotal, total_amount, payment_type, payment_status, order_status, delivery_provider, provider_order_id, provider_awb, created_at, updated_at)
        VALUES ('TEST-JS-001', 'Test JustShyp Customer', 'test.js@example.com', '9876543211', '456 Gem Way', 'New Delhi', 'Delhi', '110001', 1200, 1200, 'prepaid', 'paid', 'confirmed', 'justshyp', 'JS-ORD-9876', 'JS-AWB-112233', '{$now}', '{$now}')
    ")->execute();
    $jsOrderId = (int)$pdo->lastInsertId();

    $resolvedJsProvider = DeliveryProviderFactory::getProviderForOrder($jsOrderId);
    $t->assert($resolvedJsProvider instanceof JustShypProvider, 'Order with delivery_provider=justshyp routes to JustShypProvider');

    // Clean up test rows
    $pdo->prepare("DELETE FROM orders WHERE id IN (?, ?)")->execute([$srOrderId, $jsOrderId]);
    $t->assert(true, 'Test orders cleaned up successfully');

} catch (Throwable $e) {
    $t->assert(false, 'Order routing test exception', $e->getMessage());
}

// -------------------------------------------------------------
// Test 6: Package Dimension & Weight Compatibility (KG Format)
// -------------------------------------------------------------
echo "\n6. Testing Package Dimensions & Weight in KG for JustShyp:\n";

try {
    // 1. Test 16-piece jhumkha box order
    $pdo->prepare("
        INSERT INTO orders (order_number, customer_name, customer_email, customer_phone, shipping_address_line1, city, state, pincode, subtotal, total_amount, payment_type, payment_status, order_status, created_at, updated_at)
        VALUES ('TEST-DIM-16PC', '16pc Test', 'dim16@example.com', '9876543212', 'Plot 5', 'Jaipur', 'Rajasthan', '302001', 1999, 1999, 'cod', 'pending', 'confirmed', '{$now}', '{$now}')
    ")->execute();
    $order16Id = (int)$pdo->lastInsertId();

    $pdo->prepare("
        INSERT INTO order_items (order_id, product_name, quantity, unit_price, total_price)
        VALUES (?, '16 Pairs Oxidized Ethnic Jhumka Box Collection', 1, 1999, 1999)
    ")->execute([$order16Id]);

    $pkg16 = JustShypProvider::calculatePackageDimensions($order16Id);
    $t->assert((float)$pkg16['length'] === 27.0, '16 Piece Jhumkhas Length is 27 cm', 'Got ' . $pkg16['length']);
    $t->assert((float)$pkg16['breadth'] === 10.0, '16 Piece Jhumkhas Breadth is 10 cm', 'Got ' . $pkg16['breadth']);
    $t->assert((float)$pkg16['height'] === 9.0, '16 Piece Jhumkhas Height is 9 cm', 'Got ' . $pkg16['height']);
    $t->assert((float)$pkg16['weight'] === 0.5, '16 Piece Jhumkhas Weight is 0.5 kg', 'Got ' . $pkg16['weight']);

    // 2. Test 12-piece jhumkha box order
    $pdo->prepare("
        INSERT INTO orders (order_number, customer_name, customer_email, customer_phone, shipping_address_line1, city, state, pincode, subtotal, total_amount, payment_type, payment_status, order_status, created_at, updated_at)
        VALUES ('TEST-DIM-12PC', '12pc Test', 'dim12@example.com', '9876543213', 'Plot 6', 'Surat', 'Gujarat', '395007', 1499, 1499, 'cod', 'pending', 'confirmed', '{$now}', '{$now}')
    ")->execute();
    $order12Id = (int)$pdo->lastInsertId();

    $pdo->prepare("
        INSERT INTO order_items (order_id, product_name, quantity, unit_price, total_price)
        VALUES (?, '12 Piece Curated Royal Jhumka Collection', 1, 1499, 1499)
    ")->execute([$order12Id]);

    $pkg12 = JustShypProvider::calculatePackageDimensions($order12Id);
    $t->assert((float)$pkg12['length'] === 11.7, '12 Piece Jhumkhas Length is 11.7 cm', 'Got ' . $pkg12['length']);
    $t->assert((float)$pkg12['breadth'] === 7.0, '12 Piece Jhumkhas Breadth is 7 cm', 'Got ' . $pkg12['breadth']);
    $t->assert((float)$pkg12['height'] === 18.5, '12 Piece Jhumkhas Height is 18.5 cm', 'Got ' . $pkg12['height']);
    $t->assert((float)$pkg12['weight'] === 0.4, '12 Piece Jhumkhas Weight is 0.4 kg', 'Got ' . $pkg12['weight']);

    // Clean up
    $pdo->prepare("DELETE FROM order_items WHERE order_id IN (?, ?)")->execute([$order16Id, $order12Id]);
    $pdo->prepare("DELETE FROM orders WHERE id IN (?, ?)")->execute([$order16Id, $order12Id]);

} catch (Throwable $e) {
    $t->assert(false, 'Dimension calculation test exception', $e->getMessage());
}

// Final Report
$success = $t->report();
exit($success ? 0 : 1);
