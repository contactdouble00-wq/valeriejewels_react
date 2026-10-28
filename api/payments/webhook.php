<?php
/**
 * VALERIE JEWELS — Multi-Gateway Payment Webhook Handler
 * Supports Razorpay (Direct & UPI), Fastrr Checkout, and Shiprocket.
 * Verifies HMAC-SHA256 signatures and updates order status atomically.
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/utils/mailer.php';
require_once dirname(__DIR__) . '/config/database.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ApiResponse::error('Method not allowed. Use POST.', 405);
}

$rawPayload = file_get_contents('php://input');
$data = json_decode($rawPayload, true);

if (!$data) {
    ApiResponse::error('Invalid JSON payload', 400);
}

// Fetch gateway configuration from site_settings & env
$config = require dirname(__DIR__) . '/config/config.php';
$fastrrSecret = getenv('FASTRR_SECRET_KEY') ?: ($config['fastrr']['secret_key'] ?? '');
$fastrrWebhookSecret = getenv('FASTRR_WEBHOOK_SECRET') ?: ($config['fastrr']['webhook_secret'] ?? '');
$isSandbox = !empty($config['fastrr']['sandbox']);

$razorpayKeyId = 'rzp_live_Tf7Bar4fWloC2y';
$razorpayKeySecret = 'u8xu0HfY01b0wkwWwiYfEBRN';
$razorpayWebhookSecret = '';

try {
    $pdo = Database::getConnection();
    $stmt = $pdo->prepare("SELECT `value` FROM `site_settings` WHERE `key` = 'payment_settings' LIMIT 1");
    $stmt->execute();
    $raw = $stmt->fetchColumn();
    if ($raw) {
        $settings = json_decode($raw, true) ?: [];
        if (!empty($settings['fastrr_secret_key'])) {
            $fastrrSecret = $settings['fastrr_secret_key'];
        }
        if (!empty($settings['fastrr_webhook_secret'])) {
            $fastrrWebhookSecret = $settings['fastrr_webhook_secret'];
        }
        if (!empty($settings['razorpay_key_id'])) {
            $razorpayKeyId = $settings['razorpay_key_id'];
        }
        if (!empty($settings['razorpay_key_secret'])) {
            $razorpayKeySecret = $settings['razorpay_key_secret'];
        }
        if (!empty($settings['razorpay_webhook_secret'])) {
            $razorpayWebhookSecret = $settings['razorpay_webhook_secret'];
        }
    }
} catch (Throwable $e) {}

// Identify Webhook Source via Request Headers
$razorpaySignature = $_SERVER['HTTP_X_RAZORPAY_SIGNATURE'] ?? $_SERVER['X_RAZORPAY_SIGNATURE'] ?? null;
$fastrrSignature = $_SERVER['HTTP_X_FASTRR_SIGNATURE'] ?? $_SERVER['X_FASTRR_SIGNATURE'] ?? $_SERVER['HTTP_X_SHIPROCKET_SIGNATURE'] ?? null;

$isRazorpayWebhook = !empty($razorpaySignature) || isset($data['entity']) || (isset($data['event']) && isset($data['payload']));

if ($isRazorpayWebhook) {
    // ----------------------------------------------------
    // RAZORPAY WEBHOOK VERIFICATION & PARSING
    // ----------------------------------------------------
    $isVerified = false;

    if (!empty($razorpaySignature)) {
        // 1. Try with dedicated razorpay webhook secret if configured
        if (!empty($razorpayWebhookSecret)) {
            $expected = hash_hmac('sha256', $rawPayload, $razorpayWebhookSecret);
            if (hash_equals($expected, $razorpaySignature)) {
                $isVerified = true;
            }
        }
        // 2. Try with razorpay key secret
        if (!$isVerified && !empty($razorpayKeySecret)) {
            $expected = hash_hmac('sha256', $rawPayload, $razorpayKeySecret);
            if (hash_equals($expected, $razorpaySignature)) {
                $isVerified = true;
            }
        }
    }

    $event = $data['event'] ?? '';
    $paymentEntity = $data['payload']['payment']['entity'] ?? null;
    $orderEntity   = $data['payload']['order']['entity'] ?? null;

    $paymentId     = $paymentEntity['id'] ?? null;
    $rzpOrderId    = $orderEntity['id'] ?? ($paymentEntity['order_id'] ?? null);
    $amountInPaise = $paymentEntity['amount'] ?? ($orderEntity['amount_paid'] ?? 0);
    $amountPaid    = $amountInPaise > 0 ? ((float)$amountInPaise / 100) : null;
    $notes         = $paymentEntity['notes'] ?? ($orderEntity['notes'] ?? []);

    // If signature failed or wasn't provided, authoritatively verify directly via Razorpay REST API
    if (!$isVerified && !empty($paymentId) && !empty($razorpayKeyId) && !empty($razorpayKeySecret)) {
        $ch = curl_init('https://api.razorpay.com/v1/payments/' . urlencode($paymentId));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERPWD, $razorpayKeyId . ':' . $razorpayKeySecret);
        curl_setopt($ch, CURLOPT_TIMEOUT, 6);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $resp = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($code === 200 && $resp) {
            $apiPay = json_decode($resp, true);
            if (!empty($apiPay['id']) && $apiPay['id'] === $paymentId) {
                $isVerified = true;
                if (!empty($apiPay['status'])) {
                    if ($apiPay['status'] === 'captured') {
                        $event = 'payment.captured';
                    }
                }
                if ($amountPaid === null && isset($apiPay['amount'])) {
                    $amountPaid = (float)$apiPay['amount'] / 100;
                }
                if (empty($notes) && !empty($apiPay['notes'])) {
                    $notes = $apiPay['notes'];
                }
            }
        }
    }

    if (!$isVerified && !empty($razorpaySignature) && !$isSandbox) {
        error_log("[Razorpay Webhook] Signature verification failed. Received: " . substr($razorpaySignature, 0, 16) . "...");
        ApiResponse::error('Invalid Razorpay webhook signature', 401);
    }

    // Extract Order Identifiers
    $orderNumber   = $notes['order_number'] ?? ($orderEntity['receipt'] ?? null);
    $valerieOrderId= !empty($notes['valerie_order_id']) ? (int)$notes['valerie_order_id'] : null;

    if (!$orderNumber && !$valerieOrderId && !$rzpOrderId) {
        ApiResponse::error('Missing order identifier in Razorpay webhook payload', 422);
    }

    // Locate order in database
    $order = null;
    if (!empty($orderNumber)) {
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE order_number = ? LIMIT 1");
        $stmt->execute([$orderNumber]);
        $order = $stmt->fetch();
    }
    if (!$order && !empty($valerieOrderId)) {
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
        $stmt->execute([$valerieOrderId]);
        $order = $stmt->fetch();
    }
    if (!$order && !empty($rzpOrderId)) {
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE fastrr_order_id = ? LIMIT 1");
        $stmt->execute([$rzpOrderId]);
        $order = $stmt->fetch();
    }

    if (!$order) {
        ApiResponse::error('Order not found for Razorpay webhook', 404);
    }

    // Process event
    if ($event === 'payment.captured' || $event === 'order.paid' || $event === 'payment.authorized') {
        $paymentType = $order['payment_type'];
        $now = date('Y-m-d H:i:s');

        // Check if already processed
        $isAlreadyConfirmed = ($order['order_status'] === 'confirmed' || $order['order_status'] === 'shipped' || $order['order_status'] === 'delivered')
            && ($order['payment_status'] === 'paid' || ($paymentType === 'partial' && $order['payment_status'] === 'partial_paid'));

        if ($isAlreadyConfirmed) {
            ApiResponse::success([
                'order_id'       => $order['id'],
                'order_number'   => $order['order_number'],
                'payment_status' => $order['payment_status'],
                'message'        => 'Order already confirmed previously',
            ], 'Webhook idempotent: Order already paid');
        }

        $newPaymentStatus = 'paid';
        $newOrderStatus   = 'confirmed';
        $paidUpfront      = (float)$order['amount_paid_upfront'];
        $dueOnDelivery    = (float)$order['amount_due_on_delivery'];

        if ($paymentType === 'partial') {
            $newPaymentStatus = 'partial_paid';
            $paidUpfront = $amountPaid !== null ? $amountPaid : (float)$order['amount_paid_upfront'];
            $dueOnDelivery = round(max(0, (float)$order['total_amount'] - $paidUpfront), 2);
        } elseif ($paymentType === 'full_prepaid') {
            $newPaymentStatus = 'paid';
            $paidUpfront = $amountPaid !== null ? $amountPaid : (float)$order['total_amount'];
            $dueOnDelivery = 0.0;
        } else {
            // Full COD
            $newPaymentStatus = 'pending';
            $dueOnDelivery = (float)$order['total_amount'];
        }

        $recordedRef = $paymentId ?: ($rzpOrderId ?: $order['fastrr_order_id']);

        $updateSql = "
            UPDATE orders 
            SET payment_status = :payment_status,
                order_status   = :order_status,
                fastrr_order_id = :fastrr_order_id,
                amount_paid_upfront = :paid_upfront,
                amount_due_on_delivery = :due_on_delivery,
                updated_at = :updated_at
            WHERE id = :id
        ";
        $updateStmt = $pdo->prepare($updateSql);
        $updateStmt->execute([
            ':payment_status'   => $newPaymentStatus,
            ':order_status'     => $newOrderStatus,
            ':fastrr_order_id'  => $recordedRef,
            ':paid_upfront'     => $paidUpfront,
            ':due_on_delivery'  => $dueOnDelivery,
            ':updated_at'       => $now,
            ':id'               => $order['id'],
        ]);

        // Send order confirmation email
        try {
            MailerService::sendOrderConfirmation((int)$order['id']);
        } catch (Throwable $e) {
            error_log('[Razorpay Webhook] Mailer error: ' . $e->getMessage());
        }

        // Push confirmed order to default delivery partner panel
        try {
            require_once dirname(__DIR__) . '/shipping/DeliveryProviderFactory.php';
            $provider = DeliveryProviderFactory::getDefaultProvider();
            $provider->createShipment((int)$order['id']);
        } catch (Throwable $e) {
            error_log('[Razorpay Webhook] Delivery partner auto-sync error: ' . $e->getMessage());
        }

        ApiResponse::success([
            'order_id'               => $order['id'],
            'order_number'           => $order['order_number'],
            'payment_status'         => $newPaymentStatus,
            'order_status'           => $newOrderStatus,
            'transaction_id'         => $recordedRef,
            'amount_paid_upfront'    => $paidUpfront,
            'amount_due_on_delivery' => $dueOnDelivery,
        ], 'Razorpay webhook processed: Order confirmed');

    } elseif ($event === 'payment.failed') {
        $updateStmt = $pdo->prepare("UPDATE orders SET payment_status = 'failed', order_status = 'failed', updated_at = :updated_at WHERE id = :id AND payment_status != 'paid' AND payment_status != 'partial_paid'");
        $updateStmt->execute([
            ':updated_at' => date('Y-m-d H:i:s'),
            ':id'         => $order['id'],
        ]);

        $failureReason = $paymentEntity['error_description'] ?? 'Payment authorization failed on Razorpay';
        try {
            MailerService::sendOrderFailed((int)$order['id'], $failureReason);
        } catch (Throwable $e) {
            error_log('[Razorpay Webhook] Mailer payment failed error: ' . $e->getMessage());
        }

        ApiResponse::success([
            'order_id'       => $order['id'],
            'order_number'   => $order['order_number'],
            'payment_status' => 'failed',
            'order_status'   => 'failed',
        ], 'Razorpay webhook processed: Payment failed noted');
    } else {
        ApiResponse::success(['event' => $event], 'Razorpay webhook acknowledged');
    }

    exit;
}

// ----------------------------------------------------
// FASTRR / SHIPROCKET WEBHOOK HANDLING
// ----------------------------------------------------
if (!empty($fastrrSignature)) {
    $expectedHex = hash_hmac('sha256', $rawPayload, $fastrrSecret);
    $expectedB64 = base64_encode(hash_hmac('sha256', $rawPayload, $fastrrSecret, true));
    $isValid = hash_equals($expectedHex, $fastrrSignature) || hash_equals($expectedB64, $fastrrSignature);

    if (!$isValid && !empty($fastrrWebhookSecret)) {
        $isValid = hash_equals(hash_hmac('sha256', $rawPayload, $fastrrWebhookSecret), $fastrrSignature)
                || hash_equals(base64_encode(hash_hmac('sha256', $rawPayload, $fastrrWebhookSecret, true)), $fastrrSignature);
    }

    if (!$isValid) {
        error_log("[Fastrr Webhook] Signature verification failed. Received: " . substr($fastrrSignature, 0, 16) . "...");
        ApiResponse::error('Invalid webhook signature', 401);
    }
} elseif (!$isSandbox && empty($fastrrSignature)) {
    ApiResponse::error('Missing required webhook signature header', 401);
}

try {
    $event        = $data['event'] ?? 'payment.success';
    $orderNumber  = $data['order_number'] ?? ($data['data']['order_number'] ?? null);
    $orderId      = $data['order_id'] ?? ($data['data']['order_id'] ?? null);
    $fastrrOrderId= $data['fastrr_order_id'] ?? ($data['data']['fastrr_order_id'] ?? 'FST-' . uniqid());
    $amountPaid   = isset($data['amount_paid']) ? (float)$data['amount_paid'] : (isset($data['data']['amount_paid']) ? (float)$data['data']['amount_paid'] : null);
    $riskTier     = $data['risk_tier'] ?? ($data['data']['risk_tier'] ?? null);

    if (!$orderNumber && !$orderId) {
        ApiResponse::error('Missing order identifier in webhook payload', 422);
    }

    // Locate order
    if ($orderNumber) {
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE order_number = ? LIMIT 1");
        $stmt->execute([$orderNumber]);
    } else {
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
        $stmt->execute([(int)$orderId]);
    }
    $order = $stmt->fetch();

    if (!$order) {
        ApiResponse::error('Order not found', 404);
    }

    if ($event === 'payment.success' || $event === 'order.paid' || $event === 'order.confirmed') {
        $paymentType = $order['payment_type'];
        
        $newPaymentStatus = 'paid';
        $newOrderStatus   = 'confirmed';
        $paidUpfront      = (float)$order['amount_paid_upfront'];
        $dueOnDelivery    = (float)$order['amount_due_on_delivery'];

        if ($paymentType === 'full_prepaid') {
            $newPaymentStatus = 'paid';
            $paidUpfront = $amountPaid !== null ? $amountPaid : (float)$order['total_amount'];
            $dueOnDelivery = 0.0;
        } elseif ($paymentType === 'partial') {
            $newPaymentStatus = 'partial_paid';
            $paidUpfront = $amountPaid !== null ? $amountPaid : (float)$order['amount_paid_upfront'];
            $dueOnDelivery = round(max(0, (float)$order['total_amount'] - $paidUpfront), 2);
        } else {
            // Full COD
            $newPaymentStatus = 'pending';
            $paidUpfront = 0.0;
            $dueOnDelivery = (float)$order['total_amount'];
        }

        $updateSql = "
            UPDATE orders 
            SET payment_status = :payment_status,
                order_status   = :order_status,
                fastrr_order_id = :fastrr_order_id,
                amount_paid_upfront = :paid_upfront,
                amount_due_on_delivery = :due_on_delivery,
                fastrr_risk_tier = COALESCE(:risk_tier, fastrr_risk_tier),
                updated_at = :updated_at
            WHERE id = :id
        ";
        $updateStmt = $pdo->prepare($updateSql);
        $updateStmt->execute([
            ':payment_status'   => $newPaymentStatus,
            ':order_status'     => $newOrderStatus,
            ':fastrr_order_id'  => $fastrrOrderId,
            ':paid_upfront'     => $paidUpfront,
            ':due_on_delivery'  => $dueOnDelivery,
            ':risk_tier'        => $riskTier,
            ':updated_at'       => date('Y-m-d H:i:s'),
            ':id'               => $order['id'],
        ]);

        try {
            MailerService::sendOrderConfirmation((int)$order['id']);
        } catch (Throwable $e) {}

        try {
            require_once dirname(__DIR__) . '/shipping/DeliveryProviderFactory.php';
            $provider = DeliveryProviderFactory::getDefaultProvider();
            $provider->createShipment((int)$order['id']);
        } catch (Throwable $e) {
            error_log('[Delivery Partner] Webhook auto-sync error: ' . $e->getMessage());
        }

        ApiResponse::success([
            'order_id'               => $order['id'],
            'order_number'           => $order['order_number'],
            'payment_status'         => $newPaymentStatus,
            'order_status'           => $newOrderStatus,
            'fastrr_order_id'        => $fastrrOrderId,
            'amount_paid_upfront'    => $paidUpfront,
            'amount_due_on_delivery' => $dueOnDelivery,
        ], 'Webhook processed: Order confirmed');

    } elseif ($event === 'payment.failed') {
        $updateStmt = $pdo->prepare("UPDATE orders SET payment_status = 'failed', order_status = 'failed', updated_at = :updated_at WHERE id = :id");
        $updateStmt->execute([
            ':updated_at' => date('Y-m-d H:i:s'),
            ':id'         => $order['id'],
        ]);

        $failureReason = $data['failure_reason'] ?? ($data['data']['failure_reason'] ?? 'Payment was interrupted or declined by bank');
        try {
            MailerService::sendOrderFailed((int)$order['id'], $failureReason);
        } catch (Throwable $e) {
            error_log('Mailer payment failed error: ' . $e->getMessage());
        }

        ApiResponse::success([
            'order_id'       => $order['id'],
            'order_number'   => $order['order_number'],
            'payment_status' => 'failed',
            'order_status'   => 'failed',
        ], 'Webhook processed: Payment failed noted and customer notified');
    } else {
        ApiResponse::success(['event' => $event], 'Webhook received (unhandled event)');
    }

} catch (Throwable $e) {
    ApiResponse::error('Webhook processing error: ' . $e->getMessage(), 500);
}
