<?php
/**
 * VALERIE JEWELS — Automated Payment Recovery & Abandoned Checkout Cron Job
 * 
 * Automatically sends luxury high-converting recovery emails with direct product links
 * to customers whose checkout payment is pending, unpaid, or failed.
 * 
 * Supported Invocation:
 * 1. CLI: `php api/cron/payment_recovery.php`
 * 2. HTTP: `GET/POST /api/cron/payment_recovery.php?key=SECURE_VALERIE_CRON`
 * 3. Admin: Called directly from Admin Orders action
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/utils/mailer.php';
require_once dirname(__DIR__) . '/config/database.php';

// Allow CLI execution or HTTP execution
if (php_sapi_name() !== 'cli') {
    handleCors();
}

try {
    $pdo = Database::getConnection();

    // Query parameters
    $isCli = (php_sapi_name() === 'cli');
    $immediate = !empty($_GET['immediate']) || !empty($_POST['immediate']) || $isCli;
    $limit = isset($_GET['limit']) ? max(1, min(100, (int)$_GET['limit'])) : 25;

    // Time condition: 15 minutes old for auto cron, or 0 minutes for manual/immediate triggers
    $driver = Database::getDriver();
    if ($immediate) {
        $timeCondition = "1=1";
    } else {
        if ($driver === 'sqlite') {
            $timeCondition = "o.created_at <= datetime('now', '-15 minutes')";
        } else {
            $timeCondition = "o.created_at <= DATE_SUB(NOW(), INTERVAL 15 MINUTE)";
        }
    }

    // Find pending/failed/unpaid orders that have a valid email and NO recent recovery email sent
    $query = "
        SELECT o.id, o.order_number, o.customer_name, o.customer_email, o.customer_phone, 
               o.total_amount, o.payment_type, o.payment_status, o.order_status, o.created_at
        FROM orders o
        WHERE (o.payment_status IN ('pending', 'failed', 'unpaid') OR o.order_status IN ('pending', 'failed'))
          AND o.payment_status NOT IN ('paid', 'partial_paid')
          AND o.order_status NOT IN ('confirmed', 'shipped', 'delivered', 'cancelled')
          AND o.customer_email IS NOT NULL
          AND o.customer_email != ''
          AND o.customer_email NOT LIKE '%@valerieclient.in'
          AND {$timeCondition}
          AND NOT EXISTS (
              SELECT 1 FROM email_logs el 
              WHERE el.order_id = o.id 
                AND el.email_type IN ('order_failed', 'payment_reminder')
          )
        ORDER BY o.id DESC
        LIMIT {$limit}
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $pendingOrders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $dispatched = [];
    $failed = [];
    $skipped = [];

    foreach ($pendingOrders as $ord) {
        $ordId = (int)$ord['id'];
        $toEmail = trim($ord['customer_email']);

        if (!filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
            $skipped[] = [
                'order_id'     => $ordId,
                'order_number' => $ord['order_number'],
                'reason'       => 'Invalid email format: ' . $toEmail,
            ];
            continue;
        }

        try {
            $res = MailerService::sendOrderFailed($ordId, 'Pending checkout completion — reserved pieces', false);
            if (!empty($res['success'])) {
                $dispatched[] = [
                    'order_id'       => $ordId,
                    'order_number'   => $ord['order_number'],
                    'customer_name'  => $ord['customer_name'],
                    'customer_email' => $toEmail,
                    'status'         => $res['status'] ?? 'sent',
                    'log_id'         => $res['log_id'] ?? null,
                ];
            } else {
                $failed[] = [
                    'order_id'       => $ordId,
                    'order_number'   => $ord['order_number'],
                    'error'          => $res['error_message'] ?? 'Mailer returned false',
                ];
            }
        } catch (Throwable $e) {
            $failed[] = [
                'order_id'       => $ordId,
                'order_number'   => $ord['order_number'],
                'error'          => $e->getMessage(),
            ];
        }
    }

    $summary = [
        'scanned_eligible' => count($pendingOrders),
        'dispatched_count' => count($dispatched),
        'failed_count'     => count($failed),
        'skipped_count'    => count($skipped),
        'dispatched_items' => $dispatched,
        'failed_items'     => $failed,
        'skipped_items'    => $skipped,
    ];

    if ($isCli) {
        echo json_encode($summary, JSON_PRETTY_PRINT) . PHP_EOL;
    } else {
        ApiResponse::success($summary, 'Automated payment recovery run completed');
    }

} catch (Throwable $e) {
    if (php_sapi_name() === 'cli') {
        echo "Error: " . $e->getMessage() . PHP_EOL;
        exit(1);
    } else {
        ApiResponse::error('Payment recovery job failed: ' . $e->getMessage(), 500);
    }
}
