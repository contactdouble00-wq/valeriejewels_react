<?php
/**
 * VALERIE JEWELS — Meta Conversions API (CAPI) Server-Side Event Dispatcher
 * Sends verified server-side events (e.g. Purchase) to Meta Graph API
 * ONLY when payment gateway explicitly confirms 'Success' or 'Paid' status.
 * 
 * Dataset ID: 1574336098052134
 * Meta API Version: v18.0
 */

require_once dirname(__DIR__) . '/config/database.php';

class MetaCapiService
{
    const DATASET_ID = '1574336098052134';
    const DEFAULT_ACCESS_TOKEN = 'EAAWMxWFI7M4BS0CmPaNFjF9cDVhnq0RbaZAbJe1cZBDt50NVHlxk0KK2e2DRMyO1M5C40s45QrojVKIZBy5uBJUVyv1eStPwna0FZBZBqtGYi8WE6V0nQ3qQ9CNH4tbi9s9cvGIOktuNPODNijcYxsi7utOtedh5zMQBQyNywnx3ZABXQ4nyda2IGhakbPLQZDZD';
    const API_VERSION = 'v18.0';

    /**
     * Get active Access Token from environment, site_settings, or hardcoded default
     */
    public static function getAccessToken(): string
    {
        $token = getenv('META_ACCESS_TOKEN') ?: ($_ENV['META_ACCESS_TOKEN'] ?? null);
        if (!empty($token)) {
            return trim($token);
        }

        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare("SELECT `value` FROM `site_settings` WHERE `key` = 'meta_access_token' LIMIT 1");
            $stmt->execute();
            $dbToken = $stmt->fetchColumn();
            if (!empty($dbToken)) {
                return trim($dbToken);
            }
        } catch (Throwable $e) {}

        return self::DEFAULT_ACCESS_TOKEN;
    }

    /**
     * Get Dataset / Pixel ID
     */
    public static function getDatasetId(): string
    {
        $id = getenv('META_DATASET_ID') ?: (getenv('META_PIXEL_ID') ?: ($_ENV['META_DATASET_ID'] ?? ($_ENV['META_PIXEL_ID'] ?? null)));
        return !empty($id) ? trim($id) : self::DATASET_ID;
    }

    /**
     * Dispatch Server-Side 'Purchase' event to Meta Conversions API
     * STRICT RULE: ONLY fires when the payment gateway has explicitly confirmed 'Success' or 'Paid' status!
     */
    public static function sendPurchaseEvent(int $orderId, ?array $overrideUserData = null): array
    {
        try {
            $pdo = Database::getConnection();

            // 1. Fetch order details
            $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
            $stmt->execute([$orderId]);
            $order = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$order) {
                return [
                    'success' => false,
                    'status'  => 'order_not_found',
                    'message' => "Order #{$orderId} not found",
                ];
            }

            // 2. CRITICAL GATEWAY VALIDATION:
            // Must be 'paid' or 'partial_paid', OR 'confirmed' COD order.
            // NEVER send for 'failed', 'pending', or 'unpaid' orders!
            $paymentStatus = strtolower(trim($order['payment_status'] ?? ''));
            $orderStatus = strtolower(trim($order['order_status'] ?? ''));
            $paymentType = strtolower(trim($order['payment_type'] ?? ''));

            $isPaid = ($paymentStatus === 'paid' || $paymentStatus === 'partial_paid');
            $isConfirmedCod = ($paymentType === 'cod' && in_array($orderStatus, ['confirmed', 'processing', 'shipped'], true));

            if (!$isPaid && !$isConfirmedCod) {
                return [
                    'success' => false,
                    'status'  => 'skipped',
                    'message' => "Order #{$orderId} payment is '{$paymentStatus}' (order: '{$orderStatus}'). Meta Purchase event rejected.",
                ];
            }

            // 3. IDEMPOTENCY / DEDUPLICATION CHECK:
            // Ensure we don't send duplicate Purchase events for the same order
            self::ensureLogsTable($pdo);

            $chk = $pdo->prepare("SELECT id, status, created_at FROM meta_capi_logs WHERE order_id = ? AND event_name = 'Purchase' LIMIT 1");
            $chk->execute([$orderId]);
            $existing = $chk->fetch(PDO::FETCH_ASSOC);

            if ($existing && $existing['status'] === 'success') {
                return [
                    'success' => true,
                    'status'  => 'skipped_duplicate',
                    'message' => "Meta Purchase event already dispatched for order #{$orderId} on {$existing['created_at']}",
                ];
            }

            // 4. Fetch order items for contents payload
            $itemStmt = $pdo->prepare("SELECT product_id, product_name, quantity, unit_price FROM order_items WHERE order_id = ?");
            $itemStmt->execute([$orderId]);
            $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

            $contents = [];
            foreach ($items as $it) {
                $contents[] = [
                    'id'         => (string)($it['product_id'] ?? 1),
                    'quantity'   => max(1, (int)($it['quantity'] ?? 1)),
                    'item_price' => (float)($it['unit_price'] ?? 0),
                    'title'      => (string)($it['product_name'] ?? 'Jewelry Piece'),
                ];
            }

            // 5. Construct Normalized & SHA-256 Hashed User Data for Meta Advanced Matching
            $userData = self::buildHashedUserData($order, $overrideUserData);

            // 6. Build Order & Custom Data
            $totalAmount = (float)($order['total_amount'] ?? 0);
            $orderNumber = $order['order_number'];

            $appConfig = require dirname(__DIR__) . '/config/config.php';
            $baseUrl = rtrim($appConfig['app']['url'] ?? 'https://valeriejewels.in', '/');
            $eventSourceUrl = "{$baseUrl}/order-confirmation/" . urlencode($orderNumber);

            $eventPayload = [
                'event_name'       => 'Purchase',
                'event_time'       => time(),
                'action_source'    => 'website',
                'event_source_url' => $eventSourceUrl,
                'event_id'         => $orderNumber, // Deduplication key with client pixel
                'user_data'        => $userData,
                'custom_data'      => [
                    'currency'     => 'INR',
                    'value'        => $totalAmount,
                    'content_type' => 'product',
                    'contents'     => $contents,
                    'order_id'     => $orderNumber,
                ],
            ];

            $postBody = [
                'data' => [$eventPayload],
            ];

            // 7. Send server-side POST request to Meta Graph API
            $datasetId = self::getDatasetId();
            $accessToken = self::getAccessToken();
            $apiVersion = self::API_VERSION;
            $url = "https://graph.facebook.com/{$apiVersion}/{$datasetId}/events?access_token=" . urlencode($accessToken);

            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postBody));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Accept: application/json',
            ]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 8);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            $rawResponse = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

            $responseData = json_decode($rawResponse, true) ?: [];
            $isSuccess = ($httpCode >= 200 && $httpCode < 300 && !empty($responseData['events_received']));

            // 8. Record in meta_capi_logs table
            $logStatus = $isSuccess ? 'success' : 'failed';
            self::logEvent($pdo, $orderId, 'Purchase', $orderNumber, $logStatus, $rawResponse ?: '');

            return [
                'success'         => $isSuccess,
                'status'          => $logStatus,
                'http_code'       => $httpCode,
                'events_received' => $responseData['events_received'] ?? 0,
                'fbtrace_id'      => $responseData['fbtrace_id'] ?? null,
                'order_number'    => $orderNumber,
                'value'           => $totalAmount,
                'currency'        => 'INR',
                'response'        => $responseData,
            ];

        } catch (Throwable $e) {
            error_log("[MetaCapiService] Error dispatching Purchase event: " . $e->getMessage());
            return [
                'success'       => false,
                'status'        => 'error',
                'error_message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Build User Data with SHA-256 hashing conforming strictly to Meta specifications
     */
    private static function buildHashedUserData(array $order, ?array $overrideUserData = null): array
    {
        $userData = [];

        // Email (lowercase, trim, sha256)
        $email = trim($overrideUserData['email'] ?? ($order['customer_email'] ?? ''));
        if (!empty($email) && filter_var($email, FILTER_VALIDATE_EMAIL) && strpos($email, '@valerieclient.in') === false) {
            $userData['em'] = [hash('sha256', strtolower($email))];
        }

        // Phone (digits only, country code 91 for India, sha256)
        $rawPhone = trim($overrideUserData['phone'] ?? ($order['customer_phone'] ?? ''));
        $digits = preg_replace('/\D/', '', $rawPhone);
        if (!empty($digits)) {
            if (strlen($digits) === 10) {
                $digits = '91' . $digits;
            } elseif (strlen($digits) === 11 && str_starts_with($digits, '0')) {
                $digits = '91' . substr($digits, 1);
            }
            $userData['ph'] = [hash('sha256', $digits)];
        }

        // Name (split first/last, lowercase, sha256)
        $name = trim($overrideUserData['name'] ?? ($order['customer_name'] ?? ''));
        if (!empty($name)) {
            $parts = preg_split('/\s+/', $name);
            if (!empty($parts[0])) {
                $userData['fn'] = [hash('sha256', strtolower($parts[0]))];
            }
            if (count($parts) > 1) {
                $lastName = implode(' ', array_slice($parts, 1));
                $userData['ln'] = [hash('sha256', strtolower($lastName))];
            }
        }

        // City (lowercase, alphanumeric, sha256)
        $city = trim($order['city'] ?? '');
        if (!empty($city)) {
            $cleanCity = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $city));
            $userData['ct'] = [hash('sha256', $cleanCity)];
        }

        // State (lowercase, alphanumeric, sha256)
        $state = trim($order['state'] ?? '');
        if (!empty($state)) {
            $cleanState = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $state));
            $userData['st'] = [hash('sha256', $cleanState)];
        }

        // Pincode / Zip (lowercase, alphanumeric, sha256)
        $pincode = trim($order['pincode'] ?? '');
        if (!empty($pincode)) {
            $cleanZip = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $pincode));
            $userData['zp'] = [hash('sha256', $cleanZip)];
        }

        // Country: always India 'in'
        $userData['country'] = [hash('sha256', 'in')];

        // Client IP Address
        $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? ($_SERVER['REMOTE_ADDR'] ?? null));
        if ($ip) {
            $ipParts = explode(',', $ip);
            $userData['client_ip_address'] = trim($ipParts[0]);
        }

        // Client User Agent
        if (!empty($_SERVER['HTTP_USER_AGENT'])) {
            $userData['client_user_agent'] = $_SERVER['HTTP_USER_AGENT'];
        }

        return $userData;
    }

    /**
     * Ensure meta_capi_logs table exists for idempotency and audit trail
     */
    private static function ensureLogsTable(PDO $pdo): void
    {
        try {
            $driver = Database::getDriver();
            if ($driver === 'sqlite') {
                $pdo->exec("
                    CREATE TABLE IF NOT EXISTS meta_capi_logs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        order_id INTEGER NOT NULL,
                        event_name TEXT NOT NULL,
                        event_id TEXT NOT NULL,
                        status TEXT NOT NULL,
                        response_body TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(order_id, event_name)
                    )
                ");
            } else {
                $pdo->exec("
                    CREATE TABLE IF NOT EXISTS `meta_capi_logs` (
                        `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                        `order_id` BIGINT UNSIGNED NOT NULL,
                        `event_name` VARCHAR(50) NOT NULL,
                        `event_id` VARCHAR(100) NOT NULL,
                        `status` VARCHAR(50) NOT NULL,
                        `response_body` LONGTEXT DEFAULT NULL,
                        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE KEY `uq_order_meta_event` (`order_id`, `event_name`),
                        INDEX `idx_meta_event_status` (`event_name`, `status`)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                ");
            }
        } catch (Throwable $e) {}
    }

    /**
     * Log dispatched CAPI event
     */
    private static function logEvent(PDO $pdo, int $orderId, string $eventName, string $eventId, string $status, string $responseBody): void
    {
        try {
            $driver = Database::getDriver();
            $dt = date('Y-m-d H:i:s');
            if ($driver === 'sqlite') {
                $stmt = $pdo->prepare("
                    INSERT OR REPLACE INTO meta_capi_logs (order_id, event_name, event_id, status, response_body, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([$orderId, $eventName, $eventId, $status, $responseBody, $dt]);
            } else {
                $stmt = $pdo->prepare("
                    INSERT INTO `meta_capi_logs` (`order_id`, `event_name`, `event_id`, `status`, `response_body`, `created_at`)
                    VALUES (:order_id, :event_name, :event_id, :status, :resp, :dt)
                    ON DUPLICATE KEY UPDATE 
                        `status` = VALUES(`status`),
                        `response_body` = VALUES(`response_body`),
                        `created_at` = VALUES(`created_at`)
                ");
                $stmt->execute([
                    ':order_id'   => $orderId,
                    ':event_name' => $eventName,
                    ':event_id'   => $eventId,
                    ':status'     => $status,
                    ':resp'       => $responseBody,
                    ':dt'         => $dt,
                ]);
            }
        } catch (Throwable $e) {
            error_log("[MetaCapiService] Logging error: " . $e->getMessage());
        }
    }
}

