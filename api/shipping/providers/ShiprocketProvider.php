<?php
/**
 * VALERIE JEWELS — Shiprocket Delivery Provider
 * Wraps existing ShiprocketService behind DeliveryProviderInterface
 * preserving 100% of existing behavior and external API contracts.
 */

require_once dirname(__DIR__) . '/DeliveryProviderInterface.php';
require_once dirname(__DIR__) . '/shiprocket.php';
require_once dirname(__DIR__, 2) . '/config/database.php';

class ShiprocketProvider implements DeliveryProviderInterface
{
    public function getName(): string
    {
        return 'shiprocket';
    }

    /**
     * Test connection with credentials
     */
    public function testConnection(?array $credentials = null): array
    {
        $email = $credentials['email'] ?? null;
        $password = $credentials['password'] ?? null;
        return ShiprocketService::testConnection($email, $password);
    }

    /**
     * Create shipment via Shiprocket
     */
    public function createShipment(int $orderId, array $options = []): array
    {
        $result = ShiprocketService::createShipment($orderId);

        if (!empty($result['success'])) {
            $pdo = Database::getConnection();
            $nowSql = Database::getDriver() === 'sqlite' ? "datetime('now')" : "NOW()";
            try {
                $stmt = $pdo->prepare("
                    UPDATE orders 
                    SET delivery_provider    = 'shiprocket',
                        provider_order_id    = :p_oid,
                        provider_shipment_id = :p_sid,
                        provider_awb         = :p_awb,
                        updated_at           = $nowSql
                    WHERE id = :id
                ");
                $stmt->execute([
                    ':p_oid' => $result['shiprocket_order_id'] ?? null,
                    ':p_sid' => $result['shiprocket_shipment_id'] ?? null,
                    ':p_awb' => $result['awb_code'] ?? null,
                    ':id'    => $orderId,
                ]);
            } catch (Throwable $e) {
                error_log("[ShiprocketProvider] Update provider fields notice: " . $e->getMessage());
            }

            $result['provider'] = 'shiprocket';
        }

        return $result;
    }

    /**
     * Create reverse shipment for customer return / exchange
     */
    public function createReverseShipment(int $orderId, array $options = []): array
    {
        $token = ShiprocketService::getAuthToken();
        if (!$token) {
            return ['success' => false, 'message' => 'Shiprocket authentication failed'];
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            return ['success' => false, 'message' => "Order #{$orderId} not found"];
        }

        $pkg = ShiprocketService::calculatePackageDimensions($orderId);
        $pickupLoc = $order['shipping_city'] ?? 'Customer Address';

        $payload = [
            'order_id'              => 'RTO-' . ($order['order_number'] ?? $orderId),
            'order_date'            => date('Y-m-d H:i'),
            'pickup_customer_name'  => $order['customer_name'],
            'pickup_address'        => $order['shipping_address_line1'],
            'pickup_address_2'      => $order['shipping_address_line2'] ?? '',
            'pickup_city'           => $order['city'],
            'pickup_state'          => $order['state'],
            'pickup_pincode'        => $order['pincode'],
            'pickup_phone'          => $order['customer_phone'],
            'pickup_email'          => $order['customer_email'],
            'shipping_customer_name'=> 'Valerie Jewels Atelier',
            'shipping_address'      => 'Plot 12, SEEPZ, Andheri East',
            'shipping_city'         => 'Mumbai',
            'shipping_state'        => 'Maharashtra',
            'shipping_pincode'      => '400096',
            'shipping_phone'        => '9820000000',
            'order_items'           => [
                [
                    'name'     => 'Jewelry Return Consignment',
                    'sku'      => 'RET-' . $order['order_number'],
                    'units'    => 1,
                    'selling_price' => (float)$order['total_amount'],
                ]
            ],
            'payment_method'        => 'Prepaid',
            'sub_total'             => (float)$order['total_amount'],
            'length'                => $pkg['length'],
            'breadth'               => $pkg['breadth'],
            'height'                => $pkg['height'],
            'weight'                => $pkg['weight'],
        ];

        $ch = curl_init('https://apiv2.shiprocket.in/v1/external/orders/create/return');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $token,
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $res = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $parsed = json_decode($res, true);
        if ($code === 200 && !empty($parsed['order_id'])) {
            return [
                'success'     => true,
                'provider'    => 'shiprocket',
                'order_id'    => $parsed['order_id'],
                'shipment_id' => $parsed['shipment_id'] ?? null,
                'awb_code'    => $parsed['awb_code'] ?? null,
                'raw'         => $parsed,
            ];
        }

        return [
            'success' => false,
            'message' => $parsed['message'] ?? 'Shiprocket return creation failed',
            'raw'     => $parsed,
        ];
    }

    /**
     * Check pincode serviceability
     */
    public function checkServiceability(array $params): array
    {
        $token = ShiprocketService::getAuthToken();
        if (!$token) {
            return ['success' => false, 'serviceable' => false, 'message' => 'Shiprocket authentication failed'];
        }

        $pickup = $params['pickup_pincode'] ?? '';
        $drop   = $params['drop_pincode'] ?? '';
        $cod    = ($params['payment_mode'] ?? 'PPD') === 'COD' ? 1 : 0;
        $weight = (float)($params['weight'] ?? 0.5);

        $url = 'https://apiv2.shiprocket.in/v1/external/courier/serviceability?' . http_build_query([
            'pickup_postcode'   => $pickup,
            'delivery_postcode' => $drop,
            'cod'               => $cod,
            'weight'            => $weight,
        ]);

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $token,
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 12);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $res = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $data = json_decode($res, true);
        $companies = $data['data']['available_courier_companies'] ?? [];
        $serviceable = ($code === 200 && !empty($companies));

        return [
            'success'     => true,
            'provider'    => 'shiprocket',
            'serviceable' => $serviceable,
            'couriers'    => array_map(function($c) {
                return [
                    'courier_name' => $c['courier_name'] ?? 'Shiprocket Partner',
                    'courier_id'   => $c['courier_company_id'] ?? null,
                    'rate'         => (float)($c['rate'] ?? 0),
                    'etd'          => $c['etd'] ?? null,
                ];
            }, $companies),
            'raw'         => $data,
        ];
    }

    /**
     * Get rates for comparison
     */
    public function getRates(array $params): array
    {
        $srv = $this->checkServiceability($params);
        if (!$srv['success'] || empty($srv['couriers'])) {
            return [
                'success'  => false,
                'provider' => 'shiprocket',
                'rates'    => [],
                'message'  => $srv['message'] ?? 'No serviceable couriers found for Shiprocket',
            ];
        }

        $rates = [];
        foreach ($srv['couriers'] as $c) {
            $rates[] = [
                'provider'     => 'shiprocket',
                'courier_name' => $c['courier_name'],
                'courier_id'   => $c['courier_id'],
                'rate'         => $c['rate'],
                'etd'          => $c['etd'],
            ];
        }

        usort($rates, fn($a, $b) => $a['rate'] <=> $b['rate']);

        return [
            'success'      => true,
            'provider'     => 'shiprocket',
            'rates'        => $rates,
            'cheapest'     => $rates[0] ?? null,
        ];
    }

    /**
     * Cancel shipment
     */
    public function cancelShipment(int $orderId): array
    {
        $token = ShiprocketService::getAuthToken();
        if (!$token) {
            return ['success' => false, 'message' => 'Shiprocket authentication failed'];
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$order || empty($order['shiprocket_order_id'])) {
            return ['success' => false, 'message' => "Order #{$orderId} has no active Shiprocket order ID"];
        }

        $ch = curl_init('https://apiv2.shiprocket.in/v1/external/orders/cancel');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['ids' => [(int)$order['shiprocket_order_id']]]));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $token,
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 12);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $res = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $parsed = json_decode($res, true);
        $nowSql = Database::getDriver() === 'sqlite' ? "datetime('now')" : "NOW()";

        if ($code === 200) {
            try {
                $up = $pdo->prepare("UPDATE orders SET order_status = 'cancelled', updated_at = $nowSql WHERE id = ?");
                $up->execute([$orderId]);

                $ev = $pdo->prepare("
                    INSERT INTO order_tracking_events (order_id, status, title, description, location, occurred_at)
                    VALUES (?, 'cancelled', 'Shipment Cancelled on Shiprocket', 'Shipment was cancelled with carrier.', 'Atelier Hub', $nowSql)
                ");
                $ev->execute([$orderId]);
            } catch (Throwable $e) {}

            return ['success' => true, 'provider' => 'shiprocket', 'message' => 'Order cancelled on Shiprocket successfully'];
        }

        return ['success' => false, 'provider' => 'shiprocket', 'message' => $parsed['message'] ?? 'Failed to cancel on Shiprocket', 'raw' => $parsed];
    }

    /**
     * Track shipment by AWB
     */
    public function track(string $awb): array
    {
        $token = ShiprocketService::getAuthToken();
        if (!$token) {
            return ['success' => false, 'message' => 'Shiprocket authentication failed'];
        }

        $ch = curl_init("https://apiv2.shiprocket.in/v1/external/courier/track/awb/{$awb}");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $token,
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 12);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $res = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $parsed = json_decode($res, true);
        $trkData = $parsed['tracking_data'] ?? [];

        $rawStatus = strtolower($trkData['shipment_track'][0]['current_status'] ?? ($trkData['track_status'] ?? 'shipped'));
        $statusMap = [
            'manifest_generated' => 'processing',
            'packed'             => 'processing',
            'pickup_scheduled'   => 'processing',
            'in_transit'         => 'shipped',
            'shipped'            => 'shipped',
            'out_for_delivery'   => 'out_for_delivery',
            'delivered'          => 'delivered',
            'rto_initiated'      => 'rto',
            'rto_delivered'      => 'rto',
            'cancelled'          => 'cancelled',
        ];
        $normStatus = $statusMap[$rawStatus] ?? 'shipped';

        $scans = $trkData['shipment_track_activities'] ?? [];
        $events = [];
        foreach ($scans as $s) {
            $events[] = [
                'activity'    => $s['activity'] ?? '',
                'location'    => $s['location'] ?? '',
                'date'        => $s['date'] ?? '',
                'sr_status'   => $s['sr-status'] ?? '',
            ];
        }

        return [
            'success'           => ($code === 200),
            'provider'          => 'shiprocket',
            'awb'               => $awb,
            'current_status'    => $rawStatus,
            'normalized_status' => $normStatus,
            'events'            => $events,
            'raw'               => $parsed,
        ];
    }

    /**
     * Get label PDF
     */
    public function getLabel(string $awb): array
    {
        $token = ShiprocketService::getAuthToken();
        if (!$token) {
            return ['success' => false, 'message' => 'Shiprocket authentication failed'];
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT id, shiprocket_shipment_id FROM orders WHERE shiprocket_awb = ? OR provider_awb = ? LIMIT 1");
        $stmt->execute([$awb, $awb]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        $shipmentId = $row['shiprocket_shipment_id'] ?? null;
        if (!$shipmentId) {
            return [
                'success'   => true,
                'label_url' => "https://shiprocket.co/tracking/{$awb}",
                'message'   => 'Direct tracking view',
            ];
        }

        $ch = curl_init('https://apiv2.shiprocket.in/v1/external/generate/label');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['shipment_id' => [(int)$shipmentId]]));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $token,
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 12);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $res = curl_exec($ch);
        curl_close($ch);

        $parsed = json_decode($res, true);
        $labelUrl = $parsed['label_url'] ?? null;

        return [
            'success'     => !empty($labelUrl),
            'provider'    => 'shiprocket',
            'label_url'   => $labelUrl,
            'invoice_url' => null,
            'raw'         => $parsed,
        ];
    }

    /**
     * Schedule pickup
     */
    public function schedulePickup(array $params): array
    {
        $token = ShiprocketService::getAuthToken();
        if (!$token) {
            return ['success' => false, 'message' => 'Shiprocket authentication failed'];
        }

        $shipmentId = $params['shipment_id'] ?? null;
        $date = $params['pickup_date'] ?? date('Y-m-d');

        $ch = curl_init('https://apiv2.shiprocket.in/v1/external/courier/generate/pickup');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'shipment_id' => [(int)$shipmentId],
            'pickup_date' => [$date],
        ]));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $token,
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 12);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $res = curl_exec($ch);
        curl_close($ch);

        $parsed = json_decode($res, true);
        return [
            'success'   => ($parsed['pickup_status'] ?? 0) === 1,
            'provider'  => 'shiprocket',
            'message'   => $parsed['response']['data'] ?? ($parsed['message'] ?? 'Pickup scheduled'),
            'raw'       => $parsed,
        ];
    }

    /**
     * Generate manifest
     */
    public function generateManifest(array $params): array
    {
        $token = ShiprocketService::getAuthToken();
        if (!$token) {
            return ['success' => false, 'message' => 'Shiprocket authentication failed'];
        }

        $shipmentId = $params['shipment_id'] ?? null;

        $ch = curl_init('https://apiv2.shiprocket.in/v1/external/manifests/generate');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['shipment_id' => [(int)$shipmentId]]));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $token,
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 12);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $res = curl_exec($ch);
        curl_close($ch);

        $parsed = json_decode($res, true);
        return [
            'success'      => !empty($parsed['manifest_url']),
            'provider'     => 'shiprocket',
            'manifest_url' => $parsed['manifest_url'] ?? null,
            'raw'          => $parsed,
        ];
    }

    /**
     * List NDR shipments
     */
    public function listNdr(array $params): array
    {
        $token = ShiprocketService::getAuthToken();
        if (!$token) {
            return ['success' => false, 'message' => 'Shiprocket authentication failed'];
        }

        $ch = curl_init('https://apiv2.shiprocket.in/v1/external/ndr/all');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $token,
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 12);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $res = curl_exec($ch);
        curl_close($ch);

        $parsed = json_decode($res, true);
        return [
            'success'       => true,
            'provider'      => 'shiprocket',
            'ndr_shipments' => $parsed['data'] ?? [],
            'raw'           => $parsed,
        ];
    }

    /**
     * NDR action (reattempt / RTO / address update)
     */
    public function ndrAction(array $params): array
    {
        $token = ShiprocketService::getAuthToken();
        if (!$token) {
            return ['success' => false, 'message' => 'Shiprocket authentication failed'];
        }

        $awb = $params['awb'] ?? '';
        $action = $params['action'] ?? 'reattempt'; // 'reattempt' | 'rto'

        $ch = curl_init('https://apiv2.shiprocket.in/v1/external/ndr/action');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'awb'    => $awb,
            'action' => $action,
        ]));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $token,
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 12);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $res = curl_exec($ch);
        curl_close($ch);

        $parsed = json_decode($res, true);
        return [
            'success'  => ($parsed['status'] ?? '') === 'success',
            'provider' => 'shiprocket',
            'message'  => $parsed['message'] ?? 'Action submitted',
            'raw'      => $parsed,
        ];
    }

    /**
     * Sync warehouse
     */
    public function syncWarehouse(array $warehouseData): array
    {
        $token = ShiprocketService::getAuthToken();
        if (!$token) {
            return ['success' => false, 'message' => 'Shiprocket authentication failed'];
        }

        $ch = curl_init('https://apiv2.shiprocket.in/v1/external/settings/company/addpickup');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'pickup_location' => $warehouseData['title'] ?? 'Primary',
            'name'            => $warehouseData['sender_name'] ?? 'Valerie Jewels Atelier',
            'email'           => 'orders@valeriejewels.in',
            'phone'           => $warehouseData['phone'] ?? '9820000000',
            'address'         => $warehouseData['full_address'] ?? 'Plot 12 SEEPZ',
            'city'            => $warehouseData['city'] ?? 'Mumbai',
            'state'           => $warehouseData['state'] ?? 'Maharashtra',
            'country'         => 'India',
            'pin_code'        => $warehouseData['pincode'] ?? '400096',
        ]));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $token,
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 12);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $res = curl_exec($ch);
        curl_close($ch);

        $parsed = json_decode($res, true);
        return [
            'success'      => ($parsed['success'] ?? false) === true,
            'provider'     => 'shiprocket',
            'warehouse_id' => $warehouseData['title'] ?? 'Primary',
            'message'      => $parsed['message'] ?? 'Warehouse created',
            'raw'          => $parsed,
        ];
    }

    /**
     * List warehouses
     */
    public function listWarehouses(): array
    {
        $token = ShiprocketService::getAuthToken();
        if (!$token) {
            return ['success' => false, 'message' => 'Shiprocket authentication failed'];
        }

        $ch = curl_init('https://apiv2.shiprocket.in/v1/external/settings/company/pickup');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $token,
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 12);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $res = curl_exec($ch);
        curl_close($ch);

        $parsed = json_decode($res, true);
        $addresses = $parsed['data']['shipping_address'] ?? [];

        return [
            'success'    => true,
            'provider'   => 'shiprocket',
            'warehouses' => array_map(function($a) {
                return [
                    'warehouse_id' => $a['pickup_location'] ?? '',
                    'title'        => $a['pickup_location'] ?? '',
                    'address'      => $a['address'] ?? '',
                    'city'         => $a['city'] ?? '',
                    'state'        => $a['state'] ?? '',
                    'pincode'      => $a['pin_code'] ?? '',
                    'phone'        => $a['phone'] ?? '',
                ];
            }, $addresses),
            'raw'        => $parsed,
        ];
    }
}
