<?php

function dashboardDateRange(array $input): array {
    $start = $input['start_date'] ?? '';
    $end = $input['end_date'] ?? '';
    if ($start === '' && $end === '') return ['sql' => '1=1', 'params' => [], 'start_date' => null, 'end_date' => null];
    foreach ([$start, $end] as $date) {
        if (!is_string($date) || !preg_match('/^\d{4}-\d{2}-\d{2}$/D', $date)) {
            throw new InvalidArgumentException('Provide both dates in YYYY-MM-DD format.');
        }
        $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
        if (!$parsed || $parsed->format('Y-m-d') !== $date) throw new InvalidArgumentException('Invalid calendar date.');
    }
    if ($start > $end) throw new InvalidArgumentException('Start date must not be after end date.');
    return ['sql' => 'o.created_at >= ? AND o.created_at < ?',
        'params' => [$start . ' 00:00:00', (new DateTimeImmutable($end))->modify('+1 day')->format('Y-m-d 00:00:00')],
        'start_date' => $start, 'end_date' => $end];
}

function dashboardConditions(): array {
    // Legacy carrier integrations store RTO as shipped; use the latest tracking event too.
    $eventTitle = "LOWER(REPLACE(REPLACE(TRIM(e.title), '_', ' '), '-', ' '))";
    $rto = "(o.order_status = 'rto' OR (o.order_status != 'delivered' AND EXISTS (
        SELECT 1 FROM order_tracking_events e WHERE e.order_id = o.id
        AND e.id = (SELECT latest.id FROM order_tracking_events latest WHERE latest.order_id = o.id ORDER BY latest.occurred_at DESC, latest.id DESC LIMIT 1)
        AND (e.status = 'rto' OR $eventTitle IN ('rto', 'rto initiated', 'rto in transit', 'rto delivered', 'rto undelivered', 'return to origin', 'returned to origin'))
    )))";
    $cancelled = "(o.order_status IN ('cancelled', 'canceled') AND NOT $rto)";
    $closed = "($cancelled OR $rto)";
    $processed = "(NOT $closed AND o.order_status != 'failed' AND (
        (o.payment_type IN ('full_prepaid', 'prepaid') AND o.payment_status IN ('paid', 'refunded'))
        OR (o.payment_type = 'partial' AND o.payment_status IN ('partial_paid', 'paid', 'refunded'))
        OR (o.payment_type = 'cod' AND o.payment_status != 'failed' AND o.order_status IN ('confirmed', 'processing', 'in_transit', 'out_for_delivery', 'shipped', 'delivered'))
    ))";
    return compact('rto', 'cancelled', 'closed', 'processed');
}

function dashboardMetrics(PDO $pdo, array $range): array {
    extract(dashboardConditions());
    $net = "CASE WHEN o.payment_status = 'refunded' THEN 0 WHEN o.total_amount > COALESCE(o.refund_amount, 0) THEN o.total_amount - COALESCE(o.refund_amount, 0) ELSE 0 END";
    $abandoned = "(NOT $closed AND NOT $processed AND (o.order_status IN ('pending', 'failed') OR o.payment_status IN ('pending', 'failed')))";
    $stmt = $pdo->prepare("SELECT
        COUNT(CASE WHEN $processed THEN 1 END) AS total_orders,
        COALESCE(SUM(CASE WHEN $processed THEN $net ELSE 0 END), 0) AS total_revenue,
        COUNT(CASE WHEN $processed AND o.payment_type IN ('full_prepaid', 'prepaid') THEN 1 END) AS prepaid_orders,
        COUNT(CASE WHEN $processed AND o.payment_type = 'partial' THEN 1 END) AS partial_cod_orders,
        COUNT(CASE WHEN $processed AND o.payment_type = 'cod' THEN 1 END) AS cod_orders,
        COUNT(CASE WHEN $cancelled THEN 1 END) AS cancelled_orders,
        COUNT(CASE WHEN $rto THEN 1 END) AS rto_orders,
        COUNT(CASE WHEN $abandoned THEN 1 END) AS abandoned_orders_count,
        COALESCE(SUM(CASE WHEN $abandoned THEN o.total_amount ELSE 0 END), 0) AS abandoned_orders_value
        FROM orders o WHERE {$range['sql']}");
    $stmt->execute($range['params']);
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
    $total = (int)$stats['total_orders'];
    $cancelledCount = (int)$stats['cancelled_orders'];
    $rtoCount = (int)$stats['rto_orders'];
    $denominator = $total + $cancelledCount + $rtoCount;
    return [
        'total_orders' => $total,
        'total_revenue' => round((float)$stats['total_revenue'], 2),
        'average_order_value' => $total ? round((float)$stats['total_revenue'] / $total, 2) : 0,
        'prepaid_share_percent' => $total ? round(100 * (int)$stats['prepaid_orders'] / $total, 1) : 0,
        'rto_cancellation_rate' => $denominator ? round(100 * ($cancelledCount + $rtoCount) / $denominator, 1) : 0,
        'cancelled_orders' => $cancelledCount, 'rto_orders' => $rtoCount, 'cancellation_base_orders' => $denominator,
        'payment_split' => ['prepaid' => (int)$stats['prepaid_orders'], 'partial_cod' => (int)$stats['partial_cod_orders'], 'cod' => (int)$stats['cod_orders']],
        'abandoned_checkouts_count' => (int)$stats['abandoned_orders_count'],
        'abandoned_checkouts_value' => (float)$stats['abandoned_orders_value'],
    ];
}
