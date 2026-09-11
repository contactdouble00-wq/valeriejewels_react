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
        }
        return self::$config;
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

        // 2. Dispatch via Hostinger SMTP if configured
        if (self::hasLiveSmtp()) {
            try {
                self::sendViaHostingerSmtp($toEmail, $toName, $subject, $htmlBody);
                $status = 'sent';
            } catch (Throwable $e) {
                $status = 'failed';
                $errorMessage = $e->getMessage();
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
        }

        // 3. Record in email_logs table for audit trail and idempotency locking
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
        } catch (Throwable $e) {
            $logId = null;
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
     * Send Order Confirmation / Successful Email
     */
    public static function sendOrderConfirmation(int $orderId, bool $force = false): array
    {
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();
        if (!$order) throw new Exception("Order #{$orderId} not found");

        $itemStmt = $pdo->prepare("SELECT * FROM order_items WHERE order_id = ?");
        $itemStmt->execute([$orderId]);
        $items = $itemStmt->fetchAll();

        $appConfig = require dirname(__DIR__) . '/config/config.php';
        $storeUrl  = $appConfig['app']['url'] ?? 'http://localhost:5173';

        // Render template
        ob_start();
        require dirname(__DIR__) . '/templates/emails/order_confirmation.php';
        $htmlBody = ob_get_clean();

        $subject = "Order Confirmed: {$order['order_number']} — Valerie Jewels";

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
    public static function sendOrderFailed(int $orderId, ?string $reason = null, bool $force = false): array
    {
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();
        if (!$order) throw new Exception("Order #{$orderId} not found");

        $itemStmt = $pdo->prepare("SELECT * FROM order_items WHERE order_id = ?");
        $itemStmt->execute([$orderId]);
        $items = $itemStmt->fetchAll();

        $appConfig = require dirname(__DIR__) . '/config/config.php';
        $storeUrl  = $appConfig['app']['url'] ?? 'http://localhost:5173';

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
     * Send Order On Hold Email
     */
    public static function sendOrderOnHold(int $orderId, ?string $reason = null, bool $force = false): array
    {
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();
        if (!$order) throw new Exception("Order #{$orderId} not found");

        $itemStmt = $pdo->prepare("SELECT * FROM order_items WHERE order_id = ?");
        $itemStmt->execute([$orderId]);
        $items = $itemStmt->fetchAll();

        $appConfig = require dirname(__DIR__) . '/config/config.php';
        $storeUrl  = $appConfig['app']['url'] ?? 'http://localhost:5173';

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

        $itemStmt = $pdo->prepare("SELECT * FROM order_items WHERE order_id = ?");
        $itemStmt->execute([$orderId]);
        $items = $itemStmt->fetchAll();

        $appConfig = require dirname(__DIR__) . '/config/config.php';
        $storeUrl  = $appConfig['app']['url'] ?? 'http://localhost:5173';

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

        $itemStmt = $pdo->prepare("SELECT * FROM order_items WHERE order_id = ?");
        $itemStmt->execute([$orderId]);
        $items = $itemStmt->fetchAll();

        $appConfig = require dirname(__DIR__) . '/config/config.php';
        $storeUrl  = $appConfig['app']['url'] ?? 'http://localhost:5173';

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
     * Lightweight Zero-Dependency Hostinger SMTP Socket Client
     */
    private static function sendViaHostingerSmtp(string $toEmail, string $toName, string $subject, string $htmlBody): void
    {
        $cfg = self::getConfig();

        $host       = $cfg['host'] ?? 'smtp.hostinger.com';
        $port       = (int)($cfg['port'] ?? 465);
        $username   = $cfg['username'];
        $password   = $cfg['password'];
        $fromEmail  = $cfg['from_email'] ?? $username;
        $fromName   = $cfg['from_name'] ?? 'Valerie Jewels Support';
        $encryption = strtolower($cfg['encryption'] ?? 'ssl');

        $protocol = ($encryption === 'ssl') ? 'ssl://' : '';
        $socket = @fsockopen("{$protocol}{$host}", $port, $errno, $errstr, 15);

        if (!$socket) {
            throw new Exception("Could not connect to SMTP server {$host}:{$port} ({$errstr})");
        }

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

        $read(); // Initial greeting

        $write("EHLO " . ($_SERVER['SERVER_NAME'] ?? 'localhost'));
        $read();

        if ($encryption === 'tls') {
            $write("STARTTLS");
            $read();
            stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
            $write("EHLO " . ($_SERVER['SERVER_NAME'] ?? 'localhost'));
            $read();
        }

        // Authenticate
        $write("AUTH LOGIN");
        $read();
        $write(base64_encode($username));
        $read();
        $write(base64_encode($password));
        $authResp = $read();
        if (!str_starts_with($authResp, '235')) {
            throw new Exception("SMTP Authentication failed: {$authResp}");
        }

        // Mail Envelope
        $write("MAIL FROM: <{$fromEmail}>");
        $read();
        $write("RCPT TO: <{$toEmail}>");
        $read();
        $write("DATA");
        $read();

        // Headers + Body
        $boundary = 'vj_mime_' . md5(uniqid());
        $headers = [
            "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <{$fromEmail}>",
            "To: =?UTF-8?B?" . base64_encode($toName) . "?= <{$toEmail}>",
            "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=",
            "MIME-Version: 1.0",
            "Content-Type: text/html; charset=UTF-8",
            "Content-Transfer-Encoding: base64",
            "X-Mailer: Valerie Jewels Engine / Hostinger SMTP",
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
}
