<?php
/**
 * VALERIE JEWELS — Idempotent Mailer Service
 * Supports Hostinger SMTP, zero-dependency SSL socket mailer, and local simulation preview mode.
 * Enforces strict idempotency via MySQL email_logs table to prevent duplicate sends on webhooks.
 */

require_once dirname(__DIR__) . '/config/database.php';

class MailerService
{
    private static ?array $config = null;

    /**
     * Load SMTP configuration
     */
    public static function getConfig(): array
    {
        if (self::$config === null) {
            $allConfig = require dirname(__DIR__) . '/config/config.php';
            self::$config = $allConfig['smtp'] ?? [];

            // Dynamically load from site_settings table if credentials not in env/config
            if (empty(self::$config['username']) || empty(self::$config['password'])) {
                try {
                    $pdo = Database::getConnection();
                    $stmt = $pdo->prepare("SELECT `value` FROM `site_settings` WHERE `key` = 'smtp_settings' LIMIT 1");
                    $stmt->execute();
                    $rawDbSmtp = $stmt->fetchColumn();
                    if ($rawDbSmtp) {
                        $dbSmtp = json_decode($rawDbSmtp, true);
                        if (is_array($dbSmtp)) {
                            if (!empty($dbSmtp['host'])) self::$config['host'] = $dbSmtp['host'];
                            if (!empty($dbSmtp['port'])) self::$config['port'] = (int)$dbSmtp['port'];
                            if (!empty($dbSmtp['username'])) self::$config['username'] = $dbSmtp['username'];
                            if (!empty($dbSmtp['password'])) self::$config['password'] = $dbSmtp['password'];
                            if (!empty($dbSmtp['from_email'])) self::$config['from_email'] = $dbSmtp['from_email'];
                            if (!empty($dbSmtp['from_name'])) self::$config['from_name'] = $dbSmtp['from_name'];
                            if (!empty($dbSmtp['encryption'])) self::$config['encryption'] = $dbSmtp['encryption'];
                        }
                    }
                } catch (Throwable $e) {
                    // Ignore DB errors
                }
            }
        }
        return self::$config;
    }

    /**
     * Clear cached config to reload updated database settings
     */
    public static function resetConfig(): void
    {
        self::$config = null;
    }

    /**
     * Determine if live SMTP credentials are configured
     */
    public static function hasLiveSmtp(): bool
    {
        $cfg = self::getConfig();
        return !empty($cfg['username']) && !empty($cfg['password']) && !empty($cfg['host']);
    }

    /**
     * Core sending engine with idempotency check and force override
     */
    public static function send(int $orderId, string $emailType, string $toEmail, string $toName, string $subject, string $htmlBody, bool $force = false): array
    {
        $pdo = Database::getConnection();

        // 1. IDEMPOTENCY CHECK: Ensure this email type has NOT already been sent for this order (unless forced)
        if (!$force) {
            $checkStmt = $pdo->prepare("SELECT id, status, sent_at FROM email_logs WHERE order_id = ? AND email_type = ? LIMIT 1");
            $checkStmt->execute([$orderId, $emailType]);
            $existing = $checkStmt->fetch();

            if ($existing) {
                return [
                    'success'   => true,
                    'status'    => 'skipped',
                    'message'   => "Email of type '{$emailType}' already sent for order #{$orderId} on {$existing['sent_at']}",
                    'log_id'    => (int)$existing['id'],
                ];
            }
        }

        $status = 'simulated';
        $errorMessage = null;

        // 2. Dispatch via SMTP if configured
        if (self::hasLiveSmtp()) {
            try {
                self::sendViaHostingerSmtp($toEmail, $toName, $subject, $htmlBody);
                $status = 'sent';
            } catch (Throwable $e) {
                $status = 'failed';
                $errorMessage = $e->getMessage();
                error_log("[MailerService] Live SMTP delivery failed: " . $e->getMessage());

                // Fallback to PHP native mail() if available on production web server
                if (function_exists('mail') && php_sapi_name() !== 'cli' && !self::isLocalDevelopment()) {
                    try {
                        self::sendViaNativeMail($toEmail, $toName, $subject, $htmlBody);
                        $status = 'sent';
                        $errorMessage = null;
                    } catch (Throwable $mailErr) {
                        $errorMessage .= " | Native mail fallback failed: " . $mailErr->getMessage();
                    }
                }
            }
        } else {
            // If live SMTP is not configured, attempt native mail() on production web server
            if (function_exists('mail') && php_sapi_name() !== 'cli' && !self::isLocalDevelopment()) {
                try {
                    self::sendViaNativeMail($toEmail, $toName, $subject, $htmlBody);
                    $status = 'sent';
                } catch (Throwable $mailErr) {
                    $status = 'failed';
                    $errorMessage = "Live SMTP credentials not configured and native mail failed: " . $mailErr->getMessage();
                }
            } else {
                // Local simulation: write rendered HTML to disk for developer / browser inspection
                $saveDir = __DIR__ . '/sent_emails';
                if (!is_dir($saveDir)) {
                    @mkdir($saveDir, 0777, true);
                }
                $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', "{$emailType}_{$orderId}_" . date('Ymd_His'));
                $filePath = "{$saveDir}/{$safeName}.html";
                @file_put_contents($filePath, $htmlBody);
                $status = 'simulated';
                $errorMessage = "Live SMTP credentials not configured in api/.env. Email simulated to {$filePath}";
            }
        }

        // 3. Record in email_logs table for audit trail and idempotency locking
        try {
            $insStmt = $pdo->prepare("
                INSERT INTO email_logs (
                    order_id, email_type, recipient_email, recipient_name, subject, status, error_message, sent_at
                ) VALUES (
                    :order_id, :type, :email, :name, :subject, :status, :error, :sent_at
                )
                ON DUPLICATE KEY UPDATE 
                    recipient_email = VALUES(recipient_email),
                    recipient_name = VALUES(recipient_name),
                    subject = VALUES(subject),
                    status = VALUES(status),
                    error_message = VALUES(error_message),
                    sent_at = VALUES(sent_at)
            ");
            $insStmt->execute([
                ':order_id' => $orderId,
                ':type'     => $emailType,
                ':email'    => $toEmail,
                ':name'     => $toName,
                ':subject'  => $subject,
                ':status'   => $status,
                ':error'    => $errorMessage,
                ':sent_at'  => date('Y-m-d H:i:s'),
            ]);
            $logId = (int)$pdo->lastInsertId();
        } catch (Throwable $e) {
            try {
                $insStmt = $pdo->prepare("
                    INSERT INTO email_logs (
                        order_id, email_type, recipient_email, recipient_name, subject, status, error_message, sent_at
                    ) VALUES (
                        :order_id, :type, :email, :name, :subject, :status, :error, :sent_at
                    )
                ");
                $insStmt->execute([
                    ':order_id' => $orderId,
                    ':type'     => $emailType,
                    ':email'    => $toEmail,
                    ':name'     => $toName,
                    ':subject'  => $subject,
                    ':status'   => $status,
                    ':error'    => $errorMessage,
                    ':sent_at'  => date('Y-m-d H:i:s'),
                ]);
                $logId = (int)$pdo->lastInsertId();
            } catch (Throwable $e2) {
                $logId = null;
            }
        }

        return [
            'success'       => ($status === 'sent' || $status === 'simulated'),
            'status'        => $status,
            'log_id'        => $logId,
            'email_type'    => $emailType,
            'recipient'     => $toEmail,
            'subject'       => $subject,
            'error_message' => $errorMessage,
        ];
    }

    /**
     * Retrieve order items with high-resolution product images
     */
    public static function getOrderItemsWithImages(PDO $pdo, int $orderId): array
    {
        try {
            $stmt = $pdo->prepare("
                SELECT 
                    oi.*,
                    COALESCE(
                        (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = oi.product_id ORDER BY pi.is_primary DESC, pi.display_order ASC LIMIT 1),
                        (SELECT pi2.image_url FROM product_images pi2 JOIN products p ON pi2.product_id = p.id WHERE p.name = oi.product_name ORDER BY pi2.is_primary DESC LIMIT 1)
                    ) AS product_image
                FROM order_items oi
                WHERE oi.order_id = ?
                ORDER BY oi.id ASC
            ");
            $stmt->execute([$orderId]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            if (!empty($items)) {
                return $items;
            }
        } catch (Throwable $e) {
            // Fallback if subquery fails
        }

        try {
            $stmt = $pdo->prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC");
            $stmt->execute([$orderId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Throwable $e2) {
            return [];
        }
    }

    /**
     * Send Order Confirmation / Successful Email
     */
    public static function sendOrderConfirmation(int $orderId, bool $force = false): array
    {
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();
        if (!$order) throw new Exception("Order #{$orderId} not found");

        $items = self::getOrderItemsWithImages($pdo, $orderId);

        $appConfig = require dirname(__DIR__) . '/config/config.php';
        $storeUrl  = $appConfig['app']['url'] ?? 'https://valeriejewels.in';

        // Calculate accurate Partial COD / Prepaid amounts
        $totalVal = (float)($order['total_amount'] ?? 0);
        $amountPaidVal = (float)($order['amount_paid_upfront'] ?? 0);
        $amountDueVal = (float)($order['amount_due_on_delivery'] ?? 0);

        $isPartial = ($order['payment_type'] ?? '') === 'partial' || 
                     ($order['payment_status'] ?? '') === 'partial_paid' ||
                     ($amountDueVal > 0 && $amountPaidVal > 0) ||
                     (strpos(strtolower($order['payment_type'] ?? ''), 'partial') !== false);

        if ($isPartial && $amountDueVal <= 0 && $totalVal > $amountPaidVal) {
            $amountDueVal = max(0, $totalVal - $amountPaidVal);
        }
        if ($isPartial && $amountPaidVal <= 0 && $totalVal > $amountDueVal) {
            $amountPaidVal = max(0, $totalVal - $amountDueVal);
        }

        $amountPaidStr = number_format($amountPaidVal, 0);
        $amountDueStr = number_format($amountDueVal, 0);

        if ($isPartial) {
            $subject = "Partial COD Confirmed: {$order['order_number']} — Pay ₹{$amountDueStr} at Delivery — Valerie Jewels";
        } else {
            $subject = "Order Confirmed: {$order['order_number']} — Valerie Jewels";
        }

        // Render template
        ob_start();
        require dirname(__DIR__) . '/templates/emails/order_confirmation.php';
        $htmlBody = ob_get_clean();

        return self::send(
            $orderId,
            'order_confirmation',
            $order['customer_email'],
            $order['customer_name'],
            $subject,
            $htmlBody,
            $force
        );
    }

    /**
     * Send Order Failed / Payment Incomplete Email
     */
    public static function sendOrderFailed(int $orderId, ?string $reason = null, bool $force = false, ?string $customMessage = null): array
    {
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();
        if (!$order) throw new Exception("Order #{$orderId} not found");

        $items = self::getOrderItemsWithImages($pdo, $orderId);

        $appConfig = require dirname(__DIR__) . '/config/config.php';
        $storeUrl  = $appConfig['app']['url'] ?? 'https://valeriejewels.in';

        ob_start();
        require dirname(__DIR__) . '/templates/emails/order_failed.php';
        $htmlBody = ob_get_clean();

        $subject = "Payment Incomplete for {$order['order_number']} — Your Pieces Are Safe — Valerie Jewels";

        return self::send(
            $orderId,
            'order_failed',
            $order['customer_email'],
            $order['customer_name'],
            $subject,
            $htmlBody,
            $force
        );
    }

    /**
     * Send Payment Reminder / Pending Order Follow-up Email
     */
    public static function sendPaymentReminder(int $orderId, ?string $customMessage = null, bool $force = false): array
    {
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();
        if (!$order) throw new Exception("Order #{$orderId} not found");

        $items = self::getOrderItemsWithImages($pdo, $orderId);

        $appConfig = require dirname(__DIR__) . '/config/config.php';
        $storeUrl  = $appConfig['app']['url'] ?? 'https://valeriejewels.in';
        $reason    = 'Pending payment completion';

        ob_start();
        require dirname(__DIR__) . '/templates/emails/order_failed.php';
        $htmlBody = ob_get_clean();

        $subject = "Complete Your Order #{$order['order_number']} — Your Luxury Jewelry is Waiting — Valerie Jewels";

        return self::send(
            $orderId,
            'payment_reminder',
            $order['customer_email'],
            $order['customer_name'],
            $subject,
            $htmlBody,
            $force
        );
    }

    /**
     * Send Order On Hold Email
     */
    public static function sendOrderOnHold(int $orderId, ?string $reason = null, bool $force = false): array
    {
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();
        if (!$order) throw new Exception("Order #{$orderId} not found");

        $items = self::getOrderItemsWithImages($pdo, $orderId);

        $appConfig = require dirname(__DIR__) . '/config/config.php';
        $storeUrl  = $appConfig['app']['url'] ?? 'https://valeriejewels.in';

        ob_start();
        require dirname(__DIR__) . '/templates/emails/order_on_hold.php';
        $htmlBody = ob_get_clean();

        $subject = "Order {$order['order_number']} Temporarily On Hold — Valerie Jewels Concierge";

        return self::send(
            $orderId,
            'order_on_hold',
            $order['customer_email'],
            $order['customer_name'],
            $subject,
            $htmlBody,
            $force
        );
    }

    /**
     * Send Order Status Update / Milestone Email
     */
    public static function sendStatusUpdate(int $orderId, string $status, ?string $customMessage = null, bool $force = false): array
    {
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();
        if (!$order) throw new Exception("Order #{$orderId} not found");

        $items = self::getOrderItemsWithImages($pdo, $orderId);

        $appConfig = require dirname(__DIR__) . '/config/config.php';
        $storeUrl  = $appConfig['app']['url'] ?? 'https://valeriejewels.in';

        ob_start();
        require dirname(__DIR__) . '/templates/emails/order_status_update.php';
        $htmlBody = ob_get_clean();

        $statusTitle = ucwords(str_replace('_', ' ', $status));
        $subject = "Order Status Update: {$statusTitle} ({$order['order_number']}) — Valerie Jewels";

        $emailType = 'status_update_' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $status);

        return self::send(
            $orderId,
            $emailType,
            $order['customer_email'],
            $order['customer_name'],
            $subject,
            $htmlBody,
            $force
        );
    }

    /**
     * Send Order Shipped Email
     */
    public static function sendOrderShipped(int $orderId, bool $force = false): array
    {
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();
        if (!$order) throw new Exception("Order #{$orderId} not found");

        $items = self::getOrderItemsWithImages($pdo, $orderId);

        $appConfig = require dirname(__DIR__) . '/config/config.php';
        $storeUrl  = $appConfig['app']['url'] ?? 'https://valeriejewels.in';

        ob_start();
        require dirname(__DIR__) . '/templates/emails/order_shipped.php';
        $htmlBody = ob_get_clean();

        $awb = !empty($order['shiprocket_awb']) ? " (AWB: {$order['shiprocket_awb']})" : '';
        $subject = "Your Piece Has Shipped: {$order['order_number']}{$awb} — Valerie Jewels";

        return self::send(
            $orderId,
            'order_shipped',
            $order['customer_email'],
            $order['customer_name'],
            $subject,
            $htmlBody,
            $force
        );
    }

    /**
     * Send Order Cancelled & Refund Email
     */
    public static function sendOrderCancelled(int $orderId, bool $force = false): array
    {
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();
        if (!$order) throw new Exception("Order #{$orderId} not found");

        $appConfig = require dirname(__DIR__) . '/config/config.php';
        $storeUrl  = $appConfig['app']['url'] ?? 'http://localhost:5173';

        ob_start();
        require dirname(__DIR__) . '/templates/emails/order_cancelled.php';
        $htmlBody = ob_get_clean();

        $subject = "Order Cancelled: {$order['order_number']} — Valerie Jewels";

        return self::send(
            $orderId,
            'order_cancelled',
            $order['customer_email'],
            $order['customer_name'],
            $subject,
            $htmlBody,
            $force
        );
    }

    /**
     * Send email directly without requiring an order attachment (e.g. Test Emails, Admin Inquiries, Concierge)
     */
    public static function sendDirect(string $toEmail, string $toName, string $subject, string $htmlBody, string $emailType = 'test_email', ?int $orderId = null): array
    {
        $status = 'simulated';
        $errorMessage = null;

        // 1. Dispatch via SMTP if configured
        if (self::hasLiveSmtp()) {
            try {
                self::sendViaHostingerSmtp($toEmail, $toName, $subject, $htmlBody);
                $status = 'sent';
            } catch (Throwable $e) {
                $status = 'failed';
                $errorMessage = $e->getMessage();
                error_log("[MailerService] Live SMTP delivery failed: " . $e->getMessage());

                // Fallback to PHP native mail() if available on production web server
                if (function_exists('mail') && php_sapi_name() !== 'cli' && !self::isLocalDevelopment()) {
                    try {
                        self::sendViaNativeMail($toEmail, $toName, $subject, $htmlBody);
                        $status = 'sent';
                        $errorMessage = null;
                    } catch (Throwable $mailErr) {
                        $errorMessage .= " | Native mail fallback failed: " . $mailErr->getMessage();
                    }
                }
            }
        } else {
            // If live SMTP is not configured, attempt native mail() on production web server
            if (function_exists('mail') && php_sapi_name() !== 'cli' && !self::isLocalDevelopment()) {
                try {
                    self::sendViaNativeMail($toEmail, $toName, $subject, $htmlBody);
                    $status = 'sent';
                } catch (Throwable $mailErr) {
                    $status = 'failed';
                    $errorMessage = "Live SMTP credentials not configured and native mail failed: " . $mailErr->getMessage();
                }
            } else {
                // Local simulation: write rendered HTML to disk
                $saveDir = __DIR__ . '/sent_emails';
                if (!is_dir($saveDir)) {
                    @mkdir($saveDir, 0777, true);
                }
                $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', "{$emailType}_" . date('Ymd_His'));
                $filePath = "{$saveDir}/{$safeName}.html";
                @file_put_contents($filePath, $htmlBody);
                $status = 'simulated';
                $errorMessage = "Live SMTP credentials not configured in api/.env. Email simulated to {$filePath}";
            }
        }

        // Record in email_logs table for audit trail
        $logId = null;
        try {
            $pdo = Database::getConnection();
            $insStmt = $pdo->prepare("
                INSERT INTO email_logs (
                    order_id, email_type, recipient_email, recipient_name, subject, status, error_message, sent_at
                ) VALUES (
                    :order_id, :type, :email, :name, :subject, :status, :error, :sent_at
                )
            ");
            $insStmt->execute([
                ':order_id' => $orderId ?: 0,
                ':type'     => $emailType,
                ':email'    => $toEmail,
                ':name'     => $toName,
                ':subject'  => $subject,
                ':status'   => $status,
                ':error'    => $errorMessage,
                ':sent_at'  => date('Y-m-d H:i:s'),
            ]);
            $logId = (int)$pdo->lastInsertId();
        } catch (Throwable $e) {
            error_log('[MailerService] Failed to record email_log: ' . $e->getMessage());
        }

        return [
            'success'       => ($status === 'sent'),
            'status'        => $status,
            'log_id'        => $logId,
            'email_type'    => $emailType,
            'recipient'     => $toEmail,
            'subject'       => $subject,
            'error_message' => $errorMessage,
        ];
    }

    /**
     * Send Custom Test Email with Full Brand Design
     */
    public static function sendCustomTestEmail(string $toEmail, ?string $toName = null, ?string $subject = null, ?string $customMessage = null): array
    {
        $toName = $toName ?: 'Valued Customer';
        $subject = $subject ?: 'Valerie Jewels — Live Email Delivery & SMTP Verification';
        $message = $customMessage ?: 'Your automated customer email system (Order Confirmation, Payment Recovery Reminders, Live Tracking, and Dispatch notifications) is now operational and verified for inbox delivery.';

        $htmlBody = self::renderLuxuryTestEmailTemplate($toName, $subject, $message, $toEmail);

        return self::sendDirect($toEmail, $toName, $subject, $htmlBody, 'test_email', null);
    }

    /**
     * Check if running in local development environment
     */
    public static function isLocalDevelopment(): bool
    {
        $serverName = $_SERVER['SERVER_NAME'] ?? '';
        $docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
        return strpos($serverName, 'localhost') !== false ||
               strpos($serverName, '127.0.0.1') !== false ||
               strpos($docRoot, 'Agency stuff') !== false;
    }

    /**
     * Native PHP mail() fallback with proper UTF-8 and MIME headers
     */
    private static function sendViaNativeMail(string $toEmail, string $toName, string $subject, string $htmlBody): void
    {
        $cfg = self::getConfig();
        $fromEmail = !empty($cfg['from_email']) ? $cfg['from_email'] : 'orders@valeriejewels.in';
        $fromName = !empty($cfg['from_name']) ? $cfg['from_name'] : 'Valerie Jewels Support';

        $headers = [
            "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <{$fromEmail}>",
            "Reply-To: <{$fromEmail}>",
            "MIME-Version: 1.0",
            "Content-Type: text/html; charset=UTF-8",
            "Content-Transfer-Encoding: base64",
            "X-Mailer: Valerie Jewels Engine / Native PHP " . phpversion(),
        ];

        $headerStr = implode("\r\n", $headers);
        $encodedSubject = "=?UTF-8?B?" . base64_encode($subject) . "?=";
        $encodedBody = chunk_split(base64_encode($htmlBody));

        $sent = @mail($toEmail, $encodedSubject, $encodedBody, $headerStr, "-f{$fromEmail}");
        if (!$sent) {
            $sent = @mail($toEmail, $encodedSubject, $encodedBody, $headerStr);
        }

        if (!$sent) {
            throw new Exception("PHP native mail() returned false. Ensure sendmail/Postfix is active or configure SMTP.");
        }
    }

    /**
     * Lightweight Zero-Dependency SMTP Socket Client (Supports Hostinger, Gmail, and standard SMTP)
     */
    private static function sendViaHostingerSmtp(string $toEmail, string $toName, string $subject, string $htmlBody): void
    {
        $cfg = self::getConfig();

        $host       = $cfg['host'] ?? 'smtp.hostinger.com';
        $port       = (int)($cfg['port'] ?? 465);
        $username   = $cfg['username'] ?? '';
        $password   = $cfg['password'] ?? '';
        $fromEmail  = $cfg['from_email'] ?? $username;
        $fromName   = $cfg['from_name'] ?? 'Valerie Jewels Support';
        $encryption = strtolower($cfg['encryption'] ?? ($port === 465 ? 'ssl' : 'tls'));

        if (empty($username) || empty($password)) {
            throw new Exception("SMTP username or password is missing in configuration.");
        }

        $protocol = ($encryption === 'ssl') ? 'ssl://' : '';
        $context = stream_context_create([
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true,
            ]
        ]);

        $socket = @stream_socket_client("{$protocol}{$host}:{$port}", $errno, $errstr, 12, STREAM_CLIENT_CONNECT, $context);

        // If primary SSL port 465 fails, automatically fallback to TLS port 587
        if (!$socket && $port === 465) {
            $fallbackPort = 587;
            $fallbackSocket = @stream_socket_client("{$host}:{$fallbackPort}", $errno, $errstr, 12, STREAM_CLIENT_CONNECT, $context);
            if ($fallbackSocket) {
                $socket = $fallbackSocket;
                $port = $fallbackPort;
                $encryption = 'tls';
            }
        }

        if (!$socket) {
            throw new Exception("Could not connect to SMTP server {$host}:{$port} ({$errstr} [{$errno}])");
        }

        stream_set_timeout($socket, 15);

        $read = function() use ($socket) {
            $resp = '';
            while ($str = fgets($socket, 515)) {
                $resp .= $str;
                if (substr($str, 3, 1) === ' ') break;
            }
            return $resp;
        };

        $write = function(string $cmd) use ($socket) {
            fputs($socket, $cmd . "\r\n");
        };

        $read(); // Initial 220 banner

        $write("EHLO " . ($_SERVER['SERVER_NAME'] ?? 'localhost'));
        $read();

        if ($encryption === 'tls') {
            $write("STARTTLS");
            $tlsResp = $read();
            if (!str_starts_with($tlsResp, '220')) {
                throw new Exception("SMTP STARTTLS negotiation rejected: {$tlsResp}");
            }
            stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
            $write("EHLO " . ($_SERVER['SERVER_NAME'] ?? 'localhost'));
            $read();
        }

        // Authenticate
        $write("AUTH LOGIN");
        $authInit = $read();
        if (!str_starts_with($authInit, '334')) {
            throw new Exception("SMTP AUTH LOGIN rejected: {$authInit}");
        }

        $write(base64_encode($username));
        $userResp = $read();
        if (!str_starts_with($userResp, '334')) {
            throw new Exception("SMTP Username rejected ({$username}): {$userResp}");
        }

        $write(base64_encode($password));
        $authResp = $read();
        if (!str_starts_with($authResp, '235')) {
            throw new Exception("SMTP Authentication failed for {$username}: {$authResp}");
        }

        // Mail Envelope
        $write("MAIL FROM: <{$fromEmail}>");
        $fromResp = $read();
        if (!str_starts_with($fromResp, '250')) {
            throw new Exception("SMTP MAIL FROM rejected (<{$fromEmail}>): {$fromResp}");
        }

        $write("RCPT TO: <{$toEmail}>");
        $rcptResp = $read();
        if (!str_starts_with($rcptResp, '250') && !str_starts_with($rcptResp, '251')) {
            throw new Exception("SMTP RCPT TO rejected (<{$toEmail}>): {$rcptResp}");
        }

        $write("DATA");
        $dataInitResp = $read();
        if (!str_starts_with($dataInitResp, '354')) {
            throw new Exception("SMTP DATA command rejected: {$dataInitResp}");
        }

        // Headers + Body
        $headers = [
            "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <{$fromEmail}>",
            "To: =?UTF-8?B?" . base64_encode($toName) . "?= <{$toEmail}>",
            "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=",
            "MIME-Version: 1.0",
            "Content-Type: text/html; charset=UTF-8",
            "Content-Transfer-Encoding: base64",
            "X-Mailer: Valerie Jewels Engine / Live SMTP",
        ];

        $payload = implode("\r\n", $headers) . "\r\n\r\n" . chunk_split(base64_encode($htmlBody)) . "\r\n.";
        $write($payload);
        $dataResp = $read();

        $write("QUIT");
        fclose($socket);

        if (!str_starts_with($dataResp, '250')) {
            throw new Exception("SMTP delivery failed: {$dataResp}");
        }
    }

    /**
     * Render Luxury Test Email Template
     */
    private static function renderLuxuryTestEmailTemplate(string $customerName, string $title, string $message, string $toEmail = ''): string
    {
        $year = date('Y');
        $dateTime = date('d M Y, h:i A T');

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{$title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F8F5FB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #26153D; }
    table { border-collapse: collapse; }
  </style>
</head>
<body style="margin: 0; padding: 30px 10px; background-color: #F8F5FB;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(38, 21, 61, 0.08); border: 1px solid #ECE6F2;">
          
          <!-- Header Strip -->
          <tr>
            <td style="background-color: #26153D; padding: 32px 30px; text-align: center;">
              <span style="font-family: Georgia, serif; font-size: 26px; font-weight: bold; letter-spacing: 3px; color: #F7E7CE; text-transform: uppercase;">VALERIÉ</span>
              <div style="font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #D4AF37; margin-top: 6px; font-weight: 600;">HAUTE JOAILLERIE ATELIER</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 36px 32px;">
              <div style="display: inline-block; padding: 4px 12px; background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 20px; color: #065F46; font-size: 11px; font-weight: 700; margin-bottom: 20px;">
                ✓ LIVE DISPATCH VERIFICATION
              </div>

              <h1 style="font-family: Georgia, serif; font-size: 22px; font-weight: bold; color: #26153D; margin: 0 0 16px 0; line-height: 1.3;">
                {$title}
              </h1>

              <p style="font-size: 14px; line-height: 1.6; color: #4B3E5B; margin: 0 0 20px 0;">
                Dear {$customerName},
              </p>

              <div style="background-color: #FAF8FC; border-left: 4px solid #8366B0; padding: 18px 20px; border-radius: 12px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #26153D; font-weight: 500;">
                  {$message}
                </p>
              </div>

              <div style="background-color: #F8F9FA; border-radius: 12px; padding: 16px 20px; font-size: 12px; color: #6B7280; margin-bottom: 28px; border: 1px solid #E5E7EB;">
                <div style="margin-bottom: 6px;"><strong>Recipient:</strong> {$customerName} &lt;{$toEmail}&gt;</div>
                <div style="margin-bottom: 6px;"><strong>Dispatched At:</strong> {$dateTime}</div>
                <div><strong>System:</strong> Valerie Jewels Production Mailer Engine</div>
              </div>

              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="https://valeriejewels.in" target="_blank" style="display: inline-block; background-color: #8366B0; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-size: 13px; font-weight: 600; letter-spacing: 0.5px;">
                      Visit Valerie Jewels Store &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FAF8FC; padding: 24px 30px; text-align: center; border-top: 1px solid #ECE6F2; font-size: 11px; color: #8F829D;">
              <p style="margin: 0 0 6px 0; font-weight: 600; color: #4B3E5B;">Valerie Jewels Atelier Private Limited</p>
              <p style="margin: 0 0 8px 0;">Patel Chowk, Rajkot, Gujarat &bull; Concierge: orders@valeriejewels.in</p>
              <p style="margin: 0; font-size: 10px; color: #AFA6BA;">&copy; {$year} Valerie Jewels. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;
    }
}
