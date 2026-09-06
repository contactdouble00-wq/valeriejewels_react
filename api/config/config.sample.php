<?php
/**
 * Valerie Jewels - Configuration Template
 * Copy this file to config.php and fill in your environment-specific credentials.
 */

return [
    'app' => [
        'name'        => 'Valerie Jewels',
        'env'         => 'development', // 'development' | 'production'
        'url'         => 'http://localhost:5173',
        'api_url'     => 'http://localhost:8000',
        'debug'       => true,
        'timezone'    => 'Asia/Kolkata',
    ],

    'db' => [
        'host'        => '127.0.0.1',
        'port'        => 3306,
        'database'    => 'valerie_jewels',
        'username'    => 'root',
        'password'    => '',
        'charset'     => 'utf8mb4',
    ],

    'jwt' => [
        'secret'      => 'change_this_to_a_secure_random_64_char_secret_key_valerie_2026',
        'algorithm'   => 'HS256',
        'expires_in'  => 86400 * 7, // 7 days
    ],

    'cors' => [
        'allowed_origins' => [
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:3000',
            'https://valeriejewels.in',
            'https://www.valeriejewels.in',
            'https://shop.valeriejewels.in',
        ],
        'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With'],
    ],

    // Third-party placeholders (configured in Phase 5 & 6)
    'fastrr' => [
        'app_id'     => '',
        'secret_key' => '',
        'sandbox'    => true,
    ],

    'shiprocket' => [
        'email'      => '',
        'password'   => '',
        'token'      => '',
    ],

    'smtp' => [
        'host'       => 'smtp.hostinger.com',
        'port'       => 465,
        'encryption' => 'ssl',
        'username'   => '',
        'password'   => '',
        'from_email' => 'support@valeriejewels.com',
        'from_name'  => 'Valerie Jewels Support',
    ],
];
