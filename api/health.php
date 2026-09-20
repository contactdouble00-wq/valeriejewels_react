<?php
/**
 * Valerie Jewels - Health Check & System Status Endpoint
 */

require_once __DIR__ . '/utils/cors.php';
require_once __DIR__ . '/utils/response.php';
require_once __DIR__ . '/config/database.php';

handleCors();

$configFile = __DIR__ . '/config/config.php';
$config = file_exists($configFile) 
    ? require $configFile 
    : require __DIR__ . '/config/config.sample.php';

$dbCheck = Database::checkConnection();

$healthData = [
    'store'       => 'VALERIE JEWELS',
    'status'      => 'healthy',
    'phase'       => 'Phase 1 - Database Schema & Core Models Active',
    'environment' => $config['app']['env'] ?? 'development',
    'php_version' => PHP_VERSION,
    'git_commit'  => trim(@file_get_contents(dirname(__DIR__) . '/.git/refs/heads/main') ?: 'unknown'),
    'database'    => $dbCheck,
    'server_time' => date('c'),
];

ApiResponse::success($healthData, 'Valerie Jewels API is online and operational.');
