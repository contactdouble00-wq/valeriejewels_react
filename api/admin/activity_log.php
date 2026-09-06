<?php
/**
 * VALERIE JEWELS — Admin Activity Log Endpoint
 * Audit trail of all administrative actions for transparency and security compliance.
 */

require_once dirname(__DIR__) . '/utils/admin_auth.php';

$adminUser = AdminAuth::authenticate(['admin', 'staff']);
$pdo = Database::getConnection();

$limit = isset($_GET['limit']) ? min((int)$_GET['limit'], 100) : 40;

$stmt = $pdo->prepare("
    SELECT 
        l.*,
        u.name AS admin_name,
        u.email AS admin_email,
        u.role AS admin_role
    FROM admin_activity_log l
    LEFT JOIN users u ON l.admin_id = u.id
    ORDER BY l.id DESC
    LIMIT ?
");
$stmt->bindValue(1, $limit, PDO::PARAM_INT);
$stmt->execute();
$logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

ApiResponse::success($logs, 'Activity logs retrieved successfully');
