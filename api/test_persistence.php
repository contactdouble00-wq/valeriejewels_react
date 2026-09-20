<?php
require_once __DIR__ . '/utils/cors.php';
require_once __DIR__ . '/utils/response.php';
require_once __DIR__ . '/config/database.php';

handleCors();

try {
    $pdo = Database::getConnection();
    
    // Test write to site_settings
    $testKey = 'persistence_test_timestamp';
    $testValue = 'test_' . time();
    $stmt = $pdo->prepare("INSERT OR REPLACE INTO site_settings (`key`, `value`, `updated_at`) VALUES (:k, :v, datetime('now'))");
    $stmt->execute([':k' => $testKey, ':v' => $testValue]);
    
    // Test read back
    $checkStmt = $pdo->prepare("SELECT `value`, `updated_at` FROM site_settings WHERE `key` = :k");
    $checkStmt->execute([':k' => $testKey]);
    $row = $checkStmt->fetch(PDO::FETCH_ASSOC);

    // Inspect recent activity log
    $logsStmt = $pdo->query("SELECT * FROM admin_activity_log ORDER BY id DESC LIMIT 5");
    $recentLogs = $logsStmt->fetchAll(PDO::FETCH_ASSOC);

    // Inspect current products
    $prodStmt = $pdo->query("SELECT id, name, sku, is_active FROM products ORDER BY id ASC");
    $currentProducts = $prodStmt->fetchAll(PDO::FETCH_ASSOC);

    // Generate valid admin token for debugging
    require_once __DIR__ . '/utils/jwt.php';
    $configFile = __DIR__ . '/config/config.php';
    $config = file_exists($configFile) ? require $configFile : require __DIR__ . '/config/config.sample.php';
    $secret = $config['jwt']['secret'] ?? 'valerie_default_secret_key_2026';
    $token = JWT::encode([
        'sub' => 1,
        'name' => 'Valerie Jewels Admin',
        'email' => 'admin@valeriejewels.com',
        'role' => 'admin',
        'iat' => time(),
        'exp' => time() + 3600,
    ], $secret);

    ApiResponse::success([
        'db_check' => $dbCheck,
        'current_products' => $currentProducts,
        'recent_logs' => $recentLogs,
        'test_admin_token' => $token,
        'test_passed' => ($row && $row['value'] === $testValue),
    ], 'Persistence and diagnostics test completed.');
} catch (Throwable $e) {
    ApiResponse::error('Persistence test failed: ' . $e->getMessage(), 500);
}
