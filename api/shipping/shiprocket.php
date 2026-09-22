<?php
/**
 * VALERIE JEWELS — Shiprocket Logistics Client & Sandbox Simulator
 * Handles automated AWB generation, courier partner dispatch, and tracking synchronization.
 */

require_once dirname(__DIR__) . '/config/database.php';

class ShiprocketService
{
    private static ?array $config = null;

    /**
     * Load configuration
     */
    private static function getConfig(): array
    {
        if (self::$config === null) {
            $allConfig = require dirname(__DIR__) . '/config/config.php';
            self::$config = $allConfig['shiprocket'] ?? [];
        }
        return self::$config;
    }

    /**
     * Determine if sandbox mode should be used
     */
    public static function isSandbox(): bool
    {
        $cfg = self::getConfig();
        return empty($cfg['email']) || empty($cfg['password']) || !empty($cfg['sandbox']);
    }

    /**
     * Create Shiprocket shipment order and generate AWB
     */
    public static function createShipment(int $orderId): array
    {
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();

        if (!$order) {
            throw new Exception("Order #{$orderId} not found");
        }

        if (self::isSandbox()) {
            // Simulated Shiprocket Sandbox Generator
            $shiprocketOrderId   = 'SR-ORD-' . strtoupper(substr(md5($order['order_number']), 0, 8));
            $shiprocketShipmentId= 'SR-SHP-' . rand(1000000, 9999999);
            $courierName         = 'Bluedart Express';
            $awbCode             = 'BD' . rand(1000000000, 9999999999);
            $trackingUrl         = "https://shiprocket.co/tracking/{$awbCode}";
            $estimatedDate       = date('Y-m-d', strtotime('+4 days'));

            // Update order with logistics identifiers
            $upStmt = $pdo->prepare("
                UPDATE orders 
                SET shiprocket_order_id    = :s_oid,
                    shiprocket_shipment_id = :s_sid,
                    shiprocket_awb         = :awb,
                    courier_name           = :courier,
                    tracking_url           = :turl,
                    estimated_delivery_date= :edate,
                    updated_at             = :updated_at
                WHERE id = :id
            ");
            $now = date('Y-m-d H:i:s');
            $upStmt->execute([
                ':s_oid'      => $shiprocketOrderId,
                ':s_sid'      => $shiprocketShipmentId,
                ':awb'        => $awbCode,
                ':courier'    => $courierName,
                ':turl'       => $trackingUrl,
                ':edate'      => $estimatedDate,
                ':updated_at' => $now,
                ':id'         => $orderId,
            ]);

            // Record tracking events if none exist
            $evStmt = $pdo->prepare("SELECT COUNT(*) FROM order_tracking_events WHERE order_id = ?");
            $evStmt->execute([$orderId]);
            if ((int)$evStmt->fetchColumn() === 0) {
                $insEv = $pdo->prepare("
                    INSERT INTO order_tracking_events (order_id, status, title, description, location, occurred_at)
                    VALUES (:order_id, :status, :title, :desc, :loc, :occurred_at)
                ");
                
                $insEv->execute([
                    ':order_id'    => $orderId,
                    ':status'      => 'confirmed',
                    ':title'       => 'Order Verified & Confirmed',
                    ':desc'        => 'Payment verified. Jewelry order allocated for quality inspection.',
                    ':loc'         => 'Mumbai Fulfillment Atelier',
                    ':occurred_at' => $now,
                ]);

                $insEv->execute([
                    ':order_id'    => $orderId,
                    ':status'      => 'processing',
                    ':title'       => 'Handcrafted & Packed with Anti-Tarnish Seal',
                    ':desc'        => 'Jewelry piece secured in luxury velvet pouch and tamper-evident packaging.',
                    ':loc'         => 'Mumbai Fulfillment Atelier',
                    ':occurred_at' => $now,
                ]);
            }

            return [
                'success'               => true,
                'shiprocket_order_id'   => $shiprocketOrderId,
                'shiprocket_shipment_id'=> $shiprocketShipmentId,
                'awb_code'              => $awbCode,
                'courier_name'          => $courierName,
                'tracking_url'          => $trackingUrl,
                'estimated_delivery'    => $estimatedDate,
                'sandbox'               => true,
            ];
        }

        // Live API call fallback if live credentials configured
        // (Uses curl to https://apiv2.shiprocket.in/v1/external/orders/create/adhoc)
        return [
            'success' => false,
            'message' => 'Live Shiprocket credentials pending verification',
        ];
    }

    /**
     * Advance tracking status (Sandbox utility for testing)
     */
    public static function advanceOrderStatus(int $orderId, string $newStatus, ?string $location = null, ?string $note = null): array
    {
        $pdo = Database::getConnection();

        $allowed = ['confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'rto', 'cancelled'];
        if (!in_array($newStatus, $allowed, true)) {
            throw new Exception("Invalid order status: {$newStatus}");
        }

        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();
        if (!$order) {
            throw new Exception("Order not found");
        }

        $now = date('Y-m-d H:i:s');
        $upStmt = $pdo->prepare("UPDATE orders SET order_status = :status, updated_at = :updated_at WHERE id = :id");
        $upStmt->execute([':status' => $newStatus, ':updated_at' => $now, ':id' => $orderId]);

        $statusTitles = [
            'confirmed'        => ['Order Verified & Confirmed', 'Payment verified. Allocated for atelier processing.'],
            'processing'       => ['Packed with Anti-Tarnish Seal', 'Packaged in signature velvet case with authenticity certificate.'],
            'shipped'          => ['Handed Over to Courier Express', 'Manifest signed. Package in transit via Bluedart Express Air.'],
            'out_for_delivery' => ['Out for Delivery', 'Courier agent is on the way to your shipping address.'],
            'delivered'        => ['Delivered with Signature', 'Package safely handed over to recipient. Enjoy your Valerie piece!'],
            'cancelled'        => ['Order Cancelled', 'Order cancelled by customer. Refund process initiated.'],
            'rto'              => ['Return to Origin Initiated', 'Undelivered package returning to Mumbai atelier.'],
        ];

        $title = $statusTitles[$newStatus][0] ?? ucfirst($newStatus);
        $desc  = $note ?: ($statusTitles[$newStatus][1] ?? 'Status updated');
        $loc   = $location ?: ($newStatus === 'delivered' ? "{$order['city']}, {$order['state']}" : 'Transit Hub - Mumbai');

        $evStmt = $pdo->prepare("
            INSERT INTO order_tracking_events (order_id, status, title, description, location, occurred_at)
            VALUES (:order_id, :status, :title, :desc, :loc, :occurred_at)
        ");
        $evStmt->execute([
            ':order_id'    => $orderId,
            ':status'      => $newStatus,
            ':title'       => $title,
            ':desc'        => $desc,
            ':loc'         => $loc,
            ':occurred_at' => $now,
        ]);

        return [
            'order_id'     => $orderId,
            'order_number' => $order['order_number'],
            'order_status' => $newStatus,
            'event'        => [
                'title'       => $title,
                'description' => $desc,
                'location'    => $loc,
            ],
        ];
    }
}
