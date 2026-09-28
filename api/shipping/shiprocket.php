<?php
/**
 * VALERIE JEWELS — Shiprocket Logistics Client & Automated Fulfillment
 * Handles automated order creation, Partial COD / Prepaid split sync, AWB generation, and tracking.
 */

require_once dirname(__DIR__) . '/config/database.php';

class ShiprocketService
{
    private static ?array $settings = null;

    /**
     * Load settings from database or fallback to environment / config
     */
    private static function getSettings(): array
    {
        if (self::$settings === null) {
            $pdo = Database::getConnection();
            $settings = [];

            try {
                $stmt = $pdo->prepare("SELECT `value` FROM `site_settings` WHERE `key` = 'payment_settings' LIMIT 1");
                $stmt->execute();
                $raw = $stmt->fetchColumn();
                if ($raw) {
                    $settings = json_decode($raw, true) ?: [];
                }
            } catch (Throwable $e) {}

            $allConfig = [];
            $configFile = dirname(__DIR__) . '/config/config.php';
            if (file_exists($configFile)) {
                $allConfig = require $configFile;
            }

            $srConfig = $allConfig['shiprocket'] ?? [];

            self::$settings = [
                'email'           => getenv('SHIPROCKET_EMAIL') ?: (!empty($settings['shiprocket_email']) ? $settings['shiprocket_email'] : ($srConfig['email'] ?? '')),
                'password'        => getenv('SHIPROCKET_PASSWORD') ?: (!empty($settings['shiprocket_password']) ? $settings['shiprocket_password'] : ($srConfig['password'] ?? '')),
                'pickup_location' => getenv('SHIPROCKET_PICKUP_LOCATION') ?: (!empty($settings['shiprocket_pickup_location']) ? $settings['shiprocket_pickup_location'] : ($srConfig['pickup_location'] ?? 'Primary')),
                'auto_sync'       => isset($settings['shiprocket_auto_sync']) ? (bool)$settings['shiprocket_auto_sync'] : true,
            ];
        }

        return self::$settings;
    }

    /**
     * Authenticate with Shiprocket API v2 and cache bearer token
     */
    public static function getAuthToken(): ?string
    {
        $cfg = self::getSettings();
        if (empty($cfg['email']) || empty($cfg['password'])) {
            return null;
        }

        $pdo = Database::getConnection();

        // 1. Check cached token in site_settings
        try {
            $stmt = $pdo->prepare("SELECT `value` FROM `site_settings` WHERE `key` = 'shiprocket_token_cache' LIMIT 1");
            $stmt->execute();
            $raw = $stmt->fetchColumn();
            if ($raw) {
                $cached = json_decode($raw, true);
                // Shiprocket token valid for 10 days, refresh after 8 days
                if (!empty($cached['token']) && !empty($cached['created_at']) && (time() - $cached['created_at']) < (8 * 86400)) {
                    return $cached['token'];
                }
            }
        } catch (Throwable $e) {}

        // 2. Request new token from Shiprocket API
        $loginUrl = 'https://apiv2.shiprocket.in/v1/external/auth/login';
        $payload = json_encode([
            'email'    => $cfg['email'],
            'password' => $cfg['password'],
        ]);

        $ch = curl_init($loginUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 12);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200 && $response) {
            $data = json_decode($response, true);
            if (!empty($data['token'])) {
                $token = $data['token'];
                // Save to cache
                try {
                    $saveStmt = $pdo->prepare("
                        REPLACE INTO `site_settings` (`key`, `value`) 
                        VALUES ('shiprocket_token_cache', :val)
                    ");
                    $saveStmt->execute([
                        ':val' => json_encode(['token' => $token, 'created_at' => time()])
                    ]);
                } catch (Throwable $te) {}

                return $token;
            }
        }

        error_log("[Shiprocket API] Login failed with HTTP {$httpCode}: {$response}");
        return null;
    }

    /**
     * Create live order in Shiprocket with exact Partial COD / Prepaid mapping
     */
    /**
     * Resolve default active channel ID from Shiprocket account
     */
    public static function getDefaultChannelId(string $token): ?int
    {
        $url = 'https://apiv2.shiprocket.in/v1/external/channels';
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $token,
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $res = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($code === 200 && $res) {
            $data = json_decode($res, true);
            $channels = $data['data'] ?? (is_array($data) ? $data : []);
            if (!empty($channels)) {
                // Prefer Custom channel or take first active channel
                foreach ($channels as $c) {
                    if (stripos($c['name'] ?? '', 'custom') !== false) {
                        return (int)$c['id'];
                    }
                }
                if (!empty($channels[0]['id'])) {
                    return (int)$channels[0]['id'];
                }
            }
        }
        return null;
    }

    /**
     * Resolve valid verified pickup location from Shiprocket account
     */
    public static function getValidPickupLocation(string $token, string $preferredLocation = 'Primary'): string
    {
        $pickupUrl = 'https://apiv2.shiprocket.in/v1/external/settings/company/pickup';
        $pch = curl_init($pickupUrl);
        curl_setopt($pch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($pch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $token,
        ]);
        curl_setopt($pch, CURLOPT_TIMEOUT, 8);
        curl_setopt($pch, CURLOPT_SSL_VERIFYPEER, false);
        $pRes = curl_exec($pch);
        $pCode = curl_getinfo($pch, CURLINFO_HTTP_CODE);
        curl_close($pch);

        if ($pCode === 200 && $pRes) {
            $pData = json_decode($pRes, true);
            $addresses = $pData['data']['shipping_address'] ?? [];
            if (!empty($addresses)) {
                foreach ($addresses as $a) {
                    $locName = trim($a['pickup_location'] ?? '');
                    if (strcasecmp($locName, trim($preferredLocation)) === 0) {
                        return $locName;
                    }
                }
                if (!empty($addresses[0]['pickup_location'])) {
                    return trim($addresses[0]['pickup_location']);
                }
            }
        }
        return $preferredLocation ?: 'Primary';
    }

    /**
     * Create live order in Shiprocket with exact Partial COD / Prepaid mapping
     */
    public static function createShipment(int $orderId, bool $force = false): array
    {
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            throw new Exception("Order #{$orderId} not found");
        }

        // Avoid duplicate Shiprocket order creation if already synced to live Shiprocket (numeric order ID)
        $existingSrId = trim($order['shiprocket_order_id'] ?? '');
        $isSandboxMock = strpos($existingSrId, 'SR-ORD-') === 0;

        if (!empty($existingSrId) && !$isSandboxMock && !$force) {
            return [
                'success'               => true,
                'already_synced'        => true,
                'shiprocket_order_id'   => $order['shiprocket_order_id'],
                'shiprocket_shipment_id'=> $order['shiprocket_shipment_id'],
                'awb_code'              => $order['shiprocket_awb'],
            ];
        }

        $token = self::getAuthToken();
        $cfg = self::getSettings();

        // If credentials are not configured, handle based on context
        if (empty($token)) {
            $msg = "Shiprocket credentials (email or password) are not configured or authentication failed.";
            error_log("[Shiprocket] " . $msg);
            if ($force) {
                return [
                    'success' => false,
                    'message' => $msg . " Please verify credentials in Admin Panel -> Settings -> Payment & Shipping.",
                ];
            }
            return self::createSandboxShipment($order);
        }

        // Fetch order items
        $itemStmt = $pdo->prepare("SELECT * FROM order_items WHERE order_id = ?");
        $itemStmt->execute([$orderId]);
        $orderItems = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

        $formattedItems = [];
        $itemsSubtotal = 0.0;
        foreach ($orderItems as $it) {
            $qty = max(1, (int)($it['quantity'] ?? 1));
            $unitPrice = round((float)($it['unit_price'] ?? 0), 2);
            $itemsSubtotal += ($qty * $unitPrice);
            $formattedItems[] = [
                'name'          => trim($it['product_name'] ?? '') ?: 'Valerie Fine Jewelry',
                'sku'           => 'VJ-P' . ($it['product_id'] ?? 1) . (!empty($it['variant_id']) ? ('-V' . $it['variant_id']) : ''),
                'units'         => $qty,
                'selling_price' => $unitPrice,
                'discount'      => 0,
                'tax'           => 0,
                'hsn'           => 7117, // Standard HSN code for imitation/fashion jewelry
            ];
        }

        if (empty($formattedItems)) {
            $fallbackPrice = round((float)($order['subtotal'] > 0 ? $order['subtotal'] : $order['total_amount']), 2);
            $itemsSubtotal = $fallbackPrice;
            $formattedItems[] = [
                'name'          => 'Valerie Fine Jewelry Handcrafted Piece',
                'sku'           => 'VJ-GEN-01',
                'units'         => 1,
                'selling_price' => $fallbackPrice,
                'discount'      => 0,
                'tax'           => 0,
                'hsn'           => 7117,
            ];
        }

        // Split customer name into first & last name
        $fullName = trim($order['shipping_name'] ?? ($order['customer_name'] ?? 'Valerie Customer'));
        $nameParts = explode(' ', $fullName, 2);
        $firstName = !empty($nameParts[0]) ? $nameParts[0] : 'Valerie';
        $lastName = !empty($nameParts[1]) ? $nameParts[1] : 'Customer';

        $cleanPhone = preg_replace('/\D/', '', $order['shipping_phone'] ?? ($order['customer_phone'] ?? ''));
        $cleanPhone = substr($cleanPhone, -10);
        if (strlen($cleanPhone) < 10) {
            $cleanPhone = '9876543210';
        }

        $address1 = trim($order['shipping_address_line1'] ?? 'Flat 101');
        $address2 = trim($order['shipping_address_line2'] ?? '');
        $city     = trim($order['shipping_city'] ?? ($order['city'] ?? 'Bengaluru'));
        $pincode  = trim($order['shipping_pincode'] ?? ($order['pincode'] ?? '560038'));
        $state    = trim($order['shipping_state'] ?? ($order['state'] ?? 'Karnataka'));
        $email    = trim($order['customer_email'] ?? 'care@valeriejewels.in');

        // Resolve valid pickup location from Shiprocket account
        $preferredPickup = !empty($cfg['pickup_location']) ? $cfg['pickup_location'] : 'Primary';
        $pickupLocation = self::getValidPickupLocation($token, $preferredPickup);

        // Resolve valid channel id from Shiprocket account
        $channelId = self::getDefaultChannelId($token);

        // Financial Mapping
        $paymentType    = $order['payment_type'] ?? 'full_prepaid';
        $totalAmount    = round((float)$order['total_amount'], 2);
        $paidUpfront    = round((float)$order['amount_paid_upfront'], 2);
        $dueOnDelivery  = round((float)$order['amount_due_on_delivery'], 2);
        $shippingFee    = round((float)($order['shipping_fee'] ?? 0), 2);
        $subTotal       = round($itemsSubtotal, 2);

        $txnRef = !empty($order['fastrr_order_id']) ? " (Txn: {$order['fastrr_order_id']})" : '';

        if ($paymentType === 'partial') {
            $paymentMethod = 'COD';
            $grossTotal    = $subTotal + $shippingFee;
            $totalDiscount = max(0.0, round($grossTotal - $dueOnDelivery, 2));
            $comment = "*** PARTIAL COD ORDER *** Total: Rs.{$totalAmount} | Advance Paid Online: Rs.{$paidUpfront}{$txnRef} | PLEASE COLLECT EXACTLY Rs.{$dueOnDelivery} CASH AT DELIVERY. DO NOT OVERCHARGE.";
        } elseif ($paymentType === 'cod') {
            $paymentMethod = 'COD';
            $grossTotal    = $subTotal + $shippingFee;
            $totalDiscount = max(0.0, round($grossTotal - $dueOnDelivery, 2));
            $comment = "*** CASH ON DELIVERY *** Total: Rs.{$totalAmount} | Collect Exactly Rs.{$dueOnDelivery} Cash At Doorstep.";
        } else {
            $paymentMethod = 'Prepaid';
            $grossTotal    = $subTotal + $shippingFee;
            $totalDiscount = max(0.0, round($grossTotal - $totalAmount, 2));
            $comment = "*** 100% PREPAID ORDER *** Total: Rs.{$totalAmount} Paid Online{$txnRef} | DELIVER WITHOUT COLLECTING CASH.";
        }

        $orderPayload = [
            'order_id'              => $order['order_number'],
            'order_date'            => date('Y-m-d H:i', strtotime($order['created_at'] ?? 'now')),
            'pickup_location'       => $pickupLocation,
            'comment'               => $comment,
            'billing_customer_name' => $firstName,
            'billing_last_name'     => $lastName,
            'billing_address'       => $address1,
            'billing_address_2'     => $address2,
            'billing_city'          => $city,
            'billing_pincode'       => $pincode,
            'billing_state'         => $state,
            'billing_country'       => 'India',
            'billing_email'         => $email,
            'billing_phone'         => $cleanPhone,
            'shipping_is_billing'   => true,
            'shipping_customer_name'=> $firstName,
            'shipping_last_name'    => $lastName,
            'shipping_address'      => $address1,
            'shipping_address_2'    => $address2,
            'shipping_city'         => $city,
            'shipping_pincode'      => $pincode,
            'shipping_state'        => $state,
            'shipping_country'      => 'India',
            'shipping_email'        => $email,
            'shipping_phone'        => $cleanPhone,
            'order_items'           => $formattedItems,
            'payment_method'        => $paymentMethod,
            'shipping_charges'      => $shippingFee,
            'giftwrap_charges'      => 0,
            'transaction_charges'   => 0,
            'total_discount'        => $totalDiscount,
            'sub_total'             => $subTotal,
            'length'                => 10,
            'breadth'               => 8,
            'height'                => 5,
            'weight'                => 0.15,
        ];

        if ($channelId) {
            $orderPayload['channel_id'] = $channelId;
        }

        // Send to Shiprocket adhoc order creation endpoint
        $createUrl = 'https://apiv2.shiprocket.in/v1/external/orders/create/adhoc';
        $ch = curl_init($createUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($orderPayload, JSON_UNESCAPED_SLASHES));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $token,
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $res = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $parsed = json_decode($res, true);

        // If order already exists in Shiprocket account, query and retrieve details
        if ($httpCode !== 200 && $httpCode !== 201) {
            $errMsg = $parsed['message'] ?? '';
            if (is_array($errMsg)) $errMsg = implode(', ', $errMsg);
            if (stripos($errMsg, 'already exists') !== false) {
                $checkUrl = 'https://apiv2.shiprocket.in/v1/external/orders/show/' . urlencode($order['order_number']);
                $cch = curl_init($checkUrl);
                curl_setopt($cch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($cch, CURLOPT_HTTPHEADER, [
                    'Content-Type: application/json',
                    'Authorization: Bearer ' . $token,
                ]);
                curl_setopt($cch, CURLOPT_TIMEOUT, 10);
                curl_setopt($cch, CURLOPT_SSL_VERIFYPEER, false);
                $cRes = curl_exec($cch);
                $cCode = curl_getinfo($cch, CURLINFO_HTTP_CODE);
                curl_close($cch);

                if ($cCode === 200 && $cRes) {
                    $cData = json_decode($cRes, true);
                    $existingSr = $cData['data'] ?? [];
                    if (!empty($existingSr['id'])) {
                        $parsed = [
                            'order_id'     => $existingSr['id'],
                            'shipment_id'  => $existingSr['shipment_id'] ?? ($existingSr['shipments'][0]['id'] ?? ''),
                            'awb_code'     => $existingSr['awb_code'] ?? ($existingSr['shipments'][0]['awb'] ?? ''),
                            'courier_name' => $existingSr['courier_name'] ?? ($existingSr['shipments'][0]['courier_name'] ?? 'Shiprocket Express'),
                        ];
                        $httpCode = 200;
                    }
                }
            }
        }

        if (($httpCode === 200 || $httpCode === 201) && !empty($parsed['order_id'])) {
            $srOrderId    = (string)$parsed['order_id'];
            $srShipmentId = (string)($parsed['shipment_id'] ?? '');
            $srAwb        = (string)($parsed['awb_code'] ?? '');
            $courierName  = (string)($parsed['courier_name'] ?? 'Shiprocket Express');
            $trackingUrl  = !empty($srAwb) ? "https://shiprocket.co/tracking/{$srAwb}" : null;

            // Update orders table with Shiprocket identifiers
            $nowSql = Database::getDriver() === 'sqlite' ? "datetime('now')" : "NOW()";
            $upStmt = $pdo->prepare("
                UPDATE orders 
                SET shiprocket_order_id    = :s_oid,
                    shiprocket_shipment_id = :s_sid,
                    shiprocket_awb         = COALESCE(NULLIF(:awb, ''), shiprocket_awb),
                    courier_name           = COALESCE(NULLIF(:courier, ''), courier_name),
                    tracking_url           = COALESCE(NULLIF(:turl, ''), tracking_url),
                    updated_at             = $nowSql
                WHERE id = :id
            ");
            $upStmt->execute([
                ':s_oid'    => $srOrderId,
                ':s_sid'    => $srShipmentId,
                ':awb'      => $srAwb,
                ':courier'  => $courierName,
                ':turl'     => $trackingUrl,
                ':id'       => $orderId,
            ]);

            // Insert tracking milestone
            try {
                $evStmt = $pdo->prepare("
                    INSERT INTO order_tracking_events (order_id, status, title, description, location, occurred_at)
                    VALUES (:order_id, 'confirmed', 'Order Pushed to Shiprocket Panel', :desc, 'Shiprocket Automated Hub', $nowSql)
                ");
                $evStmt->execute([
                    ':order_id' => $orderId,
                    ':desc'     => "Shiprocket Live Order ID #{$srOrderId} generated. Awaiting warehouse manifest & courier pickup.",
                ]);
            } catch (Throwable $te) {}

            return [
                'success'                => true,
                'shiprocket_order_id'    => $srOrderId,
                'shiprocket_shipment_id' => $srShipmentId,
                'awb_code'               => $srAwb,
                'courier_name'           => $courierName,
                'tracking_url'           => $trackingUrl,
                'live'                   => true,
            ];
        }

        $errorMsg = $parsed['message'] ?? 'Shiprocket order creation failed';
        if (is_array($errorMsg)) {
            $errorMsg = json_encode($errorMsg);
        }
        error_log("[Shiprocket API] Order creation returned HTTP {$httpCode}: {$res}");

        // Record sync failure in order tracking events
        try {
            $nowSql = Database::getDriver() === 'sqlite' ? "datetime('now')" : "NOW()";
            $evStmt = $pdo->prepare("
                INSERT INTO order_tracking_events (order_id, status, title, description, location, occurred_at)
                VALUES (:order_id, 'confirmed', 'Shiprocket Sync Pending', :desc, 'Shiprocket API Gateway', $nowSql)
            ");
            $evStmt->execute([
                ':order_id' => $orderId,
                ':desc'     => "Shiprocket API Error (HTTP {$httpCode}): {$errorMsg}. Use Admin Orders to retry sync.",
            ]);
        } catch (Throwable $te) {}

        return [
            'success' => false,
            'message' => "Shiprocket returned HTTP {$httpCode}: {$errorMsg}",
            'raw'     => $parsed,
        ];
    }

    /**
     * Advance order fulfillment status and insert tracking milestone
     */
    public static function advanceOrderStatus(int $orderId, string $newStatus, ?string $location = null, ?string $note = null): array
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            throw new Exception("Order #{$orderId} not found");
        }

        $statusTitles = [
            'confirmed'        => 'Order Confirmed',
            'processing'       => 'Order In Production / Manifested',
            'shipped'          => 'Handed Over to Courier',
            'out_for_delivery' => 'Out for Doorstep Delivery',
            'delivered'        => 'Order Delivered',
            'cancelled'        => 'Order Cancelled',
        ];

        $nowSql = Database::getDriver() === 'sqlite' ? "datetime('now')" : "NOW()";
        $upStmt = $pdo->prepare("
            UPDATE orders 
            SET order_status = :st,
                updated_at = $nowSql
            WHERE id = :id
        ");
        $upStmt->execute([
            ':st' => $newStatus,
            ':id' => $orderId,
        ]);

        $title = $statusTitles[$newStatus] ?? ucfirst($newStatus);
        $desc = $note ?: "Order updated to {$newStatus}";
        $loc = $location ?: ($order['shipping_city'] ?? ($order['city'] ?? 'Hub'));

        try {
            $evStmt = $pdo->prepare("
                INSERT INTO order_tracking_events (order_id, status, title, description, location, occurred_at)
                VALUES (:order_id, :status, :title, :desc, :loc, $nowSql)
            ");
            $evStmt->execute([
                ':order_id' => $orderId,
                ':status'   => $newStatus,
                ':title'    => $title,
                ':desc'     => $desc,
                ':loc'      => $loc,
            ]);
        } catch (Throwable $e) {}

        return [
            'success'      => true,
            'order_id'     => $orderId,
            'order_status' => $newStatus,
            'updated_at'   => date('Y-m-d H:i:s'),
        ];
    }

    /**
     * Test connection to Shiprocket with provided or saved credentials
     */
    public static function testConnection(?string $email = null, ?string $password = null): array
    {
        $cfg = self::getSettings();
        $testEmail = !empty($email) ? trim($email) : ($cfg['email'] ?? '');
        $testPass  = !empty($password) ? trim($password) : ($cfg['password'] ?? '');

        if (empty($testEmail) || empty($testPass)) {
            return [
                'success' => false,
                'message' => 'Shiprocket email and password are required to test connection.',
            ];
        }

        $loginUrl = 'https://apiv2.shiprocket.in/v1/external/auth/login';
        $ch = curl_init($loginUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'email'    => $testEmail,
            'password' => $testPass,
        ]));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 12);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200 && $response) {
            $data = json_decode($response, true);
            if (!empty($data['token'])) {
                $token = $data['token'];

                // Fetch available pickup locations
                $pickupLocations = [];
                $pickupUrl = 'https://apiv2.shiprocket.in/v1/external/settings/company/pickup';
                $pch = curl_init($pickupUrl);
                curl_setopt($pch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($pch, CURLOPT_HTTPHEADER, [
                    'Content-Type: application/json',
                    'Authorization: Bearer ' . $token,
                ]);
                curl_setopt($pch, CURLOPT_TIMEOUT, 10);
                curl_setopt($pch, CURLOPT_SSL_VERIFYPEER, false);
                $pRes = curl_exec($pch);
                $pCode = curl_getinfo($pch, CURLINFO_HTTP_CODE);
                curl_close($pch);

                if ($pCode === 200 && $pRes) {
                    $pData = json_decode($pRes, true);
                    $shippingAddresses = $pData['data']['shipping_address'] ?? [];
                    foreach ($shippingAddresses as $addr) {
                        $pickupLocations[] = [
                            'pickup_location' => $addr['pickup_location'] ?? '',
                            'address'         => $addr['address'] ?? '',
                            'city'            => $addr['city'] ?? '',
                            'state'           => $addr['state'] ?? '',
                            'pin_code'        => $addr['pin_code'] ?? '',
                            'phone'           => $addr['phone'] ?? '',
                            'name'            => $addr['name'] ?? '',
                        ];
                    }
                }

                return [
                    'success'          => true,
                    'message'          => 'Shiprocket connected successfully! Credentials are valid.',
                    'first_name'       => $data['first_name'] ?? '',
                    'last_name'        => $data['last_name'] ?? '',
                    'email'            => $data['email'] ?? $testEmail,
                    'company_name'     => $data['company_name'] ?? '',
                    'pickup_locations' => $pickupLocations,
                ];
            }
        }

        $errData = json_decode($response, true);
        $errMsg = $errData['message'] ?? 'Invalid credentials or connection error with Shiprocket API';
        return [
            'success' => false,
            'message' => $errMsg . " (HTTP {$httpCode})",
        ];
    }

    /**
     * Fallback Sandbox Simulator when credentials are not yet configured
     */
    private static function createSandboxShipment(array $order): array
    {
        $pdo = Database::getConnection();
        $orderId = (int)$order['id'];

        $shiprocketOrderId   = 'SR-ORD-' . strtoupper(substr(md5($order['order_number']), 0, 8));
        $shiprocketShipmentId= 'SR-SHP-' . rand(1000000, 9999999);
        $courierName         = 'Bluedart Express';
        $awbCode             = 'BD' . rand(1000000000, 9999999999);
        $trackingUrl         = "https://shiprocket.co/tracking/{$awbCode}";
        $estimatedDate       = date('Y-m-d', strtotime('+4 days'));

        $nowSql = Database::getDriver() === 'sqlite' ? "datetime('now')" : "NOW()";
        $upStmt = $pdo->prepare("
            UPDATE orders 
            SET shiprocket_order_id    = :s_oid,
                shiprocket_shipment_id = :s_sid,
                shiprocket_awb         = :awb,
                courier_name           = :courier,
                tracking_url           = :turl,
                estimated_delivery_date= :edate,
                updated_at             = $nowSql
            WHERE id = :id
        ");
        $upStmt->execute([
            ':s_oid'  => $shiprocketOrderId,
            ':s_sid'  => $shiprocketShipmentId,
            ':awb'    => $awbCode,
            ':courier'=> $courierName,
            ':turl'   => $trackingUrl,
            ':edate'  => $estimatedDate,
            ':id'     => $orderId,
        ]);

        return [
            'success'               => true,
            'shiprocket_order_id'   => $shiprocketOrderId,
            'shiprocket_shipment_id'=> $shiprocketShipmentId,
            'awb_code'              => $awbCode,
            'courier_name'          => $courierName,
            'tracking_url'          => $trackingUrl,
            'sandbox'               => true,
        ];
    }
}
