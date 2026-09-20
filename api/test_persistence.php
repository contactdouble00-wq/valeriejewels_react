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

    // Get table stats
    $stats = Database::getStats();
    $dbCheck = Database::checkConnection();

    ApiResponse::success([
        'db_check' => $dbCheck,
        'written_key' => $testKey,
        'read_value' => $row['value'] ?? null,
        'updated_at' => $row['updated_at'] ?? null,
        'test_passed' => ($row && $row['value'] === $testValue),
    ], 'Persistence verification completed successfully.');
} catch (Throwable $e) {
    ApiResponse::error('Persistence test failed: ' . $e->getMessage(), 500);
}
