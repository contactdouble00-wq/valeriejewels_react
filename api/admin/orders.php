<?php
/**
 * VALERIE JEWELS — Admin Orders Management & Cancellation/Refund Workflows
 * Supports order filtering, inspection, status override, and refund execution.
 * Restricts refund actions to 'admin' role only.
 */

require_once dirname(__DIR__) . '/utils/admin_auth.php';
require_once dirname(__DIR__) . '/utils/mailer.php';

$adminUser = AdminAuth::authenticate(['admin', 'staff']);
$pdo = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];

// Handle GET: List or Single Order
if ($method === 'GET') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if ($id > 0) {
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ?");
        $stmt->execute([$id]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            ApiResponse::error('Order not found', 404);
        }

        // Fetch items
        $itemStmt = $pdo->prepare("
            SELECT oi.*, p.slug, p.category_id,
                   (SELECT image_url FROM product_images WHERE product_id = oi.product_id AND is_primary = 1 LIMIT 1) AS primary_image,
                   CASE WHEN p.sku LIKE 'VJ-JHM%' OR p.category_id = (SELECT id FROM categories WHERE slug = 'jhumka-boxes' LIMIT 1) THEN 1 ELSE 0 END AS is_jhumka_box
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        ");
        $itemStmt->execute([$id]);
        $order['items'] = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch tracking events
        $trkStmt = $pdo->prepare("SELECT * FROM order_tracking_events WHERE order_id = ? ORDER BY event_time DESC");
        $trkStmt->execute([$id]);
        $order['tracking_events'] = $trkStmt->fetchAll(PDO::FETCH_ASSOC);

        ApiResponse::success($order, 'Order retrieved successfully');
    }

    // List with filters
    $search = trim($_GET['search'] ?? '');
    $status = trim($_GET['status'] ?? '');
    $paymentMethod = trim($_GET['payment_method'] ?? '');
    $riskTier = trim($_GET['risk_tier'] ?? '');
    $jhumkaOnly = !empty($_GET['jhumka_only']);

    $where = ["1=1"];
    $params = [];

    if ($search !== '') {
        $where[] = "(o.order_number LIKE ? OR o.customer_name LIKE ? OR o.customer_phone LIKE ? OR o.customer_email LIKE ? OR o.shiprocket_awb LIKE ?)";
        $term = "%{$search}%";
        $params = array_merge($params, [$term, $term, $term, $term, $term]);
    }

    if ($status !== '' && $status !== 'all') {
        $where[] = "o.order_status = ?";
        $params[] = $status;
    }

    if ($paymentMethod !== '' && $paymentMethod !== 'all') {
        $where[] = "o.payment_type = ?";
        $params[] = $paymentMethod;
    }

    if ($riskTier !== '' && $riskTier !== 'all') {
        $where[] = "o.fastrr_risk_tier = ?";
        $params[] = $riskTier;
    }

    if ($jhumkaOnly) {
        $where[] = "EXISTS (
            SELECT 1 FROM order_items oi 
            JOIN products p ON oi.product_id = p.id 
            WHERE oi.order_id = o.id AND (p.sku LIKE 'VJ-JHM%' OR p.category_id = (SELECT id FROM categories WHERE slug = 'jhumka-boxes' LIMIT 1))
        )";
    }

    $whereSql = implode(' AND ', $where);

    $stmt = $pdo->prepare("
        SELECT 
            o.*,
            (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS items_count,
            EXISTS (
                SELECT 1 FROM order_items oi 
                JOIN products p ON oi.product_id = p.id 
                WHERE oi.order_id = o.id AND (p.sku LIKE 'VJ-JHM%' OR p.category_id = (SELECT id FROM categories WHERE slug = 'jhumka-boxes' LIMIT 1))
            ) AS has_jhumka_box
        FROM orders o
        WHERE {$whereSql}
        ORDER BY o.id DESC
    ");
    $stmt->execute($params);
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    ApiResponse::success($orders, 'Orders retrieved successfully');
}

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
$action = $_GET['action'] ?? ($input['action'] ?? '');

// Handle Order Status Update (e.g. mark shipped, delivered, etc.)
if ($action === 'update_status') {
    $orderId = (int)($input['order_id'] ?? 0);
    $newStatus = trim($input['order_status'] ?? '');

    $allowedStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'rto'];
    if ($orderId <= 0 || !in_array($newStatus, $allowedStatuses, true)) {
        ApiResponse::error('Invalid order ID or status value', 422);
    }

    $origStmt = $pdo->prepare("SELECT * FROM orders WHERE id = ?");
    $origStmt->execute([$orderId]);
    $order = $origStmt->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
        ApiResponse::error('Order not found', 404);
    }

    $awbCode = trim($input['awb_code'] ?? ($order['shiprocket_awb'] ?? ''));
    $courier = trim($input['courier_partner'] ?? ($order['courier_name'] ?? 'Bluedart Express Air'));

    $updateSql = "UPDATE orders SET order_status = :status, shiprocket_awb = :awb, courier_name = :courier WHERE id = :id";
    $pdo->prepare($updateSql)->execute([
        ':status'  => $newStatus,
        ':awb'     => $awbCode ?: null,
        ':courier' => $courier ?: null,
        ':id'      => $orderId,
    ]);

    // Insert tracking event
    $eventStmt = $pdo->prepare("
        INSERT INTO order_tracking_events (order_id, status_milestone, title, description, location, courier_partner, awb_code)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $eventStmt->execute([
        $orderId,
        $newStatus,
        ucfirst($newStatus) . ' by Admin Concierge',
        'Order status manual update via administrative panel by ' . $adminUser['name'],
        'Mumbai Central Hub',
        $courier,
        $awbCode ?: null,
    ]);

    // Trigger Phase 7 Email if marked Shipped
    if ($newStatus === 'shipped') {
        try {
            MailerService::sendOrderShipped($orderId);
        } catch (Throwable $e) {
            error_log('Mailer error: ' . $e->getMessage());
        }
    }

    AdminAuth::logActivity($adminUser['id'], 'update_order_status', 'order', $orderId, [
        'old_status' => $order['order_status'],
        'new_status' => $newStatus,
        'awb'        => $awbCode,
    ]);

    ApiResponse::success(['order_id' => $orderId, 'status' => $newStatus], 'Order status updated successfully');
}

// Handle Cancel & Refund
if ($action === 'cancel_refund') {
    // CRITICAL SECURITY RULE: Staff cannot issue refunds or cancellations!
    if ($adminUser['role'] !== 'admin') {
        ApiResponse::error('Permission Denied: Only administrators can execute order cancellations and refunds.', 403);
    }

    $orderId = (int)($input['order_id'] ?? 0);
    $reason = trim($input['cancellation_reason'] ?? '');

    if ($orderId <= 0 || empty($reason)) {
        ApiResponse::error('Order ID and a detailed cancellation reason are required', 422);
    }

    $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ?");
    $stmt->execute([$orderId]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
        ApiResponse::error('Order not found', 404);
    }

    if ($order['order_status'] === 'cancelled') {
        ApiResponse::error('Order is already marked cancelled', 400);
    }

    // Calculate refund amount
    $refundAmount = 0.00;
    if ($order['payment_type'] === 'full_prepaid') {
        $refundAmount = (float)$order['total_amount'];
    } elseif ($order['payment_type'] === 'partial') {
        $refundAmount = (float)$order['amount_paid_upfront'];
    }

    $pdo->beginTransaction();
    try {
        $upd = $pdo->prepare("
            UPDATE orders SET 
                order_status = 'cancelled',
                payment_status = CASE WHEN :ref > 0 THEN 'refunded' ELSE payment_status END,
                cancellation_reason = :reason,
                refund_amount = :ref_amt,
                cancelled_at = NOW()
            WHERE id = :id
        ");
        $upd->execute([
            ':ref'     => $refundAmount,
            ':reason'  => $reason,
            ':ref_amt' => $refundAmount,
            ':id'      => $orderId,
        ]);

        // Restock inventory
        $itemsStmt = $pdo->prepare("SELECT product_id, quantity FROM order_items WHERE order_id = ?");
        $itemsStmt->execute([$orderId]);
        $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

        $restockStmt = $pdo->prepare("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?");
        foreach ($items as $item) {
            $restockStmt->execute([(int)$item['quantity'], (int)$item['product_id']]);
        }

        // Add tracking milestone
        $trkStmt = $pdo->prepare("
            INSERT INTO order_tracking_events (order_id, status_milestone, title, description, location)
            VALUES (?, 'cancelled', 'Order Cancelled & Refund Initiated', ?, 'Mumbai Admin Hub')
        ");
        $trkStmt->execute([
            $orderId,
            "Admin cancellation: {$reason}. ₹{$refundAmount} initiated for refund.",
        ]);

        AdminAuth::logActivity($adminUser['id'], 'admin_cancel_refund', 'order', $orderId, [
            'refund_amount' => $refundAmount,
            'reason'        => $reason,
        ]);

        $pdo->commit();

        // Trigger Phase 7 Cancellation Email
        try {
            MailerService::sendOrderCancelled($orderId);
        } catch (Throwable $e) {
            error_log('Mailer error: ' . $e->getMessage());
        }

        ApiResponse::success([
            'order_id'      => $orderId,
            'refund_amount' => $refundAmount,
            'order_status'  => 'cancelled',
        ], "Order cancelled successfully. ₹{$refundAmount} refund processed.");

    } catch (Throwable $e) {
        $pdo->rollBack();
        ApiResponse::error('Failed to process cancellation & refund: ' . $e->getMessage(), 500);
    }
}

ApiResponse::error('Invalid request action or method', 400);
