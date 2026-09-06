<?php
/**
 * VALERIE JEWELS — Customer Registration Endpoint
 * Creates new customer accounts and issues signed JWT tokens.
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/utils/jwt.php';
require_once dirname(__DIR__) . '/config/database.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ApiResponse::error('Method not allowed. Use POST.', 405);
}

// Parse request body
$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

$name     = trim($input['name'] ?? '');
$email    = strtolower(trim($input['email'] ?? ''));
$phone    = trim($input['phone'] ?? '');
$password = $input['password'] ?? '';

// Validation
$errors = [];
if (empty($name)) {
    $errors['name'] = 'Full name is required';
}
if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'A valid email address is required';
}
if (empty($password) || strlen($password) < 8) {
    $errors['password'] = 'Password must be at least 8 characters long';
}

if (!empty($errors)) {
    ApiResponse::error('Validation failed', 422, $errors);
}

try {
    $pdo = Database::getConnection();

    // Check if email already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = :email LIMIT 1");
    $stmt->execute([':email' => $email]);
    if ($stmt->fetch()) {
        ApiResponse::error('An account with this email address already exists', 409);
    }

    // Hash password & insert
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    $insertStmt = $pdo->prepare("
        INSERT INTO users (name, email, phone, password_hash, role, is_blocked_rto)
        VALUES (:name, :email, :phone, :hash, 'customer', 0)
    ");
    $insertStmt->execute([
        ':name'  => $name,
        ':email' => $email,
        ':phone' => !empty($phone) ? $phone : null,
        ':hash'  => $passwordHash,
    ]);

    $userId = (int)$pdo->lastInsertId();

    // Load config for JWT secret
    $configFile = dirname(__DIR__) . '/config/config.php';
    $config = file_exists($configFile)
        ? require $configFile
        : require dirname(__DIR__) . '/config/config.sample.php';

    $jwtSecret = $config['jwt']['secret'] ?? 'valerie_default_secret_key_2026';
    $expiresIn = $config['jwt']['expires_in'] ?? (86400 * 7);

    // Issue JWT Token
    $now = time();
    $payload = [
        'sub'   => $userId,
        'name'  => $name,
        'email' => $email,
        'role'  => 'customer',
        'iat'   => $now,
        'exp'   => $now + $expiresIn,
    ];

    $token = JWT::encode($payload, $jwtSecret);

    $userProfile = [
        'id'    => $userId,
        'name'  => $name,
        'email' => $email,
        'phone' => $phone,
        'role'  => 'customer',
    ];

    ApiResponse::success([
        'user'  => $userProfile,
        'token' => $token,
    ], 'Account created successfully', 201);

} catch (Throwable $e) {
    ApiResponse::error('Registration failed: ' . $e->getMessage(), 500);
}
