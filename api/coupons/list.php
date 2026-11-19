<?php
/**
 * VALERIE JEWELS — Public Promotional Coupons API
 * Returns list of currently active public coupons for storefront checkout.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: public, max-age=60');

require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/utils/response.php';

try {
    $pdo = Database::getConnection();

    $stmt = $pdo->query("
        SELECT id, code, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, used_count
        FROM coupons 
        WHERE is_active = 1
        ORDER BY min_order_amount ASC, discount_value DESC
    ");
    $rawCoupons = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $formatted = [];
    foreach ($rawCoupons as $c) {
        if ($c['usage_limit'] !== null && (int)$c['usage_limit'] > 0 && (int)$c['used_count'] >= (int)$c['usage_limit']) {
            continue;
        }

        $cMin = (float)$c['min_order_amount'];
        $cVal = (float)$c['discount_value'];

        $title = ($c['discount_type'] === 'percentage')
            ? round($cVal) . '% OFF'
            : '₹' . round($cVal) . ' FLAT OFF';

        $description = ($c['discount_type'] === 'percentage')
            ? ($c['max_discount_amount'] ? ('Get ' . round($cVal) . '% off up to ₹' . round($c['max_discount_amount'])) : ('Save ' . round($cVal) . '% on your order'))
            : ('Flat ₹' . round($cVal) . ' discount on your order');

        $terms = ($cMin > 0)
            ? ('Valid on orders above ₹' . number_format($cMin, 0))
            : 'No minimum order required';

        $formatted[] = [
            'id'                  => (int)$c['id'],
            'code'                => $c['code'],
            'discount_type'       => $c['discount_type'],
            'discount_value'      => $cVal,
            'min_order_amount'    => $cMin,
            'max_discount_amount' => $c['max_discount_amount'] !== null ? (float)$c['max_discount_amount'] : null,
            'title'               => $title,
            'description'         => $description,
            'terms'               => $terms,
        ];
    }

    ApiResponse::success($formatted, 'Available coupons list');
} catch (Throwable $e) {
    error_log('coupons/list.php error: ' . $e->getMessage());
    ApiResponse::error('Failed to load available coupons', 500);
}
