<?php
/**
 * VALERIE JEWELS — Order Confirmation Luxury HTML Email Template
 * 
 * Available Variables:
 * - $order (array): Master order record from orders table
 * - $items (array): Itemized product list from order_items table
 * - $storeUrl (string): Base URL of the storefront
 */
$storeUrl = $storeUrl ?? 'http://localhost:5173';
$trackingUrl = $storeUrl . '/#track-order';
$orderNumber = htmlspecialchars($order['order_number'] ?? '');
$customerName = htmlspecialchars($order['customer_name'] ?? 'Valued Customer');
$paymentTypeLabel = ($order['payment_type'] ?? '') === 'full_prepaid' 
    ? 'Prepaid (UPI / Card / NetBanking)' 
    : (($order['payment_type'] ?? '') === 'partial' ? 'Partial COD (Deposit Paid)' : 'Cash on Delivery (Full COD)');
$amountPaid = number_format((float)($order['amount_paid_upfront'] ?? 0), 2);
$amountDue  = number_format((float)($order['amount_due_on_delivery'] ?? 0), 2);
$subtotal   = number_format((float)($order['subtotal'] ?? 0), 2);
$discount   = number_format((float)($order['discount_amount'] ?? 0), 2);
$shipping   = (float)($order['shipping_fee'] ?? 0) == 0 ? 'FREE' : '₹' . number_format((float)$order['shipping_fee'], 2);
$total      = number_format((float)($order['total_amount'] ?? 0), 2);
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
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #EBE4F3; overflow: hidden; box-shadow: 0 4px 20px rgba(131, 102, 176, 0.08);">
          
          <!-- Brand Header -->
          <tr>
            <td align="center" style="padding: 35px 30px 25px 30px; border-bottom: 1px solid #F2ECF7; background: linear-gradient(180deg, #FAF7FC 0%, #FFFFFF 100%);">
              <h1 style="margin: 0; font-family: 'Georgia', serif; font-size: 28px; letter-spacing: 4px; font-weight: 700; color: #8366B0; text-transform: uppercase;">
                VALERIÉ
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #8F82A0; font-weight: 500;">
                Everyday Luxury Jewelry
              </p>
            </td>
          </tr>

          <!-- Confirmation Banner -->
          <tr>
            <td style="padding: 35px 35px 20px 35px; text-align: center;">
              <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 50%; background-color: #EBF8F2; color: #10B981; font-size: 24px; margin-bottom: 15px;">
                ✓
              </div>
              <h2 style="margin: 0 0 8px 0; font-family: 'Georgia', serif; font-size: 22px; color: #26153D; font-weight: 600;">
                Your Order is Confirmed
              </h2>
              <p style="margin: 0; font-size: 13px; line-height: 20px; color: #6D5E7A;">
                Thank you for choosing Valerie Jewels, <strong><?= $customerName ?></strong>. Our master craftsmen have allocated your piece for luxury anti-tarnish preparation.
              </p>
            </td>
          </tr>

          <!-- Order Summary Badge -->
          <tr>
            <td style="padding: 0 35px 25px 35px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="12" style="background-color: #FAF7FC; border-radius: 12px; border: 1px solid #EBE3F2;">
                <tr>
                  <td style="font-size: 12px; color: #6D5E7A;">
                    Order Reference: <strong style="color: #8366B0; font-family: monospace; font-size: 13px;"><?= $orderNumber ?></strong>
                  </td>
                  <td align="right" style="font-size: 12px; color: #6D5E7A;">
                    Payment: <strong style="color: #26153D;"><?= $paymentTypeLabel ?></strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Itemized Table -->
          <tr>
            <td style="padding: 0 35px 20px 35px;">
              <h3 style="margin: 0 0 12px 0; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #8F82A0; font-weight: 700;">
                Order Summary
              </h3>
              
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <?php foreach ($items as $item): ?>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #F4EFF8;">
                    <div style="font-size: 13px; font-weight: 600; color: #26153D;">
                      <?= htmlspecialchars($item['product_name']) ?>
                    </div>
                    <?php if (!empty($item['variant_title'])): ?>
                    <div style="font-size: 11px; color: #8F82A0; margin-top: 2px;">
                      Option: <?= htmlspecialchars($item['variant_title']) ?>
                    </div>
                    <?php endif; ?>
                    <div style="font-size: 12px; color: #6D5E7A; margin-top: 3px;">
                      Qty: <?= (int)$item['quantity'] ?> × ₹<?= number_format((float)$item['unit_price'], 2) ?>
                    </div>
                  </td>
                  <td align="right" style="padding: 12px 0; border-bottom: 1px solid #F4EFF8; font-size: 13px; font-weight: 600; color: #26153D; vertical-align: top;">
                    ₹<?= number_format((float)$item['total_price'], 2) ?>
                  </td>
                </tr>
                <?php endforeach; ?>
              </table>
            </td>
          </tr>

          <!-- Financial Breakdown -->
          <tr>
            <td style="padding: 0 35px 25px 35px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="5">
                <tr>
                  <td style="font-size: 12px; color: #6D5E7A;">Subtotal</td>
                  <td align="right" style="font-size: 12px; color: #26153D; font-weight: 500;">₹<?= $subtotal ?></td>
                </tr>
                <?php if ((float)$order['discount_amount'] > 0): ?>
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
                  <td style="padding-top: 8px; border-top: 1px solid #EBE4F3; font-size: 14px; font-weight: 700; color: #26153D;">Total Order Value</td>
                  <td align="right" style="padding-top: 8px; border-top: 1px solid #EBE4F3; font-size: 16px; font-weight: 700; color: #8366B0;">₹<?= $total ?></td>
                </tr>
                
                <?php if ((float)$order['amount_due_on_delivery'] > 0): ?>
                <tr>
                  <td style="padding-top: 6px; font-size: 12px; color: #10B981; font-weight: 600;">Amount Paid Upfront</td>
                  <td align="right" style="padding-top: 6px; font-size: 12px; color: #10B981; font-weight: 600;">₹<?= $amountPaid ?></td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: #B45309; font-weight: 600;">Balance Due on Courier Delivery</td>
                  <td align="right" style="font-size: 12px; color: #B45309; font-weight: 600;">₹<?= $amountDue ?></td>
                </tr>
                <?php endif; ?>
              </table>
            </td>
          </tr>

          <!-- Shipping Address Box -->
          <tr>
            <td style="padding: 0 35px 25px 35px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="15" style="background-color: #FAF7FC; border-radius: 12px; border: 1px solid #EBE3F2;">
                <tr>
                  <td>
                    <div style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #8F82A0; font-weight: 700; margin-bottom: 5px;">
                      Shipping Destination
                    </div>
                    <div style="font-size: 13px; color: #26153D; line-height: 18px;">
                      <strong><?= $customerName ?></strong><br>
                      <?= htmlspecialchars($order['shipping_address_line1']) ?><br>
                      <?php if (!empty($order['shipping_address_line2'])): ?>
                      <?= htmlspecialchars($order['shipping_address_line2']) ?><br>
                      <?php endif; ?>
                      <?= htmlspecialchars($order['city']) ?>, <?= htmlspecialchars($order['state']) ?> - <?= htmlspecialchars($order['pincode']) ?><br>
                      Mobile: +91 <?= htmlspecialchars($order['customer_phone']) ?>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Track CTA -->
          <tr>
            <td align="center" style="padding: 0 35px 35px 35px;">
              <a href="<?= $trackingUrl ?>" class="btn-primary" style="display: inline-block; background-color: #8366B0; color: #FFFFFF; text-decoration: none; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(131, 102, 176, 0.3);">
                Track Order Status
              </a>
              <p style="margin: 15px 0 0 0; font-size: 11px; color: #8F82A0;">
                Estimated dispatch in 24–48 hours via Shiprocket Express Air.
              </p>
            </td>
          </tr>

          <!-- Luxury Footer -->
          <tr>
            <td align="center" style="padding: 25px 30px; background-color: #FAF7FC; border-top: 1px solid #F0EAF5;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #6D5E7A;">
                Questions regarding your piece? Contact our Concierge at <a href="mailto:support@valeriejewels.com" style="color: #8366B0; text-decoration: underline;">support@valeriejewels.com</a>
              </p>
              <p style="margin: 0; font-size: 10px; color: #A498B2; letter-spacing: 1px; text-transform: uppercase;">
                © <?= date('Y') ?> VALERIÉ JEWELS. All rights reserved. • 18K PVD Gold Plating Anti-Tarnish Assurance
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
