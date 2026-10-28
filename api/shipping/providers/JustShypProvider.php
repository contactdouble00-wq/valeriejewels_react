<?php
/**
 * VALERIE JEWELS — JustShyp Delivery Provider
 * Integrates JustShyp REST API v3 at /api/v3/ behind DeliveryProviderInterface.
 * Docs: https://backend.justshyp.com/api/docs/
 */

require_once dirname(__DIR__) . '/DeliveryProviderInterface.php';
require_once dirname(__DIR__) . '/shiprocket.php'; // For calculatePackageDimensions()
require_once dirname(__DIR__, 2) . '/config/database.php';

class JustShypProvider implements DeliveryProviderInterface
{
    private static ?array $settings = null;

    public function getName(): string
    {
        return 'justshyp';
    }

    /**
     * Load settings from env, config file, or site_settings database
     */
    public static function getSettings(): array
    {
        if (self::$settings === null) {
            $pdo = Database::getConnection();
            $dbSettings = [];

            try {
                $stmt = $pdo->prepare("SELECT `value` FROM `site_settings` WHERE `key` = 'payment_settings' LIMIT 1");
                $stmt->execute();
                $raw = $stmt->fetchColumn();
                if ($raw) {
                    $dbSettings = json_decode($raw, true) ?: [];
                }
            } catch (Throwable $e) {}

            $allConfig = [];
            $configFile = dirname(__DIR__, 2) . '/config/config.php';
            if (file_exists($configFile)) {
                $allConfig = require $configFile;
            }

            $jsConfig = $allConfig['justshyp'] ?? [];

            $baseUrl = getenv('JUSTSHYP_BASE_URL') ?: ($_ENV['JUSTSHYP_BASE_URL'] ?? ($_SERVER['JUSTSHYP_BASE_URL'] ?? (!empty($dbSettings['justshyp_base_url']) ? $dbSettings['justshyp_base_url'] : ($jsConfig['base_url'] ?? 'https://backend.justshyp.com'))));
            $token   = getenv('JUSTSHYP_ACCESS_TOKEN') ?: ($_ENV['JUSTSHYP_ACCESS_TOKEN'] ?? ($_SERVER['JUSTSHYP_ACCESS_TOKEN'] ?? (!empty($dbSettings['justshyp_access_token']) ? $dbSettings['justshyp_access_token'] : ($jsConfig['access_token'] ?? '8cf39dd6a9d4df7548fc86764cb4bd82cb4240f489215521af3540bd9a606426'))));
            $email   = getenv('JUSTSHYP_EMAIL') ?: ($_ENV['JUSTSHYP_EMAIL'] ?? ($_SERVER['JUSTSHYP_EMAIL'] ?? (!empty($dbSettings['justshyp_email']) ? $dbSettings['justshyp_email'] : ($jsConfig['email'] ?? ''))));
            $pass    = getenv('JUSTSHYP_PASSWORD') ?: ($_ENV['JUSTSHYP_PASSWORD'] ?? ($_SERVER['JUSTSHYP_PASSWORD'] ?? (!empty($dbSettings['justshyp_password']) ? $dbSettings['justshyp_password'] : ($jsConfig['password'] ?? ''))));
            $warehouseId = !empty($dbSettings['justshyp_warehouse_id']) 
                ? (string)$dbSettings['justshyp_warehouse_id'] 
                : ($jsConfig['warehouse_id'] ?? (getenv('JUSTSHYP_WAREHOUSE_ID') ?: ($_ENV['JUSTSHYP_WAREHOUSE_ID'] ?? ($_SERVER['JUSTSHYP_WAREHOUSE_ID'] ?? '166'))));

            self::$settings = [
                'base_url'      => rtrim($baseUrl, '/'),
                'access_token'  => $token,
                'email'         => $email,
                'password'      => $pass,
                'warehouse_id'  => $warehouseId,
                'auto_sync'     => isset($dbSettings['justshyp_auto_sync']) ? (bool)$dbSettings['justshyp_auto_sync'] : true,
            ];
        }

        return self::$settings;
    }

    /**
     * Clear cached settings (useful during tests or settings updates)
     */
    public static function clearSettingsCache(): void
    {
        self::$settings = null;
    }

    /**
     * Retrieve access token (or generate via credentials if missing)
     */
    public static function getAccessToken(?string $overrideToken = null): ?string
    {
        if (!empty($overrideToken)) {
            return $overrideToken;
        }

        $cfg = self::getSettings();
        if (!empty($cfg['access_token'])) {
            return $cfg['access_token'];
        }

        // If no direct token but email & password provided, generate one
        if (!empty($cfg['email']) && !empty($cfg['password'])) {
            $authRes = self::generateToken($cfg['email'], $cfg['password'], $cfg['base_url']);
            if (!empty($authRes['token'])) {
                self::$settings['access_token'] = $authRes['token'];
                return $authRes['token'];
            }
        }

        return null;
    }

    /**
     * Generate access-token via POST /api/v3/generate-token
     */
    public static function generateToken(string $email, string $password, ?string $baseUrl = null): array
    {
        $base = rtrim($baseUrl ?: (self::getSettings()['base_url'] ?? 'https://backend.justshyp.com'), '/');
        $url  = $base . '/api/v3/generate-token';

        $payload = json_encode([
            'email'    => $email,
            'password' => $password,
        ]);

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $res = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if (PHP_VERSION_ID < 80500) {
            @curl_close($ch);
        }

        $parsed = json_decode($res, true) ?: [];

        if ($code === 200 && !empty($parsed['status']) && !empty($parsed['data']['access-token'])) {
            $token = $parsed['data']['access-token'];
            // Optionally persist token to site_settings
            try {
                $pdo = Database::getConnection();
                $stmt = $pdo->prepare("SELECT `value` FROM `site_settings` WHERE `key` = 'payment_settings' LIMIT 1");
                $stmt->execute();
                $cur = json_decode($stmt->fetchColumn() ?: '{}', true) ?: [];
                $cur['justshyp_access_token'] = $token;
                $save = $pdo->prepare("REPLACE INTO `site_settings` (`key`, `value`) VALUES ('payment_settings', :val)");
                $save->execute([':val' => json_encode($cur, JSON_UNESCAPED_SLASHES)]);
            } catch (Throwable $e) {}

            return [
                'success' => true,
                'token'   => $token,
                'message' => $parsed['responsemsg'] ?? 'Access token generated successfully.',
            ];
        }

        $errorMsg = $parsed['responsemsg'] ?? "Failed with HTTP {$code}";
        return [
            'success' => false,
            'token'   => null,
            'message' => $errorMsg,
        ];
    }

    /**
     * Shared HTTP Client with timeouts, safe error handling, envelope unwrapping,
     * and safe retries on 5xx/network errors (NEVER retry createShipment).
     */
    public static function sendRequest(
        string $method,
        string $endpoint,
        ?array $data = null,
        ?string $token = null,
        bool $canRetry = false
    ): array {
        $cfg = self::getSettings();
        $baseUrl = $cfg['base_url'];
        $cleanPath = '/' . ltrim($endpoint, '/');
        $url = $baseUrl . $cleanPath;

        $accessToken = self::getAccessToken($token);
        if (empty($accessToken) && strpos($endpoint, 'generate-token') === false) {
            return [
                'success'     => false,
                'status_code' => 401,
                'message'     => 'JustShyp access-token is not configured. Please set JUSTSHYP_ACCESS_TOKEN in settings.',
                'data'        => null,
            ];
        }

        $headers = [
            'Content-Type: application/json',
            'Accept: application/json',
        ];
        if (!empty($accessToken)) {
            $headers[] = 'access-token: ' . $accessToken;
        }

        $maxAttempts = $canRetry ? 2 : 1;
        $attempt = 0;
        $httpCode = 0;
        $responseBody = '';
        $curlError = '';

        while ($attempt < $maxAttempts) {
            $attempt++;
            $ch = curl_init();

            if (strtoupper($method) === 'GET') {
                if (!empty($data)) {
                    $urlWithParams = $url . (strpos($url, '?') === false ? '?' : '&') . http_build_query($data);
                    curl_setopt($ch, CURLOPT_URL, $urlWithParams);
                } else {
                    curl_setopt($ch, CURLOPT_URL, $url);
                }
            } else {
                curl_setopt($ch, CURLOPT_URL, $url);
                curl_setopt($ch, CURLOPT_POST, true);
                if (strtoupper($method) !== 'POST') {
                    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, strtoupper($method));
                }
                if ($data !== null) {
                    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data, JSON_UNESCAPED_SLASHES));
                }
            }

            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 8);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

            $responseBody = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            if (PHP_VERSION_ID < 80500) {
            @curl_close($ch);
        }

            // Retry only on 5xx or network errors when canRetry = true
            if ($canRetry && ($httpCode >= 500 || $responseBody === false) && $attempt < $maxAttempts) {
                usleep(500000); // 500ms backoff
                continue;
            }
            break;
        }

        // Structured logging that NEVER logs the access-token
        if ($httpCode !== 200 && $httpCode !== 201) {
            $safePayload = $data;
            if (is_array($safePayload)) {
                unset($safePayload['password'], $safePayload['access-token']);
            }
            error_log(sprintf(
                "[JustShyp API] HTTP %d on %s %s. Response: %s. Error: %s",
                $httpCode,
                $method,
                $cleanPath,
                substr((string)$responseBody, 0, 300),
                $curlError
            ));
        }

        if ($responseBody === false || empty($responseBody)) {
            return [
                'success'     => false,
                'status_code' => $httpCode ?: 500,
                'message'     => !empty($curlError) ? "JustShyp network error: {$curlError}" : "Empty response from JustShyp (HTTP {$httpCode})",
                'data'        => null,
            ];
        }

        $parsed = json_decode($responseBody, true);
        if (!is_array($parsed)) {
            return [
                'success'     => false,
                'status_code' => $httpCode,
                'message'     => "Invalid JSON response from JustShyp (HTTP {$httpCode})",
                'data'        => null,
                'raw'         => $responseBody,
            ];
        }

        // Check envelope: { status: boolean, data, responsemsg }
        // NDR list uses 'response' instead of 'data'
        $status = !empty($parsed['status']);
        $responseMsg = $parsed['responsemsg'] ?? ($parsed['message'] ?? '');
        $payloadData = $parsed['data'] ?? ($parsed['response'] ?? null);

        if ($httpCode === 401) {
            return [
                'success'     => false,
                'status_code' => 401,
                'message'     => 'JustShyp access-token is invalid or expired. Please check your credentials.',
                'data'        => $payloadData,
                'raw'         => $parsed,
            ];
        }

        if (!$status || ($httpCode >= 400)) {
            $userMessage = $responseMsg ?: "JustShyp request failed with HTTP {$httpCode}";
            return [
                'success'     => false,
                'status_code' => $httpCode,
                'message'     => $userMessage,
                'data'        => $payloadData,
                'raw'         => $parsed,
            ];
        }

        return [
            'success'     => true,
            'status_code' => $httpCode,
            'message'     => $responseMsg ?: 'Success',
            'data'        => $payloadData,
            'raw'         => $parsed,
        ];
    }

    /**
     * Map JustShyp status to Valerie Jewels internal order_status
     */
    public static function mapStatus(string $justshypStatus): string
    {
        $st = strtolower(trim($justshypStatus));
        $statusMap = [
            'order_created'       => 'processing',
            'created'             => 'processing',
            'manifest_generated'  => 'processing',
            'manifested'          => 'processing',
            'pickup_scheduled'    => 'processing',
            'packed'              => 'processing',
            'in_transit'          => 'shipped',
            'shipped'             => 'shipped',
            'dispatched'          => 'shipped',
            'reached_hub'         => 'shipped',
            'in_transit_hub'      => 'shipped',
            'out_for_delivery'    => 'out_for_delivery',
            'delivered'           => 'delivered',
            'closed'              => 'delivered',
            'undelivered'         => 'processing',
            'rto'                 => 'rto',
            'rto_initiated'       => 'rto',
            'rto_in_transit'      => 'rto',
            'rto_delivered'       => 'rto',
            'cancelled'           => 'cancelled',
            'lost'                => 'cancelled',
            'destroyed'           => 'cancelled',
            'damaged'             => 'cancelled',
        ];

        if (isset($statusMap[$st])) {
            return $statusMap[$st];
        }

        // Unknown status fallback: log safely and default to processing
        error_log("[JustShyp Status Mapping] Unknown status encountered: '{$justshypStatus}'. Falling back to 'processing'.");
        return 'processing';
    }

    /**
     * Test connection with JustShyp
     */
    public function testConnection(?array $credentials = null): array
    {
        $token = $credentials['access_token'] ?? null;
        if (empty($token) && !empty($credentials['email']) && !empty($credentials['password'])) {
            $authRes = self::generateToken($credentials['email'], $credentials['password'], $credentials['base_url'] ?? null);
            if (!$authRes['success']) {
                return $authRes;
            }
            $token = $authRes['token'];
        }

        // Call read-only GET /api/v3/warehouse-list
        $res = self::sendRequest('GET', '/api/v3/warehouse-list', null, $token, true);

        if ($res['success']) {
            $warehouses = $res['data'] ?? [];
            $count = is_array($warehouses) ? count($warehouses) : 0;
            return [
                'success'    => true,
                'message'    => "JustShyp connection verified successfully! ({$count} registered warehouses found)",
                'warehouses' => $warehouses,
            ];
        }

        return [
            'success' => false,
            'message' => $res['message'] ?? 'JustShyp connection test failed',
        ];
    }

    /**
     * Resolve or synchronize pickup warehouse ID with JustShyp
     */
    public function resolveWarehouseId(): ?string
    {
        $cfg = self::getSettings();
        if (!empty($cfg['warehouse_id'])) {
            return (string)$cfg['warehouse_id'];
        }

        $pdo = Database::getConnection();

        // 1. Check local warehouse_mappings table
        try {
            $stmt = $pdo->prepare("SELECT provider_warehouse_id FROM warehouse_mappings WHERE provider = 'justshyp' ORDER BY id ASC LIMIT 1");
            $stmt->execute();
            $mappedId = $stmt->fetchColumn();
            if ($mappedId) {
                return (string)$mappedId;
            }
        } catch (Throwable $e) {}

        // 2. Fetch existing warehouses from JustShyp
        $listRes = self::sendRequest('GET', '/api/v3/warehouse-list', null, null, true);
        if ($listRes['success'] && !empty($listRes['data']) && is_array($listRes['data'])) {
            $first = $listRes['data'][0];
            $wId = (string)($first['warehouse_id'] ?? ($first['id'] ?? ($first['pick_address_id'] ?? ($first['pickup_id'] ?? ''))));
            if (!empty($wId)) {
                // Cache locally
                try {
                    $isSqlite = Database::getDriver() === 'sqlite';
                    $sql = $isSqlite
                        ? "INSERT OR REPLACE INTO warehouse_mappings (internal_code, provider, provider_warehouse_id, title, address, pincode, phone)
                           VALUES ('primary_justshyp', 'justshyp', :wid, :title, :addr, :pin, :phone)"
                        : "INSERT INTO warehouse_mappings (internal_code, provider, provider_warehouse_id, title, address, pincode, phone)
                           VALUES ('primary_justshyp', 'justshyp', :wid, :title, :addr, :pin, :phone)
                           ON DUPLICATE KEY UPDATE provider_warehouse_id = VALUES(provider_warehouse_id), title = VALUES(title), address = VALUES(address), pincode = VALUES(pincode), phone = VALUES(phone)";
                    $ins = $pdo->prepare($sql);
                    $ins->execute([
                        ':wid'   => $wId,
                        ':title' => $first['title'] ?? ($first['address_title'] ?? 'Valerie Jewels'),
                        ':addr'  => $first['full_address'] ?? ($first['address'] ?? 'Valerie Jewels, Jeel Kakadiya, Rajkot, Gujarat'),
                        ':pin'   => $first['pincode'] ?? '360002',
                        ':phone' => $first['phone'] ?? '7016347945',
                    ]);
                } catch (Throwable $e) {}

                return $wId;
            }
        }

        // 3. Fallback to Valerie Jewels default registered warehouse ID (166)
        return '166';
    }

    /**
     * Check pincode serviceability
     * POST /api/v3/pincode-serviceability
     */
    public function checkServiceability(array $params): array
    {
        $pickup = $params['pickup_pincode'] ?? '360002';
        $drop   = $params['drop_pincode'] ?? '';
        $mode   = strtoupper($params['payment_mode'] ?? 'PPD');
        if ($mode !== 'COD') $mode = 'PPD';

        if (empty($drop)) {
            return ['success' => false, 'serviceable' => false, 'message' => 'Drop pincode is required'];
        }

        $res = self::sendRequest('POST', '/api/v3/pincode-serviceability', [
            'pickup_pincode' => (string)$pickup,
            'drop_pincode'   => (string)$drop,
            'payment_mode'   => $mode,
        ], null, true);

        if (!$res['success']) {
            return [
                'success'     => false,
                'provider'    => 'justshyp',
                'serviceable' => false,
                'message'     => $res['message'],
            ];
        }

        $data = $res['data'] ?? [];
        $isServiceable = !empty($data['serviceable']) || !empty($data['couriers']) || !empty($data);

        return [
            'success'     => true,
            'provider'    => 'justshyp',
            'serviceable' => (bool)$isServiceable,
            'data'        => $data,
        ];
    }

    /**
     * Rate calculator
     * POST /api/v3/rate-calculator
     */
    public function getRates(array $params): array
    {
        $pickup = $params['pickup_pincode'] ?? '360002';
        $drop   = $params['drop_pincode'] ?? '';
        $mode   = strtoupper($params['payment_mode'] ?? 'PPD');
        if ($mode !== 'COD') $mode = 'PPD';

        $pkg = $params['package'] ?? [];
        $weight = isset($pkg['weight']) && (float)$pkg['weight'] > 0 ? (float)$pkg['weight'] : 0.5; // in KG
        $length = isset($pkg['length']) && (float)$pkg['length'] > 0 ? (float)$pkg['length'] : 10.0;
        $breadth= isset($pkg['breadth']) && (float)$pkg['breadth'] > 0 ? (float)$pkg['breadth'] : 8.0;
        $height = isset($pkg['height']) && (float)$pkg['height'] > 0 ? (float)$pkg['height'] : 5.0;

        $res = self::sendRequest('POST', '/api/v3/rate-calculator', [
            'pickup_pincode' => (string)$pickup,
            'drop_pincode'   => (string)$drop,
            'payment_mode'   => $mode,
            'package'        => [
                'weight'  => $weight,
                'length'  => $length,
                'breadth' => $breadth,
                'height'  => $height,
            ],
        ], null, true);

        if (!$res['success']) {
            return [
                'success'  => false,
                'provider' => 'justshyp',
                'rates'    => [],
                'message'  => $res['message'],
            ];
        }

        $ratesList = [];
        $rawRates = $res['data'] ?? [];

        if (is_array($rawRates)) {
            // Check if array of couriers or keyed
            $items = isset($rawRates[0]) ? $rawRates : ($rawRates['rates'] ?? ($rawRates['couriers'] ?? [$rawRates]));
            foreach ($items as $r) {
                if (!is_array($r)) continue;
                $ratesList[] = [
                    'provider'        => 'justshyp',
                    'courier_name'    => $r['courier_name'] ?? ($r['name'] ?? ($r['courier'] ?? 'JustShyp Partner')),
                    'courier_id'      => $r['courier_id'] ?? ($r['id'] ?? null),
                    'courier_keyword' => $r['keyword'] ?? null,
                    'rate'            => (float)($r['total'] ?? ($r['rate'] ?? ($r['total_charge'] ?? ($r['freight_charge'] ?? ($r['freight'] ?? 0))))),
                    'etd'             => $r['edd_days'] ?? ($r['etd'] ?? ($r['delivery_days'] ?? ($r['expected_delivery_date'] ?? null))),
                    'mode'            => $r['service'] ?? ($r['express_type'] ?? 'surface'),
                ];
            }
        }

        usort($ratesList, fn($a, $b) => $a['rate'] <=> $b['rate']);

        return [
            'success'  => true,
            'provider' => 'justshyp',
            'rates'    => $ratesList,
            'cheapest' => $ratesList[0] ?? null,
            'raw'      => $rawRates,
        ];
    }

    /**
     * Calculate package dimensions and weight for an order according to Valerie Jewels product packaging rules:
     * - 16 piece jhumkhas: L: 27 cm, B: 10 cm, H: 9 cm, Weight: 0.5 kg
     * - 12 piece jhumkhas: L: 11.7 cm, B: 7 cm, H: 18.5 cm, Weight: 0.4 kg
     * - Mystery Jar: L: 12 cm, B: 12 cm, H: 14 cm, Weight: 0.35 kg
     * - Standard jewelry: L: 10 cm, B: 8 cm, H: 5 cm, Weight: 0.15 kg
     */
    public static function calculatePackageDimensions(int $orderId): array
    {
        return ShiprocketService::calculatePackageDimensions($orderId);
    }

    /**
     * Create shipment / book order with JustShyp
     * POST /api/v3/create-shipment
     * NEVER retry automatically to prevent duplicate orders.
     */
    public function createShipment(int $orderId, array $options = []): array
    {
        $pdo = Database::getConnection();

        // 1. Fetch order details
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            return ['success' => false, 'provider' => 'justshyp', 'message' => "Order #{$orderId} not found"];
        }

        // Idempotency: If this order already has a JustShyp AWB or provider_awb with delivery_provider = 'justshyp', retrieve details
        if ($order['delivery_provider'] === 'justshyp' && !empty($order['provider_awb'])) {
            $existingAwb = $order['provider_awb'];
            $existingTrack = $this->track($existingAwb);
            return [
                'success'       => true,
                'provider'      => 'justshyp',
                'order_id'      => $order['provider_order_id'] ?? $order['order_number'],
                'shipment_id'   => $order['provider_shipment_id'] ?? $existingAwb,
                'awb_code'      => $existingAwb,
                'courier_name'  => $order['courier_name'] ?? 'JustShyp Express',
                'tracking_url'  => $order['tracking_url'] ?? "https://backend.justshyp.com/tracking?awb={$existingAwb}",
                'label_url'     => $order['shipping_label_url'] ?? null,
                'invoice_url'   => $order['shipping_invoice_url'] ?? null,
                'message'       => 'Order already booked on JustShyp. Existing shipment details returned.',
                'already_synced'=> true,
            ];
        }

        // 2. Resolve warehouse ID
        $warehouseId = $this->resolveWarehouseId();
        if (empty($warehouseId)) {
            return [
                'success'  => false,
                'provider' => 'justshyp',
                'message'  => 'No valid JustShyp pickup warehouse ID found. Please configure a warehouse in settings.',
            ];
        }

        // 3. Calculate package dimensions and weight in KG
        $pkg = ShiprocketService::calculatePackageDimensions($orderId);
        $packageWeight  = (float)$pkg['weight']; // in KG
        $packageLength  = (float)$pkg['length'];
        $packageBreadth = (float)$pkg['breadth'];
        $packageHeight  = (float)$pkg['height'];

        // 4. Fetch line items
        $itemStmt = $pdo->prepare("SELECT * FROM order_items WHERE order_id = ?");
        $itemStmt->execute([$orderId]);
        $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

        $formattedProducts = [];
        foreach ($items as $item) {
            $formattedProducts[] = [
                'name'     => $item['product_name'] ?: 'Valerie Fine Jewelry',
                'sku'      => !empty($item['sku']) ? $item['sku'] : ('VJ-SKU-' . $item['id']),
                'quantity' => (int)$item['quantity'],
                'price'    => (float)$item['unit_price'],
            ];
        }
        if (empty($formattedProducts)) {
            $formattedProducts[] = [
                'name'     => 'Valerie Jewels Bespoke Selection',
                'sku'      => 'VJ-ORD-' . $order['order_number'],
                'quantity' => 1,
                'price'    => (float)$order['total_amount'],
            ];
        }

        // 5. Payment mode mapping: 'COD' or 'PPD'
        $paymentType = strtolower($order['payment_type'] ?? 'cod');
        $paymentMode = ($paymentType === 'partial' || $paymentType === 'cod') ? 'COD' : 'PPD';
        $orderAmount = ($paymentMode === 'COD') 
            ? (float)$order['amount_due_on_delivery'] 
            : (float)$order['total_amount'];

        // Split customer name
        $nameParts = explode(' ', trim($order['customer_name'] ?? 'Guest Customer'), 2);
        $firstName = $nameParts[0];
        $lastName  = $nameParts[1] ?? 'Customer';

        $phone = preg_replace('/[^0-9]/', '', $order['customer_phone'] ?? '');
        if (strlen($phone) > 10) {
            $phone = substr($phone, -10);
        }

        // 6. Build JustShyp create-shipment payload
        $payload = [
            'warehouse_id'    => (int)$warehouseId,
            'client_order_id' => (string)$order['order_number'], // Idempotency reference
            'payment_mode'    => $paymentMode,
            'order_amount'    => round($orderAmount, 2),
            'consignee'       => [
                'name'    => trim($order['customer_name'] ?? 'Customer'),
                'mobile'  => $phone ?: '9999999999',
                'email'   => $order['customer_email'] ?: 'orders@valeriejewels.in',
                'address' => [
                    'line1'   => $order['shipping_address_line1'],
                    'line2'   => $order['shipping_address_line2'] ?? '',
                    'city'    => $order['city'],
                    'state'   => $order['state'],
                    'pincode' => $order['pincode'],
                ],
            ],
            'package' => [
                'weight'  => $packageWeight, // KG
                'length'  => $packageLength,
                'breadth' => $packageBreadth,
                'height'  => $packageHeight,
            ],
            'products' => $formattedProducts,
        ];

        // Courier preference if selected
        if (!empty($options['courier'])) {
            $payload['courier'] = $options['courier'];
        }

        // Send request (canRetry = false for safety)
        $res = self::sendRequest('POST', '/api/v3/create-shipment', $payload, null, false);

        if (!$res['success']) {
            $errMsg = $res['message'];

            // Log milestone for pending/failed sync
            try {
                $nowSql = Database::getDriver() === 'sqlite' ? "datetime('now')" : "NOW()";
                $evStmt = $pdo->prepare("
                    INSERT INTO order_tracking_events (order_id, status, title, description, location, occurred_at)
                    VALUES (:order_id, 'confirmed', 'JustShyp Sync Pending', :desc, 'JustShyp API Gateway', $nowSql)
                ");
                $evStmt->execute([
                    ':order_id' => $orderId,
                    ':desc'     => "JustShyp API notice: {$errMsg}. Please verify warehouse/pincode or retry in Admin Orders.",
                ]);
            } catch (Throwable $e) {}

            return [
                'success'  => false,
                'provider' => 'justshyp',
                'message'  => $errMsg,
                'raw'      => $res['raw'] ?? null,
            ];
        }

        // Parse JustShyp success payload
        // Sample fields: shipment_id, waybill_number, awb, courier, courier_name, label_url, invoice_url
        $data = $res['data'] ?? [];
        $cfg  = self::getSettings();
        $awb  = (string)($data['waybill_number'] ?? ($data['awb'] ?? ($data['awb_number'] ?? '')));
        $shipmentId = (string)($data['shipment_id'] ?? ($data['id'] ?? $awb));
        $courierName = (string)($data['courier_name'] ?? ($data['courier'] ?? 'JustShyp Express'));
        $trackingUrl = !empty($awb) ? "https://backend.justshyp.com/tracking?awb={$awb}" : null;
        $labelUrl    = $data['label_url'] ?? null;
        $invoiceUrl  = $data['invoice_url'] ?? null;

        if (!empty($labelUrl) && str_starts_with($labelUrl, '/')) {
            $labelUrl = rtrim($cfg['base_url'], '/') . $labelUrl;
        }
        if (!empty($invoiceUrl) && str_starts_with($invoiceUrl, '/')) {
            $invoiceUrl = rtrim($cfg['base_url'], '/') . $invoiceUrl;
        }

        // Fetch label right away if not returned in create payload
        if (empty($labelUrl) && !empty($awb)) {
            $labelRes = $this->getLabel($awb);
            if (!empty($labelRes['label_url'])) {
                $labelUrl   = $labelRes['label_url'];
                $invoiceUrl = $labelRes['invoice_url'] ?? null;
            }
        }

        // Update orders table with normalized fields and backward-compatible fields
        $nowSql = Database::getDriver() === 'sqlite' ? "datetime('now')" : "NOW()";
        $upStmt = $pdo->prepare("
            UPDATE orders 
            SET delivery_provider    = 'justshyp',
                provider_order_id    = :p_oid,
                provider_shipment_id = :p_sid,
                provider_awb         = :p_awb,
                order_status         = CASE WHEN order_status IN ('pending', 'confirmed') THEN 'processing' ELSE order_status END,
                shipping_label_url   = COALESCE(NULLIF(:label_url, ''), shipping_label_url),
                shipping_invoice_url = COALESCE(NULLIF(:invoice_url, ''), shipping_invoice_url),
                courier_name         = COALESCE(NULLIF(:courier, ''), courier_name),
                tracking_url         = COALESCE(NULLIF(:turl, ''), tracking_url),
                updated_at           = $nowSql
            WHERE id = :id
        ");
        $upStmt->execute([
            ':p_oid'       => (string)$order['order_number'],
            ':p_sid'       => $shipmentId,
            ':p_awb'       => $awb,
            ':label_url'   => $labelUrl,
            ':invoice_url' => $invoiceUrl,
            ':courier'     => $courierName,
            ':turl'        => $trackingUrl,
            ':id'          => $orderId,
        ]);

        // Insert tracking milestone
        try {
            $evStmt = $pdo->prepare("
                INSERT INTO order_tracking_events (order_id, status, title, description, location, courier_partner, awb_code, occurred_at)
                VALUES (:order_id, 'processing', 'Order Pushed to JustShyp Panel', :desc, 'JustShyp Logistics Hub', :courier, :awb, $nowSql)
            ");
            $evStmt->execute([
                ':order_id' => $orderId,
                ':desc'     => "JustShyp Shipment #{$shipmentId} booked (AWB: {$awb}). Carrier: {$courierName}. Package: {$packageLength}x{$packageBreadth}x{$packageHeight}cm, {$packageWeight}kg.",
                ':courier'  => $courierName,
                ':awb'      => $awb,
            ]);
        } catch (Throwable $e) {}

        return [
            'success'              => true,
            'provider'             => 'justshyp',
            'order_id'             => $order['order_number'],
            'shipment_id'          => $shipmentId,
            'awb_code'             => $awb,
            'courier_name'         => $courierName,
            'tracking_url'         => $trackingUrl,
            'shipping_label_url'   => $labelUrl,
            'shipping_invoice_url' => $invoiceUrl,
            'dimensions'           => [
                'length'  => $packageLength,
                'breadth' => $packageBreadth,
                'height'  => $packageHeight,
                'weight'  => $packageWeight,
            ],
            'package_type'         => $pkg['package_type'],
            'message'              => 'Order pushed to JustShyp panel successfully!',
            'raw'                  => $data,
        ];
    }

    /**
     * Create reverse pickup shipment
     * POST /api/v3/reverse-shipment
     */
    public function createReverseShipment(int $orderId, array $options = []): array
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            return ['success' => false, 'provider' => 'justshyp', 'message' => "Order #{$orderId} not found"];
        }

        $warehouseId = $this->resolveWarehouseId();
        $pkg = ShiprocketService::calculatePackageDimensions($orderId);

        $payload = [
            'warehouse_id'    => (int)$warehouseId,
            'client_order_id' => 'RTO-' . $order['order_number'],
            'consignee'       => [
                'name'    => $order['customer_name'],
                'mobile'  => substr(preg_replace('/[^0-9]/', '', $order['customer_phone']), -10),
                'email'   => $order['customer_email'],
                'address' => [
                    'line1'   => $order['shipping_address_line1'],
                    'city'    => $order['city'],
                    'state'   => $order['state'],
                    'pincode' => $order['pincode'],
                ],
            ],
            'package' => [
                'weight' => (float)$pkg['weight'],
            ],
        ];

        $res = self::sendRequest('POST', '/api/v3/reverse-shipment', $payload, null, false);
        if (!$res['success']) {
            return [
                'success'  => false,
                'provider' => 'justshyp',
                'message'  => $res['message'],
            ];
        }

        return [
            'success'  => true,
            'provider' => 'justshyp',
            'data'     => $res['data'],
            'message'  => 'Reverse shipment requested successfully on JustShyp',
        ];
    }

    /**
     * Cancel shipment
     * POST /api/v3/cancel-shipment
     */
    public function cancelShipment(int $orderId): array
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        $awb = $order['provider_awb'] ?? ($order['shiprocket_awb'] ?? null);
        if (empty($awb)) {
            return ['success' => false, 'provider' => 'justshyp', 'message' => "Order #{$orderId} has no AWB number to cancel"];
        }

        $res = self::sendRequest('POST', '/api/v3/cancel-shipment', ['awb' => $awb], null, false);
        if (!$res['success']) {
            return [
                'success'  => false,
                'provider' => 'justshyp',
                'message'  => $res['message'],
            ];
        }

        $nowSql = Database::getDriver() === 'sqlite' ? "datetime('now')" : "NOW()";
        try {
            $up = $pdo->prepare("UPDATE orders SET order_status = 'cancelled', updated_at = $nowSql WHERE id = ?");
            $up->execute([$orderId]);

            $ev = $pdo->prepare("
                INSERT INTO order_tracking_events (order_id, status, title, description, location, courier_partner, awb_code, occurred_at)
                VALUES (?, 'cancelled', 'Shipment Cancelled on JustShyp', 'Shipment was cancelled with carrier.', 'Atelier Hub', ?, ?, $nowSql)
            ");
            $ev->execute([$orderId, $order['courier_name'] ?? 'JustShyp', $awb]);
        } catch (Throwable $e) {}

        return [
            'success'  => true,
            'provider' => 'justshyp',
            'message'  => 'Shipment cancelled successfully on JustShyp',
            'raw'      => $res['data'],
        ];
    }

    /**
     * Track shipment by AWB
     * GET or POST /api/v3/tracking
     */
    public function track(string $awb): array
    {
        $res = self::sendRequest('GET', '/api/v3/tracking', ['awb' => $awb], null, true);

        if (!$res['success']) {
            // Also try shipments-details if tracking returns empty
            $detailRes = self::sendRequest('GET', '/api/v3/shipments-details', ['awb' => $awb], null, true);
            if ($detailRes['success'] && !empty($detailRes['data'])) {
                $d = $detailRes['data'];
                $status = $d['status'] ?? 'processing';
                return [
                    'success'           => true,
                    'provider'          => 'justshyp',
                    'awb'               => $awb,
                    'current_status'    => $status,
                    'normalized_status' => self::mapStatus($status),
                    'courier_name'      => $d['express_type'] ?? 'JustShyp Express',
                    'events'            => [],
                    'raw'               => $d,
                ];
            }

            return [
                'success'  => false,
                'provider' => 'justshyp',
                'message'  => $res['message'],
            ];
        }

        $data = $res['data'] ?? [];
        $rawStatus = strtolower($data['current_status'] ?? ($data['status'] ?? 'processing'));
        $normStatus = self::mapStatus($rawStatus);
        $scans = $data['events'] ?? ($data['scans'] ?? ($data['tracking_activities'] ?? []));

        $events = [];
        foreach ($scans as $s) {
            $events[] = [
                'activity' => $s['description'] ?? ($s['activity'] ?? ($s['remarks'] ?? ($s['status'] ?? ''))),
                'location' => $s['location'] ?? '',
                'date'     => $s['datetime'] ?? ($s['date'] ?? ($s['time'] ?? '')),
            ];
        }

        return [
            'success'           => true,
            'provider'          => 'justshyp',
            'awb'               => $awb,
            'current_status'    => $rawStatus,
            'normalized_status' => $normStatus,
            'courier_name'      => $data['courier_name'] ?? ($data['courier'] ?? 'JustShyp Partner'),
            'events'            => $events,
            'raw'               => $data,
        ];
    }

    /**
     * Retrieve shipping label (4x6 thermal) & invoice (A4)
     * GET or POST /api/v3/shipping-label?awb=
     */
    public function getLabel(string $awb): array
    {
        $res = self::sendRequest('GET', '/api/v3/shipping-label', ['awb' => $awb], null, true);

        if (!$res['success']) {
            return [
                'success'     => false,
                'provider'    => 'justshyp',
                'label_url'   => null,
                'invoice_url' => null,
                'message'     => $res['message'],
            ];
        }

        $data = $res['data'] ?? [];
        $cfg  = self::getSettings();
        $labelUrl   = $data['label_url'] ?? ($data['shipping_label_url'] ?? null);
        $invoiceUrl = $data['invoice_url'] ?? ($data['invoice_pdf'] ?? null);

        if (!empty($labelUrl) && str_starts_with($labelUrl, '/')) {
            $labelUrl = rtrim($cfg['base_url'], '/') . $labelUrl;
        }
        if (!empty($invoiceUrl) && str_starts_with($invoiceUrl, '/')) {
            $invoiceUrl = rtrim($cfg['base_url'], '/') . $invoiceUrl;
        }

        // Update database if order found
        if (!empty($labelUrl)) {
            try {
                $pdo = Database::getConnection();
                $up = $pdo->prepare("
                    UPDATE orders 
                    SET shipping_label_url = :lbl,
                        shipping_invoice_url = COALESCE(:inv, shipping_invoice_url)
                    WHERE provider_awb = :awb OR shiprocket_awb = :awb
                ");
                $up->execute([
                    ':lbl' => $labelUrl,
                    ':inv' => $invoiceUrl,
                    ':awb' => $awb,
                ]);
            } catch (Throwable $e) {}
        }

        return [
            'success'     => true,
            'provider'    => 'justshyp',
            'label_url'   => $labelUrl,
            'invoice_url' => $invoiceUrl,
            'raw'         => $data,
        ];
    }

    /**
     * Schedule courier pickup
     * POST /api/v3/generate-pickup
     */
    public function schedulePickup(array $params): array
    {
        $awb = $params['awb'] ?? '';
        $warehouseId = $params['warehouse_id'] ?? $this->resolveWarehouseId();
        $date = $params['pickup_date'] ?? date('Y-m-d');

        $res = self::sendRequest('POST', '/api/v3/generate-pickup', [
            'awb'          => $awb,
            'warehouse_id' => (int)$warehouseId,
            'pickup_date'  => $date,
        ], null, false);

        if (!$res['success']) {
            return [
                'success'  => false,
                'provider' => 'justshyp',
                'message'  => $res['message'],
            ];
        }

        return [
            'success'  => true,
            'provider' => 'justshyp',
            'message'  => 'Pickup scheduled successfully on JustShyp',
            'data'     => $res['data'],
        ];
    }

    /**
     * Generate shipment manifest
     * POST /api/v3/generate-manifest
     */
    public function generateManifest(array $params): array
    {
        $awb = $params['awb'] ?? '';
        $warehouseId = $params['warehouse_id'] ?? $this->resolveWarehouseId();

        $res = self::sendRequest('POST', '/api/v3/generate-manifest', [
            'awb'          => $awb,
            'warehouse_id' => (int)$warehouseId,
        ], null, false);

        if (!$res['success']) {
            return [
                'success'  => false,
                'provider' => 'justshyp',
                'message'  => $res['message'],
            ];
        }

        $data = $res['data'] ?? [];
        return [
            'success'      => true,
            'provider'     => 'justshyp',
            'manifest_url' => $data['manifest_url'] ?? null,
            'data'         => $data,
        ];
    }

    /**
     * List NDR shipments
     * GET /api/v3/ndr-shipments?ndr_type=initiated|rto&from_date=&to_date=
     * Note: Envelope uses `response` instead of `data`.
     */
    public function listNdr(array $params): array
    {
        $query = [
            'ndr_type'  => $params['ndr_type'] ?? 'initiated',
            'from_date' => $params['from_date'] ?? date('Y-m-d', strtotime('-30 days')),
            'to_date'   => $params['to_date'] ?? date('Y-m-d'),
        ];

        $res = self::sendRequest('GET', '/api/v3/ndr-shipments', $query, null, true);
        if (!$res['success']) {
            return [
                'success'       => false,
                'provider'      => 'justshyp',
                'ndr_shipments' => [],
                'message'       => $res['message'],
            ];
        }

        $list = $res['data'] ?? [];
        return [
            'success'       => true,
            'provider'      => 'justshyp',
            'ndr_shipments' => is_array($list) ? $list : [],
        ];
    }

    /**
     * NDR Action (reattempt | rto | update_phone | update_address)
     * POST /api/v3/ndr-action
     */
    public function ndrAction(array $params): array
    {
        $awb    = $params['awb'] ?? '';
        $action = $params['action'] ?? 'reattempt';

        $payload = [
            'awb'    => $awb,
            'action' => $action,
        ];
        if (!empty($params['phone']))   $payload['phone'] = $params['phone'];
        if (!empty($params['address'])) $payload['address'] = $params['address'];

        $res = self::sendRequest('POST', '/api/v3/ndr-action', $payload, null, false);
        return [
            'success'  => $res['success'],
            'provider' => 'justshyp',
            'message'  => $res['message'],
            'data'     => $res['data'] ?? null,
        ];
    }

    /**
     * Create / sync pickup warehouse
     * POST /api/v3/create_warehouse
     */
    public function syncWarehouse(array $warehouseData): array
    {
        $payload = [
            'address_title' => $warehouseData['title'] ?? 'Valerie Jewels',
            'sender_name'   => $warehouseData['sender_name'] ?? 'Jeel Kakadiya',
            'full_address'  => $warehouseData['full_address'] ?? 'Valerie Jewels, Jeel Kakadiya, Rajkot, Gujarat',
            'phone'         => $warehouseData['phone'] ?? '7016347945',
            'pincode'       => $warehouseData['pincode'] ?? '360002',
            'city'          => $warehouseData['city'] ?? 'Rajkot',
            'state'         => $warehouseData['state'] ?? 'Gujarat',
        ];

        $res = self::sendRequest('POST', '/api/v3/create_warehouse', $payload, null, false);

        if (!$res['success']) {
            return [
                'success'  => false,
                'provider' => 'justshyp',
                'message'  => $res['message'],
            ];
        }

        $wId = $res['data']['warehouse_id'] ?? ($res['data']['id'] ?? ($res['data']['pick_address_id'] ?? ($res['data']['pickup_id'] ?? null)));

        if (!empty($wId)) {
            // Save to warehouse_mappings
            try {
                $pdo = Database::getConnection();
                $isSqlite = Database::getDriver() === 'sqlite';
                $sql = $isSqlite
                    ? "INSERT OR REPLACE INTO warehouse_mappings (internal_code, provider, provider_warehouse_id, title, address, pincode, phone)
                       VALUES (:code, 'justshyp', :wid, :title, :addr, :pin, :phone)"
                    : "INSERT INTO warehouse_mappings (internal_code, provider, provider_warehouse_id, title, address, pincode, phone)
                       VALUES (:code, 'justshyp', :wid, :title, :addr, :pin, :phone)
                       ON DUPLICATE KEY UPDATE provider_warehouse_id = VALUES(provider_warehouse_id), title = VALUES(title), address = VALUES(address), pincode = VALUES(pincode), phone = VALUES(phone)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    ':code'  => 'justshyp_' . $wId,
                    ':wid'   => (string)$wId,
                    ':title' => $payload['address_title'],
                    ':addr'  => $payload['full_address'],
                    ':pin'   => $payload['pincode'],
                    ':phone' => $payload['phone'],
                ]);
            } catch (Throwable $e) {}
        }

        return [
            'success'      => true,
            'provider'     => 'justshyp',
            'warehouse_id' => $wId,
            'message'      => $res['message'],
        ];
    }

    /**
     * List registered warehouses
     * GET /api/v3/warehouse-list
     * Note: Handles the misspelled field `ciity`
     */
    public function listWarehouses(): array
    {
        $res = self::sendRequest('GET', '/api/v3/warehouse-list', null, null, true);
        if (!$res['success']) {
            return [
                'success'    => false,
                'provider'   => 'justshyp',
                'warehouses' => [],
                'message'    => $res['message'],
            ];
        }

        $rawWarehouses = $res['data'] ?? [];
        $normalized = [];

        if (is_array($rawWarehouses)) {
            foreach ($rawWarehouses as $w) {
                if (!is_array($w)) continue;
                $normalized[] = [
                    'warehouse_id' => (string)($w['warehouse_id'] ?? ($w['id'] ?? ($w['pick_address_id'] ?? ($w['pickup_id'] ?? '')))),
                    'title'        => $w['title'] ?? ($w['address_title'] ?? ($w['name'] ?? 'Valerie Jewels')),
                    'addressee'    => $w['addressee'] ?? ($w['sender_name'] ?? ($w['contact_name'] ?? 'Jeel Kakadiya')),
                    'address'      => $w['full_address'] ?? ($w['address'] ?? 'Rajkot, Gujarat'),
                    'pincode'      => (string)($w['pincode'] ?? ($w['pin_code'] ?? ($w['pin'] ?? '360002'))),
                    'city'         => $w['ciity'] ?? ($w['city'] ?? 'Rajkot'), // Handles misspelled 'ciity'
                    'state'        => $w['state'] ?? 'Gujarat',
                    'phone'        => (string)($w['phone'] ?? ($w['mobile'] ?? ($w['contact_number'] ?? '7016347945'))),
                ];
            }
        }

        return [
            'success'    => true,
            'provider'   => 'justshyp',
            'warehouses' => $normalized,
        ];
    }
}
