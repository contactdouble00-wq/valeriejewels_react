<?php
/**
 * VALERIE JEWELS — Automated Payment Recovery & Abandoned Checkout Cron Job
 * 
 * Automatically sends luxury high-converting recovery emails with direct product links
 * to customers whose checkout payment is pending, unpaid, or failed.
 * 
 * Supported Invocation:
 * 1. CLI: `php api/cron/payment_recovery.php`
 * 2. HTTP: `GET/POST /api/cron/payment_recovery.php?key=SECURE_VALERIE_CRON`
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/utils/auto_recovery.php';
require_once dirname(__DIR__) . '/config/database.php';

$isCli = (php_sapi_name() === 'cli');
if (!$isCli) {
    handleCors();
}

try {
    $limit = isset($_GET['limit']) ? max(1, min(100, (int)$_GET['limit'])) : ($isCli ? 50 : 25);
    $immediate = !empty($_GET['immediate']) || !empty($_POST['immediate']) || $isCli;
    $minMinutes = $immediate ? 0 : (isset($_GET['min_minutes']) ? max(1, (int)$_GET['min_minutes']) : 5);

    $summary = AutoRecoveryService::runSweep($limit, $minMinutes, $immediate);

    if ($isCli) {
        echo json_encode($summary, JSON_PRETTY_PRINT) . PHP_EOL;
    } else {
        ApiResponse::success($summary, 'Automated payment recovery run completed');
    }

} catch (Throwable $e) {
    if ($isCli) {
        echo "Error: " . $e->getMessage() . PHP_EOL;
        exit(1);
    } else {
        ApiResponse::error('Payment recovery job failed: ' . $e->getMessage(), 500);
    }
}
