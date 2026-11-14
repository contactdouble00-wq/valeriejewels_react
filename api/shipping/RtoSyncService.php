<?php
/**
 * VALERIE JEWELS — Multi-Carrier RTO Sync Service
 * Queries JustShyp & Shiprocket RTO/NDR panels, reconciles shipments with local database orders,
 * updates order statuses to 'rto', logs tracking milestones, and caches sync metadata.
 */

require_once __DIR__ . '/DeliveryProviderFactory.php';
require_once __DIR__ . '/shiprocket.php';
require_once dirname(__DIR__) . '/config/database.php';

class RtoSyncService
{
    /**
     * Run full RTO synchronization across JustShyp and Shiprocket
     *
     * @param PDO $pdo
     * @param string $targetProvider 'all' | 'justshyp' | 'shiprocket'
     * @param bool $force Bypass 5-minute debounce check
     * @return array Sync result summary
     */
    public static function sync(PDO $pdo, string $targetProvider = 'all', bool $force = false): array
    {
        $targetProvider = strtolower(trim($targetProvider));

        // 1. Debounce check (skip if synced within last 5 minutes, unless forced)
        if (!$force) {
            try {
                $stmt = $pdo->prepare("SELECT `value` FROM `site_settings` WHERE `key` = 'last_rto_sync_meta' LIMIT 1");
                $stmt->execute();
                $raw = $stmt->fetchColumn();
                if ($raw) {
                    $meta = json_decode($raw, true);
                    if (!empty($meta['timestamp']) && (time() - (int)$meta['timestamp']) < 300) {
                        return [
                            'success'    => true,
                            'cached'     => true,
                            'synced'     => (int)($meta['synced'] ?? 0),
                            'justshyp'   => (int)($meta['justshyp'] ?? 0),
                            'shiprocket' => (int)($meta['shiprocket'] ?? 0),
                            'message'    => 'RTO data recently synchronized (within 5 minutes)',
                        ];
                    }
                }
            } catch (Throwable $e) {}
        }

        $syncedJustShyp = 0;
        $syncedShiprocket = 0;
        $errors = [];
        $syncedOrders = [];
        $driver = Database::getDriver();
        $nowSql = $driver === 'sqlite' ? "datetime('now')" : "NOW()";

        // 2. QUERY & RECONCILE JUSTSHYP RTO PANEL
        if ($targetProvider === 'all' || $targetProvider === 'justshyp') {
            try {
                $jsProvider = DeliveryProviderFactory::getProvider('justshyp');
                $jsRes = $jsProvider->listNdr(['ndr_type' => 'rto']);

                if (!empty($jsRes['success']) && !empty($jsRes['ndr_shipments'])) {
                    $shipments = is_array($jsRes['ndr_shipments']) ? $jsRes['ndr_shipments'] : [];
                    foreach ($shipments as $item) {
                        $awb = trim($item['waybill_number'] ?? ($item['awb'] ?? ($item['shipment']['awb'] ?? '')));
                        $channelOrdId = trim($item['channel_order_id'] ?? ($item['client_order_id'] ?? ($item['order_number'] ?? ($item['order_id'] ?? ''))));
                        $reason = trim($item['ndr_reason'] ?? ($item['rto_reason'] ?? ($item['reason'] ?? ($item['remarks'] ?? 'Returned to Origin on JustShyp panel'))));
                        $courier = trim($item['courier_name'] ?? ($item['courier'] ?? 'JustShyp Express'));
                        $location = trim($item['location'] ?? ($item['current_location'] ?? ''));

                        if (empty($awb) && empty($channelOrdId)) {
                            continue;
                        }

                        // Robust order number cleansing & prefix matching
                        $cleanOrdNum = preg_replace('/^#|^RTO-/', '', $channelOrdId);
                        $vjOrdNum = (stripos($cleanOrdNum, 'VJ-') === 0) ? $cleanOrdNum : 'VJ-' . $cleanOrdNum;

                        $findStmt = $pdo->prepare("
                            SELECT id, order_number, order_status, delivery_provider, courier_name, provider_awb, total_amount, amount_paid_upfront
                            FROM orders 
                            WHERE (provider_awb = :awb AND :awb != '') 
                               OR (shiprocket_awb = :awb AND :awb != '') 
                               OR order_number = :ord_raw 
                               OR order_number = :ord_clean 
                               OR order_number = :ord_vj
                               OR order_number LIKE :ord_wild
                            LIMIT 1
                        ");
                        $findStmt->execute([
                            ':awb'       => $awb,
                            ':ord_raw'   => $channelOrdId,
                            ':ord_clean' => $cleanOrdNum,
                            ':ord_vj'    => $vjOrdNum,
                            ':ord_wild'  => "%" . $cleanOrdNum,
                        ]);
                        $ord = $findStmt->fetch(PDO::FETCH_ASSOC);

                        if ($ord) {
                            if ($ord['order_status'] !== 'rto') {
                                $upStmt = $pdo->prepare("
                                    UPDATE orders 
                                    SET order_status = 'rto',
                                        delivery_provider = 'justshyp',
                                        courier_name = COALESCE(NULLIF(:courier, ''), courier_name),
                                        provider_awb = COALESCE(NULLIF(:awb, ''), provider_awb),
                                        cancellation_reason = :reason,
                                        updated_at = $nowSql
                                    WHERE id = :id
                                ");
                                $upStmt->execute([
                                    ':courier' => $courier,
                                    ':awb'     => $awb,
                                    ':reason'  => "JustShyp RTO: {$reason}",
                                    ':id'      => $ord['id'],
                                ]);

                                // Insert tracking milestone event
                                try {
                                    $evStmt = $pdo->prepare("
                                        INSERT INTO order_tracking_events (order_id, status, title, description, location, courier_partner, awb_code, occurred_at)
                                        VALUES (:order_id, 'rto', 'RTO Confirmed via JustShyp Panel', :desc, :loc, :courier, :awb, $nowSql)
                                    ");
                                    $evStmt->execute([
                                        ':order_id' => $ord['id'],
                                        ':desc'     => "Shipment flagged as RTO on JustShyp panel. Reason: {$reason}",
                                        ':loc'      => $location ?: 'Transit Atelier Hub',
                                        ':courier'  => $courier,
                                        ':awb'      => $awb ?: ($ord['provider_awb'] ?? ''),
                                    ]);
                                } catch (Throwable $te) {}

                                $syncedJustShyp++;
                                $syncedOrders[] = [
                                    'order_id'     => $ord['id'],
                                    'order_number' => $ord['order_number'],
                                    'provider'     => 'justshyp',
                                    'awb'          => $awb,
                                    'reason'       => $reason,
                                ];
                            }
                        }
                    }
                }
            } catch (Throwable $je) {
                $errors[] = 'JustShyp: ' . $je->getMessage();
            }
        }

        // 3. QUERY & RECONCILE SHIPROCKET RTO SHIPMENTS
        if ($targetProvider === 'all' || $targetProvider === 'shiprocket') {
            try {
                $srToken = ShiprocketService::getAuthToken();
                if ($srToken) {
                    $endpoints = [
                        'https://apiv2.shiprocket.in/v1/external/ndr/all',
                        'https://apiv2.shiprocket.in/v1/external/orders?filter_by=rto',
                    ];

                    foreach ($endpoints as $srUrl) {
                        $ch = curl_init($srUrl);
                        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                        curl_setopt($ch, CURLOPT_HTTPHEADER, [
                            'Content-Type: application/json',
                            'Authorization: Bearer ' . $srToken,
                        ]);
                        curl_setopt($ch, CURLOPT_TIMEOUT, 12);
                        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                        $res = curl_exec($ch);
                        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                        curl_close($ch);

                        if ($httpCode === 200 && $res) {
                            $parsed = json_decode($res, true) ?: [];
                            $srList = $parsed['data'] ?? [];
                            if (is_array($srList)) {
                                foreach ($srList as $item) {
                                    $awb = trim($item['awb_code'] ?? ($item['awb'] ?? ($item['shipment']['awb_code'] ?? '')));
                                    $channelOrdId = trim($item['channel_order_id'] ?? ($item['order_id'] ?? ($item['order_number'] ?? '')));
                                    $reason = trim($item['remarks'] ?? ($item['rto_reason'] ?? ($item['status'] ?? 'Returned to Origin on Shiprocket panel')));
                                    $courier = trim($item['courier_name'] ?? 'Shiprocket Partner');

                                    if (empty($awb) && empty($channelOrdId)) continue;

                                    $cleanOrdNum = preg_replace('/^#|^RTO-/', '', $channelOrdId);
                                    $vjOrdNum = (stripos($cleanOrdNum, 'VJ-') === 0) ? $cleanOrdNum : 'VJ-' . $cleanOrdNum;

                                    $findStmt = $pdo->prepare("
                                        SELECT id, order_number, order_status, delivery_provider, courier_name, shiprocket_awb
                                        FROM orders 
                                        WHERE (shiprocket_awb = :awb AND :awb != '') 
                                           OR (provider_awb = :awb AND :awb != '') 
                                           OR order_number = :ord_raw 
                                           OR order_number = :ord_clean 
                                           OR order_number = :ord_vj
                                           OR order_number LIKE :ord_wild
                                        LIMIT 1
                                    ");
                                    $findStmt->execute([
                                        ':awb'       => $awb,
                                        ':ord_raw'   => $channelOrdId,
                                        ':ord_clean' => $cleanOrdNum,
                                        ':ord_vj'    => $vjOrdNum,
                                        ':ord_wild'  => "%" . $cleanOrdNum,
                                    ]);
                                    $ord = $findStmt->fetch(PDO::FETCH_ASSOC);

                                    if ($ord && $ord['order_status'] !== 'rto') {
                                        $upStmt = $pdo->prepare("
                                            UPDATE orders 
                                            SET order_status = 'rto',
                                                delivery_provider = 'shiprocket',
                                                courier_name = COALESCE(NULLIF(:courier, ''), courier_name),
                                                shiprocket_awb = COALESCE(NULLIF(:awb, ''), shiprocket_awb),
                                                cancellation_reason = :reason,
                                                updated_at = $nowSql
                                            WHERE id = :id
                                        ");
                                        $upStmt->execute([
                                            ':courier' => $courier,
                                            ':awb'     => $awb,
                                            ':reason'  => "Shiprocket RTO: {$reason}",
                                            ':id'      => $ord['id'],
                                        ]);

                                        try {
                                            $evStmt = $pdo->prepare("
                                                INSERT INTO order_tracking_events (order_id, status, title, description, location, courier_partner, awb_code, occurred_at)
                                                VALUES (:order_id, 'rto', 'RTO Confirmed via Shiprocket Panel', :desc, 'Shiprocket Hub', :courier, :awb, $nowSql)
                                            ");
                                            $evStmt->execute([
                                                ':order_id' => $ord['id'],
                                                ':desc'     => "Shipment flagged as RTO on Shiprocket panel. Reason: {$reason}",
                                                ':courier'  => $courier,
                                                ':awb'      => $awb ?: ($ord['shiprocket_awb'] ?? ''),
                                            ]);
                                        } catch (Throwable $te) {}

                                        $syncedShiprocket++;
                                        $syncedOrders[] = [
                                            'order_id'     => $ord['id'],
                                            'order_number' => $ord['order_number'],
                                            'provider'     => 'shiprocket',
                                            'awb'          => $awb,
                                            'reason'       => $reason,
                                        ];
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (Throwable $se) {
                $errors[] = 'Shiprocket: ' . $se->getMessage();
            }
        }

        // 4. AUTO-HEAL HISTORICAL RTOs IN DATABASE
        // Reclassifies orders that already had RTO milestone events or cancellation reasons recorded
        try {
            $healStmt = $pdo->prepare("
                UPDATE orders 
                SET order_status = 'rto',
                    updated_at = $nowSql
                WHERE order_status != 'rto'
                  AND (
                    LOWER(COALESCE(cancellation_reason, '')) LIKE '%rto%'
                    OR LOWER(COALESCE(cancellation_reason, '')) LIKE '%return to origin%'
                    OR id IN (
                        SELECT DISTINCT order_id 
                        FROM order_tracking_events 
                        WHERE status IN ('rto', 'rto_initiated', 'rto_delivered', 'rto_in_transit')
                    )
                  )
            ");
            $healStmt->execute();
        } catch (Throwable $he) {}

        // 5. CACHE SYNC METADATA IN site_settings
        $totalSynced = $syncedJustShyp + $syncedShiprocket;
        try {
            $metaJson = json_encode([
                'timestamp'  => time(),
                'datetime'   => date('Y-m-d H:i:s'),
                'synced'     => $totalSynced,
                'justshyp'   => $syncedJustShyp,
                'shiprocket' => $syncedShiprocket,
                'errors'     => $errors,
            ], JSON_UNESCAPED_SLASHES);

            if ($driver === 'sqlite') {
                $cacheStmt = $pdo->prepare("
                    INSERT INTO site_settings (key, value, updated_at)
                    VALUES ('last_rto_sync_meta', :val, datetime('now'))
                    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
                ");
            } else {
                $cacheStmt = $pdo->prepare("
                    INSERT INTO `site_settings` (`key`, `value`)
                    VALUES ('last_rto_sync_meta', :val)
                    ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), `updated_at` = CURRENT_TIMESTAMP
                ");
            }
            $cacheStmt->execute([':val' => $metaJson]);
        } catch (Throwable $ce) {}

        return [
            'success'          => true,
            'cached'           => false,
            'synced_count'     => $totalSynced,
            'justshyp_synced'  => $syncedJustShyp,
            'shiprocket_synced'=> $syncedShiprocket,
            'synced_orders'    => $syncedOrders,
            'errors'           => $errors,
            'message'          => $totalSynced > 0
                ? "✓ Synchronized {$totalSynced} RTO order(s) ({$syncedJustShyp} JustShyp, {$syncedShiprocket} Shiprocket)"
                : "RTO panel sync complete: carrier panels scanned and aligned",
        ];
    }
}
