<?php
require_once __DIR__ . '/../api/utils/dashboard_metrics.php';
function expectMetric($actual, $expected, $label) {
    if ($actual != $expected) throw new RuntimeException("$label: expected " . json_encode($expected) . ', got ' . json_encode($actual));
}
$pdo = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$pdo->exec('CREATE TABLE orders (id INTEGER PRIMARY KEY, order_status TEXT, payment_type TEXT, payment_status TEXT, total_amount NUMERIC, refund_amount NUMERIC, created_at TEXT);
CREATE TABLE order_tracking_events (id INTEGER PRIMARY KEY, order_id INTEGER, status TEXT NOT NULL, status_milestone TEXT NOT NULL, title TEXT NOT NULL, occurred_at TEXT);');
$insert = $pdo->prepare('INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?, ?)');
$rows = [
    [1, 'confirmed', 'full_prepaid', 'paid', 1000, 0, '2026-11-01 00:00:00'],
    [2, 'shipped', 'partial', 'partial_paid', 900, 0, '2026-11-30 23:59:59'],
    [3, 'confirmed', 'cod', 'pending', 500, 0, '2026-11-15 12:00:00'],
    [4, 'cancelled', 'full_prepaid', 'refunded', 1000, 1000, '2026-11-15 12:00:00'],
    [5, 'shipped', 'partial', 'partial_paid', 900, 0, '2026-11-15 12:00:00'],
    [6, 'rto', 'cod', 'pending', 500, 0, '2026-11-15 12:00:00'],
    [7, 'pending', 'full_prepaid', 'pending', 999, 0, '2026-11-15 12:00:00'],
    [8, 'confirmed', 'partial', 'failed', 999, 0, '2026-11-15 12:00:00'],
    [9, 'delivered', 'prepaid', 'paid', 1000, 100, '2026-12-01 00:00:00'],
    [10, 'cancelled', 'partial', 'refunded', 900, 49, '2026-11-15 12:00:00'],
];
foreach ($rows as $row) $insert->execute($row);
$pdo->exec("INSERT INTO order_tracking_events VALUES
    (1, 5, 'shipped', 'shipped', 'Rto Initiated', '2026-11-16 10:00:00'),
    (2, 5, 'shipped', 'shipped', 'Rto Delivered', '2026-11-17 10:00:00'),
    (3, 9, 'shipped', 'shipped', 'Rto Initiated', '2026-11-16 10:00:00'),
    (4, 9, 'delivered', 'delivered', 'Delivered', '2026-12-02 10:00:00'),
    (5, 10, 'shipped', 'shipped', 'RTO In Transit', '2026-11-16 10:00:00');");
$all = dashboardMetrics($pdo, dashboardDateRange([]));
expectMetric($all['total_orders'], 4, 'Processed excludes failed advances and RTO');
expectMetric($all['total_revenue'], 3300, 'Revenue excludes cancelled/RTO and deducts refund');
expectMetric($all['average_order_value'], 825, 'AOV');
expectMetric($all['prepaid_share_percent'], 50, 'Partial COD is not prepaid');
expectMetric($all['cancelled_orders'], 1, 'Cancellation and RTO are mutually exclusive');
expectMetric($all['rto_orders'], 3, 'Legacy tracking RTO counted once per order');
expectMetric($all['rto_percentage'], 42.9, 'RTO percentage excludes cancellations');
expectMetric($all['rto_base_orders'], 7, 'Processed plus RTO denominator');
expectMetric($all['abandoned_checkouts_count'], 2, 'Abandoned excludes confirmed COD');
expectMetric(array_sum($all['payment_split']), $all['total_orders'], 'Payment breakdown reconciles');
$nov = dashboardMetrics($pdo, dashboardDateRange(['start_date' => '2026-11-01', 'end_date' => '2026-11-30']));
expectMetric($nov['total_orders'], 3, 'Inclusive date boundaries');
expectMetric($nov['total_revenue'], 2400, 'Filtered revenue');
expectMetric($nov['prepaid_share_percent'], 33.3, 'Filtered prepaid percentage');
expectMetric($nov['rto_percentage'], 50, 'Filtered RTO percentage');
$empty = dashboardMetrics($pdo, dashboardDateRange(['start_date' => '2020-01-01', 'end_date' => '2020-01-01']));
expectMetric($empty['total_orders'], 0, 'Empty range');
expectMetric($empty['rto_percentage'], 0, 'Zero denominator');
foreach ([['start_date'=>'2026-02-30','end_date'=>'2026-03-01'], ['start_date'=>'2026-11-01'], ['start_date'=>'2026-12-01','end_date'=>'2026-11-01'], ['start_date'=>[], 'end_date'=>'2026-11-01']] as $bad) {
    try { dashboardDateRange($bad); throw new RuntimeException('Invalid range accepted'); }
    catch (InvalidArgumentException $expected) {}
}
// Reattempts can recover: only the latest carrier event should determine legacy RTO.
$pdo->exec("INSERT INTO order_tracking_events VALUES (6, 5, 'shipped', 'shipped', 'In Transit', '2026-11-18 10:00:00')");
expectMetric(dashboardMetrics($pdo, dashboardDateRange([]))['rto_orders'], 2, 'Recovered shipment no longer RTO');
// Exercise the carrier mapping without connecting to a database or courier API.
require_once __DIR__ . '/../api/shipping/providers/JustShypProvider.php';
foreach (['rto', 'rto_initiated', 'RTO In Transit', 'rto-delivered'] as $status) {
    expectMetric(JustShypProvider::mapStatus($status), 'rto', "Carrier preserves $status");
}
expectMetric(JustShypProvider::mapStatus('delivered'), 'delivered', 'Normal carrier delivery unchanged');
echo "Dashboard metric and date-range tests passed.\n";

require_once __DIR__ . '/../api/utils/carrier_reconciliation.php';
$pdo->exec("ALTER TABLE orders ADD COLUMN provider_awb TEXT;
    ALTER TABLE orders ADD COLUMN shiprocket_awb TEXT;
    ALTER TABLE orders ADD COLUMN delivery_provider TEXT;
    ALTER TABLE orders ADD COLUMN order_number TEXT;
    ALTER TABLE orders ADD COLUMN updated_at TEXT;
    ALTER TABLE order_tracking_events ADD COLUMN description TEXT;
    ALTER TABLE order_tracking_events ADD COLUMN location TEXT;
    UPDATE orders SET provider_awb = 'JS-1', delivery_provider = 'justshyp', order_number = 'V1' WHERE id = 1;
    UPDATE orders SET provider_awb = 'REPLACEMENT', delivery_provider = 'justshyp', order_number = 'V2' WHERE id = 2;
    UPDATE orders SET provider_awb = 'SR-3', delivery_provider = 'shiprocket', order_number = 'V3' WHERE id = 3;
    UPDATE orders SET delivery_provider = 'justshyp', order_number = 'V7' WHERE id = 7;");
$feed = [
    ['waybill_number' => 'JS-1', 'channel_order_id' => 'V1'],
    ['waybill_number' => 'JS-1', 'channel_order_id' => 'V1'],
    ['waybill_number' => 'OLD-2', 'channel_order_id' => 'V2'],
    ['waybill_number' => 'SR-3', 'channel_order_id' => 'V3'],
    ['waybill_number' => 'UNSAVED-7', 'channel_order_id' => 'V7'],
    ['waybill_number' => 'UNKNOWN'],
];
expectMetric(reconcileJustShypRtoList($pdo, $feed), 2, 'Confirmed feed reconciles unique matching orders');
expectMetric(reconcileJustShypRtoList($pdo, $feed), 0, 'Repeated carrier feed is idempotent');
expectMetric($pdo->query('SELECT order_status FROM orders WHERE id = 2')->fetchColumn(), 'shipped', 'Old AWB cannot mark replacement RTO');
expectMetric($pdo->query('SELECT order_status FROM orders WHERE id = 3')->fetchColumn(), 'confirmed', 'Provider isolation');
expectMetric(dashboardMetrics($pdo, dashboardDateRange([]))['rto_orders'], 4, 'Dashboard includes panel feed and existing RTOs once');
expectMetric($pdo->query("SELECT COUNT(*) FROM order_tracking_events WHERE description LIKE 'Verified against%'")->fetchColumn(), 2, 'One audit event per correction');
expectMetric($pdo->query("SELECT COUNT(*) FROM order_tracking_events WHERE description LIKE 'Verified against%' AND status = 'rto' AND status_milestone = 'rto'")->fetchColumn(), 2, 'Reconciled RTO events populate both required status fields');
echo "RTO panel-to-dashboard reconciliation tests passed.\n";

$pdo->exec('CREATE TABLE site_settings (`key` TEXT PRIMARY KEY, `value` TEXT)');
$provider = new class {
    public bool $available = true;
    public function listNdr(array $params): array {
        return $this->available
            ? ['success' => true, 'ndr_shipments' => [['waybill_number' => 'JS-CACHED', 'channel_order_id' => 'V2']]]
            : ['success' => false];
    }
};
$live = loadJustShypRtoFeed($pdo, $provider, []);
expectMetric($live['cached'], false, 'Panel response saved');
$provider->available = false;
$cached = loadJustShypRtoFeed($pdo, $provider, []);
expectMetric($cached['cached'], true, 'Dashboard falls back to saved panel records');
expectMetric($cached['ndr_shipments'], $live['ndr_shipments'], 'Failure never replaces saved RTO records with zero');
$pdo->exec("UPDATE orders SET provider_awb = NULL, shiprocket_awb = 'AUTO-SR', delivery_provider = 'shiprocket' WHERE id = 2");
expectMetric(reconcileJustShypRtoList($pdo, $cached['ndr_shipments']), 1, 'Panel merchant order ID matches automatic Shiprocket assignment');
expectMetric(reconcileJustShypRtoList($pdo, $cached['ndr_shipments']), 0, 'Saved panel replay does not double count');
echo "RTO panel snapshot fallback tests passed.\n";
