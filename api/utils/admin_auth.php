<?php
/**
 * VALERIE JEWELS — Admin Authentication & Authorization Middleware
 * Enforces role-based access control (RBAC) and audit logging for admin actions.
 */

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/jwt.php';
require_once dirname(__DIR__) . '/config/database.php';

class AdminAuth {
    /**
     * Authenticate admin or staff user from JWT token
     * @param array $allowedRoles Defaults to ['admin', 'staff']
     * @return array Decoded admin user payload
     */
    public static function authenticate(array $allowedRoles = ['admin', 'staff']): array {
        handleCors();

        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        
        // Also check Apache/nginx fallback
        if (empty($authHeader) && function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }

        // Fallback for custom header X-Admin-Token (immune to Apache FastCGI Authorization stripping)
        if (empty($authHeader) && !empty($_SERVER['HTTP_X_ADMIN_TOKEN'])) {
            $authHeader = 'Bearer ' . trim($_SERVER['HTTP_X_ADMIN_TOKEN']);
        }

        // Fallback for query param (testing or download links)
        if (empty($authHeader) && !empty($_GET['token'])) {
            $authHeader = 'Bearer ' . $_GET['token'];
        }

        if (empty($authHeader) || !preg_match('/Bearer\s+(.+)$/i', $authHeader, $matches)) {
            ApiResponse::error('Authentication required. Missing Bearer token.', 401);
        }

        $jwtToken = trim($matches[1]);
        $tokenHash = hash('sha256', $jwtToken);

        $pdo = Database::getConnection();

        // 1. Check server-side session revocation / token blacklist
        try {
            $blStmt = $pdo->prepare("SELECT 1 FROM token_blacklist WHERE token_hash = ? AND expires_at > ? LIMIT 1");
            $blStmt->execute([$tokenHash, time()]);
            if ($blStmt->fetchColumn()) {
                ApiResponse::error('Session has been terminated or logged out. Please log in again.', 401);
            }
        } catch (Throwable $e) {
            // Proceed if table not created yet
        }

        $configFile = dirname(__DIR__) . '/config/config.php';
        $config = file_exists($configFile)
            ? require $configFile
            : require dirname(__DIR__) . '/config/config.sample.php';

        $jwtSecret = $config['jwt']['secret'] ?? 'valerie_default_secret_key_2026';

        try {
            $payload = JWT::decode($jwtToken, $jwtSecret);
        } catch (Throwable $e) {
            ApiResponse::error('Invalid or expired authentication session: ' . $e->getMessage(), 401);
        }

        // 2. Verify active account existence & live role in database
        $userId = (int)($payload['sub'] ?? 0);
        $userCheckStmt = $pdo->prepare("SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1");
        $userCheckStmt->execute([$userId]);
        $activeUser = $userCheckStmt->fetch();

        if (!$activeUser) {
            ApiResponse::error('User account no longer exists', 401);
        }

        $role = $activeUser['role'] ?? ($payload['role'] ?? 'customer');
        if (!in_array($role, $allowedRoles, true)) {
            ApiResponse::error("Access denied. Required privileges: " . implode(', ', $allowedRoles) . ". Your role: {$role}", 403);
        }

        return [
            'id'    => (int)$activeUser['id'],
            'name'  => $activeUser['name'],
            'email' => $activeUser['email'],
            'role'  => $role,
        ];
    }

    /**
     * Log an administrative action to admin_activity_log
     */
    public static function logActivity(int $adminId, string $action, string $targetEntity, $targetId, $details = null): void {
        try {
            $pdo = Database::getConnection();
            $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
            $stmt = $pdo->prepare("
                INSERT INTO admin_activity_log (admin_id, action, target_entity, target_id, details, ip_address)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $adminId,
                $action,
                $targetEntity,
                $targetId !== null ? (string)$targetId : null,
                is_array($details) || is_object($details) ? json_encode($details) : (string)$details,
                $ip,
            ]);
        } catch (Throwable $e) {
            error_log('Admin Activity Log Error: ' . $e->getMessage());
        }
    }
}
