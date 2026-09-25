<?php
// Simulate POST request to create_session.php
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

// Mock php://input
class MockPhpStream {
    public $context;
    private $position = 0;
    private static $data = '';

    public static function setData($d) {
        self::$data = $d;
    }

    public function stream_open($path, $mode, $options, &$opened_path) {
        $this->position = 0;
        return true;
    }

    public function stream_read($count) {
        $ret = substr(self::$data, $this->position, $count);
        $this->position += strlen($ret);
        return $ret;
    }

    public function stream_eof() {
        return $this->position >= strlen(self::$data);
    }

    public function stream_stat() {
        return [];
    }
}

// We can just run create_session via internal curl or php built-in server or direct include if we set $_POST
$_POST = $testPayload;

ob_start();
require __DIR__ . '/../api/fastrr/create_session.php';
$output = ob_get_clean();

echo "create_session.php Output:\n";
echo $output . "\n";
