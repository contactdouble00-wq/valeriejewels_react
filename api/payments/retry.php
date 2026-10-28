<?php
/**
 * VALERIE JEWELS — Order Payment Retry & Recovery Endpoint
 * Allows customers whose initial payment failed or timed out to:
 * 1. Retry online payment via 1-click Razorpay checkout.
 * 2. Switch order directly to Cash on Delivery (COD) to guarantee psychological conversion.
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/utils/rate_limiter.php';
require_once dirname(__DIR__) . '/utils/mailer.php';
require_once dirname(__DIR__) . '/config/database.php';

handleCors();

RateLimiter::check('payment_retry', 60, 600);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ApiResponse::error('Method not allowed. Use POST.', 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
$orderNumber = trim($input['order_number'] ?? '');
$action      = trim($input['action'] ?? 'pay_online'); // 'pay_online' | 'switch_to_cod'
$targetType  = trim($input['payment_type'] ?? '');     // 'full_prepaid' | 'partial' | 'cod'

if (empty($orderNumber)) {
    ApiResponse::error('order_number is required.', 422);
}

try {
    $pdo = Database::getConnection();

    $stmt = $pdo->prepare("SELECT * FROM orders WHERE order_number = ? LIMIT 1");
    $stmt->execute([$orderNumber]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
        ApiResponse::error('Order not found.', 404);
    }

    $pStatus = strtolower($order['payment_status'] ?? '');
    $oStatus = strtolower($order['order_status'] ?? '');
    $currentType = strtolower($order['payment_type'] ?? '');

    // Check if already paid or confirmed (and not a pending COD order)
    if (
        $pStatus === 'paid' || 
        $pStatus === 'partial_paid' || 
        ($currentType !== 'cod' && $oStatus === 'confirmed')
    ) {
        ApiResponse::success([
            'already_confirmed' => true,
            'order' => $order,
        ], 'Order is already paid and confirmed.');
    }

    // Load active payment gateway config from site_settings
    $payConfig = [
        'gateway_mode'         => 'live',
        'razorpay_key_id'      => 'rzp_live_Tf7Bar4fWloC2y',
        'razorpay_key_secret'  => 'u8xu0HfY01b0wkwWwiYfEBRN',
        'cod_available'        => true,
        'partial_cod_enabled'  => true,
        'partial_advance'      => 100,
    ];

    try {
        $setStmt = $pdo->prepare("SELECT `value` FROM `site_settings` WHERE `key` = 'payment_settings' LIMIT 1");
        $setStmt->execute();
        $raw = $setStmt->fetchColumn();
        if ($raw) {
            $parsed = json_decode($raw, true);
            if (is_array($parsed)) {
                $payConfig = array_merge($payConfig, $parsed);
            }
        }
    } catch (Throwable $e) {}

    // ─────────────────────────────────────────────────────────────
    // STRATEGY 1: CONVERT TO CASH ON DELIVERY (Doorstep Settlement)
    // ─────────────────────────────────────────────────────────────
    if ($action === 'switch_to_cod' || $targetType === 'cod') {
        $nowSql = Database::getDriver() === 'sqlite' ? "datetime('now')" : "NOW()";
        
        $upStmt = $pdo->prepare("
            UPDATE orders 
            SET payment_type = 'cod',
                payment_status = 'pending',
                order_status = 'confirmed',
                amount_paid_upfront = 0.0,
                amount_due_on_delivery = total_amount,
                updated_at = $nowSql
            WHERE id = ?
        ");
        $upStmt->execute([(int)$order['id']]);

        // Auto-create shipment via default delivery provider
        try {
            require_once dirname(__DIR__) . '/shipping/DeliveryProviderFactory.php';
            $provider = DeliveryProviderFactory::getDefaultProvider();
            $provider->createShipment((int)$order['id']);
        } catch (Throwable $se) {
            error_log('[Fulfillment] Switch to COD auto-sync error: ' . $se->getMessage());
        }

        // Dispatch confirmation email
        try {
            MailerService::sendOrderConfirmation((int)$order['id']);
        } catch (Throwable $me) {
            error_log('[Mailer] Error dispatching COD confirmation email: ' . $me->getMessage());
        }

        // Fetch refreshed order
        $stmt->execute([$orderNumber]);
        $refreshed = $stmt->fetch(PDO::FETCH_ASSOC);

        ApiResponse::success([
            'switched_to_cod' => true,
            'order' => $refreshed,
        ], 'Order successfully converted to Cash on Delivery.');
    }

    // ─────────────────────────────────────────────────────────────
    // STRATEGY 2: RETRY ONLINE PAYMENT VIA RAZORPAY / UPI
    // ─────────────────────────────────────────────────────────────
    $effectiveType = in_array($targetType, ['full_prepaid', 'partial'], true) 
        ? $targetType 
        : ($currentType === 'partial' ? 'partial' : 'full_prepaid');

    $totalAmount = (float)$order['total_amount'];
    $dueNow = $totalAmount;

    if ($effectiveType === 'partial') {
        $adv = (float)($order['amount_paid_upfront'] > 0 
            ? $order['amount_paid_upfront'] 
            : ($payConfig['partial_advance'] ?? 100.0));
        $dueNow = min($adv, $totalAmount);
    }

    $razorpayKeyId     = $payConfig['razorpay_key_id'] ?? 'rzp_live_Tf7Bar4fWloC2y';
    $razorpayKeySecret = $payConfig['razorpay_key_secret'] ?? 'u8xu0HfY01b0wkwWwiYfEBRN';
    $isLive            = ($payConfig['gateway_mode'] ?? 'sandbox') === 'live';

    $razorpayOrderId = null;
    $dueNowInPaise = (int)round($dueNow * 100);

    if ($dueNowInPaise > 0 && !empty($razorpayKeyId) && !empty($razorpayKeySecret)) {
        $orderPayload = [
            'amount'   => $dueNowInPaise,
            'currency' => 'INR',
            'receipt'  => $orderNumber . '-R' . time(),
            'notes'    => [
                'valerie_order_id' => (string)$order['id'],
                'order_number'     => $orderNumber,
                'customer_phone'   => $order['customer_phone'],
                'customer_name'    => $order['customer_name'],
                'payment_type'     => $effectiveType,
                'retry'            => '1',
            ],
        ];

        $ch = curl_init('https://api.razorpay.com/v1/orders');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERPWD, $razorpayKeyId . ':' . $razorpayKeySecret);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($orderPayload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $rpResponse = curl_exec($ch);
        $rpHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($rpHttpCode === 200 && $rpResponse) {
            $rpData = json_decode($rpResponse, true);
            if (!empty($rpData['id'])) {
                $razorpayOrderId = $rpData['id'];
                $upStmt = $pdo->prepare("UPDATE orders SET fastrr_order_id = ? WHERE id = ?");
                $upStmt->execute([$razorpayOrderId, (int)$order['id']]);
            }
        }
    }

    ApiResponse::success([
        'order_number'      => $orderNumber,
        'order_id'          => (int)$order['id'],
        'payment_type'      => $effectiveType,
        'amount_due_now'    => $dueNow,
        'total_amount'      => $totalAmount,
        'currency'          => 'INR',
        'razorpay_order_id' => $razorpayOrderId,
        'razorpay_key_id'   => $razorpayKeyId,
        'customer'          => [
            'name'  => $order['customer_name'],
            'email' => $order['customer_email'],
            'phone' => $order['customer_phone'],
        ],
        'sandbox'           => !$isLive,
    ], 'Payment retry initiated.');

} catch (Throwable $e) {
    ApiResponse::error('Payment retry failed: ' . $e->getMessage(), 500);
}
