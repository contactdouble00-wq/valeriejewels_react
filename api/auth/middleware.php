<?php
/**
 * VALERIE JEWELS — Authentication Middleware
 * Enforces JWT token validation and role-based access controls.
 */

require_once dirname(__DIR__) . '/utils/jwt.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/config/database.php';

class AuthMiddleware {
    /**
     * Extract Bearer token from HTTP Authorization headers.
     *
     * @return string|null
     */
    public static function getBearerToken(): ?string {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (empty($header) && function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            $header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }

        if (preg_match('/Bearer\s+(\S+)/i', $header, $matches)) {
            return $matches[1];
        }

        return null;
    }

    /**
     * Authenticate and retrieve current user from database.
     * Halts with 401 on failure.
     *
     * @return array Authenticated user record
     */
    public static function requireAuth(): array {
        $token = self::getBearerToken();
        if (!$token) {
            ApiResponse::error('Authentication required. Missing Bearer token.', 401);
        }

        $configFile = dirname(__DIR__) . '/config/config.php';
        $config = file_exists($configFile)
            ? require $configFile
            : require dirname(__DIR__) . '/config/config.sample.php';

        $jwtSecret = $config['jwt']['secret'] ?? 'valerie_default_secret_key_2026';

        try {
            $payload = JWT::decode($token, $jwtSecret);
        } catch (Throwable $e) {
            ApiResponse::error('Invalid or expired authentication token: ' . $e->getMessage(), 401);
        }

        $userId = (int)($payload['sub'] ?? 0);
        if (!$userId) {
            ApiResponse::error('Invalid token payload', 401);
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT id, name, email, phone, role, is_blocked_rto, created_at FROM users WHERE id = ? LIMIT 1");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if (!$user) {
            ApiResponse::error('User account no longer exists', 401);
        }

        return $user;
    }

    /**
     * Enforce Admin role privileges.
     */
    public static function requireAdmin(): array {
        $user = self::requireAuth();
        if ($user['role'] !== 'admin') {
            ApiResponse::error('Forbidden: Administrator privileges required', 403);
        }
        return $user;
    }

    /**
     * Enforce Staff or Admin role privileges.
     */
    public static function requireStaff(): array {
        $user = self::requireAuth();
        if (!in_array($user['role'], ['admin', 'staff'], true)) {
            ApiResponse::error('Forbidden: Staff privileges required', 403);
        }
        return $user;
    }

    /**
     * Optional authentication helper for guest-friendly checkout endpoints.
     * Returns user record if valid token provided, otherwise returns null.
     */
    public static function getOptionalAuth(): ?array {
        $token = self::getBearerToken();
        if (!$token) {
            return null;
        }

        $configFile = dirname(__DIR__) . '/config/config.php';
        $config = file_exists($configFile)
            ? require $configFile
            : require dirname(__DIR__) . '/config/config.sample.php';

        $jwtSecret = $config['jwt']['secret'] ?? 'valerie_default_secret_key_2026';

        try {
            $payload = JWT::decode($token, $jwtSecret);
            $userId = (int)($payload['sub'] ?? 0);
            if (!$userId) return null;

            $pdo = Database::getConnection();
            $stmt = $pdo->prepare("SELECT id, name, email, phone, role, is_blocked_rto FROM users WHERE id = ? LIMIT 1");
            $stmt->execute([$userId]);
            return $stmt->fetch() ?: null;
        } catch (Throwable) {
            return null;
        }
    }
}
