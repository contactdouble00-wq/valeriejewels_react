<?php
/**
 * VALERIE JEWELS — High-Converting Payment Recovery / Order Failed Luxury Email Template
 * 
 * Available Variables:
 * - $order (array): Master order record from orders table
 * - $items (array): Itemized product list from order_items table with product_image and product_slug
 * - $storeUrl (string): Base URL of the storefront (https://valeriejewels.in)
 * - $reason (string|null): Optional failure reason / bank code
 * - $customMessage (string|null): Optional personalized note from admin
 */
$storeUrl = (!empty($storeUrl) && strpos($storeUrl, 'localhost') === false && strpos($storeUrl, '127.0.0.1') === false) 
    ? rtrim($storeUrl, '/') 
    : 'https://valeriejewels.in';

$logoUrl = 'https://valeriejewels.in/valerie.png';
$orderNumber = htmlspecialchars($order['order_number'] ?? '');
$customerName = htmlspecialchars($order['customer_name'] ?? 'Valued Customer');
$total = number_format((float)($order['total_amount'] ?? 0), 2);

// Calculate accurate Partial COD / Prepaid breakdown
$totalVal = (float)($order['total_amount'] ?? 0);
$amountPaidVal = (float)($order['amount_paid_upfront'] ?? 0);
$amountDueVal = (float)($order['amount_due_on_delivery'] ?? 0);

$isPartial = ($order['payment_type'] ?? '') === 'partial' || 
             ($order['payment_status'] ?? '') === 'partial_paid' ||
             (strpos(strtolower($order['payment_type'] ?? ''), 'partial') !== false);

if ($isPartial) {
    if ($amountPaidVal <= 0 && $amountDueVal > 0) {
        $amountPaidVal = max(0, $totalVal - $amountDueVal);
    }
    if ($amountDueVal <= 0 && $totalVal > $amountPaidVal) {
        $amountDueVal = max(0, $totalVal - $amountPaidVal);
    }
    if ($amountPaidVal <= 0) {
        $amountPaidVal = 9.0;
        $amountDueVal = max(0, $totalVal - 9.0);
    }
}

$amountPaidStr = number_format($amountPaidVal, 0);
$amountDueStr = number_format($amountDueVal, 0);

// First item and primary product link
$firstItem = !empty($items[0]) ? $items[0] : null;
$firstItemSlug = !empty($firstItem['product_slug']) ? trim($firstItem['product_slug']) : '';
if (empty($firstItemSlug) && !empty($firstItem['product_id'])) {
    $firstItemSlug = (string)$firstItem['product_id'];
}
$firstItemName = !empty($firstItem['product_name']) ? $firstItem['product_name'] : 'Jewelry Piece';

// Primary recovery destination URL
$firstProductUrl = !empty($firstItemSlug) ? ($storeUrl . '/#product-' . rawurlencode($firstItemSlug)) : ($storeUrl . '/#shop');
$retryUrl = $storeUrl . '/#checkout?order=' . urlencode($order['order_number'] ?? '');
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Jewelry Pieces Are Reserved — Valerie Jewels</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F8F5FB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #26153D; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    img { border: 0; outline: none; text-decoration: none; }
    .btn-retry:hover { background-color: #6C4F99 !important; }
    .btn-view-prod:hover { background-color: #EFE8F6 !important; }
  </style>
</head>
<body style="margin: 0; padding: 30px 10px; background-color: #F8F5FB;">

  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        
        <!-- Main Card Container -->
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #EBE4F3; overflow: hidden; box-shadow: 0 4px 25px rgba(131, 102, 176, 0.08);">
          
          <!-- Brand Header with Logo on Top -->
          <tr>
            <td align="center" style="padding: 35px 30px 22px 30px; border-bottom: 1px solid #F2ECF7; background: linear-gradient(180deg, #FAF7FC 0%, #FFFFFF 100%);">
              <a href="<?= htmlspecialchars($storeUrl) ?>" target="_blank" style="text-decoration: none; display: inline-block;">
                <img src="<?= htmlspecialchars($logoUrl) ?>" alt="VALERIÉ" height="28" style="height: 28px; width: auto; max-height: 28px; display: block; margin: 0 auto;" />
              </a>
              <p style="margin: 6px 0 0 0; font-size: 10px; letter-spacing: 2.5px; text-transform: uppercase; color: #8F82A0; font-weight: 600;">
                Everyday Luxury Jewelry • 18K Anti-Tarnish
              </p>
            </td>
          </tr>

          <!-- High-Converting Alert & Headline -->
          <tr>
            <td style="padding: 35px 35px 20px 35px; text-align: center;">
              <div style="display: inline-block; width: 52px; height: 52px; line-height: 52px; border-radius: 50%; background-color: #FBF0F4; color: #8366B0; font-size: 24px; margin-bottom: 15px; border: 1px solid #F2DCE8;">
                ✨
              </div>
              <h2 style="margin: 0 0 8px 0; font-family: 'Georgia', serif; font-size: 23px; color: #26153D; font-weight: 700; line-height: 1.3;">
                Your Jewelry is Reserved — Complete Your Order
              </h2>
              <p style="margin: 0; font-size: 14px; line-height: 22px; color: #6D5E7A;">
                Hello <strong><?= $customerName ?></strong>, we noticed your payment for order <strong style="color: #8366B0; font-family: monospace;">#<?= $orderNumber ?></strong> could not be completed. Don't worry — your handcrafted pieces have been temporarily set aside for you!
              </p>
              <?php if (!empty($reason)): ?>
              <div style="margin: 12px 0 0 0; padding: 10px 14px; background-color: #FFF1F2; border-left: 3px solid #E11D48; border-radius: 6px; font-size: 12px; line-height: 18px; color: #9F1239; text-align: left;">
                <strong>Notice:</strong> <?= htmlspecialchars($reason) ?>
              </div>
              <?php endif; ?>
              <?php if (!empty($customMessage)): ?>
              <div style="margin: 14px 0 0 0; padding: 14px 16px; background-color: #FAF7FC; border-left: 3px solid #8366B0; border-radius: 8px; font-size: 13px; line-height: 20px; color: #26153D; text-align: left;">
                <?= nl2br(htmlspecialchars($customMessage)) ?>
              </div>
              <?php endif; ?>
            </td>
          </tr>

          <!-- Reassurance Box (Banks/UPI Deductions) -->
          <tr>
            <td style="padding: 0 35px 20px 35px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="14" style="background-color: #F8FBF8; border-radius: 12px; border: 1px solid #D1EAD4;">
                <tr>
                  <td>
                    <p style="margin: 0 0 4px 0; font-size: 12.5px; color: #22543D; font-weight: bold;">
                      🛡️ Was money deducted from your bank or UPI?
                    </p>
                    <p style="margin: 0; font-size: 12px; line-height: 18px; color: #276749;">
                      Please rest assured: if an amount was deducted during an interrupted transaction, banking networks automatically refund failed attempts within 24–48 hours. No duplicate charge will ever occur.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Partial COD Special Callout (If Applicable) -->
          <?php if ($isPartial): ?>
          <tr>
            <td style="padding: 0 35px 20px 35px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="16" style="background: linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%); border-radius: 14px; border: 1px solid #D8B4FE;">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #6B21A8; margin-bottom: 4px;">
                      💎 Partial COD Option Active
                    </div>
                    <div style="font-size: 15px; font-weight: 700; color: #26153D; margin-bottom: 6px;">
                      Pay Just <span style="color: #6B21A8; font-size: 18px;">₹<?= $amountPaidStr ?></span> Online to Confirm Dispatch!
                    </div>
                    <p style="margin: 0; font-size: 12.5px; line-height: 19px; color: #4C1D95;">
                      You do not have to pay the full amount today. Pay just <strong>₹<?= $amountPaidStr ?></strong> advance deposit to confirm your order, and pay the remaining <strong>₹<?= $amountDueStr ?></strong> at your doorstep in cash or UPI when your jewelry arrives!
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <?php endif; ?>

          <!-- Reserved Jewelry Pieces with Images & Direct Links -->
          <tr>
            <td style="padding: 0 35px 25px 35px;">
              <div style="border: 1px solid #EBE3F2; border-radius: 16px; padding: 20px; background-color: #FAF7FC;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #8F82A0; font-weight: 700; padding-bottom: 14px; border-bottom: 1px solid #EBE3F2;">
                      Reserved Jewelry Pieces In Your Bag
                    </td>
                    <td align="right" style="font-size: 11px; color: #8F82A0; font-weight: 600; padding-bottom: 14px; border-bottom: 1px solid #EBE3F2;">
                      Total: <strong style="color: #26153D; font-size: 14px;">₹<?= $total ?></strong>
                    </td>
                  </tr>

                  <?php foreach ($items as $item): ?>
                  <?php 
                    $itemImg = !empty($item['product_image']) ? $item['product_image'] : 'https://valeriejewels.in/valerie.png';
                    $itemSlug = !empty($item['product_slug']) ? trim($item['product_slug']) : '';
                    if (empty($itemSlug) && !empty($item['product_id'])) {
                        $itemSlug = (string)$item['product_id'];
                    }
                    $itemUrl = !empty($itemSlug) ? ($storeUrl . '/#product-' . rawurlencode($itemSlug)) : ($storeUrl . '/#shop');
                  ?>
                  <tr>
                    <td colspan="2" style="padding: 16px 0; border-bottom: 1px solid #F0EAF5;">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <!-- Product Thumbnail Image -->
                          <td width="80" valign="top" style="width: 80px; padding-right: 16px;">
                            <a href="<?= htmlspecialchars($itemUrl) ?>" target="_blank" style="text-decoration: none; display: block;">
                              <img src="<?= htmlspecialchars($itemImg) ?>" alt="<?= htmlspecialchars($item['product_name'] ?? 'Jewelry') ?>" width="76" height="76" style="width: 76px; height: 76px; border-radius: 12px; object-fit: cover; display: block; border: 1px solid #E5DCEF; background-color: #FFFFFF;" />
                            </a>
                          </td>

                          <!-- Product Details & Direct Link -->
                          <td valign="top">
                            <a href="<?= htmlspecialchars($itemUrl) ?>" target="_blank" style="font-size: 13.5px; font-weight: 700; color: #26153D; text-decoration: none; line-height: 1.4; display: block;">
                              <?= htmlspecialchars($item['product_name'] ?? 'Luxury Jewelry Piece') ?>
                            </a>

                            <?php if (!empty($item['variant_title'])): ?>
                            <div style="font-size: 11.5px; color: #8366B0; margin-top: 3px; font-weight: 500;">
                              <?= htmlspecialchars($item['variant_title']) ?>
                            </div>
                            <?php endif; ?>

                            <div style="margin-top: 6px; font-size: 12px; color: #6D5E7A;">
                              Quantity: <strong><?= (int)($item['quantity'] ?? 1) ?></strong> &bull; Price: <strong style="color: #26153D;">₹<?= number_format((float)($item['total_price'] ?? 0), 2) ?></strong>
                            </div>

                            <!-- Direct Product Link Button -->
                            <div style="margin-top: 8px;">
                              <a href="<?= htmlspecialchars($itemUrl) ?>" target="_blank" class="btn-view-prod" style="display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 700; color: #8366B0; background-color: #F2ECF7; border-radius: 6px; text-decoration: none; letter-spacing: 0.3px;">
                                View Product Details &rarr;
                              </a>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <?php endforeach; ?>
                </table>
              </div>
            </td>
          </tr>

          <!-- Primary High-Converting Call to Action Buttons -->
          <tr>
            <td align="center" style="padding: 0 35px 25px 35px;">
              <table border="0" cellspacing="0" cellpadding="0" style="width: 100%;">
                <tr>
                  <td align="center" style="border-radius: 14px; background: linear-gradient(135deg, #8366B0 0%, #64458D 100%); box-shadow: 0 6px 20px rgba(131, 102, 176, 0.35);">
                    <a href="<?= htmlspecialchars($firstProductUrl) ?>" target="_blank" class="btn-retry" style="display: block; padding: 18px 24px; font-size: 14px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; color: #FFFFFF; text-decoration: none; border-radius: 14px; text-align: center;">
                      Complete Your Order Now &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 12px 0 0 0; font-size: 12px; color: #7A6F87; text-align: center;">
                ⚡ <strong>Free Express Shipping</strong> &bull; Cash on Delivery & Partial COD Available &bull; 100% Secure Checkout
              </p>
            </td>
          </tr>

          <!-- Personal Concierge & WhatsApp Ordering -->
          <tr>
            <td style="padding: 0 35px 30px 35px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="18" style="background-color: #F8F5FB; border-radius: 14px; border: 1px solid #EBE4F3; text-align: center;">
                <tr>
                  <td>
                    <h4 style="margin: 0 0 6px 0; font-size: 14px; color: #26153D; font-weight: 700;">
                      Need Instant Help Completing This Order?
                    </h4>
                    <p style="margin: 0 0 14px 0; font-size: 12.5px; color: #6D5E7A; line-height: 19px;">
                      Our Valerie Jewels Concierge can assist you with alternative UPI links, custom payment options, or placing your order directly over WhatsApp.
                    </p>
                    <table border="0" cellspacing="0" cellpadding="0" align="center">
                      <tr>
                        <td style="padding: 0 6px;">
                          <a href="https://wa.me/917016347945?text=<?= urlencode("Hello Valerie Jewels, I need help completing my order " . $orderNumber . " for " . $firstItemName) ?>" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #25D366; color: #FFFFFF; text-decoration: none; font-size: 12px; font-weight: 700; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
                            💬 Chat on WhatsApp
                          </a>
                        </td>
                        <td style="padding: 0 6px;">
                          <a href="tel:+919023422392" style="display: inline-block; padding: 10px 18px; background-color: #FFFFFF; color: #26153D; text-decoration: none; font-size: 12px; font-weight: 700; border-radius: 10px; border: 1px solid #D5C7E6; text-transform: uppercase; letter-spacing: 0.5px;">
                            📞 Call +91 90234 22392
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer Trust Badges -->
          <tr>
            <td align="center" style="padding: 25px 35px; background-color: #FAF7FC; border-top: 1px solid #F2ECF7;">
              <p style="margin: 0 0 6px 0; font-size: 11.5px; color: #8F82A0; font-weight: 600;">
                18K Anti-Tarnish PVD Gold &bull; 100% Waterproof & Shower-Safe &bull; Complimentary Express Shipping Across India
              </p>
              <p style="margin: 0; font-size: 10.5px; color: #B3A8C2;">
                &copy; <?= date('Y') ?> Valerie Jewels. Atelier: Patel Chowk, Rajkot, Gujarat — 360001
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
