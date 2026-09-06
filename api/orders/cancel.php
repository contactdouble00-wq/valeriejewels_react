<?php
/**
 * VALERIE JEWELS — Order Cancellation & Refund Endpoint
 * Strictly enforces pre-shipping rule: blocks cancellation once shipped.
 * Calculates exact refund matching amount collected upfront.
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/utils/mailer.php';
require_once dirname(__DIR__) . '/auth/middleware.php';
require_once dirname(__DIR__) . '/config/database.php';


handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ApiResponse::error('Method not allowed. Use POST.', 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

$orderNumber = trim($input['order_number'] ?? '');
$reason      = trim($input['reason'] ?? 'Customer requested cancellation prior to dispatch');
$contact     = trim($input['contact'] ?? ($input['email_or_phone'] ?? ''));

if (empty($orderNumber)) {
    ApiResponse::error('Order number is required for cancellation', 422);
}

try {
    $pdo = Database::getConnection();
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("SELECT * FROM orders WHERE order_number = ? FOR UPDATE");
    $stmt->execute([$orderNumber]);
    $order = $stmt->fetch();

    if (!$order) {
        $pdo->rollBack();
        ApiResponse::error('Order not found', 404);
    }

    // Auth or contact validation
    $authUser = AuthMiddleware::getOptionalAuth();
    if ($authUser) {
        // Authenticated customer or admin
        $isOwner = ((int)$order['user_id'] === (int)$authUser['id']) || 
                   (strtolower($order['customer_email']) === strtolower($authUser['email']));
        $isAdmin = in_array($authUser['role'], ['admin', 'staff'], true);

        if (!$isOwner && !$isAdmin) {
            $pdo->rollBack();
            ApiResponse::error('You do not have permission to cancel this order', 403);
        }
    } elseif (!empty($contact)) {
        // Guest contact check
        $cleanContact = strtolower(preg_replace('/[^a-zA-Z0-9@.]/', '', $contact));
        $orderEmail   = strtolower(trim($order['customer_email']));
        $orderPhone   = preg_replace('/[^0-9]/', '', $order['customer_phone']);

        $match = (str_contains($orderEmail, $cleanContact)) || 
                 (str_contains($orderPhone, $cleanContact)) || 
                 (str_contains($cleanContact, substr($orderPhone, -6)));

        if (!$match) {
            $pdo->rollBack();
            ApiResponse::error('The contact information provided does not match the order records', 403);
        }
    }

    // CRITICAL ACCEPTANCE CRITERIA: Pre-shipping verification only
    $currentStatus = $order['order_status'];

    if ($currentStatus === 'cancelled') {
        $pdo->rollBack();
        ApiResponse::error('This order has already been cancelled', 400);
    }

    if (in_array($currentStatus, ['shipped', 'out_for_delivery', 'delivered'], true)) {
        $pdo->rollBack();
        ApiResponse::error(
            'This shipment has already been handed over to the courier partner and cannot be cancelled self-service. Please initiate a return upon delivery via our returns portal.', 
            400
        );
    }

    // Compute exact refund matching upfront payment
    $paidUpfront   = (float)$order['amount_paid_upfront'];
    $refundAmount  = round($paidUpfront, 2);
    $newPaymentStatus = ($refundAmount > 0) ? 'refunded' : $order['payment_status'];

    // Update order
    $upStmt = $pdo->prepare("
        UPDATE orders 
        SET order_status        = 'cancelled',
            payment_status      = :payment_status,
            refund_amount       = :refund_amount,
            cancelled_at        = NOW(),
            cancellation_reason = :reason,
            updated_at          = NOW()
        WHERE id = :id
    ");
    $upStmt->execute([
        ':payment_status' => $newPaymentStatus,
        ':refund_amount'  => $refundAmount,
        ':reason'         => $reason,
        ':id'             => $order['id'],
    ]);

    // Record tracking milestone
    $evDesc = $refundAmount > 0
        ? "Order cancelled by customer. A full refund of ₹" . number_format($refundAmount, 2) . " has been scheduled to the original payment source (3-5 banking days)."
        : "Cash on Delivery order cancelled by customer. No upfront payment was collected.";

    $evStmt = $pdo->prepare("
        INSERT INTO order_tracking_events (order_id, status, title, description, location, occurred_at)
        VALUES (:order_id, 'cancelled', 'Order Cancelled by Customer', :desc, 'Valerie Support Atelier', NOW())
    ");
    $evStmt->execute([
        ':order_id' => $order['id'],
        ':desc'     => $evDesc,
    ]);

    // If an admin performed this, log it in admin_activity_log
    if ($authUser && in_array($authUser['role'], ['admin', 'staff'], true)) {
        $logStmt = $pdo->prepare("
            INSERT INTO admin_activity_log (admin_id, action, target_entity, target_id, details, ip_address, created_at)
            VALUES (:admin_id, 'cancel_order', 'orders', :order_id, :details, :ip, NOW())
        ");
        $logStmt->execute([
            ':admin_id' => (int)$authUser['id'],
            ':order_id' => (string)$order['id'],
            ':details'  => json_encode([
                'order_number'  => $order['order_number'],
                'reason'        => $reason,
                'refund_amount' => $refundAmount,
            ]),
            ':ip'       => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
        ]);
    }

    $pdo->commit();

    // Phase 7: Send idempotent order cancellation & refund email
    try {
        MailerService::sendOrderCancelled((int)$order['id']);
    } catch (Throwable $e) {
        // Log silently
    }

    ApiResponse::success([

        'order_id'       => (int)$order['id'],
        'order_number'   => $order['order_number'],
        'order_status'   => 'cancelled',
        'payment_status' => $newPaymentStatus,
        'refund_amount'  => $refundAmount,
        'refund_message' => $refundAmount > 0
            ? "Your refund of ₹" . number_format($refundAmount, 2) . " will be credited within 3-5 business days."
            : "Order successfully cancelled.",
    ], 'Order successfully cancelled');

} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    ApiResponse::error('Order cancellation failed: ' . $e->getMessage(), 500);
}
