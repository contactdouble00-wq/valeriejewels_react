<?php

function loadJustShypRtoFeed(PDO $pdo, $provider, array $params): array {
    $key = 'justshyp_rto_panel_snapshot';
    try {
        $result = $provider->listNdr(array_merge($params, ['ndr_type' => 'rto']));
        if (empty($result['success']) || !is_array($result['ndr_shipments'] ?? null)) {
            throw new RuntimeException('RTO feed unavailable');
        }
        $snapshot = ['ndr_shipments' => $result['ndr_shipments'], 'saved_at' => date('Y-m-d H:i:s')];
        $sql = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite'
            ? 'INSERT INTO site_settings (`key`, `value`) VALUES (?, ?) ON CONFLICT(`key`) DO UPDATE SET `value` = excluded.`value`'
            : 'INSERT INTO site_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)';
        $pdo->prepare($sql)->execute([$key, json_encode($snapshot, JSON_THROW_ON_ERROR)]);
        return $snapshot + ['success' => true, 'cached' => false];
    } catch (Throwable $e) {
        $stmt = $pdo->prepare('SELECT `value` FROM site_settings WHERE `key` = ?');
        $stmt->execute([$key]);
        $snapshot = json_decode($stmt->fetchColumn() ?: 'null', true);
        if (!is_array($snapshot) || !is_array($snapshot['ndr_shipments'] ?? null)) throw $e;
        return $snapshot + ['success' => true, 'cached' => true];
    }
}

// The dashboard card uses the same carrier reports as the RTO panel, including unmatched shipments.
function dashboardJustShypRtoFeed(PDO $pdo, $provider, array $params): array {
    try {
        $feed = loadJustShypRtoFeed($pdo, $provider, $params);
        return [
            'count' => count($feed['ndr_shipments']),
            'feed' => $feed['ndr_shipments'],
            'warning' => !empty($feed['cached']) ? 'Using saved RTO panel data from ' . $feed['saved_at'] . '. Live refresh unavailable.' : null,
        ];
    } catch (Throwable $e) {
        return ['count' => null, 'feed' => [], 'warning' => 'JustShyp RTO data is unavailable.'];
    }
}

// Share the RTO panel's confirmed carrier records with dashboard reporting.
function reconcileJustShypRtoList(PDO $pdo, array $shipments): int {
    $changed = 0;
    foreach ($shipments as $shipment) {
        $awb = trim((string)($shipment['waybill_number'] ?? ''));
        $number = trim((string)($shipment['channel_order_id'] ?? ''));
        if ($awb === '' && $number === '') continue;
        $stmt = $pdo->prepare("SELECT id, order_status, provider_awb, shiprocket_awb FROM orders
            WHERE ((? != '' AND (provider_awb = ? OR shiprocket_awb = ?)
                    AND (delivery_provider = 'justshyp' OR COALESCE(delivery_provider, '') = ''))
                OR (? != '' AND order_number = ? AND (
                    (COALESCE(provider_awb, '') = '' AND COALESCE(shiprocket_awb, '') = '')
                    OR (delivery_provider = 'shiprocket' AND COALESCE(provider_awb, '') = ''))))
            LIMIT 2");
        $stmt->execute([$awb, $awb, $awb, $number, $number]);
        $matches = $stmt->fetchAll(PDO::FETCH_ASSOC);
        // Ambiguous matches and older AWBs must not change a replacement order.
        if (count($matches) !== 1) continue;
        if (reconcileCarrierOutcome($pdo, $matches[0], ['success' => true, 'current_status' => 'rto'])) $changed++;
    }
    return $changed;
}

// Only explicit carrier outcomes can close an order. NDR is not an RTO.
function carrierOutcome(string $status): ?string {
    $status = preg_replace('/[\s-]+/', '_', strtolower(trim($status)));
    if (in_array($status, ['rto', 'rto_initiated', 'rto_in_transit', 'rto_delivered', 'rto_undelivered', 'return_to_origin', 'returned_to_origin'], true)) return 'rto';
    if (in_array($status, ['cancelled', 'canceled'], true)) return 'cancelled';
    return $status === 'delivered' ? 'delivered' : null;
}

function reconcileCarrierOutcome(PDO $pdo, array $order, array $tracking): bool {
    if (empty($tracking['success'])) throw new RuntimeException('Carrier tracking unavailable');
    $status = carrierOutcome((string)($tracking['current_status'] ?? ''));
    if (!$status || $status === $order['order_status']) return false;
    $pdo->beginTransaction();
    try {
        // Do not overwrite an order edited or assigned a new shipment during the request.
        $stmt = $pdo->prepare('UPDATE orders SET order_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND order_status = ? AND COALESCE(provider_awb, \'\') = ? AND COALESCE(shiprocket_awb, \'\') = ?');
        $stmt->execute([$status, $order['id'], $order['order_status'], $order['provider_awb'] ?? '', $order['shiprocket_awb'] ?? '']);
        $changed = $stmt->rowCount() > 0;
        if ($changed) {
            $stmt = $pdo->prepare('INSERT INTO order_tracking_events (order_id, status, status_milestone, title, description, location, occurred_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)');
            $stmt->execute([$order['id'], $status, $status, $tracking['current_status'], 'Verified against current carrier tracking during admin reconciliation.', '',]);
        }
        $pdo->commit();
        return $changed;
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}
