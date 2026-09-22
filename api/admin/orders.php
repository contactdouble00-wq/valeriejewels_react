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

try {
// Handle GET: List, Single Order, or Email Template Preview
if ($method === 'GET') {
    $action = $_GET['action'] ?? '';

    // Action: Preview Email Template Formats
    if ($action === 'preview_email') {
        $templateType = trim($_GET['type'] ?? 'order_confirmation');
        $format = $_GET['format'] ?? 'json';

        $appConfig = require dirname(__DIR__) . '/config/config.php';
        $storeUrl = $appConfig['app']['url'] ?? 'http://localhost:5173';

        // Sample luxury order data
        $order = [
            'id' => 101,
            'order_number' => 'VJ-2026-8942',
            'customer_name' => 'Aarav Singhania',
            'customer_email' => 'aarav.singhania@example.com',
            'customer_phone' => '98201 23456',
            'shipping_address_line1' => 'Flat 14B, Oberoi Sky Heights, Lokhandwala Complex',
            'shipping_address_line2' => 'Andheri West',
            'city' => 'Mumbai',
            'state' => 'Maharashtra',
            'pincode' => '400053',
            'payment_type' => 'full_prepaid',
            'payment_status' => 'paid',
            'order_status' => $_GET['status'] ?? 'confirmed',
            'subtotal' => 2498.00,
            'discount_amount' => 200.00,
            'shipping_fee' => 0.00,
            'total_amount' => 2298.00,
            'amount_paid_upfront' => 2298.00,
            'amount_due_on_delivery' => 0.00,
            'shiprocket_awb' => 'BLUEDART-882190471',
            'courier_name' => 'Bluedart Air Express',
            'tracking_url' => $storeUrl . '/#track-order?order=VJ-2026-8942',
            'estimated_delivery_date' => date('Y-m-d', strtotime('+4 days')),
            'cancellation_reason' => 'Customer requested pre-dispatch cancellation',
            'refund_amount' => 2298.00,
            'created_at' => date('Y-m-d H:i:s'),
        ];

        $items = [
            [
                'id' => 1,
                'product_name' => '18K Gold Plated Emerald Clover Necklace',
                'variant_title' => 'Anti-Tarnish 316L Stainless Steel',
                'quantity' => 1,
                'unit_price' => 1299.00,
                'total_price' => 1299.00,
                'primary_image' => 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=300&q=80',
            ],
            [
                'id' => 2,
                'product_name' => 'Signature Festive 4-Box Jhumka Set',
                'variant_title' => 'Set of 4 Pairs / Traditional Micro-Polish',
                'quantity' => 1,
                'unit_price' => 1199.00,
                'total_price' => 1199.00,
                'primary_image' => 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=300&q=80',
            ]
        ];

        $reason = $_GET['reason'] ?? 'Standard concierge verification & address validation';
        $customMessage = $_GET['custom_message'] ?? 'We have prepared your handcrafted pieces with signature anti-tarnish micro-polishing and added our complimentary velvet pouch. Enjoy your Valerie jewelry!';
        $status = $_GET['status'] ?? 'shipped';

        ob_start();
        switch ($templateType) {
            case 'order_failed':
                $subject = "Payment Incomplete for {$order['order_number']} — Your Pieces Are Safe — Valerie Jewels";
                require dirname(__DIR__) . '/templates/emails/order_failed.php';
                break;
            case 'order_on_hold':
                $subject = "Order {$order['order_number']} Temporarily On Hold — Valerie Jewels Concierge";
                require dirname(__DIR__) . '/templates/emails/order_on_hold.php';
                break;
            case 'order_status_update':
                $statusTitle = ucwords(str_replace('_', ' ', $status));
                $subject = "Order Status Update: {$statusTitle} ({$order['order_number']}) — Valerie Jewels";
                require dirname(__DIR__) . '/templates/emails/order_status_update.php';
                break;
            case 'order_shipped':
                $subject = "Your Piece Has Shipped: {$order['order_number']} (AWB: {$order['shiprocket_awb']}) — Valerie Jewels";
                require dirname(__DIR__) . '/templates/emails/order_shipped.php';
                break;
            case 'order_cancelled':
                $subject = "Order Cancelled: {$order['order_number']} — Valerie Jewels";
                require dirname(__DIR__) . '/templates/emails/order_cancelled.php';
                break;
            case 'order_confirmation':
            default:
                $templateType = 'order_confirmation';
                $subject = "Order Confirmed: {$order['order_number']} — Valerie Jewels";
                require dirname(__DIR__) . '/templates/emails/order_confirmation.php';
                break;
        }
        $renderedHtml = ob_get_clean();

        if ($format === 'html') {
            header('Content-Type: text/html; charset=UTF-8');
            echo $renderedHtml;
            exit;
        }

        ApiResponse::success([
            'template_type' => $templateType,
            'subject'       => $subject,
            'html'          => $renderedHtml,
            'sample_order'  => $order,
        ], 'Email template preview generated successfully');
    }

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
            SELECT oi.*, p.slug, p.category_id, p.sku,
                   COALESCE(
                       (SELECT image_url FROM product_images WHERE product_id = oi.product_id AND is_primary = 1 LIMIT 1),
                       (SELECT image_url FROM product_images WHERE product_id = oi.product_id ORDER BY display_order ASC, id ASC LIMIT 1)
                   ) AS primary_image,
                   CASE WHEN p.sku LIKE 'VJ-JHM%' OR p.category_id = (SELECT id FROM categories WHERE slug = 'jhumka-boxes' LIMIT 1) THEN 1 ELSE 0 END AS is_jhumka_box
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        ");
        $itemStmt->execute([$id]);
        $order['items'] = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch tracking events safely (ordered by latest event)
        try {
            $trkStmt = $pdo->prepare("SELECT * FROM order_tracking_events WHERE order_id = ? ORDER BY id DESC");
            $trkStmt->execute([$id]);
            $order['tracking_events'] = $trkStmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Throwable $e) {
            $order['tracking_events'] = [];
        }

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
            (SELECT oi.product_name FROM order_items oi WHERE oi.order_id = o.id ORDER BY oi.id ASC LIMIT 1) AS first_item_name,
            (SELECT p.sku FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id ORDER BY oi.id ASC LIMIT 1) AS first_item_sku,
            (SELECT p.slug FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id ORDER BY oi.id ASC LIMIT 1) AS first_item_slug,
            (SELECT COALESCE(
                (SELECT image_url FROM product_images WHERE product_id = oi.product_id AND is_primary = 1 LIMIT 1),
                (SELECT image_url FROM product_images WHERE product_id = oi.product_id ORDER BY display_order ASC, id ASC LIMIT 1)
            ) FROM order_items oi WHERE oi.order_id = o.id ORDER BY oi.id ASC LIMIT 1) AS first_item_image,
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

    $allowedStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'on_hold', 'failed', 'cancelled', 'rto'];
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
    $customMessage = trim($input['custom_message'] ?? '');

    $updateSql = "UPDATE orders SET order_status = :status, shiprocket_awb = :awb, courier_name = :courier WHERE id = :id";
    $pdo->prepare($updateSql)->execute([
        ':status'  => $newStatus,
        ':awb'     => $awbCode ?: null,
        ':courier' => $courier ?: null,
        ':id'      => $orderId,
    ]);

    // Insert tracking event (resilient across schema variations)
    $eventDesc = !empty($customMessage) 
        ? $customMessage 
        : 'Order status manual update via administrative panel by ' . $adminUser['name'];
        
    try {
        $eventStmt = $pdo->prepare("
            INSERT INTO order_tracking_events (order_id, status, status_milestone, title, description, location, courier_partner, awb_code, occurred_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $eventStmt->execute([
            $orderId,
            $newStatus,
            $newStatus,
            ucwords(str_replace('_', ' ', $newStatus)) . ' by Admin Concierge',
            $eventDesc,
            'Mumbai Central Hub',
            $courier,
            $awbCode ?: null,
            date('Y-m-d H:i:s'),
        ]);
    } catch (Throwable $trkErr) {
        try {
            $eventStmt = $pdo->prepare("
                INSERT INTO order_tracking_events (order_id, status, title, description, location, occurred_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $eventStmt->execute([
                $orderId,
                $newStatus,
                ucwords(str_replace('_', ' ', $newStatus)) . ' by Admin Concierge',
                $eventDesc,
                'Mumbai Central Hub',
                date('Y-m-d H:i:s'),
            ]);
        } catch (Throwable $fallbackErr) {
            error_log('Tracking event insertion warning: ' . $fallbackErr->getMessage());
        }
    }

    // Send corresponding customer notification email based on new status
    $emailSendResult = null;
    $shouldNotify = !isset($input['notify_customer']) || (bool)$input['notify_customer'];
    if ($shouldNotify) {
        try {
            switch ($newStatus) {
                case 'confirmed':
                    $emailSendResult = MailerService::sendOrderConfirmation($orderId, true);
                    break;
                case 'shipped':
                    $emailSendResult = MailerService::sendOrderShipped($orderId, true);
                    break;
                case 'on_hold':
                    $emailSendResult = MailerService::sendOrderOnHold($orderId, $customMessage ?: null, true);
                    break;
                case 'failed':
                    $emailSendResult = MailerService::sendOrderFailed($orderId, $customMessage ?: null, true);
                    break;
                case 'cancelled':
                    $emailSendResult = MailerService::sendOrderCancelled($orderId, true);
                    break;
                default:
                    $emailSendResult = MailerService::sendStatusUpdate($orderId, $newStatus, $customMessage ?: null, true);
                    break;
            }
        } catch (Throwable $e) {
            error_log('Mailer status update error: ' . $e->getMessage());
        }
    }

    AdminAuth::logActivity($adminUser['id'], 'update_order_status', 'order', $orderId, [
        'old_status' => $order['order_status'],
        'new_status' => $newStatus,
        'awb'        => $awbCode,
        'email_sent' => $emailSendResult['status'] ?? 'none',
    ]);

    ApiResponse::success([
        'order_id'   => $orderId, 
        'status'     => $newStatus,
        'email_info' => $emailSendResult
    ], 'Order status updated successfully');
}

// Handle Dedicated Manual Send Customer Email
if ($action === 'send_customer_email') {
    $orderId = (int)($input['order_id'] ?? 0);
    $emailType = trim($input['email_type'] ?? 'order_status_update');
    $customMessage = trim($input['custom_message'] ?? '');
    $reason = trim($input['reason'] ?? '');
    $force = true;

    if ($orderId <= 0) {
        ApiResponse::error('Order ID is required', 422);
    }

    $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ?");
    $stmt->execute([$orderId]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
        ApiResponse::error('Order not found', 404);
    }

    try {
        switch ($emailType) {
            case 'order_confirmation':
                $result = MailerService::sendOrderConfirmation($orderId, $force);
                break;
            case 'order_failed':
                $result = MailerService::sendOrderFailed($orderId, $reason ?: null, $force);
                break;
            case 'order_on_hold':
                $result = MailerService::sendOrderOnHold($orderId, $reason ?: null, $force);
                break;
            case 'order_shipped':
                $result = MailerService::sendOrderShipped($orderId, $force);
                break;
            case 'order_cancelled':
                $result = MailerService::sendOrderCancelled($orderId, $force);
                break;
            case 'order_status_update':
            default:
                $targetStatus = !empty($input['status']) ? trim($input['status']) : $order['order_status'];
                $result = MailerService::sendStatusUpdate($orderId, $targetStatus, $customMessage ?: null, $force);
                break;
        }

        AdminAuth::logActivity($adminUser['id'], 'send_customer_email', 'order', $orderId, [
            'email_type' => $emailType,
            'result'     => $result['status'] ?? 'unknown',
            'recipient'  => $order['customer_email'],
        ]);

        ApiResponse::success($result, "Email dispatch processed successfully ({$emailType})");
    } catch (Throwable $e) {
        ApiResponse::error('Failed to dispatch email: ' . $e->getMessage(), 500);
    }
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
        $now = date('Y-m-d H:i:s');
        $upd = $pdo->prepare("
            UPDATE orders SET 
                order_status = 'cancelled',
                payment_status = CASE WHEN :ref > 0 THEN 'refunded' ELSE payment_status END,
                cancellation_reason = :reason,
                refund_amount = :ref_amt,
                cancelled_at = :cancelled_at
            WHERE id = :id
        ");
        $upd->execute([
            ':ref'          => $refundAmount,
            ':reason'       => $reason,
            ':ref_amt'      => $refundAmount,
            ':cancelled_at' => $now,
            ':id'           => $orderId,
        ]);

        // Restock inventory
        $itemsStmt = $pdo->prepare("SELECT product_id, quantity FROM order_items WHERE order_id = ?");
        $itemsStmt->execute([$orderId]);
        $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

        $restockStmt = $pdo->prepare("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?");
        foreach ($items as $item) {
            $restockStmt->execute([(int)$item['quantity'], (int)$item['product_id']]);
        }

        // Add tracking milestone (compatible with MySQL and SQLite columns)
        try {
            $trkStmt = $pdo->prepare("
                INSERT INTO order_tracking_events (order_id, status, status_milestone, title, description, location, occurred_at)
                VALUES (?, 'cancelled', 'cancelled', 'Order Cancelled & Refund Initiated', ?, 'Mumbai Admin Hub', ?)
            ");
            $trkStmt->execute([
                $orderId,
                "Admin cancellation: {$reason}. ₹{$refundAmount} initiated for refund.",
                $now,
            ]);
        } catch (Throwable $te) {
            try {
                $trkStmt = $pdo->prepare("
                    INSERT INTO order_tracking_events (order_id, status, title, description, location, occurred_at)
                    VALUES (?, 'cancelled', 'Order Cancelled & Refund Initiated', ?, 'Mumbai Admin Hub', ?)
                ");
                $trkStmt->execute([
                    $orderId,
                    "Admin cancellation: {$reason}. ₹{$refundAmount} initiated for refund.",
                    $now,
                ]);
            } catch (Throwable $te2) {
                error_log('Tracking event insertion warning: ' . $te2->getMessage());
            }
        }

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

} catch (Throwable $e) {
    error_log('orders.php error: ' . $e->getMessage());
    ApiResponse::handleDatabaseException($e, 'Failed to process order request');
}
