<?php
require_once __DIR__ . '/../api/utils/dashboard_metrics.php';
function expectMetric($actual, $expected, $label) {
    if ($actual != $expected) throw new RuntimeException("$label: expected " . json_encode($expected) . ', got ' . json_encode($actual));
}
$pdo = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$pdo->exec('CREATE TABLE orders (id INTEGER PRIMARY KEY, order_status TEXT, payment_type TEXT, payment_status TEXT, total_amount NUMERIC, refund_amount NUMERIC, created_at TEXT);
CREATE TABLE order_tracking_events (id INTEGER PRIMARY KEY, order_id INTEGER, status TEXT, title TEXT, occurred_at TEXT);');
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
    (1, 5, 'shipped', 'Rto Initiated', '2026-11-16 10:00:00'),
    (2, 5, 'shipped', 'Rto Delivered', '2026-11-17 10:00:00'),
    (3, 9, 'shipped', 'Rto Initiated', '2026-11-16 10:00:00'),
    (4, 9, 'delivered', 'Delivered', '2026-12-02 10:00:00'),
    (5, 10, 'shipped', 'RTO In Transit', '2026-11-16 10:00:00');");
$all = dashboardMetrics($pdo, dashboardDateRange([]));
expectMetric($all['total_orders'], 4, 'Processed excludes failed advances and RTO');
expectMetric($all['total_revenue'], 3300, 'Revenue excludes cancelled/RTO and deducts refund');
expectMetric($all['average_order_value'], 825, 'AOV');
expectMetric($all['prepaid_share_percent'], 50, 'Partial COD is not prepaid');
expectMetric($all['cancelled_orders'], 1, 'Cancellation and RTO are mutually exclusive');
expectMetric($all['rto_orders'], 3, 'Legacy tracking RTO counted once per order');
expectMetric($all['rto_cancellation_rate'], 50, 'Cancellation denominator');
expectMetric($all['abandoned_checkouts_count'], 2, 'Abandoned excludes confirmed COD');
expectMetric(array_sum($all['payment_split']), $all['total_orders'], 'Payment breakdown reconciles');
$nov = dashboardMetrics($pdo, dashboardDateRange(['start_date' => '2026-11-01', 'end_date' => '2026-11-30']));
expectMetric($nov['total_orders'], 3, 'Inclusive date boundaries');
expectMetric($nov['total_revenue'], 2400, 'Filtered revenue');
expectMetric($nov['prepaid_share_percent'], 33.3, 'Filtered prepaid percentage');
$empty = dashboardMetrics($pdo, dashboardDateRange(['start_date' => '2020-01-01', 'end_date' => '2020-01-01']));
expectMetric($empty['total_orders'], 0, 'Empty range');
expectMetric($empty['rto_cancellation_rate'], 0, 'Zero denominator');
foreach ([['start_date'=>'2026-02-30','end_date'=>'2026-03-01'], ['start_date'=>'2026-11-01'], ['start_date'=>'2026-12-01','end_date'=>'2026-11-01'], ['start_date'=>[], 'end_date'=>'2026-11-01']] as $bad) {
    try { dashboardDateRange($bad); throw new RuntimeException('Invalid range accepted'); }
    catch (InvalidArgumentException $expected) {}
}
// Reattempts can recover: only the latest carrier event should determine legacy RTO.
$pdo->exec("INSERT INTO order_tracking_events VALUES (6, 5, 'shipped', 'In Transit', '2026-11-18 10:00:00')");
expectMetric(dashboardMetrics($pdo, dashboardDateRange([]))['rto_orders'], 2, 'Recovered shipment no longer RTO');
// Exercise the carrier mapping without connecting to a database or courier API.
require_once __DIR__ . '/../api/shipping/providers/JustShypProvider.php';
foreach (['rto', 'rto_initiated', 'RTO In Transit', 'rto-delivered'] as $status) {
    expectMetric(JustShypProvider::mapStatus($status), 'rto', "Carrier preserves $status");
}
expectMetric(JustShypProvider::mapStatus('delivered'), 'delivered', 'Normal carrier delivery unchanged');
echo "Dashboard metric and date-range tests passed.\n";
