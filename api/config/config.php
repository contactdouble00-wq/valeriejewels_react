<?php
/**
 * Valerie Jewels - Configuration Loader
 * Supports local development, environment variables, .env file, and optional config.local.php.
 */

$config = require __DIR__ . '/config.sample.php';

// 1. Check for .env file across standard deployment locations
$envPaths = [
    dirname(__DIR__) . '/.env',                 // api/.env
    dirname(dirname(__DIR__)) . '/.env',        // shop/.env
    dirname(dirname(dirname(__DIR__))) . '/.env', // public_html/.env or domain root
    dirname($_SERVER['DOCUMENT_ROOT'] ?? '') . '/.env',
    ($_SERVER['DOCUMENT_ROOT'] ?? '') . '/.env',
];

foreach ($envPaths as $envFile) {
    if (!empty($envFile) && file_exists($envFile) && is_readable($envFile)) {
        $lines = @file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines !== false) {
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || str_starts_with($line, '#')) {
                    continue;
                }
                if (strpos($line, '=') !== false) {
                    [$k, $v] = explode('=', $line, 2);
                    $k = trim($k);
                    $v = trim($v, " \t\n\r\0\x0B\"'");
                    if (!getenv($k)) {
                        putenv("$k=$v");
                        $_ENV[$k] = $v;
                        $_SERVER[$k] = $v;
                    }
                }
            }
        }
        break;
    }
}

// 2. Auto-detect Hostinger WordPress database credentials if DB_DATABASE is not explicitly set
if (empty(getenv('DB_DATABASE')) && empty($_ENV['DB_DATABASE'])) {
    $wpPaths = [
        dirname(dirname(dirname(__DIR__))) . '/wp-config.php',
        '/home/u513962642/domains/valeriejewels.in/public_html/wp-config.php',
        dirname(dirname(__DIR__)) . '/wp-config.php',
        (isset($_SERVER['DOCUMENT_ROOT']) ? dirname($_SERVER['DOCUMENT_ROOT']) . '/wp-config.php' : ''),
        ($_SERVER['DOCUMENT_ROOT'] ?? '') . '/wp-config.php',
    ];

    foreach ($wpPaths as $wpFile) {
        if (!empty($wpFile) && file_exists($wpFile) && is_readable($wpFile)) {
            $wpContent = @file_get_contents($wpFile);
            if ($wpContent) {
                if (preg_match("/define\s*\(\s*['\"]DB_NAME['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*\)/i", $wpContent, $m)) {
                    $config['db']['database'] = trim($m[1]);
                }
                if (preg_match("/define\s*\(\s*['\"]DB_USER['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*\)/i", $wpContent, $m)) {
                    $config['db']['username'] = trim($m[1]);
                }
                if (preg_match("/define\s*\(\s*['\"]DB_PASSWORD['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*\)/i", $wpContent, $m)) {
                    $config['db']['password'] = trim($m[1]);
                }
                if (preg_match("/define\s*\(\s*['\"]DB_HOST['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*\)/i", $wpContent, $m)) {
                    $config['db']['host'] = trim($m[1]);
                }
                break;
            }
        }
    }
}

// 3. Check for optional uncommitted local override: config.local.php
$localConfigFile = __DIR__ . '/config.local.php';
if (file_exists($localConfigFile) && is_readable($localConfigFile)) {
    $localConfig = require $localConfigFile;
    if (is_array($localConfig)) {
        $config = array_replace_recursive($config, $localConfig);
    }
}

// 3. Apply Environment Variable overrides (e.g. from Hostinger or CI/CD)
$dbHost = getenv('DB_HOST') ?: ($_ENV['DB_HOST'] ?? null);
if ($dbHost) {
    $config['db']['host'] = $dbHost;
}

$dbPort = getenv('DB_PORT') ?: ($_ENV['DB_PORT'] ?? null);
if ($dbPort) {
    $config['db']['port'] = (int)$dbPort;
}

$dbName = getenv('DB_DATABASE') ?: (getenv('DB_NAME') ?: ($_ENV['DB_DATABASE'] ?? ($_ENV['DB_NAME'] ?? null)));
if ($dbName) {
    $config['db']['database'] = $dbName;
}

$dbUser = getenv('DB_USERNAME') ?: (getenv('DB_USER') ?: ($_ENV['DB_USERNAME'] ?? ($_ENV['DB_USER'] ?? null)));
if ($dbUser) {
    $config['db']['username'] = $dbUser;
}

$dbPass = getenv('DB_PASSWORD') !== false ? getenv('DB_PASSWORD') : (getenv('DB_PASS') !== false ? getenv('DB_PASS') : ($_ENV['DB_PASSWORD'] ?? ($_ENV['DB_PASS'] ?? null)));
if ($dbPass !== null) {
    $config['db']['password'] = $dbPass;
}

$appEnv = getenv('APP_ENV') ?: ($_ENV['APP_ENV'] ?? null);
if ($appEnv) {
    $config['app']['env'] = $appEnv;
}

// Fastrr sandbox credentials for testing
$config['fastrr']['app_id'] = getenv('FASTRR_APP_ID') ?: ($config['fastrr']['app_id'] ?: 'vj_fastrr_app_test');
$config['fastrr']['secret_key'] = getenv('FASTRR_SECRET_KEY') ?: ($config['fastrr']['secret_key'] ?: 'vj_fastrr_secret_test_2026');
$config['fastrr']['sandbox'] = true;

return $config;
