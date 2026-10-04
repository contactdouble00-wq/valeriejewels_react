<?php
/**
 * VALERIE JEWELS — Order Confirmation Luxury HTML Email Template
 * 
 * Available Variables:
 * - $order (array): Master order record from orders table
 * - $items (array): Itemized product list from order_items table with product_image
 * - $storeUrl (string): Base URL of the storefront
 */
$storeUrl = !empty($storeUrl) ? rtrim($storeUrl, '/') : 'https://valeriejewels.in';

$assetLogoFile = dirname(dirname(dirname(__DIR__))) . '/Assets/valerie.png';
if (file_exists($assetLogoFile) && (!isset($logoUrl) || strpos($storeUrl, 'localhost') !== false || strpos($storeUrl, '127.0.0.1') !== false)) {
    $logoUrl = 'data:image/png;base64,' . base64_encode(file_get_contents($assetLogoFile));
} else {
    $logoUrl = $logoUrl ?? ($storeUrl . '/valerie.png');
}

$orderNumber = htmlspecialchars($order['order_number'] ?? ('#' . ($order['id'] ?? '')));
$customerName = htmlspecialchars($order['customer_name'] ?? 'Valued Customer');
$trackingUrl = $storeUrl . '/#track-order?order=' . urlencode($order['order_number'] ?? '');

// Financial calculation safeguards
$totalAmountFloat = (float)($order['total_amount'] ?? 0);
$amountPaidFloat  = (float)($order['amount_paid_upfront'] ?? 0);
$amountDueFloat   = (float)($order['amount_due_on_delivery'] ?? 0);

$isPartialCod = ($order['payment_type'] ?? '') === 'partial' || 
                ($order['payment_status'] ?? '') === 'partial_paid' ||
                ($amountDueFloat > 0 && $amountPaidFloat > 0) ||
                (strpos(strtolower($order['payment_type'] ?? ''), 'partial') !== false);

$isPrepaid = !$isPartialCod && (
    ($order['payment_type'] ?? '') === 'prepaid' || 
    ($order['payment_type'] ?? '') === 'full_prepaid' || 
    ($order['payment_status'] ?? '') === 'paid'
);

$isFullCod = !$isPartialCod && !$isPrepaid && (
    ($order['payment_type'] ?? '') === 'cod' || 
    ($order['payment_method'] ?? '') === 'cod'
);

// Fallback calculations if amounts are not populated in database
if ($isPartialCod && $amountDueFloat <= 0 && $totalAmountFloat > $amountPaidFloat) {
    $amountDueFloat = max(0, $totalAmountFloat - $amountPaidFloat);
}
if ($isPartialCod && $amountPaidFloat <= 0 && $totalAmountFloat > $amountDueFloat) {
    $amountPaidFloat = max(0, $totalAmountFloat - $amountDueFloat);
}

$paymentTypeLabel = $isPrepaid 
    ? 'Prepaid (UPI / Card / NetBanking)' 
    : ($isPartialCod ? 'Partial COD (Advance Deposit Verified)' : 'Cash on Delivery (Full COD)');

$amountPaid = number_format($amountPaidFloat, 2);
$amountDue  = number_format($amountDueFloat, 2);
$subtotal   = number_format((float)($order['subtotal'] ?? $totalAmountFloat), 2);
$discount   = number_format((float)($order['discount_amount'] ?? 0), 2);
$shipping   = (float)($order['shipping_fee'] ?? 0) == 0 ? 'FREE' : '₹' . number_format((float)$order['shipping_fee'], 2);
$total      = number_format($totalAmountFloat, 2);

$totalItemsCount = 0;
foreach ($items as $it) {
    $totalItemsCount += max(1, (int)($it['quantity'] ?? 1));
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmed — Valerie Jewels</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F8F5FB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #26153D; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    img { border: 0; outline: none; text-decoration: none; }
    .btn-primary:hover { background-color: #6C4F99 !important; }
  </style>
</head>
<body style="margin: 0; padding: 30px 10px; background-color: #F8F5FB;">

  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        
        <!-- Main Card Container -->
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #EBE4F3; overflow: hidden; box-shadow: 0 4px 24px rgba(131, 102, 176, 0.08);">
          
          <!-- Brand Header with Logo on Top -->
          <tr>
            <td align="center" style="padding: 35px 30px 22px 30px; border-bottom: 1px solid #F2ECF7; background: linear-gradient(180deg, #FAF7FC 0%, #FFFFFF 100%);">
              <a href="<?= htmlspecialchars($storeUrl) ?>" target="_blank" style="text-decoration: none; display: inline-block;">
                <img src="<?= htmlspecialchars($logoUrl) ?>" alt="VALERIÉ" height="28" style="height: 28px; width: auto; max-height: 28px; display: block; margin: 0 auto;" />
              </a>
              <p style="margin: 6px 0 0 0; font-size: 10px; letter-spacing: 2.5px; text-transform: uppercase; color: #8F82A0; font-weight: 600;">
                Everyday Luxury Jewelry • 18K Anti-Tarnish Assurance
              </p>
            </td>
          </tr>

          <!-- Confirmation Announcement -->
          <tr>
            <td style="padding: 35px 35px 22px 35px; text-align: center;">
              <div style="display: inline-block; width: 50px; height: 50px; line-height: 50px; border-radius: 50%; background-color: #EBF8F2; color: #10B981; font-size: 26px; margin-bottom: 14px; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);">
                ✓
              </div>
              <h2 style="margin: 0 0 8px 0; font-family: 'Georgia', serif; font-size: 23px; color: #26153D; font-weight: 700;">
                <?= $isPartialCod ? 'Partial COD Order Confirmed' : ($isPrepaid ? 'Order Confirmed & Payment Verified' : 'Your Order is Confirmed') ?>
              </h2>
              <p style="margin: 0; font-size: 13px; line-height: 20px; color: #6D5E7A;">
                <?php if ($isPartialCod): ?>
                  Dear <strong><?= $customerName ?></strong>, thank you for your order! Your partial advance deposit of <strong>₹<?= $amountPaid ?></strong> has been successfully received and verified online. Your handcrafted jewelry has been allocated for luxury micro-polishing and express dispatch.
                <?php else: ?>
                  Dear <strong><?= $customerName ?></strong>, thank you for your order! Our master craftsmen have allocated your selected jewelry pieces for luxury anti-tarnish preparation and express dispatch.
                <?php endif; ?>
              </p>
            </td>
          </tr>

          <!-- Partial COD Highlight Callout Banner -->
          <?php if ($isPartialCod): ?>
          <tr>
            <td style="padding: 0 35px 25px 35px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #FFFDF5 0%, #FEF9E7 100%); border-radius: 14px; border: 2px solid #F59E0B; overflow: hidden; box-shadow: 0 2px 10px rgba(245, 158, 11, 0.08);">
                <tr>
                  <td style="padding: 18px 20px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="38" valign="top" style="width: 38px; font-size: 26px; line-height: 1;">
                          📦
                        </td>
                        <td valign="top" style="padding-left: 8px;">
                          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800; color: #B45309; margin-bottom: 4px;">
                            Partial COD Payment Summary
                          </div>
                          <div style="font-size: 15px; font-weight: 700; color: #78350F; line-height: 22px;">
                            Amount to be Paid at Delivery: <span style="font-size: 20px; color: #B45309; font-family: 'Georgia', serif; font-weight: 800;">₹<?= $amountDue ?></span>
                          </div>
                          <div style="font-size: 12px; color: #92400E; margin-top: 6px; line-height: 18px;">
                            ✓ <strong>₹<?= $amountPaid ?></strong> advance deposit received & verified online.<br />
                            💵 <strong>₹<?= $amountDue ?></strong> remaining balance will be collected when the courier arrives at your address. Please keep cash or UPI ready for delivery!
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <?php elseif ($isPrepaid): ?>
          <!-- Complimentary Gift Callout for Prepaid Orders -->
          <tr>
            <td style="padding: 0 35px 22px 35px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="14" style="background: linear-gradient(135deg, #FAF5FF 0%, #F5F3FF 100%); border-radius: 12px; border: 1px solid #DDD6FE;">
                <tr>
                  <td width="30" valign="middle" style="font-size: 22px; text-align: center;">✨</td>
                  <td valign="middle" style="font-size: 12px; color: #5B21B6; line-height: 18px;">
                    <strong>Prepaid Order Privilege:</strong> 100% paid online. Your shipment includes our <strong>Complimentary Anti-Tarnish Zircon Necklace</strong> and signature velvet travel pouch!
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <?php elseif ($isFullCod): ?>
          <!-- Full COD Callout -->
          <tr>
            <td style="padding: 0 35px 22px 35px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="14" style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); border-radius: 12px; border: 1px solid #FCD34D;">
                <tr>
                  <td width="30" valign="middle" style="font-size: 22px; text-align: center;">💵</td>
                  <td valign="middle" style="font-size: 12px; color: #92400E; line-height: 18px;">
                    <strong>Cash on Delivery (Full COD):</strong> Total amount of <strong>₹<?= $total ?></strong> will be collected at your doorstep. Please keep cash or UPI ready.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <?php endif; ?>

          <!-- Order Reference & Payment Badge -->
          <tr>
            <td style="padding: 0 35px 25px 35px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="12" style="background-color: #FAF7FC; border-radius: 12px; border: 1px solid #EBE3F2;">
                <tr>
                  <td style="font-size: 12px; color: #6D5E7A;">
                    Order Reference: <strong style="color: #8366B0; font-family: monospace; font-size: 14px;"><?= $orderNumber ?></strong>
                  </td>
                  <td align="right" style="font-size: 12px; color: #6D5E7A;">
                    Payment Method: <strong style="color: #26153D;"><?= $paymentTypeLabel ?></strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Itemized Products with Images & Quantity -->
          <tr>
            <td style="padding: 0 35px 25px 35px;">
              <div style="border-bottom: 2px solid #F0EAF5; padding-bottom: 8px; margin-bottom: 14px;">
                <h3 style="margin: 0; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #8F82A0; font-weight: 700;">
                  Order Items (<?= $totalItemsCount ?> <?= $totalItemsCount === 1 ? 'Piece' : 'Pieces' ?>)
                </h3>
              </div>
              
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <?php foreach ($items as $item): 
                  $rawImg = $item['product_image'] ?? ($item['primary_image'] ?? ($item['image_url'] ?? ''));
                  if (empty($rawImg)) {
                    $itemImage = 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=240&q=80';
                  } elseif (str_starts_with($rawImg, 'http://') || str_starts_with($rawImg, 'https://') || str_starts_with($rawImg, 'data:')) {
                    $itemImage = $rawImg;
                  } else {
                    $itemImage = $storeUrl . '/' . ltrim($rawImg, '/');
                  }
                  $qty = max(1, (int)($item['quantity'] ?? 1));
                  $unitPrice = (float)($item['unit_price'] ?? 0);
                  $totalPrice = (float)($item['total_price'] ?? ($unitPrice * $qty));
                ?>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #F4EFF8;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <!-- Product Thumbnail Image -->
                        <td width="68" valign="top" style="width: 68px; padding-right: 14px;">
                          <img src="<?= htmlspecialchars($itemImage) ?>" alt="<?= htmlspecialchars($item['product_name'] ?? 'Product') ?>" width="64" height="64" style="width: 64px; height: 64px; max-width: 64px; max-height: 64px; object-fit: cover; border-radius: 10px; border: 1px solid #EBE3F2; display: block;" />
                        </td>
                        <!-- Product Details & Quantity Badge -->
                        <td valign="top" style="font-size: 13px; line-height: 18px;">
                          <div style="font-size: 13px; font-weight: 700; color: #26153D; margin-bottom: 2px;">
                            <?= htmlspecialchars($item['product_name'] ?? 'Handcrafted Jewelry Piece') ?>
                          </div>
                          <?php if (!empty($item['variant_title'])): ?>
                          <div style="font-size: 11px; color: #8F82A0; margin-bottom: 4px;">
                            Option: <strong><?= htmlspecialchars($item['variant_title']) ?></strong>
                          </div>
                          <?php endif; ?>
                          <div style="margin-top: 4px;">
                            <span style="display: inline-block; background-color: #F5EEFA; color: #8366B0; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; border: 1px solid #E4D5EE;">
                              Quantity: <?= $qty ?>
                            </span>
                            <span style="font-size: 11px; color: #6D5E7A; margin-left: 6px;">
                              ₹<?= number_format($unitPrice, 2) ?> each
                            </span>
                          </div>
                        </td>
                        <!-- Line Total Price -->
                        <td width="90" align="right" valign="top" style="width: 90px; text-align: right;">
                          <div style="font-size: 14px; font-weight: 700; color: #26153D;">
                            ₹<?= number_format($totalPrice, 2) ?>
                          </div>
                          <?php if ($qty > 1): ?>
                          <div style="font-size: 10px; color: #8F82A0; margin-top: 2px;">
                            (<?= $qty ?> × ₹<?= number_format($unitPrice, 0) ?>)
                          </div>
                          <?php endif; ?>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <?php endforeach; ?>
              </table>
            </td>
          </tr>

          <!-- Financial Breakdown -->
          <tr>
            <td style="padding: 0 35px 25px 35px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="6">
                <tr>
                  <td style="font-size: 12px; color: #6D5E7A;">Subtotal</td>
                  <td align="right" style="font-size: 12px; color: #26153D; font-weight: 500;">₹<?= $subtotal ?></td>
                </tr>
                <?php if ((float)($order['discount_amount'] ?? 0) > 0): ?>
                <tr>
                  <td style="font-size: 12px; color: #10B981;">Coupon & Discounts</td>
                  <td align="right" style="font-size: 12px; color: #10B981; font-weight: 600;">-₹<?= $discount ?></td>
                </tr>
                <?php endif; ?>
                <tr>
                  <td style="font-size: 12px; color: #6D5E7A;">Express Courier Shipping</td>
                  <td align="right" style="font-size: 12px; color: #26153D; font-weight: 500;"><?= $shipping ?></td>
                </tr>
                <tr>
                  <td style="padding-top: 10px; border-top: 1px solid #EBE4F3; font-size: 14px; font-weight: 700; color: #26153D;">Total Order Value</td>
                  <td align="right" style="padding-top: 10px; border-top: 1px solid #EBE4F3; font-size: 16px; font-weight: 700; color: #8366B0;">₹<?= $total ?></td>
                </tr>
                
                <?php if ($isPartialCod): ?>
                <tr>
                  <td style="padding-top: 8px; font-size: 12px; color: #059669; font-weight: 600;">
                    ✓ Advance Paid Online (Verified)
                  </td>
                  <td align="right" style="padding-top: 8px; font-size: 13px; color: #059669; font-weight: 700;">
                    ₹<?= $amountPaid ?>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top: 8px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="10" style="background-color: #FEF3C7; border-radius: 8px; border: 1px solid #FCD34D;">
                      <tr>
                        <td style="font-size: 13px; color: #92400E; font-weight: 800;">
                          💵 Balance to be Paid at Delivery
                        </td>
                        <td align="right" style="font-size: 16px; color: #B45309; font-weight: 800; font-family: 'Georgia', serif;">
                          ₹<?= $amountDue ?>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <?php elseif ($isPrepaid): ?>
                <tr>
                  <td style="padding-top: 8px; font-size: 12px; color: #059669; font-weight: 600;">
                    ✓ Total Paid Online
                  </td>
                  <td align="right" style="padding-top: 8px; font-size: 13px; color: #059669; font-weight: 700;">
                    ₹<?= $total ?>
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: #6D5E7A; font-weight: 600;">
                    Amount Due on Delivery
                  </td>
                  <td align="right" style="font-size: 13px; color: #059669; font-weight: 700;">
                    ₹0.00 (Fully Prepaid)
                  </td>
                </tr>
                <?php elseif ($isFullCod): ?>
                <tr>
                  <td colspan="2" style="padding-top: 8px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="10" style="background-color: #FEF3C7; border-radius: 8px; border: 1px solid #FCD34D;">
                      <tr>
                        <td style="font-size: 13px; color: #92400E; font-weight: 800;">
                          💵 Amount Due on Doorstep Delivery
                        </td>
                        <td align="right" style="font-size: 16px; color: #B45309; font-weight: 800; font-family: 'Georgia', serif;">
                          ₹<?= $total ?>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <?php endif; ?>
              </table>
            </td>
          </tr>

          <!-- Shipping Destination Box -->
          <tr>
            <td style="padding: 0 35px 25px 35px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="15" style="background-color: #FAF7FC; border-radius: 12px; border: 1px solid #EBE3F2;">
                <tr>
                  <td>
                    <div style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #8F82A0; font-weight: 700; margin-bottom: 6px;">
                      Shipping Destination
                    </div>
                    <div style="font-size: 13px; color: #26153D; line-height: 20px;">
                      <strong><?= $customerName ?></strong><br>
                      <?= htmlspecialchars($order['shipping_address_line1'] ?? '') ?><br>
                      <?php if (!empty($order['shipping_address_line2'])): ?>
                      <?= htmlspecialchars($order['shipping_address_line2']) ?><br>
                      <?php endif; ?>
                      <?= htmlspecialchars($order['city'] ?? '') ?><?= !empty($order['state']) ? ', ' . htmlspecialchars($order['state']) : '' ?> <?= !empty($order['pincode']) ? '- ' . htmlspecialchars($order['pincode']) : '' ?><br>
                      <?php if (!empty($order['customer_phone'])): ?>
                      Mobile: +91 <?= htmlspecialchars($order['customer_phone']) ?>
                      <?php endif; ?>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Track CTA Button -->
          <tr>
            <td align="center" style="padding: 0 35px 35px 35px;">
              <a href="<?= $trackingUrl ?>" class="btn-primary" style="display: inline-block; background-color: #8366B0; color: #FFFFFF; text-decoration: none; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; padding: 14px 34px; border-radius: 12px; box-shadow: 0 4px 14px rgba(131, 102, 176, 0.35);">
                Track Order Status
              </a>
              <p style="margin: 14px 0 0 0; font-size: 11px; color: #8F82A0;">
                Delivered across India in 3–5 working days via Shiprocket Express Air.
              </p>
            </td>
          </tr>

          <!-- Luxury Footer -->
          <tr>
            <td align="center" style="padding: 25px 30px; background-color: #FAF7FC; border-top: 1px solid #F0EAF5;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #6D5E7A;">
                Questions regarding your piece? WhatsApp our Concierge at <a href="https://wa.me/919594477422?text=Hi%20Valerie%20Jewels,%20I%20have%20an%20inquiry%20about%20order%20<?= urlencode($orderNumber) ?>" target="_blank" style="color: #8366B0; font-weight: bold; text-decoration: none;">WhatsApp Concierge</a> or email <a href="mailto:orders@valeriejewels.in" style="color: #8366B0; text-decoration: underline;">orders@valeriejewels.in</a>
              </p>
              <p style="margin: 0; font-size: 10px; color: #A498B2; letter-spacing: 1px; text-transform: uppercase;">
                © <?= date('Y') ?> VALERIÉ JEWELS. All rights reserved. • 18K Anti-Tarnish Assurance
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
