<?php
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['HTTP_HOST'] = 'localhost:8000';
$_SERVER['DOCUMENT_ROOT'] = dirname(__DIR__);

$testPayload = [
    'items' => [
        [
            'id' => 1,
            'variant_id' => 1,
            'name' => 'Royal Noor Jhumka Box',
            'price' => 1799,
            'quantity' => 1,
            'image' => 'https://valeriejewels.in/hero-jewelry-model.jpg'
        ]
    ],
    'coupon_code' => '',
    'discount_amount' => 0
];
$_POST = $testPayload;

ob_start();
require __DIR__ . '/../api/fastrr/create_session.php';
$output = ob_get_clean();

echo $output;
