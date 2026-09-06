<?php
/**
 * VALERIE JEWELS — Server-Side Price & Payment Split Recalculation
 * CRITICAL SECURITY: Never trusts client-submitted prices. 
 * Recomputes all totals directly from canonical MySQL database records.
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/config/database.php';

handleCors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ApiResponse::error('Method not allowed. Use POST.', 405);
}

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

$items      = $input['items'] ?? [];
$couponCode = strtoupper(trim($input['coupon_code'] ?? ''));

if (empty($items) || !is_array($items)) {
    ApiResponse::error('Cart items are required for checkout calculation', 422);
}

try {
    $pdo = Database::getConnection();

    $recalculatedItems = [];
    $subtotal = 0.0;
    $totalMrp = 0.0;

    $prodStmt = $pdo->prepare("SELECT id, name, slug, price, mrp, is_active FROM products WHERE id = ? LIMIT 1");
    $varStmt  = $pdo->prepare("SELECT id, title, price, mrp, is_active FROM product_variants WHERE id = ? AND product_id = ? LIMIT 1");
    $bndlStmt = $pdo->prepare("SELECT id, title, slug, bundle_price, compare_price, is_active FROM bundles WHERE id = ? LIMIT 1");

    foreach ($items as $item) {
        $quantity = max(1, (int)($item['quantity'] ?? 1));

        if (!empty($item['isBundle'])) {
            // Bundle / Combo Item
            $bundleId = (int)($item['bundleId'] ?? $item['id'] ?? 0);
            $bndlStmt->execute([$bundleId]);
            $bndl = $bndlStmt->fetch();

            if (!$bndl || !$bndl['is_active']) {
                continue;
            }

            $price = (float)$bndl['bundle_price'];
            $mrp   = (float)$bndl['compare_price'];
            $lineTotal = $price * $quantity;
            $lineMrp   = $mrp * $quantity;

            $subtotal += $lineTotal;
            $totalMrp += $lineMrp;

            $recalculatedItems[] = [
                'type'       => 'bundle',
                'id'         => $bndl['id'],
                'name'       => $bndl['title'],
                'price'      => $price,
                'mrp'        => $mrp,
                'quantity'   => $quantity,
                'line_total' => $lineTotal,
            ];
        } else {
            // Regular Product Item
            $productId = (int)($item['productId'] ?? $item['id'] ?? 0);
            $variantId = !empty($item['variantId']) ? (int)$item['variantId'] : null;

            $prodStmt->execute([$productId]);
            $prod = $prodStmt->fetch();

            if (!$prod || !$prod['is_active']) {
                continue;
            }

            $price = (float)$prod['price'];
            $mrp   = (float)($prod['mrp'] ?: $prod['price']);
            $variantTitle = null;

            if ($variantId) {
                $varStmt->execute([$variantId, $productId]);
                $variant = $varStmt->fetch();
                if ($variant && $variant['is_active']) {
                    $variantTitle = $variant['title'];
                    if ($variant['price'] !== null) $price = (float)$variant['price'];
                    if ($variant['mrp'] !== null)   $mrp   = (float)$variant['mrp'];
                }
            }

            $lineTotal = $price * $quantity;
            $lineMrp   = $mrp * $quantity;

            $subtotal += $lineTotal;
            $totalMrp += $lineMrp;

            $recalculatedItems[] = [
                'type'          => 'product',
                'id'            => $prod['id'],
                'variant_id'    => $variantId,
                'name'          => $prod['name'],
                'variant_title' => $variantTitle,
                'price'         => $price,
                'mrp'           => $mrp,
                'quantity'      => $quantity,
                'line_total'    => $lineTotal,
            ];
        }
    }

    if (empty($recalculatedItems)) {
        ApiResponse::error('No valid active products in cart', 400);
    }

    // Coupon discount logic
    $discountAmount = 0.0;
    $appliedCoupon  = null;

    if (!empty($couponCode)) {
        $coupStmt = $pdo->prepare("
            SELECT * FROM coupons 
            WHERE code = :code AND is_active = 1
            LIMIT 1
        ");
        $coupStmt->execute([':code' => $couponCode]);
        $coupon = $coupStmt->fetch();

        if ($coupon) {
            $minOrder = (float)$coupon['min_order_amount'];
            if ($subtotal >= $minOrder) {
                if ($coupon['discount_type'] === 'percentage') {
                    $discountAmount = ($subtotal * (float)$coupon['discount_value']) / 100.0;
                    if ($coupon['max_discount_amount'] !== null) {
                        $discountAmount = min($discountAmount, (float)$coupon['max_discount_amount']);
                    }
                } else {
                    // Fixed discount
                    $discountAmount = (float)$coupon['discount_value'];
                }
                $discountAmount = min($discountAmount, $subtotal);
                $appliedCoupon = [
                    'code'           => $coupon['code'],
                    'discount_type'  => $coupon['discount_type'],
                    'discount_value' => (float)$coupon['discount_value'],
                    'amount_saved'   => round($discountAmount, 2),
                ];
            }
        }
    }

    // Shipping calculation (Threshold: ₹999)
    $freeShippingThreshold = 999.0;
    $isFreeShipping = ($subtotal - $discountAmount) >= $freeShippingThreshold;
    $shippingFee    = $isFreeShipping ? 0.0 : 99.0;

    $finalTotal = round(max(0, ($subtotal - $discountAmount) + $shippingFee), 2);
    $totalSavings = round(($totalMrp - $subtotal) + $discountAmount, 2);

    // Smart Payment Split calculations per Fastrr specifications
    // 1. Prepaid incentive: ₹50 instant discount for 100% upfront UPI/Cards
    $prepaidIncentiveDiscount = min(50.0, $finalTotal);
    $prepaidTotal = round(max(0, $finalTotal - $prepaidIncentiveDiscount), 2);

    // 2. Partial COD (Smart RTO Protection): ₹199 upfront deposit, remainder on delivery
    $partialDeposit = min(199.0, $finalTotal);
    $partialDueOnDelivery = round(max(0, $finalTotal - $partialDeposit), 2);

    // 3. Full COD: 100% on delivery
    $codDueOnDelivery = $finalTotal;

    $calculation = [
        'items'                   => $recalculatedItems,
        'item_count'              => array_sum(array_column($recalculatedItems, 'quantity')),
        'subtotal'                => round($subtotal, 2),
        'total_mrp'               => round($totalMrp, 2),
        'discount_amount'         => round($discountAmount, 2),
        'total_savings'           => $totalSavings,
        'shipping_fee'            => round($shippingFee, 2),
        'is_free_shipping'        => $isFreeShipping,
        'final_total'             => $finalTotal,
        'applied_coupon'          => $appliedCoupon,
        'payment_splits' => [
            'full_prepaid' => [
                'title'                 => 'Prepaid (UPI / Cards / NetBanking)',
                'badge'                 => 'Save ₹50 Extra Instant Discount',
                'incentive_discount'    => $prepaidIncentiveDiscount,
                'amount_due_now'        => $prepaidTotal,
                'amount_due_on_delivery'=> 0.0,
            ],
            'partial' => [
                'title'                 => 'Partial COD (Smart Split)',
                'badge'                 => 'Pay ₹199 Deposit Now, Rest on Delivery',
                'amount_due_now'        => $partialDeposit,
                'amount_due_on_delivery'=> $partialDueOnDelivery,
            ],
            'cod' => [
                'title'                 => 'Cash on Delivery (Full COD)',
                'badge'                 => 'Pay 100% upon Courier Delivery',
                'amount_due_now'        => 0.0,
                'amount_due_on_delivery'=> $codDueOnDelivery,
            ],
        ],
    ];

    ApiResponse::success($calculation, 'Order totals recalculated successfully');

} catch (Throwable $e) {
    ApiResponse::error('Calculation error: ' . $e->getMessage(), 500);
}
