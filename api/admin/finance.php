<?php
/**
 * VALERIE JEWELS — Admin Finance & Partner Ledgers Controller
 * Manages partner accounts (Yash, Dhruvik, Jeel), ledgers, marketing budget tracker,
 * settlements, audit trails, and Excel backups.
 */

require_once dirname(__DIR__) . '/utils/admin_auth.php';
require_once dirname(__DIR__) . '/utils/response.php';

$adminUser = AdminAuth::authenticate(['admin', 'staff']);
$pdo = Database::getConnection();
$driver = Database::getDriver();
$method = $_SERVER['REQUEST_METHOD'];

// Helper to format now timestamp
$nowSql = $driver === 'sqlite' ? "datetime('now', 'localtime')" : "NOW()";

define('FINANCE_SECURITY_PIN', '1785');

try {
    $action = $_GET['action'] ?? '';
    $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

    // -------------------------------------------------------------------------
    // PIN VERIFICATION ENDPOINT
    // -------------------------------------------------------------------------
    if ($action === 'verify_pin') {
        $pinToCheck = $input['pin'] ?? ($_POST['pin'] ?? ($_GET['pin'] ?? ''));
        if ((string)$pinToCheck === FINANCE_SECURITY_PIN) {
            ApiResponse::success([
                'verified' => true,
                'message'  => 'PIN verified successfully.'
            ], 'PIN verified successfully.');
        }
        ApiResponse::error('Incorrect PIN. Access denied to financial ledgers.', 403);
    }

    // Enforce 1785 PIN protection for all Finance API requests
    $providedPin = $_SERVER['HTTP_X_FINANCE_PIN'] ?? ($_GET['pin'] ?? ($_POST['pin'] ?? ($input['pin'] ?? '')));
    if ((string)$providedPin !== FINANCE_SECURITY_PIN) {
        ApiResponse::error('Security PIN 1785 required to access Finance & Partner Ledgers.', 403);
    }

    // -------------------------------------------------------------------------
    // 1. OVERVIEW & KPIS
    // -------------------------------------------------------------------------
    if ($action === 'overview' && $method === 'GET') {
        $month = trim($_GET['month'] ?? ''); // Optional: 'YYYY-MM' or 'all'

        // 1.1 Fetch Partners
        $partnersStmt = $pdo->query("SELECT * FROM finance_partners WHERE is_active = 1 ORDER BY id ASC");
        $partners = $partnersStmt->fetchAll(PDO::FETCH_ASSOC);

        $partnerStats = [];
        $totalBusinessExpense = 0;
        $totalPendingExpense = 0;

        foreach ($partners as $partner) {
            $pId = (int)$partner['id'];
            $whereDate = "";
            $params = [$pId];

            if ($month && $month !== 'all') {
                $whereDate = " AND strftime('%Y-%m', date) = ?";
                if ($driver !== 'sqlite') {
                    $whereDate = " AND DATE_FORMAT(date, '%Y-%m') = ?";
                }
                $params[] = $month;
            }

            // Calculations per partner
            // Exact Excel Match: Total Expense is the plain sum of all amounts, including negatives, whatever the status.
            $stmt = $pdo->prepare("
                SELECT 
                    COALESCE(SUM(amount), 0) AS total_expense,
                    COALESCE(SUM(CASE WHEN LOWER(status) = 'pending' THEN amount ELSE 0 END), 0) AS pending_expense,
                    COALESCE(SUM(CASE WHEN type = 'CONTRIBUTION' THEN amount ELSE 0 END), 0) AS total_contributions,
                    COALESCE(SUM(CASE WHEN type = 'REIMBURSEMENT' THEN amount ELSE 0 END), 0) AS total_reimbursements,
                    COALESCE(SUM(CASE WHEN type = 'TRANSFER_IN' THEN amount ELSE 0 END), 0) AS total_transfers_in,
                    COALESCE(SUM(CASE WHEN type = 'TRANSFER_OUT' THEN amount ELSE 0 END), 0) AS total_transfers_out,
                    COUNT(id) AS total_entries_count
                FROM finance_entries
                WHERE partner_id = ? AND deleted_at IS NULL {$whereDate}
            ");
            $stmt->execute($params);
            $calc = $stmt->fetch(PDO::FETCH_ASSOC);

            $exp = (float)$calc['total_expense'];
            $pend = (float)$calc['pending_expense'];
            $contrib = (float)$calc['total_contributions'];
            $reimb = (float)$calc['total_reimbursements'];
            $transIn = (float)$calc['total_transfers_in'];
            $transOut = (float)$calc['total_transfers_out'];

            // Net Position = (Contributions + Reimbursements + Transfers In) - (Expenses + Transfers Out)
            $netPosition = ($contrib + $reimb + $transIn) - ($exp + $transOut);

            $partnerStats[] = [
                'id'                  => $pId,
                'name'                => $partner['name'],
                'color'               => $partner['color'],
                'share_percent'       => (float)$partner['share_percent'],
                'total_expense'       => $exp,
                'pending_expense'     => $pend,
                'total_contributions' => $contrib,
                'total_reimbursements'=> $reimb,
                'total_transfers_in'  => $transIn,
                'total_transfers_out' => $transOut,
                'net_position'        => $netPosition,
                'entries_count'       => (int)$calc['total_entries_count'],
            ];

            $totalBusinessExpense += $exp;
            $totalPendingExpense += $pend;
        }

        // 1.2 Marketing Budget Summary
        $mktWhere = "";
        $mktParams = [];
        if ($month && $month !== 'all') {
            $mktWhere = $driver === 'sqlite' 
                ? " AND strftime('%Y-%m', date) = ?" 
                : " AND DATE_FORMAT(date, '%Y-%m') = ?";
            $mktParams[] = $month;
        }

        $mktStmt = $pdo->prepare("
            SELECT 
                COALESCE(SUM(budget_amount), 0) AS total_budget,
                COALESCE(SUM(charge_amount), 0) AS total_charges,
                COALESCE(SUM(total_cost), 0) AS total_marketing_spend,
                COALESCE(SUM(CASE WHEN charge_status = 'PENDING' THEN charge_amount ELSE 0 END), 0) AS pending_charges,
                COUNT(id) AS campaigns_count
            FROM finance_marketing_campaigns
            WHERE deleted_at IS NULL {$mktWhere}
        ");
        $mktStmt->execute($mktParams);
        $mktStats = $mktStmt->fetch(PDO::FETCH_ASSOC);

        // 1.3 Category Breakdown
        $catStmt = $pdo->query("
            SELECT 
                category,
                COALESCE(SUM(amount), 0) AS total_amount,
                COUNT(id) AS count
            FROM finance_entries
            WHERE deleted_at IS NULL AND type = 'EXPENSE'
            GROUP BY category
            ORDER BY total_amount DESC
        ");
        $categories = $catStmt->fetchAll(PDO::FETCH_ASSOC);

        // 1.4 Monthly Trend (Last 6 Months)
        $monthExpr = $driver === 'sqlite' ? "strftime('%Y-%m', date)" : "DATE_FORMAT(date, '%Y-%m')";
        $trendStmt = $pdo->query("
            SELECT 
                {$monthExpr} AS month_label,
                p.name AS partner_name,
                COALESCE(SUM(fe.amount), 0) AS expense_amount
            FROM finance_entries fe
            JOIN finance_partners p ON fe.partner_id = p.id
            WHERE fe.deleted_at IS NULL AND fe.type = 'EXPENSE' AND fe.status = 'PAID'
            GROUP BY month_label, p.name
            ORDER BY month_label ASC
        ");
        $trendRows = $trendStmt->fetchAll(PDO::FETCH_ASSOC);

        ApiResponse::success([
            'kpis' => [
                'business_total_expense' => $totalBusinessExpense,
                'business_pending'       => $totalPendingExpense,
                'total_marketing_spend'  => (float)$mktStats['total_marketing_spend'],
                'marketing_budget'       => (float)$mktStats['total_budget'],
                'marketing_charges'      => (float)$mktStats['total_charges'],
                'pending_mkt_charges'    => (float)$mktStats['pending_charges'],
                'campaigns_count'        => (int)$mktStats['campaigns_count'],
            ],
            'partners'     => $partnerStats,
            'categories'   => $categories,
            'monthly_trend'=> $trendRows,
        ], 'Finance overview loaded successfully');
    }

    // -------------------------------------------------------------------------
    // 2. PARTNER ENTRIES (LIST / FILTER)
    // -------------------------------------------------------------------------
    if ($action === 'entries' && $method === 'GET') {
        $partnerId = isset($_GET['partner_id']) ? (int)$_GET['partner_id'] : 0;
        $status = trim($_GET['status'] ?? '');
        $category = trim($_GET['category'] ?? '');
        $type = trim($_GET['type'] ?? '');
        $search = trim($_GET['search'] ?? '');
        $includeDeleted = !empty($_GET['include_deleted']) ? 1 : 0;

        $where = ["1=1"];
        $params = [];

        if (!$includeDeleted) {
            $where[] = "fe.deleted_at IS NULL";
        }

        if ($partnerId > 0) {
            $where[] = "fe.partner_id = ?";
            $params[] = $partnerId;
        }

        if ($status !== '' && $status !== 'all') {
            $where[] = "fe.status = ?";
            $params[] = strtoupper($status);
        }

        if ($category !== '' && $category !== 'all') {
            $where[] = "fe.category = ?";
            $params[] = $category;
        }

        if ($type !== '' && $type !== 'all') {
            $where[] = "fe.type = ?";
            $params[] = strtoupper($type);
        }

        if ($search !== '') {
            $where[] = "(fe.description LIKE ? OR fe.notes LIKE ?)";
            $term = "%{$search}%";
            $params[] = $term;
            $params[] = $term;
        }

        $whereSql = implode(' AND ', $where);

        $sort = $_GET['sort_by'] ?? 'id';
        $order = strtolower($_GET['sort_order'] ?? 'asc') === 'desc' ? 'DESC' : 'ASC';
        $validSorts = [
            'id' => 'fe.id',
            'date' => 'fe.date',
            'amount' => 'fe.amount',
            'description' => 'fe.description',
            'status' => 'fe.status',
            'category' => 'fe.category',
        ];
        $sortCol = $validSorts[$sort] ?? 'fe.id';

        $stmt = $pdo->prepare("
            SELECT 
                fe.*,
                p.name AS partner_name,
                p.color AS partner_color,
                cp.name AS counterparty_name
            FROM finance_entries fe
            JOIN finance_partners p ON fe.partner_id = p.id
            LEFT JOIN finance_partners cp ON fe.counterparty_partner_id = cp.id
            WHERE {$whereSql}
            ORDER BY {$sortCol} {$order}
        ");
        $stmt->execute($params);
        $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Also fetch partners metadata for UI selectors
        $partners = $pdo->query("SELECT * FROM finance_partners WHERE is_active = 1 ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);

        ApiResponse::success([
            'entries'  => $entries,
            'partners' => $partners,
        ], 'Ledger entries retrieved successfully');
    }

    // -------------------------------------------------------------------------
    // 3. CREATE ENTRY (FAST QUICK-ADD)
    // -------------------------------------------------------------------------
    if (($action === 'create_entry' || ($action === '' && $method === 'POST')) && $method === 'POST') {
        $partnerId = (int)($input['partner_id'] ?? 0);
        $date = isset($input['date']) ? trim($input['date']) : '';
        $description = trim($input['description'] ?? '');
        $amount = (float)($input['amount'] ?? 0);
        $type = strtoupper(trim($input['type'] ?? 'EXPENSE'));
        $status = isset($input['status']) ? trim($input['status']) : '';
        $category = trim($input['category'] ?? '');
        $counterpartyId = !empty($input['counterparty_partner_id']) ? (int)$input['counterparty_partner_id'] : null;
        $notes = trim($input['notes'] ?? '');

        if ($partnerId <= 0) {
            ApiResponse::error('Please select a valid partner', 422);
        }
        if ($description === '') {
            ApiResponse::error('Description is required', 422);
        }
        if (!isset($input['amount']) || !is_numeric($input['amount'])) {
            ApiResponse::error('Valid amount is required', 422);
        }

        // Validate type
        $validTypes = ['EXPENSE', 'CONTRIBUTION', 'REIMBURSEMENT', 'TRANSFER_OUT', 'TRANSFER_IN'];
        if (!in_array($type, $validTypes, true)) {
            $type = 'EXPENSE';
        }
        // Normalize status if provided, allow empty if empty
        if ($status !== '') {
            $statusLower = strtolower($status);
            if ($statusLower === 'paid') $status = 'paid';
            elseif ($statusLower === 'received') $status = 'received';
            elseif ($statusLower === 'pending') $status = 'pending';
        }

        // When status is 'received', it represents reimbursement/incoming funds and decreases partner total expense
        if (strtolower($status) === 'received') {
            $amount = -abs($amount);
            $type = 'REIMBURSEMENT';
        }

        // Auto-category suggestion if left default or blank
        if (empty($category) || $category === 'Other') {
            $descLower = strtolower($description);
            if (strpos($descLower, 'shiprocket') !== false || strpos($descLower, 'courier') !== false) {
                $category = 'Shiprocket';
            } elseif (strpos($descLower, 'meta') !== false || strpos($descLower, 'ad') !== false || strpos($descLower, 'marketing') !== false || strpos($descLower, 'campaign') !== false) {
                $category = 'Marketing';
            } elseif (strpos($descLower, 'influencer') !== false || strpos($descLower, 'reel') !== false || strpos($descLower, 'creator') !== false) {
                $category = 'Influencer';
            } elseif (strpos($descLower, 'packaging') !== false || strpos($descLower, 'pouch') !== false || strpos($descLower, 'honeycomb') !== false || strpos($descLower, 'honey comb') !== false || strpos($descLower, 'box') !== false) {
                $category = 'Packaging';
            } elseif (strpos($descLower, 'hostinger') !== false || strpos($descLower, 'domain') !== false || strpos($descLower, 'server') !== false) {
                $category = 'Hosting';
            } elseif (strpos($descLower, 'trademark') !== false || strpos($descLower, 'legal') !== false || strpos($descLower, 'ip') !== false) {
                $category = 'Legal/Trademark';
            } elseif (strpos($descLower, 'order') !== false) {
                $category = 'Order Cost';
            } else {
                $category = 'Other';
            }
        }

        $stmt = $pdo->prepare("
            INSERT INTO finance_entries (
                partner_id, date, description, amount, type, status, category,
                counterparty_partner_id, notes, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $partnerId, $date, $description, $amount, $type, $status, $category,
            $counterpartyId, $notes, $adminUser['id']
        ]);
        $entryId = (int)$pdo->lastInsertId();

        // Audit Log
        try {
            $audit = $pdo->prepare("INSERT INTO finance_audit_log (user_id, entity_type, entity_id, action, new_values, ip_address) VALUES (?, ?, ?, ?, ?, ?)");
            $audit->execute([
                $adminUser['id'], 'finance_entry', $entryId, 'CREATE',
                json_encode(['partner_id' => $partnerId, 'description' => $description, 'amount' => $amount, 'type' => $type, 'status' => $status]),
                $_SERVER['REMOTE_ADDR'] ?? null
            ]);
        } catch (Throwable $ae) {}

        // Fetch inserted row with partner metadata
        $getStmt = $pdo->prepare("
            SELECT fe.*, p.name AS partner_name, p.color AS partner_color, cp.name AS counterparty_name
            FROM finance_entries fe
            JOIN finance_partners p ON fe.partner_id = p.id
            LEFT JOIN finance_partners cp ON fe.counterparty_partner_id = cp.id
            WHERE fe.id = ?
        ");
        $getStmt->execute([$entryId]);
        $newEntry = $getStmt->fetch(PDO::FETCH_ASSOC);

        ApiResponse::success($newEntry, 'Entry added successfully');
    }

    // -------------------------------------------------------------------------
    // 4. UPDATE ENTRY (INLINE EDITING)
    // -------------------------------------------------------------------------
    if (($action === 'update_entry' || $method === 'PUT') && ($method === 'POST' || $method === 'PUT')) {
        $entryId = (int)($input['id'] ?? 0);
        if ($entryId <= 0) {
            ApiResponse::error('Valid entry ID required', 422);
        }

        // Get existing entry for audit log
        $oldStmt = $pdo->prepare("SELECT * FROM finance_entries WHERE id = ?");
        $oldStmt->execute([$entryId]);
        $oldEntry = $oldStmt->fetch(PDO::FETCH_ASSOC);
        if (!$oldEntry) {
            ApiResponse::error('Entry not found', 404);
        }

        $fields = [];
        $params = [];

        if (array_key_exists('date', $input)) {
            $fields[] = "date = ?";
            $params[] = trim($input['date'] ?? '');
        }
        if (isset($input['description'])) {
            $desc = trim($input['description']);
            if ($desc === '') ApiResponse::error('Description cannot be empty', 422);
            $fields[] = "description = ?";
            $params[] = $desc;
        }
        if (isset($input['amount'])) {
            if (!is_numeric($input['amount'])) ApiResponse::error('Valid amount is required', 422);
            $amt = (float)$input['amount'];
            $fields[] = "amount = ?";
            $params[] = $amt;
        }
        if (array_key_exists('type', $input)) {
            $fields[] = "type = ?";
            $params[] = strtoupper(trim($input['type'] ?? 'EXPENSE'));
        }
        if (array_key_exists('status', $input)) {
            $fields[] = "status = ?";
            $statusVal = trim($input['status'] ?? '');
            if ($statusVal !== '') {
                $statusLower = strtolower($statusVal);
                if ($statusLower === 'paid') $statusVal = 'paid';
                elseif ($statusLower === 'received') $statusVal = 'received';
                elseif ($statusLower === 'pending') $statusVal = 'pending';
            }
            $params[] = $statusVal;
        }
        if (isset($input['category'])) {
            $fields[] = "category = ?";
            $params[] = trim($input['category']);
        }
        if (isset($input['counterparty_partner_id'])) {
            $fields[] = "counterparty_partner_id = ?";
            $params[] = !empty($input['counterparty_partner_id']) ? (int)$input['counterparty_partner_id'] : null;
        }
        if (isset($input['notes'])) {
            $fields[] = "notes = ?";
            $params[] = trim($input['notes']);
        }

        // Received status handling: incoming funds / deductions MUST decrease partner total
        $effectiveStatus = array_key_exists('status', $input) ? trim($input['status'] ?? '') : ($oldEntry['status'] ?? '');
        $isReceived = strtolower($effectiveStatus) === 'received';
        $wasReceived = strtolower($oldEntry['status'] ?? '') === 'received';

        if ($isReceived) {
            // Force negative amount and REIMBURSEMENT type
            if (isset($input['amount']) && is_numeric($input['amount'])) {
                $negAmt = -abs((float)$input['amount']);
                $amtFound = false;
                foreach ($fields as $idx => $f) {
                    if (strpos($f, 'amount =') === 0) {
                        $params[$idx] = $negAmt;
                        $amtFound = true;
                        break;
                    }
                }
                if (!$amtFound) {
                    $fields[] = "amount = ?";
                    $params[] = $negAmt;
                }
            } else {
                $fields[] = "amount = -ABS(amount)";
            }

            $typeFound = false;
            foreach ($fields as $idx => $f) {
                if (strpos($f, 'type =') === 0) {
                    $params[$idx] = 'REIMBURSEMENT';
                    $typeFound = true;
                    break;
                }
            }
            if (!$typeFound) {
                $fields[] = "type = ?";
                $params[] = 'REIMBURSEMENT';
            }
        } elseif ($wasReceived && !$isReceived) {
            // Status changed from received to paid/pending: restore positive amount
            if (!isset($input['amount']) && (float)$oldEntry['amount'] < 0) {
                $fields[] = "amount = ABS(amount)";
            }
            if (!array_key_exists('type', $input)) {
                $fields[] = "type = ?";
                $params[] = 'EXPENSE';
            }
        }

        if (empty($fields)) {
            ApiResponse::error('No fields provided to update', 422);
        }

        $fields[] = "updated_at = {$nowSql}";
        $params[] = $entryId;

        $updateSql = "UPDATE finance_entries SET " . implode(', ', $fields) . " WHERE id = ?";
        $upStmt = $pdo->prepare($updateSql);
        $upStmt->execute($params);

        // Audit Log
        try {
            $audit = $pdo->prepare("INSERT INTO finance_audit_log (user_id, entity_type, entity_id, action, old_values, new_values, ip_address) VALUES (?, ?, ?, ?, ?, ?)");
            $audit->execute([
                $adminUser['id'], 'finance_entry', $entryId, 'UPDATE',
                json_encode($oldEntry), json_encode($input), $_SERVER['REMOTE_ADDR'] ?? null
            ]);
        } catch (Throwable $ae) {}

        // Return updated row
        $getStmt = $pdo->prepare("
            SELECT fe.*, p.name AS partner_name, p.color AS partner_color, cp.name AS counterparty_name
            FROM finance_entries fe
            JOIN finance_partners p ON fe.partner_id = p.id
            LEFT JOIN finance_partners cp ON fe.counterparty_partner_id = cp.id
            WHERE fe.id = ?
        ");
        $getStmt->execute([$entryId]);
        $updatedEntry = $getStmt->fetch(PDO::FETCH_ASSOC);

        ApiResponse::success($updatedEntry, 'Entry updated successfully');
    }

    // -------------------------------------------------------------------------
    // 5. DELETE ENTRY (SOFT DELETE WITH UNDO)
    // -------------------------------------------------------------------------
    if (($action === 'delete_entry' || $method === 'DELETE') && ($method === 'POST' || $method === 'DELETE')) {
        $entryId = (int)($input['id'] ?? ($_GET['id'] ?? 0));
        if ($entryId <= 0) {
            ApiResponse::error('Valid entry ID required', 422);
        }

        $oldStmt = $pdo->prepare("SELECT * FROM finance_entries WHERE id = ?");
        $oldStmt->execute([$entryId]);
        $oldEntry = $oldStmt->fetch(PDO::FETCH_ASSOC);
        if (!$oldEntry) {
            ApiResponse::error('Entry not found', 404);
        }

        $stmt = $pdo->prepare("UPDATE finance_entries SET deleted_at = {$nowSql} WHERE id = ?");
        $stmt->execute([$entryId]);

        // Audit Log
        try {
            $audit = $pdo->prepare("INSERT INTO finance_audit_log (user_id, entity_type, entity_id, action, old_values, ip_address) VALUES (?, ?, ?, ?, ?, ?)");
            $audit->execute([
                $adminUser['id'], 'finance_entry', $entryId, 'SOFT_DELETE',
                json_encode($oldEntry), $_SERVER['REMOTE_ADDR'] ?? null
            ]);
        } catch (Throwable $ae) {}

        ApiResponse::success(['id' => $entryId], 'Entry deleted. Undo is available for 8 seconds.');
    }

    // -------------------------------------------------------------------------
    // 6. RESTORE ENTRY (UNDO SOFT DELETE)
    // -------------------------------------------------------------------------
    if ($action === 'restore_entry' && $method === 'POST') {
        $entryId = (int)($input['id'] ?? 0);
        if ($entryId <= 0) {
            ApiResponse::error('Valid entry ID required', 422);
        }

        $stmt = $pdo->prepare("UPDATE finance_entries SET deleted_at = NULL WHERE id = ?");
        $stmt->execute([$entryId]);

        // Audit Log
        try {
            $audit = $pdo->prepare("INSERT INTO finance_audit_log (user_id, entity_type, entity_id, action, ip_address) VALUES (?, ?, ?, ?, ?)");
            $audit->execute([$adminUser['id'], 'finance_entry', $entryId, 'RESTORE', $_SERVER['REMOTE_ADDR'] ?? null]);
        } catch (Throwable $ae) {}

        ApiResponse::success(['id' => $entryId], 'Entry restored successfully');
    }

    // -------------------------------------------------------------------------
    // 6.1 DUPLICATE ENTRY
    // -------------------------------------------------------------------------
    if ($action === 'duplicate_entry' && $method === 'POST') {
        $id = (int)($input['id'] ?? 0);
        $stmt = $pdo->prepare("SELECT * FROM finance_entries WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) ApiResponse::error('Entry not found', 404);

        $ins = $pdo->prepare("
            INSERT INTO finance_entries (partner_id, date, description, amount, type, status, category, notes, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $ins->execute([
            $row['partner_id'],
            $row['date'],
            $row['description'] . ' (Copy)',
            $row['amount'],
            $row['type'],
            $row['status'],
            $row['category'],
            $row['notes'],
            $adminUser['id']
        ]);
        $newId = (int)$pdo->lastInsertId();
        $getStmt = $pdo->prepare("
            SELECT fe.*, p.name AS partner_name, p.color AS partner_color, cp.name AS counterparty_name
            FROM finance_entries fe
            JOIN finance_partners p ON fe.partner_id = p.id
            LEFT JOIN finance_partners cp ON fe.counterparty_partner_id = cp.id
            WHERE fe.id = ?
        ");
        $getStmt->execute([$newId]);
        ApiResponse::success($getStmt->fetch(PDO::FETCH_ASSOC), 'Entry duplicated successfully');
    }

    // -------------------------------------------------------------------------
    // 6.2 BULK ACTIONS (DELETE, STATUS, CATEGORY)
    // -------------------------------------------------------------------------
    if ($action === 'bulk_actions' && $method === 'POST') {
        $bulkAction = $input['action_type'] ?? '';
        $ids = $input['ids'] ?? [];
        if (!is_array($ids) || empty($ids)) {
            ApiResponse::error('No entry IDs selected', 422);
        }
        $inPlaceholders = implode(',', array_fill(0, count($ids), '?'));

        if ($bulkAction === 'delete') {
            $stmt = $pdo->prepare("UPDATE finance_entries SET deleted_at = {$nowSql} WHERE id IN ({$inPlaceholders})");
            $stmt->execute($ids);
            ApiResponse::success(['count' => count($ids)], count($ids) . ' entries deleted');
        } elseif ($bulkAction === 'update_status') {
            $newStatus = trim($input['status'] ?? 'PAID');
            $newStatusLower = strtolower($newStatus);
            if ($newStatusLower === 'received') {
                $stmt = $pdo->prepare("UPDATE finance_entries SET status = ?, amount = -ABS(amount), type = 'REIMBURSEMENT', updated_at = {$nowSql} WHERE id IN ({$inPlaceholders})");
                $stmt->execute(array_merge([$newStatus], $ids));
            } else {
                $stmt = $pdo->prepare("UPDATE finance_entries SET status = ?, amount = ABS(amount), type = 'EXPENSE', updated_at = {$nowSql} WHERE id IN ({$inPlaceholders})");
                $stmt->execute(array_merge([$newStatus], $ids));
            }
            ApiResponse::success(['count' => count($ids)], count($ids) . " entries marked as {$newStatus}");
        } elseif ($bulkAction === 'update_category') {
            $newCat = trim($input['category'] ?? 'Other');
            $stmt = $pdo->prepare("UPDATE finance_entries SET category = ?, updated_at = {$nowSql} WHERE id IN ({$inPlaceholders})");
            $stmt->execute(array_merge([$newCat], $ids));
            ApiResponse::success(['count' => count($ids)], count($ids) . " entries updated to {$newCat}");
        }
        ApiResponse::error('Invalid bulk action', 400);
    }

    // -------------------------------------------------------------------------
    // 6.3 UPDATE PARTNER (RENAME / RECOLOR / EQUITY SHARE)
    // -------------------------------------------------------------------------
    if ($action === 'update_partner' && $method === 'POST') {
        $pId = (int)($input['id'] ?? 0);
        $name = trim($input['name'] ?? '');
        $color = trim($input['color'] ?? '');
        $share = isset($input['share_percent']) ? (float)$input['share_percent'] : null;

        if ($pId <= 0 || $name === '') {
            ApiResponse::error('Valid partner ID and Name are required', 422);
        }

        $fields = ["name = ?"];
        $params = [$name];

        if ($color !== '') {
            $fields[] = "color = ?";
            $params[] = $color;
        }
        if ($share !== null) {
            $fields[] = "share_percent = ?";
            $params[] = $share;
        }
        $params[] = $pId;

        $stmt = $pdo->prepare("UPDATE finance_partners SET " . implode(', ', $fields) . " WHERE id = ?");
        $stmt->execute($params);

        $getStmt = $pdo->prepare("SELECT * FROM finance_partners WHERE id = ?");
        $getStmt->execute([$pId]);
        ApiResponse::success($getStmt->fetch(PDO::FETCH_ASSOC), 'Partner updated successfully');
    }

    // -------------------------------------------------------------------------
    // 7. MARKETING BUDGET TRACKER
    // -------------------------------------------------------------------------
    if ($action === 'marketing') {
        if ($method === 'GET') {
            $stmt = $pdo->query("
                SELECT fmc.*, fe.description AS ledger_description
                FROM finance_marketing_campaigns fmc
                LEFT JOIN finance_entries fe ON fmc.ledger_entry_id = fe.id
                WHERE fmc.deleted_at IS NULL
                ORDER BY fmc.date DESC, fmc.id DESC
            ");
            $campaigns = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Grand totals
            $totalsStmt = $pdo->query("
                SELECT 
                    COALESCE(SUM(budget_amount), 0) AS total_budget,
                    COALESCE(SUM(charge_amount), 0) AS total_charges,
                    COALESCE(SUM(total_cost), 0) AS grand_total_cost,
                    COALESCE(SUM(CASE WHEN charge_status = 'PAID' THEN charge_amount ELSE 0 END), 0) AS charges_paid,
                    COALESCE(SUM(CASE WHEN charge_status = 'PENDING' THEN charge_amount ELSE 0 END), 0) AS charges_pending
                FROM finance_marketing_campaigns
                WHERE deleted_at IS NULL
            ");
            $totals = $totalsStmt->fetch(PDO::FETCH_ASSOC);

            ApiResponse::success([
                'campaigns' => $campaigns,
                'totals'    => $totals,
            ], 'Marketing campaigns retrieved successfully');
        }

        if ($method === 'POST') {
            $id = (int)($input['id'] ?? 0);
            $date = trim($input['date'] ?? date('Y-m-d'));
            $name = trim($input['campaign_name'] ?? '');
            $budget = (float)($input['budget_amount'] ?? 0);
            $chargePercent = isset($input['charge_percent']) ? (float)$input['charge_percent'] : 20.0;
            $chargeStatus = strtoupper(trim($input['charge_status'] ?? 'PENDING'));
            $status = strtoupper(trim($input['status'] ?? 'PENDING'));
            $ledgerEntryId = !empty($input['ledger_entry_id']) ? (int)$input['ledger_entry_id'] : null;
            $notes = trim($input['notes'] ?? '');

            if ($name === '') ApiResponse::error('Campaign name is required', 422);
            if ($budget <= 0) ApiResponse::error('Budget amount must be greater than zero', 422);

            // Compute charges and total cost automatically
            $chargeAmount = round($budget * ($chargePercent / 100), 2);
            $totalCost = round($budget + $chargeAmount, 2);

            if ($id > 0) {
                // Update
                $stmt = $pdo->prepare("
                    UPDATE finance_marketing_campaigns
                    SET date = ?, campaign_name = ?, budget_amount = ?, charge_percent = ?,
                        charge_amount = ?, total_cost = ?, charge_status = ?, status = ?,
                        ledger_entry_id = ?, notes = ?, updated_at = {$nowSql}
                    WHERE id = ?
                ");
                $stmt->execute([
                    $date, $name, $budget, $chargePercent, $chargeAmount, $totalCost,
                    $chargeStatus, $status, $ledgerEntryId, $notes, $id
                ]);
                $campaignId = $id;
            } else {
                // Insert
                $stmt = $pdo->prepare("
                    INSERT INTO finance_marketing_campaigns (
                        date, campaign_name, budget_amount, charge_percent, charge_amount,
                        total_cost, charge_status, status, ledger_entry_id, notes, created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $date, $name, $budget, $chargePercent, $chargeAmount, $totalCost,
                    $chargeStatus, $status, $ledgerEntryId, $notes, $adminUser['id']
                ]);
                $campaignId = (int)$pdo->lastInsertId();
            }

            $getStmt = $pdo->prepare("SELECT * FROM finance_marketing_campaigns WHERE id = ?");
            $getStmt->execute([$campaignId]);
            $saved = $getStmt->fetch(PDO::FETCH_ASSOC);

            ApiResponse::success($saved, 'Marketing campaign saved successfully');
        }

        if ($method === 'DELETE') {
            $id = (int)($input['id'] ?? ($_GET['id'] ?? 0));
            if ($id <= 0) ApiResponse::error('Valid campaign ID required', 422);

            $stmt = $pdo->prepare("UPDATE finance_marketing_campaigns SET deleted_at = {$nowSql} WHERE id = ?");
            $stmt->execute([$id]);

            ApiResponse::success(['id' => $id], 'Campaign deleted');
        }
    }

    // -------------------------------------------------------------------------
    // 8. SETTLEMENTS & DEBT RESOLUTION
    // -------------------------------------------------------------------------
    if ($action === 'settlements') {
        if ($method === 'GET') {
            $partners = $pdo->query("SELECT * FROM finance_partners WHERE is_active = 1 ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);

            $partnerPositions = [];
            $totalNetContributions = 0;

            foreach ($partners as $p) {
                $pId = (int)$p['id'];
                $stmt = $pdo->prepare("
                    SELECT 
                        COALESCE(SUM(CASE WHEN type = 'EXPENSE' AND status = 'PAID' THEN amount ELSE 0 END), 0) AS expenses,
                        COALESCE(SUM(CASE WHEN type = 'CONTRIBUTION' THEN amount ELSE 0 END), 0) AS contributions,
                        COALESCE(SUM(CASE WHEN type = 'REIMBURSEMENT' THEN amount ELSE 0 END), 0) AS reimbursements,
                        COALESCE(SUM(CASE WHEN type = 'TRANSFER_IN' THEN amount ELSE 0 END), 0) AS transfers_in,
                        COALESCE(SUM(CASE WHEN type = 'TRANSFER_OUT' THEN amount ELSE 0 END), 0) AS transfers_out
                    FROM finance_entries
                    WHERE partner_id = ? AND deleted_at IS NULL
                ");
                $stmt->execute([$pId]);
                $r = $stmt->fetch(PDO::FETCH_ASSOC);

                $net = ((float)$r['contributions'] + (float)$r['reimbursements'] + (float)$r['transfers_in']) 
                     - ((float)$r['expenses'] + (float)$r['transfers_out']);

                $partnerPositions[] = [
                    'id'           => $pId,
                    'name'         => $p['name'],
                    'color'        => $p['color'],
                    'share_percent'=> (float)$p['share_percent'],
                    'expenses'     => (float)$r['expenses'],
                    'contributions'=> (float)$r['contributions'],
                    'net_position' => $net,
                ];

                $totalNetContributions += $net;
            }

            // Calculate fair share and balance (Creditor if balance > 0, Debtor if balance < 0)
            $debtors = [];
            $creditors = [];

            foreach ($partnerPositions as &$pp) {
                $fairShare = round($totalNetContributions * ($pp['share_percent'] / 100), 2);
                $balance = round($pp['net_position'] - $fairShare, 2);
                $pp['fair_share'] = $fairShare;
                $pp['balance'] = $balance;

                if ($balance < -0.01) {
                    $debtors[] = ['id' => $pp['id'], 'name' => $pp['name'], 'amount' => abs($balance)];
                } elseif ($balance > 0.01) {
                    $creditors[] = ['id' => $pp['id'], 'name' => $pp['name'], 'amount' => $balance];
                }
            }

            // Match debtors and creditors to formulate concrete settlement transfers
            $suggestedPayments = [];
            $dIdx = 0;
            $cIdx = 0;

            while ($dIdx < count($debtors) && $cIdx < count($creditors)) {
                $debtor = &$debtors[$dIdx];
                $creditor = &$creditors[$cIdx];

                $paymentAmount = min($debtor['amount'], $creditor['amount']);

                if ($paymentAmount > 0.01) {
                    $suggestedPayments[] = [
                        'from_partner_id'   => $debtor['id'],
                        'from_partner_name' => $debtor['name'],
                        'to_partner_id'     => $creditor['id'],
                        'to_partner_name'   => $creditor['name'],
                        'amount'            => round($paymentAmount, 2),
                        'instruction'       => "{$debtor['name']} pays {$creditor['name']} ₹" . number_format($paymentAmount, 2),
                    ];
                }

                $debtor['amount'] -= $paymentAmount;
                $creditor['amount'] -= $paymentAmount;

                if ($debtor['amount'] <= 0.01) $dIdx++;
                if ($creditor['amount'] <= 0.01) $cIdx++;
            }

            ApiResponse::success([
                'partners'           => $partnerPositions,
                'total_net_capital'  => $totalNetContributions,
                'suggested_payments' => $suggestedPayments,
            ], 'Settlements computed successfully');
        }

        // Record a settlement transfer
        if ($method === 'POST') {
            $fromId = (int)($input['from_partner_id'] ?? 0);
            $toId = (int)($input['to_partner_id'] ?? 0);
            $amount = (float)($input['amount'] ?? 0);
            $date = trim($input['date'] ?? date('Y-m-d'));
            $notes = trim($input['notes'] ?? 'Settlement transfer between partners');

            if ($fromId <= 0 || $toId <= 0 || $fromId === $toId) {
                ApiResponse::error('Valid distinct from/to partners required', 422);
            }
            if ($amount <= 0) {
                ApiResponse::error('Amount must be positive', 422);
            }

            // Partner names
            $stmt = $pdo->prepare("SELECT id, name FROM finance_partners WHERE id IN (?, ?)");
            $stmt->execute([$fromId, $toId]);
            $pNames = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

            $fromName = $pNames[$fromId] ?? 'Partner';
            $toName = $pNames[$toId] ?? 'Partner';

            // Atomic Transaction
            $pdo->beginTransaction();
            try {
                // 1. Transfer Out for Sender
                $outStmt = $pdo->prepare("
                    INSERT INTO finance_entries (partner_id, date, description, amount, type, status, category, counterparty_partner_id, notes, created_by)
                    VALUES (?, ?, ?, ?, 'TRANSFER_OUT', 'PAID', 'Other', ?, ?, ?)
                ");
                $outStmt->execute([
                    $fromId, $date, "Settlement transfer to {$toName}", $amount, $toId, $notes, $adminUser['id']
                ]);

                // 2. Transfer In for Receiver
                $inStmt = $pdo->prepare("
                    INSERT INTO finance_entries (partner_id, date, description, amount, type, status, category, counterparty_partner_id, notes, created_by)
                    VALUES (?, ?, ?, ?, 'TRANSFER_IN', 'RECEIVED', 'Other', ?, ?, ?)
                ");
                $inStmt->execute([
                    $toId, $date, "Settlement received from {$fromName}", $amount, $fromId, $notes, $adminUser['id']
                ]);

                $pdo->commit();
                ApiResponse::success(null, "Settlement of ₹" . number_format($amount, 2) . " successfully recorded between {$fromName} and {$toName}.");
            } catch (Throwable $te) {
                $pdo->rollBack();
                ApiResponse::error('Failed to record settlement: ' . $te->getMessage(), 500);
            }
        }
    }

    // -------------------------------------------------------------------------
    // 9. EXCEL CURRENT BACKUP & DOWNLOAD EXPORT
    // -------------------------------------------------------------------------
    if ($action === 'export_backup' && $method === 'GET') {
        // Fetch all active partners
        $partners = $pdo->query("SELECT * FROM finance_partners WHERE is_active = 1 ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);

        // Fetch all non-deleted entries grouped by partner
        $ledgersByPartner = [];
        $ledgersById = [];
        foreach ($partners as $partner) {
            $pId = (int)$partner['id'];
            $stmt = $pdo->prepare("
                SELECT id, date, description, amount, type, status, category, notes
                FROM finance_entries
                WHERE partner_id = ? AND deleted_at IS NULL
                ORDER BY id ASC
            ");
            $stmt->execute([$pId]);
            $partnerRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $ledgersByPartner[$partner['name']] = $partnerRows;
            $ledgersById[$pId] = $partnerRows;
        }

        // Fetch all active marketing campaigns
        $mktStmt = $pdo->query("
            SELECT id, date, campaign_name, budget_amount, charge_percent, charge_amount, total_cost, charge_status, status, notes
            FROM finance_marketing_campaigns
            WHERE deleted_at IS NULL
            ORDER BY id ASC
        ");
        $marketing = $mktStmt->fetchAll(PDO::FETCH_ASSOC);

        // Return comprehensive structured payload ready for client or server XLSX generation
        $todayStr = date('Y-m-d');
        ApiResponse::success([
            'filename'         => "Valerie_Jewels_Finance_Backup_{$todayStr}.xlsx",
            'generated_at'     => date('Y-m-d H:i:s'),
            'partners'         => $partners,
            'ledgers'          => $ledgersByPartner,
            'ledgers_by_id'    => $ledgersById,
            'marketing'        => $marketing,
        ], 'Finance backup data generated successfully');
    }

    // -------------------------------------------------------------------------
    // 10. BATCH IMPORT FROM EXCEL
    // -------------------------------------------------------------------------
    if ($action === 'import_excel' && $method === 'POST') {
        $rows = $input['entries'] ?? [];
        if (!is_array($rows) || empty($rows)) {
            ApiResponse::error('No entry rows provided for import', 422);
        }

        $partners = $pdo->query("SELECT id, name FROM finance_partners")->fetchAll(PDO::FETCH_ASSOC);
        $partnerMap = [];
        foreach ($partners as $p) {
            $partnerMap[strtolower(trim($p['name']))] = (int)$p['id'];
        }

        $imported = 0;
        $skipped = 0;

        $checkStmt = $pdo->prepare("
            SELECT id FROM finance_entries 
            WHERE partner_id = ? AND date = ? AND description = ? AND amount = ? AND deleted_at IS NULL
            LIMIT 1
        ");

        $insStmt = $pdo->prepare("
            INSERT INTO finance_entries (partner_id, date, description, amount, type, status, category, notes, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $pdo->beginTransaction();
        try {
            foreach ($rows as $row) {
                $pName = strtolower(trim($row['partner_name'] ?? ''));
                $partnerId = $partnerMap[$pName] ?? 0;
                if ($partnerId <= 0) {
                    $skipped++;
                    continue;
                }

                $desc = trim($row['description'] ?? '');
                $amount = abs((float)($row['amount'] ?? 0));
                $date = trim($row['date'] ?? date('Y-m-d'));
                $status = strtoupper(trim($row['status'] ?? 'PAID'));
                $type = strtoupper(trim($row['type'] ?? 'EXPENSE'));
                $category = trim($row['category'] ?? 'Other');
                $notes = trim($row['notes'] ?? 'Imported from Valerie_Jewels_Business_Expense.xlsx');

                if ($desc === '' || $amount <= 0) {
                    $skipped++;
                    continue;
                }

                // Deduplication check: idempotent import
                $checkStmt->execute([$partnerId, $date, $desc, $amount]);
                if ($checkStmt->fetchColumn()) {
                    $skipped++;
                    continue;
                }

                $insStmt->execute([
                    $partnerId, $date, $desc, $amount, $type, $status, $category, $notes, $adminUser['id']
                ]);
                $imported++;
            }
            $pdo->commit();
            ApiResponse::success([
                'imported_count' => $imported,
                'skipped_count'  => $skipped,
            ], "Import completed: {$imported} entries imported, {$skipped} duplicates/invalid skipped.");
        } catch (Throwable $ie) {
            $pdo->rollBack();
            ApiResponse::error('Import failed: ' . $ie->getMessage(), 500);
        }
    }

    // -------------------------------------------------------------------------
    // 12. COMPLETE DATA WIPE (PURGE ALL ENTRIES & CAMPAIGNS)
    // -------------------------------------------------------------------------
    if ($action === 'wipe_all' && $method === 'POST') {
        $pdo->exec("DELETE FROM finance_entries");
        $pdo->exec("DELETE FROM finance_marketing_campaigns");
        $pdo->exec("DELETE FROM finance_audit_log");
        if ($driver === 'sqlite') {
            try {
                $pdo->exec("DELETE FROM sqlite_sequence WHERE name IN ('finance_entries', 'finance_marketing_campaigns', 'finance_audit_log')");
            } catch (Throwable $se) {}
        }
        ApiResponse::success([
            'wiped'     => true,
            'timestamp' => date('c'),
        ], 'All financial entries and marketing campaigns have been wiped clean.');
    }

    ApiResponse::error('Invalid action or method', 400);

} catch (Throwable $e) {
    error_log('api/admin/finance.php error: ' . $e->getMessage());
    ApiResponse::handleDatabaseException($e, 'Finance operation failed');
}
