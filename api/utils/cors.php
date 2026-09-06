<?php
/**
 * Valerie Jewels - CORS and Request Header Management
 */

function handleCors(): void {
    $configFile = dirname(__DIR__) . '/config/config.php';
    $config = file_exists($configFile) 
        ? require $configFile 
        : require dirname(__DIR__) . '/config/config.sample.php';

    $isProduction = ($config['app']['env'] ?? 'development') === 'production';
    $allowedOrigins = $config['cors']['allowed_origins'] ?? [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'https://valeriejewels.in',
        'https://www.valeriejewels.in',
        'https://shop.valeriejewels.in',
    ];
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    $originAllowed = false;
    if (in_array($origin, $allowedOrigins, true) || preg_match('/^https:\/\/([a-z0-9-]+\.)?valeriejewels\.in$/i', $origin)) {
        header("Access-Control-Allow-Origin: {$origin}");
        header("Vary: Origin");
        $originAllowed = true;
    } elseif (!$isProduction && ($config['app']['debug'] ?? false)) {
        // Development-only fallback: only allow during local debug mode
        header("Access-Control-Allow-Origin: *");
        $originAllowed = true;
    }

    $methods = implode(', ', $config['cors']['allowed_methods'] ?? ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
    $headers = implode(', ', $config['cors']['allowed_headers'] ?? ['Content-Type', 'Authorization', 'X-Requested-With']);

    if ($originAllowed) {
        header("Access-Control-Allow-Methods: {$methods}");
        header("Access-Control-Allow-Headers: {$headers}");
        header("Access-Control-Allow-Credentials: true");
        header("Access-Control-Max-Age: 86400");
    }

    // Handle preflight OPTIONS request
    if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        if ($originAllowed) {
            http_response_code(204);
        } else {
            http_response_code(403);
        }
        exit;
    }
}
