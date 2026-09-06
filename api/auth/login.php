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
        ApiResponse::error('Invalid email or password credentials', 401);
    }

    // Role verification for Admin Portal logins
    if ($isAdminPortal && !in_array($user['role'], ['admin', 'staff'], true)) {
        ApiResponse::error('Access denied. Administrator privileges required.', 403);
    }

    // Load config for JWT secret
    $configFile = dirname(__DIR__) . '/config/config.php';
    $config = file_exists($configFile)
        ? require $configFile
        : require dirname(__DIR__) . '/config/config.sample.php';

    $jwtSecret = $config['jwt']['secret'] ?? 'valerie_default_secret_key_2026';
    
    // Shorter token lifetime for admin sessions (24 hours) vs customers (7 days)
    $expiresIn = in_array($user['role'], ['admin', 'staff'], true) ? 86400 : (86400 * 7);

    $now = time();
    $payload = [
        'sub'   => (int)$user['id'],
        'name'  => $user['name'],
        'email' => $user['email'],
        'role'  => $user['role'],
        'iat'   => $now,
        'exp'   => $now + $expiresIn,
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
