<?php
/**
 * VALERIE JEWELS — Rate Limiting Service
 * Provides IP-based request rate limiting with automatic table creation and proxy-aware IP detection.
 * Emits standard HTTP 429 Too Many Requests, X-RateLimit-*, and Retry-After headers.
 */

require_once dirname(__DIR__) . '/config/database.php';
require_once __DIR__ . '/response.php';

class RateLimiter
{
    private static bool $tableChecked = false;

    /**
     * Resolve the true client IP address, accounting for reverse proxies & Cloudflare.
     */
    public static function getClientIp(): string
    {
        $headers = [
            'HTTP_CF_CONNECTING_IP',
            'HTTP_X_FORWARDED_FOR',
            'HTTP_CLIENT_IP',
            'REMOTE_ADDR',
        ];

        foreach ($headers as $header) {
            if (!empty($_SERVER[$header])) {
                $ips = explode(',', $_SERVER[$header]);
                $ip = trim($ips[0]);
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }

        return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    }

    /**
     * Enforce rate limit for a specific action and client IP.
     * Halts execution with HTTP 429 if the limit is exceeded.
     *
     * @param string $action Identifier for the action (e.g. 'auth_login', 'payment_init')
     * @param int $maxAttempts Maximum permitted requests within the window
     * @param int $decaySeconds Window duration in seconds
     */
    public static function check(string $action, int $maxAttempts = 10, int $decaySeconds = 900): void
    {
        try {
            $pdo = Database::getConnection();
            self::ensureTableExists($pdo);

            $ip = self::getClientIp();
            $key = $action . ':' . $ip;

            // 1. Purge expired records for this key
            $purgeStmt = $pdo->prepare("DELETE FROM rate_limits WHERE rate_key = ? AND expires_at <= NOW()");
            $purgeStmt->execute([$key]);

            // 2. Fetch active record
            $fetchStmt = $pdo->prepare("SELECT id, hits, TIMESTAMPDIFF(SECOND, NOW(), expires_at) AS remaining_seconds FROM rate_limits WHERE rate_key = ? AND expires_at > NOW() LIMIT 1");
            $fetchStmt->execute([$key]);
            $record = $fetchStmt->fetch(PDO::FETCH_ASSOC);

            if ($record) {
                $hits = (int)$record['hits'];
                $retryAfter = max(1, (int)$record['remaining_seconds']);

                if ($hits >= $maxAttempts) {
                    // Set standard RFC rate limit headers
                    header('X-RateLimit-Limit: ' . $maxAttempts);
                    header('X-RateLimit-Remaining: 0');
                    header('Retry-After: ' . $retryAfter);

                    $friendlyMinutes = ceil($retryAfter / 60);
                    ApiResponse::error(
                        "Too many requests. For security reasons, please wait {$friendlyMinutes} minute(s) before trying again.",
                        429
                    );
                    exit;
                }

                // Increment hit counter
                $updateStmt = $pdo->prepare("UPDATE rate_limits SET hits = hits + 1 WHERE id = ?");
                $updateStmt->execute([$record['id']]);
                $remainingAttempts = max(0, $maxAttempts - ($hits + 1));
            } else {
                // First hit in this time window
                $insertStmt = $pdo->prepare("INSERT INTO rate_limits (rate_key, hits, expires_at) VALUES (?, 1, DATE_ADD(NOW(), INTERVAL ? SECOND))");
                $insertStmt->execute([$key, $decaySeconds]);
                $remainingAttempts = max(0, $maxAttempts - 1);
            }

            // Standard headers for successful calls
            header('X-RateLimit-Limit: ' . $maxAttempts);
            header('X-RateLimit-Remaining: ' . $remainingAttempts);

        } catch (Throwable $e) {
            // Failsafe: log internal rate limiter error but do not block legitimate users if DB transiently fails
            error_log('RateLimiter Error: ' . $e->getMessage());
        }
    }

    /**
     * Clear all rate limits for a specific action and client IP (e.g. after successful login).
     */
    public static function clear(string $action): void
    {
        try {
            $pdo = Database::getConnection();
            $ip = self::getClientIp();
            $key = $action . ':' . $ip;
            $stmt = $pdo->prepare("DELETE FROM rate_limits WHERE rate_key = ?");
            $stmt->execute([$key]);
        } catch (Throwable $e) {
            error_log('RateLimiter Clear Error: ' . $e->getMessage());
        }
    }

    /**
     * Ensure rate_limits table exists in MySQL.
     */
    private static function ensureTableExists(PDO $pdo): void
    {
        if (self::$tableChecked) {
            return;
        }

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS rate_limits (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                rate_key VARCHAR(120) NOT NULL,
                hits INT UNSIGNED DEFAULT 1,
                expires_at DATETIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_rate_key_expires (rate_key, expires_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");

        self::$tableChecked = true;
    }
}
