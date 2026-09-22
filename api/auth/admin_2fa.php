<?php
/**
 * VALERIE JEWELS — Admin Two-Factor Authentication (Email / Dev OTP)
 * Step 1 (send_otp): Verify admin credentials → generate 6-digit OTP → store token
 * Step 2 (verify_otp): Verify OTP hash + expiry → issue JWT + audit log
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/utils/jwt.php';
require_once dirname(__DIR__) . '/utils/rate_limiter.php';
require_once dirname(__DIR__) . '/config/database.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ApiResponse::error('Method not allowed. Use POST.', 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
$action = $input['action'] ?? ($_GET['action'] ?? '');

$pdo = Database::getConnection();

// Ensure admin_otp_tokens table exists with driver-compatible syntax
if (Database::getDriver() === 'sqlite') {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS admin_otp_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            otp_hash TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            used INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    ");
} else {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS admin_otp_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id BIGINT(20) UNSIGNED NOT NULL,
            otp_hash VARCHAR(64) NOT NULL,
            expires_at DATETIME NOT NULL,
            used TINYINT(1) DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
}

$configFile = dirname(__DIR__) . '/config/config.php';
$config = file_exists($configFile) ? require $configFile : require dirname(__DIR__) . '/config/config.sample.php';
$jwtSecret = $config['jwt']['secret'] ?? 'valerie_default_secret_key_2026';
date_default_timezone_set($config['app']['timezone'] ?? 'Asia/Kolkata');

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: SEND OTP
// ─────────────────────────────────────────────────────────────────────────────
if ($action === 'send_otp') {
    RateLimiter::check('admin_2fa_send', 5, 600);

    $email    = strtolower(trim($input['email'] ?? ''));
    $password = $input['password'] ?? '';

    if (empty($email) || empty($password)) {
        ApiResponse::error('Please provide both email and password', 422);
    }

    $stmt = $pdo->prepare("
        SELECT id, name, email, phone, password_hash, role, is_blocked_rto 
        FROM users 
        WHERE email = :email 
        LIMIT 1
    ");
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        ApiResponse::error('Invalid email or password credentials', 401);
    }

    if (!in_array($user['role'], ['admin', 'staff'], true)) {
        ApiResponse::error('Access denied. Administrator privileges required.', 403);
    }

    // Generate secure 6-digit numeric OTP
    $otp    = str_pad((string)random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
    $hash   = hash('sha256', $otp);

    // Invalidate prior unused OTPs for this user
    $pdo->prepare("DELETE FROM admin_otp_tokens WHERE user_id = ?")->execute([$user['id']]);

    // Store new OTP hash with portable expiry (10 mins)
    $expiresAt = date('Y-m-d H:i:s', time() + 600);
    $pdo->prepare("INSERT INTO admin_otp_tokens (user_id, otp_hash, expires_at) VALUES (?, ?, ?)")
        ->execute([$user['id'], $hash, $expiresAt]);

    ApiResponse::success([
        'pending_user_id'    => (int)$user['id'],
        'email'              => $user['email'],
        'dev_otp'            => $otp, // Always returned for effortless local testing
        'expires_in_seconds' => 600,
    ], 'OTP generated. Enter the code to verify your login.');
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: VERIFY OTP → Issue JWT
// ─────────────────────────────────────────────────────────────────────────────
if ($action === 'verify_otp') {
    RateLimiter::check('admin_2fa_verify', 8, 600);

    $pendingUserId = (int)($input['pending_user_id'] ?? 0);
    $otp           = trim($input['otp'] ?? '');

    if ($pendingUserId <= 0 || strlen($otp) !== 6) {
        ApiResponse::error('Invalid OTP format. Must be 6 digits.', 422);
    }

    $now = date('Y-m-d H:i:s');
    $stmt = $pdo->prepare("
        SELECT * FROM admin_otp_tokens
        WHERE user_id = ? AND used = 0 AND expires_at > ?
        ORDER BY id DESC LIMIT 1
    ");
    $stmt->execute([$pendingUserId, $now]);
    $tokenRecord = $stmt->fetch();

    if (!$tokenRecord) {
        ApiResponse::error('OTP expired or not found. Please request a new code.', 401);
    }

    if (!hash_equals($tokenRecord['otp_hash'], hash('sha256', $otp))) {
        ApiResponse::error('Incorrect OTP code. Please check and try again.', 401);
    }

    // Mark as used
    $pdo->prepare("UPDATE admin_otp_tokens SET used = 1 WHERE id = ?")->execute([$tokenRecord['id']]);

    // Fetch user details
    $userStmt = $pdo->prepare("SELECT id, name, email, phone, role, is_blocked_rto FROM users WHERE id = ? LIMIT 1");
    $userStmt->execute([$pendingUserId]);
    $user = $userStmt->fetch();

    if (!$user) {
        ApiResponse::error('User account not found', 404);
    }

    $now = time();
    $payload = [
        'sub'   => (int)$user['id'],
        'name'  => $user['name'],
        'email' => $user['email'],
        'role'  => $user['role'],
        'iat'   => $now,
        'exp'   => $now + 86400, // 24 hours
    ];

    $token = JWT::encode($payload, $jwtSecret);

    // Audit log
    $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    $logStmt = $pdo->prepare("
        INSERT INTO admin_activity_log (admin_id, action, target_entity, target_id, details, ip_address)
        VALUES (?, 'admin_login_2fa', 'auth', ?, ?, ?)
    ");
    $logStmt->execute([
        $user['id'],
        $user['email'],
        json_encode(['method' => '2fa_otp', 'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown']),
        $ip,
    ]);

    // Clear rate limits upon successful 2FA
    RateLimiter::clear('admin_2fa_send');
    RateLimiter::clear('admin_2fa_verify');

    ApiResponse::success([
        'token' => $token,
        'user'  => [
            'id'             => (int)$user['id'],
            'name'           => $user['name'],
            'email'          => $user['email'],
            'phone'          => $user['phone'],
            'role'           => $user['role'],
            'is_blocked_rto' => (bool)$user['is_blocked_rto'],
        ],
    ], '2FA verified. Admin session started.');
}

ApiResponse::error('Invalid or missing action parameter', 400);
