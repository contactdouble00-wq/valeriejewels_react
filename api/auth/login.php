<?php
/**
 * VALERIE JEWELS — Authentication Endpoint
 * Supports customer login and separate role-restricted Admin Portal login.
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/utils/jwt.php';
require_once dirname(__DIR__) . '/utils/rate_limiter.php';
require_once dirname(__DIR__) . '/config/database.php';

handleCors();

// Rate limit: max 10 login attempts per 15 minutes per IP
RateLimiter::check('auth_login', 10, 900);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ApiResponse::error('Method not allowed. Use POST.', 405);
}

// Parse input
$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

$email         = strtolower(trim($input['email'] ?? ''));
$password      = $input['password'] ?? '';
$isAdminPortal = !empty($input['is_admin_portal']);

if (empty($email) || empty($password)) {
    ApiResponse::error('Please provide both email and password', 422);
}

// Enforce admin brute-force lockout check (5 failed attempts within 15 minutes)
if ($isAdminPortal) {
    $lockRemaining = RateLimiter::getLockRemaining('admin_login_lock', 5);
    if ($lockRemaining) {
        $minutes = ceil($lockRemaining / 60);
        ApiResponse::error("Account temporarily locked due to repeated failed login attempts. Please wait {$minutes} minute(s) before trying again.", 429);
    }
}

try {
    $pdo = Database::getConnection();

    // Fetch user
    $stmt = $pdo->prepare("
        SELECT id, name, email, phone, password_hash, role, is_blocked_rto
        FROM users 
        WHERE email = :email 
        LIMIT 1
    ");
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        if ($isAdminPortal) {
            $failedHits = RateLimiter::recordFailedAttempt('admin_login_lock', 900);
            $remaining = max(0, 5 - $failedHits);
            if ($remaining === 0) {
                ApiResponse::error('Too many failed attempts. Account temporarily locked for 15 minutes to prevent unauthorized access.', 429);
            }
            ApiResponse::error("Invalid admin credentials. ({$remaining} attempt(s) remaining before 15-minute lockout)", 401);
        }
        ApiResponse::error('Invalid email or password credentials', 401);
    }

    // Role verification for Admin Portal logins
    if ($isAdminPortal && !in_array($user['role'], ['admin', 'staff'], true)) {
        RateLimiter::recordFailedAttempt('admin_login_lock', 900);
        ApiResponse::error('Access denied. Administrator privileges required.', 403);
    }

    // Reset failed attempt counter upon successful login
    if ($isAdminPortal) {
        RateLimiter::clear('admin_login_lock');
    }

    // Load config for JWT secret
    $configFile = dirname(__DIR__) . '/config/config.php';
    $config = file_exists($configFile)
        ? require $configFile
        : require dirname(__DIR__) . '/config/config.sample.php';

    $jwtSecret = $config['jwt']['secret'] ?? 'valerie_default_secret_key_2026';
    
    // Strict 30-minute session lifetime for admin (1800s) vs customers (7 days)
    $expiresIn = in_array($user['role'], ['admin', 'staff'], true) ? 1800 : (86400 * 7);

    $now = time();
    $payload = [
        'sub'           => (int)$user['id'],
        'name'          => $user['name'],
        'email'         => $user['email'],
        'role'          => $user['role'],
        'iat'           => $now,
        'exp'           => $now + $expiresIn,
        'jti'           => bin2hex(random_bytes(16)),
        'last_activity' => $now,
    ];

    $token = JWT::encode($payload, $jwtSecret);

    // Audit log for staff/admin logins
    if (in_array($user['role'], ['admin', 'staff'], true)) {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        $logStmt = $pdo->prepare("
            INSERT INTO admin_activity_log (admin_id, action, target_entity, target_id, details, ip_address)
            VALUES (?, 'admin_login', 'auth', ?, ?, ?)
        ");
        $logStmt->execute([
            $user['id'],
            $user['email'],
            json_encode(['user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown']),
            $ip,
        ]);
    }

    $userProfile = [
        'id'             => (int)$user['id'],
        'name'           => $user['name'],
        'email'          => $user['email'],
        'phone'          => $user['phone'],
        'role'           => $user['role'],
        'is_blocked_rto' => (bool)$user['is_blocked_rto'],
    ];

    RateLimiter::clear('auth_login');

    ApiResponse::success([
        'user'  => $userProfile,
        'token' => $token,
    ], 'Authenticated successfully');

} catch (Throwable $e) {
    ApiResponse::error('Authentication error: ' . $e->getMessage(), 500);
}
