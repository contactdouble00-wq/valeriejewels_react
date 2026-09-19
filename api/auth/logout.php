<?php
/**
 * VALERIE JEWELS — Admin & Customer Logout Endpoint
 * Server-side session revocation: invalidates JWT tokens in token_blacklist.
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/utils/jwt.php';
require_once dirname(__DIR__) . '/config/database.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ApiResponse::error('Method not allowed. Use POST.', 405);
}

// Extract Bearer token
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
if (empty($authHeader) && function_exists('apache_request_headers')) {
    $headers = apache_request_headers();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
}

if (empty($authHeader) || !preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches)) {
    ApiResponse::success(null, 'Logged out (no active session token provided).');
    exit;
}

$rawToken = trim($matches[1]);
$tokenHash = hash('sha256', $rawToken);

try {
    $pdo = Database::getConnection();

    // Ensure token_blacklist table exists with BIGINT expires_at
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS token_blacklist (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            token_hash VARCHAR(64) NOT NULL UNIQUE,
            user_id BIGINT UNSIGNED DEFAULT 0,
            expires_at BIGINT UNSIGNED NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_token_hash (token_hash),
            INDEX idx_expires (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    // Migrate column if existing table had DATETIME
    try {
        $col = $pdo->query("SHOW COLUMNS FROM token_blacklist LIKE 'expires_at'")->fetch();
        if ($col && stripos($col['Type'], 'bigint') === false) {
            $pdo->exec("ALTER TABLE token_blacklist MODIFY expires_at BIGINT UNSIGNED NOT NULL");
        }
    } catch (Throwable) {}

    // Purge expired revoked tokens to keep table lightweight
    $currentTime = time();
    $purgeStmt = $pdo->prepare("DELETE FROM token_blacklist WHERE expires_at < ?");
    $purgeStmt->execute([$currentTime]);

    // Decode token to extract expiration
    $configFile = dirname(__DIR__) . '/config/config.php';
    $config = file_exists($configFile) ? require $configFile : require dirname(__DIR__) . '/config/config.sample.php';
    $jwtSecret = $config['jwt']['secret'] ?? 'valerie_default_secret_key_2026';

    $userId = 0;
    $expiresAt = $currentTime + 86400; // Default 24h timestamp

    try {
        $payload = JWT::decode($rawToken, $jwtSecret);
        $userId = (int)($payload['sub'] ?? 0);
        if (!empty($payload['exp'])) {
            $expiresAt = (int)$payload['exp'];
        }
    } catch (Throwable) {
        // Even if token format is unverified, blacklisting the hash neutralizes it
    }

    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
    if ($driver === 'sqlite') {
        $stmt = $pdo->prepare("
            INSERT INTO token_blacklist (token_hash, user_id, expires_at)
            VALUES (?, ?, ?)
            ON CONFLICT(token_hash) DO UPDATE SET expires_at = excluded.expires_at
        ");
    } else {
        $stmt = $pdo->prepare("
            INSERT INTO token_blacklist (token_hash, user_id, expires_at)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE expires_at = VALUES(expires_at)
        ");
    }
    $stmt->execute([$tokenHash, $userId, $expiresAt]);

    ApiResponse::success(null, 'Session successfully invalidated and logged out.');
} catch (Throwable $e) {
    error_log('Logout Error: ' . $e->getMessage());
    ApiResponse::success(null, 'Logged out.');
}
