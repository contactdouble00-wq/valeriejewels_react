<?php
/**
 * VALERIE JEWELS — Autonomous Payment Recovery & Abandoned Checkout Dispatcher
 * Automatically detects and emails customers with failed or pending/unpaid orders.
 * Strictly idempotent: never sends duplicate recovery emails for the same order.
 */

require_once __DIR__ . '/mailer.php';
require_once dirname(__DIR__) . '/config/database.php';

class AutoRecoveryService
{
    private static string $lockFile = __DIR__ . '/.auto_recovery_sweep.lock';

    /**
     * Send recovery email for a single specific order immediately.
     * Used by report_failed.php, webhook.php, and admin status updates.
     */
    public static function sendForOrder(int $orderId, ?string $reason = null, bool $force = false): array
    {
        try {
            $pdo = Database::getConnection();

            $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
            $stmt->execute([$orderId]);
            $order = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$order) {
                return [
                    'success' => false,
                    'status'  => 'not_found',
                    'message' => "Order #{$orderId} not found",
                ];
            }

            // Never send recovery if order is already paid, partial_paid, confirmed, or shipped
            $paidStatuses = ['paid', 'partial_paid'];
            $confirmedStatuses = ['confirmed', 'shipped', 'delivered', 'cancelled'];
            if (in_array(strtolower($order['payment_status'] ?? ''), $paidStatuses, true) ||
                in_array(strtolower($order['order_status'] ?? ''), $confirmedStatuses, true)) {
                return [
                    'success' => false,
                    'status'  => 'already_completed',
                    'message' => "Order #{$orderId} is already completed/paid",
                ];
            }

            $email = trim($order['customer_email'] ?? '');
            if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL) || strpos($email, '@valerieclient.in') !== false) {
                return [
                    'success' => false,
                    'status'  => 'invalid_email',
                    'message' => "No valid recipient email for order #{$orderId}",
                ];
            }

            // Strict Idempotency Check: Don't double-send unless explicitly forced
            if (!$force) {
                $checkStmt = $pdo->prepare("
                    SELECT id, status, sent_at 
                    FROM email_logs 
                    WHERE order_id = ? AND email_type IN ('order_failed', 'payment_reminder') 
                    LIMIT 1
                ");
                $checkStmt->execute([$orderId]);
                $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

                if ($existing) {
                    return [
                        'success' => true,
                        'status'  => 'skipped',
                        'message' => "Recovery email already dispatched on {$existing['sent_at']}",
                        'log_id'  => (int)$existing['id'],
                    ];
                }
            }

            $defaultReason = ($order['payment_status'] === 'failed' || $order['order_status'] === 'failed')
                ? 'Payment authorization was interrupted or cancelled'
                : 'Pending checkout completion — reserved pieces';

            $finalReason = !empty($reason) ? $reason : $defaultReason;

            return MailerService::sendOrderFailed($orderId, $finalReason, $force);

        } catch (Throwable $e) {
            error_log("[AutoRecoveryService] sendForOrder({$orderId}) exception: " . $e->getMessage());
            return [
                'success'       => false,
                'status'        => 'error',
                'error_message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Autonomous background sweep for all pending & failed orders.
     * Can be invoked from cron, admin list requests, or health ping.
     * 
     * @param int $limit Maximum orders to process per run
     * @param int $minPendingMinutes Minimum minutes an unpaid/pending order must wait before receiving email (default 5 mins)
     * @param bool $ignoreThrottle Whether to bypass cooldown lock
     */
    public static function runSweep(int $limit = 10, int $minPendingMinutes = 5, bool $ignoreThrottle = false): array
    {
        try {
            $pdo = Database::getConnection();
            $driver = Database::getDriver();

            // Throttle cooldown (default 60s) to avoid unnecessary load on high traffic
            if (!$ignoreThrottle && !self::acquireCooldownLock($pdo, $driver, 60)) {
                return [
                    'success'          => true,
                    'status'           => 'throttled',
                    'message'          => 'Sweep ran recently. Cooldown in effect.',
                    'dispatched_count' => 0,
                    'scanned_count'    => 0,
                ];
            }

            // Build time filter:
            // 1) Failed orders are eligible immediately (0 mins).
            // 2) Pending/unpaid orders are eligible after $minPendingMinutes grace period.
            if ($driver === 'sqlite') {
                $timeCondition = "(
                    (o.payment_status = 'failed' OR o.order_status = 'failed')
                    OR o.created_at <= datetime('now', '-{$minPendingMinutes} minutes')
                )";
            } else {
                $timeCondition = "(
                    (o.payment_status = 'failed' OR o.order_status = 'failed')
                    OR o.created_at <= DATE_SUB(NOW(), INTERVAL {$minPendingMinutes} MINUTE)
                )";
            }

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
                LIMIT " . (int)$limit;

            $stmt = $pdo->prepare($query);
            $stmt->execute();
            $eligibleOrders = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $dispatched = [];
            $failed = [];
            $skipped = [];

            foreach ($eligibleOrders as $ord) {
                $ordId = (int)$ord['id'];
                $email = trim($ord['customer_email']);

                if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $skipped[] = [
                        'order_id'     => $ordId,
                        'order_number' => $ord['order_number'],
                        'reason'       => 'Invalid email: ' . $email,
                    ];
                    continue;
                }

                try {
                    $reason = ($ord['payment_status'] === 'failed' || $ord['order_status'] === 'failed')
                        ? 'Payment authorization was interrupted or cancelled'
                        : 'Pending checkout completion — reserved pieces';

                    $res = MailerService::sendOrderFailed($ordId, $reason, false);

                    if (!empty($res['success'])) {
                        $dispatched[] = [
                            'order_id'       => $ordId,
                            'order_number'   => $ord['order_number'],
                            'customer_email' => $email,
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
                } catch (Throwable $sendErr) {
                    $failed[] = [
                        'order_id'       => $ordId,
                        'order_number'   => $ord['order_number'],
                        'error'          => $sendErr->getMessage(),
                    ];
                }
            }

            return [
                'success'          => true,
                'status'           => 'completed',
                'scanned_count'    => count($eligibleOrders),
                'dispatched_count' => count($dispatched),
                'failed_count'     => count($failed),
                'skipped_count'    => count($skipped),
                'dispatched'       => $dispatched,
                'failed'           => $failed,
                'skipped'          => $skipped,
            ];

        } catch (Throwable $e) {
            error_log("[AutoRecoveryService] runSweep error: " . $e->getMessage());
            return [
                'success'          => false,
                'status'           => 'error',
                'error_message'    => $e->getMessage(),
                'dispatched_count' => 0,
            ];
        }
    }

    /**
     * Cross-platform Cooldown Lock (Database + Filesystem Fallback)
     */
    private static function acquireCooldownLock(PDO $pdo, string $driver, int $cooldownSeconds): bool
    {
        $now = time();

        // 1. Database lock check
        try {
            $stmt = $pdo->prepare("SELECT `value` FROM `site_settings` WHERE `key` = 'last_auto_recovery_sweep' LIMIT 1");
            $stmt->execute();
            $lastRun = (int)$stmt->fetchColumn();

            if ($lastRun > 0 && ($now - $lastRun) < $cooldownSeconds) {
                return false;
            }

            // Update timestamp in site_settings
            $nowStr = (string)$now;
            $dtStr = date('Y-m-d H:i:s');
            if ($driver === 'sqlite') {
                $up = $pdo->prepare("INSERT OR REPLACE INTO `site_settings` (`key`, `value`, `updated_at`) VALUES ('last_auto_recovery_sweep', ?, ?)");
                $up->execute([$nowStr, $dtStr]);
            } else {
                $up = $pdo->prepare("
                    INSERT INTO `site_settings` (`key`, `value`, `updated_at`) 
                    VALUES ('last_auto_recovery_sweep', ?, ?) 
                    ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), `updated_at` = VALUES(`updated_at`)
                ");
                $up->execute([$nowStr, $dtStr]);
            }
            return true;
        } catch (Throwable $dbLockErr) {
            // Fallback to filesystem lock if site_settings table issue
        }

        // 2. Filesystem fallback lock
        try {
            $lockFile = self::$lockFile;
            if (file_exists($lockFile)) {
                $lastFileRun = (int)@file_get_contents($lockFile);
                if ($lastFileRun > 0 && ($now - $lastFileRun) < $cooldownSeconds) {
                    return false;
                }
            }
            @file_put_contents($lockFile, (string)$now);
            return true;
        } catch (Throwable $fsErr) {
            return true; // Allow proceed if locking completely unavailable
        }
    }
}
