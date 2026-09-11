<?php
/**
 * VALERIE JEWELS — Order Status Update Luxury HTML Email Template
 * 
 * Available Variables:
 * - $order (array): Master order record from orders table
 * - $items (array): Itemized product list from order_items table
 * - $storeUrl (string): Base URL of the storefront
 * - $status (string): Current status slug (e.g. 'confirmed', 'shipped', 'delivered', 'on_hold', 'cancelled')
 * - $customMessage (string|null): Optional personalized note from admin concierge
 */
$storeUrl = $storeUrl ?? 'http://localhost:5173';
$logoUrl = rtrim($storeUrl, '/') . '/valerie.png';
$trackingUrl = rtrim($storeUrl, '/') . '/#track-order?order=' . urlencode($order['order_number'] ?? '');
$orderNumber = htmlspecialchars($order['order_number'] ?? '');
$customerName = htmlspecialchars($order['customer_name'] ?? 'Valued Customer');
$statusSlug = strtolower(trim($status ?? ($order['order_status'] ?? 'processing')));

// Status Metadata Styling & Messages
$statusMeta = [
    'confirmed' => [
        'badge' => 'Order Confirmed',
        'color' => '#8366B0',
        'bg' => '#F4EFF8',
        'border' => '#E5D9F2',
        'icon' => '✓',
        'headline' => 'Piece Reserved & In Anti-Tarnish Preparation',
        'desc' => 'Your order has been verified and our team is preparing your handcrafted pieces with signature velvet packaging.'
    ],
    'processing' => [
        'badge' => 'In Crafting & Prep',
        'color' => '#8366B0',
        'bg' => '#F4EFF8',
        'border' => '#E5D9F2',
        'icon' => '✦',
        'headline' => 'Preparing Your Jewelry for Dispatch',
        'desc' => 'Every piece is undergoing 18K anti-tarnish inspection and micro-polishing prior to secure handover to our courier.'
    ],
    'shipped' => [
        'badge' => 'Dispatched & On The Way',
        'color' => '#2563EB',
        'bg' => '#EFF6FF',
        'border' => '#BFDBFE',
        'icon' => '✈',
        'headline' => 'Your Valerie Package is En Route',
        'desc' => 'Your shipment has been handed over to our express air delivery partner and is moving towards your doorstep.'
    ],
    'out_for_delivery' => [
        'badge' => 'Out for Delivery Today',
        'color' => '#059669',
        'bg' => '#ECFDF5',
        'border' => '#A7F3D0',
        'icon' => '📦',
        'headline' => 'Arriving Today',
        'desc' => 'The courier delivery executive is in your area today with your Valerie Jewels package. Please keep your phone handy.'
    ],
    'delivered' => [
        'badge' => 'Delivered with Care',
        'color' => '#10B981',
        'bg' => '#ECFDF5',
        'border' => '#A7F3D0',
        'icon' => '★',
        'headline' => 'Package Successfully Delivered',
        'desc' => 'Your order has been safely delivered! We hope you adore your new sparkle. Tag @valeriejewels to be featured.'
    ],
    'on_hold' => [
        'badge' => 'Order Temporarily On Hold',
        'color' => '#D97706',
        'bg' => '#FEF3C7',
        'border' => '#FDE68A',
        'icon' => '⏱',
        'headline' => 'Pending Quick Concierge Review',
        'desc' => 'Your order requires a minor confirmation (such as address validation). Our concierge team is on it.'
    ],
    'failed' => [
        'badge' => 'Payment Incomplete',
        'color' => '#E11D48',
        'bg' => '#FFF1F2',
        'border' => '#FFE4E6',
        'icon' => '✕',
        'headline' => 'Checkout Payment Not Received',
        'desc' => 'Your payment attempt was not finalized. Your selected pieces remain safe for a limited time.'
    ],
    'cancelled' => [
        'badge' => 'Order Cancelled',
        'color' => '#6B7280',
        'bg' => '#F3F4F6',
        'border' => '#E5E7EB',
        'icon' => '—',
        'headline' => 'Order Cancellation Confirmed',
        'desc' => 'This order has been cancelled. If any prepaid amount was collected, your full refund is initiated to the source account.'
    ]
];

$currMeta = $statusMeta[$statusSlug] ?? [
    'badge' => ucwords(str_replace('_', ' ', $statusSlug)),
    'color' => '#8366B0',
    'bg' => '#F4EFF8',
    'border' => '#E5D9F2',
    'icon' => '✦',
    'headline' => 'Order Status Update',
    'desc' => 'Your order status has been updated. You can review your real-time tracking anytime below.'
];

$paymentTypeLabel = ($order['payment_type'] ?? '') === 'full_prepaid' 
    ? 'Prepaid (UPI / Card)' 
    : (($order['payment_type'] ?? '') === 'partial' ? 'Partial COD (Deposit Paid)' : 'Cash on Delivery (COD)');
$subtotal = number_format((float)($order['subtotal'] ?? 0), 2);
$discount = number_format((float)($order['discount_amount'] ?? 0), 2);
$shipping = (float)($order['shipping_fee'] ?? 0) == 0 ? 'FREE' : '₹' . number_format((float)$order['shipping_fee'], 2);
$total    = number_format((float)($order['total_amount'] ?? 0), 2);
$amountPaid = number_format((float)($order['amount_paid_upfront'] ?? 0), 2);
$amountDue  = number_format((float)($order['amount_due_on_delivery'] ?? 0), 2);
$isPrepaid = ($order['payment_type'] ?? '') === 'full_prepaid';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= htmlspecialchars($currMeta['badge']) ?> — Valerie Jewels</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F8F5FB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #26153D; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    img { border: 0; outline: none; text-decoration: none; }
    .btn-track:hover { background-color: #6C4F99 !important; }
  </style>
</head>
<body style="margin: 0; padding: 30px 10px; background-color: #F8F5FB;">

  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        
        <!-- Main Card Container -->
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #EBE4F3; overflow: hidden; box-shadow: 0 4px 20px rgba(131, 102, 176, 0.08);">
          
          <!-- Brand Header with Logo on Top -->
          <tr>
            <td align="center" style="padding: 35px 30px 22px 30px; border-bottom: 1px solid #F2ECF7; background: linear-gradient(180deg, #FAF7FC 0%, #FFFFFF 100%);">
              <a href="<?= htmlspecialchars($storeUrl) ?>" target="_blank" style="text-decoration: none; display: inline-block;">
                <img src="<?= htmlspecialchars($logoUrl) ?>" alt="VALERIÉ" height="28" style="height: 28px; width: auto; max-height: 28px; display: block; margin: 0 auto;" />
              </a>
              <p style="margin: 6px 0 0 0; font-size: 10px; letter-spacing: 2.5px; text-transform: uppercase; color: #8F82A0; font-weight: 500;">
                Everyday Luxury Jewelry
              </p>
            </td>
          </tr>

          <!-- Dynamic Status Banner -->
          <tr>
            <td style="padding: 35px 35px 20px 35px; text-align: center;">
              <div style="display: inline-block; width: 50px; height: 50px; line-height: 50px; border-radius: 50%; background-color: <?= $currMeta['bg'] ?>; color: <?= $currMeta['color'] ?>; font-size: 22px; margin-bottom: 15px; font-weight: bold; border: 1px solid <?= $currMeta['border'] ?>;">
                <?= $currMeta['icon'] ?>
              </div>
              <div style="display: inline-block; padding: 4px 14px; border-radius: 20px; background-color: <?= $currMeta['bg'] ?>; color: <?= $currMeta['color'] ?>; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px; border: 1px solid <?= $currMeta['border'] ?>;">
                <?= htmlspecialchars($currMeta['badge']) ?>
              </div>
              <h2 style="margin: 0 0 8px 0; font-family: 'Georgia', serif; font-size: 22px; color: #26153D; font-weight: 600;">
                <?= htmlspecialchars($currMeta['headline']) ?>
              </h2>
              <p style="margin: 0; font-size: 13.5px; line-height: 22px; color: #6D5E7A;">
                Hello <strong><?= $customerName ?></strong>, here is the latest update regarding your order <strong style="color: #8366B0; font-family: monospace;"><?= $orderNumber ?></strong>.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 13px; line-height: 20px; color: #8F82A0;">
                <?= htmlspecialchars($currMeta['desc']) ?>
              </p>
            </td>
          </tr>

          <!-- Optional Admin Custom Message Note -->
          <?php if (!empty($customMessage)): ?>
          <tr>
            <td style="padding: 0 35px 20px 35px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="16" style="background-color: #FAF7FC; border-radius: 12px; border-left: 4px solid #8366B0; border-top: 1px solid #EBE3F2; border-right: 1px solid #EBE3F2; border-bottom: 1px solid #EBE3F2;">
                <tr>
                  <td>
                    <p style="margin: 0 0 5px 0; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #8366B0; font-weight: 700;">
                      💌 Note From Valerie Concierge:
                    </p>
                    <p style="margin: 0; font-size: 13px; line-height: 20px; color: #26153D;">
                      <?= nl2br(htmlspecialchars($customMessage)) ?>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <?php endif; ?>

          <!-- Tracking / Live Shipment Info -->
          <?php if (!empty($order['tracking_number'])): ?>
          <tr>
            <td style="padding: 0 35px 20px 35px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="14" style="background-color: #EFF6FF; border-radius: 12px; border: 1px solid #BFDBFE;">
                <tr>
                  <td>
                    <div style="font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: #1D4ED8; font-weight: 700; margin-bottom: 4px;">
                      🚚 Courier Waybill / AWB Number
                    </div>
                    <div style="font-size: 14px; font-weight: bold; font-family: monospace; color: #1E3A8A;">
                      <?= htmlspecialchars($order['tracking_number']) ?> 
                      <?php if (!empty($order['courier_name'])): ?>
                      <span style="font-size: 12px; font-weight: normal; color: #3B82F6;">(<?= htmlspecialchars($order['courier_name']) ?>)</span>
                      <?php endif; ?>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <?php endif; ?>

          <!-- Complimentary Gift Callout for Prepaid Orders -->
          <?php if ($isPrepaid): ?>
          <tr>
            <td style="padding: 0 35px 20px 35px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="12" style="background: linear-gradient(135deg, #FAF5FF 0%, #F5F3FF 100%); border-radius: 12px; border: 1px solid #DDD6FE;">
                <tr>
                  <td width="30" valign="middle" style="font-size: 20px; text-align: center;">✨</td>
                  <td valign="middle" style="font-size: 12px; color: #5B21B6; line-height: 18px;">
                    <strong>Prepaid Order Privilege:</strong> Includes a <strong>Complimentary Anti-Tarnish Zircon Necklace</strong> gift and signature velvet travel pouch!
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <?php endif; ?>

          <!-- Order Summary Badge -->
          <tr>
            <td style="padding: 0 35px 20px 35px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="12" style="background-color: #FAF7FC; border-radius: 12px; border: 1px solid #EBE3F2;">
                <tr>
                  <td style="font-size: 12px; color: #6D5E7A;">
                    Order Reference: <strong style="color: #8366B0; font-family: monospace; font-size: 13px;"><?= $orderNumber ?></strong>
                  </td>
                  <td align="right" style="font-size: 12px; color: #6D5E7A;">
                    Payment Mode: <strong style="color: #26153D;"><?= $paymentTypeLabel ?></strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Itemized Table -->
          <tr>
            <td style="padding: 0 35px 20px 35px;">
              <h3 style="margin: 0 0 12px 0; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #8F82A0; font-weight: 700;">
                Your Ordered Pieces
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
                  <td style="font-size: 12px; color: #10B981;">Exclusive Discount</td>
                  <td align="right" style="font-size: 12px; color: #10B981; font-weight: 600;">-₹<?= $discount ?></td>
                </tr>
                <?php endif; ?>
                <tr>
                  <td style="font-size: 12px; color: #6D5E7A;">Express Courier Delivery (5–7 Working Days)</td>
                  <td align="right" style="font-size: 12px; color: #26153D; font-weight: 500;"><?= $shipping ?></td>
                </tr>
                <tr>
                  <td style="padding-top: 8px; border-top: 1px solid #EBE4F3; font-size: 14px; font-weight: 700; color: #26153D;">Total Order Value</td>
                  <td align="right" style="padding-top: 8px; border-top: 1px solid #EBE4F3; font-size: 16px; font-weight: 700; color: #8366B0;">₹<?= $total ?></td>
                </tr>
                
                <?php if ((float)$order['amount_due_on_delivery'] > 0): ?>
                <tr>
                  <td style="padding-top: 6px; font-size: 12px; color: #10B981; font-weight: 600;">Amount Paid</td>
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
                      Shipping Address
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

          <!-- Track CTA Button -->
          <tr>
            <td align="center" style="padding: 0 35px 35px 35px;">
              <a href="<?= $trackingUrl ?>" class="btn-track" style="display: inline-block; background-color: #8366B0; color: #FFFFFF; text-decoration: none; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(131, 102, 176, 0.3);">
                Track Live Order
              </a>
              <p style="margin: 15px 0 0 0; font-size: 11px; color: #8F82A0;">
                Delivery across India in 5–7 working days via Shiprocket Express Air.
              </p>
            </td>
          </tr>

          <!-- Luxury Footer -->
          <tr>
            <td align="center" style="padding: 25px 30px; background-color: #FAF7FC; border-top: 1px solid #F0EAF5;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #6D5E7A;">
                Have questions or need instant updates? WhatsApp our Concierge at <a href="https://wa.me/919999999999?text=Hi%20Valerie%20Jewels,%20I%20have%20an%20inquiry%20about%20order%20<?= urlencode($orderNumber) ?>" target="_blank" style="color: #8366B0; font-weight: bold; text-decoration: none;">+91 99999 99999</a> or email <a href="mailto:support@valeriejewels.com" style="color: #8366B0; text-decoration: underline;">support@valeriejewels.com</a>
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
