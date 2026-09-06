<?php
/**
 * VALERIE JEWELS — Lifecycle Notification Service
 * Logs and queues transactional email, SMS, and WhatsApp alerts for customer orders.
 */

require_once dirname(__DIR__) . '/config/database.php';

class NotificationService
{
    /**
     * Dispatch or queue notification
     */
    public static function queue(string $type, array $orderData, array $meta = []): array
    {
        $logFile = dirname(__DIR__) . '/utils/notification_log.json';
        
        $entry = [
            'type'            => $type, // 'order_confirmed' | 'order_shipped' | 'order_cancelled' | 'refund_initiated'
            'order_number'    => $orderData['order_number'] ?? 'UNKNOWN',
            'recipient_name'  => $orderData['customer_name'] ?? 'Customer',
            'recipient_email' => $orderData['customer_email'] ?? '',
            'recipient_phone' => $orderData['customer_phone'] ?? '',
            'awb'             => $orderData['shiprocket_awb'] ?? null,
            'courier'         => $orderData['courier_name'] ?? null,
            'refund_amount'   => $orderData['refund_amount'] ?? 0.0,
            'meta'            => $meta,
            'queued_at'       => date('c'),
            'status'          => 'sent_simulated',
        ];

        $logs = [];
        if (file_exists($logFile)) {
            $logs = json_decode(file_get_contents($logFile), true) ?: [];
        }
        $logs[] = $entry;
        // Keep last 100 entries
        if (count($logs) > 100) {
            $logs = array_slice($logs, -100);
        }
        file_put_contents($logFile, json_encode($logs, JSON_PRETTY_PRINT));

        return $entry;
    }
}
