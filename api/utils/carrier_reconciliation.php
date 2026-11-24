<?php

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
            $stmt = $pdo->prepare('INSERT INTO order_tracking_events (order_id, status, title, description, location, occurred_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)');
            $stmt->execute([$order['id'], $status, $tracking['current_status'], 'Verified against current carrier tracking during admin reconciliation.', '',]);
        }
        $pdo->commit();
        return $changed;
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}
