<?php
/**
 * VALERIE JEWELS — Order On Hold Luxury HTML Email Template
 * 
 * Available Variables:
 * - $order (array): Master order record from orders table
 * - $items (array): Itemized product list from order_items table
 * - $storeUrl (string): Base URL of the storefront
 * - $reason (string|null): Optional reason for hold (e.g. address verification)
 */
$storeUrl = $storeUrl ?? 'http://localhost:5173';
$logoUrl = rtrim($storeUrl, '/') . '/valerie.png';
$trackingUrl = rtrim($storeUrl, '/') . '/#track-order?order=' . urlencode($order['order_number'] ?? '');
$orderNumber = htmlspecialchars($order['order_number'] ?? '');
$customerName = htmlspecialchars($order['customer_name'] ?? 'Valued Customer');
$holdReason = !empty($reason) ? htmlspecialchars($reason) : 'Standard concierge verification & address validation';
$total = number_format((float)($order['total_amount'] ?? 0), 2);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order On Hold — Valerie Jewels</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F8F5FB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #26153D; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    img { border: 0; outline: none; text-decoration: none; }
    .btn-action:hover { background-color: #6C4F99 !important; }
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

          <!-- On Hold Banner -->
          <tr>
            <td style="padding: 35px 35px 20px 35px; text-align: center;">
              <div style="display: inline-block; width: 50px; height: 50px; line-height: 50px; border-radius: 50%; background-color: #FEF3C7; color: #D97706; font-size: 22px; margin-bottom: 15px; font-weight: bold; border: 1px solid #FDE68A;">
                ⏱
              </div>
              <h2 style="margin: 0 0 8px 0; font-family: 'Georgia', serif; font-size: 22px; color: #26153D; font-weight: 600;">
                Your Order is Temporarily On Hold
              </h2>
              <p style="margin: 0; font-size: 13.5px; line-height: 22px; color: #6D5E7A;">
                Hello <strong><?= $customerName ?></strong>, your order <strong style="color: #8366B0; font-family: monospace;"><?= $orderNumber ?></strong> is currently under brief concierge review.
              </p>
            </td>
          </tr>

          <!-- Notice Box -->
          <tr>
            <td style="padding: 0 35px 20px 35px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="14" style="background-color: #FFFBEB; border-radius: 12px; border: 1px solid #FDE68A;">
                <tr>
                  <td>
                    <p style="margin: 0 0 4px 0; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: #92400E; font-weight: bold;">
                      Review Status:
                    </p>
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #78350F; font-weight: 600;">
                      <?= $holdReason ?>
                    </p>
                    <p style="margin: 0; font-size: 12px; line-height: 18px; color: #92400E;">
                      Our fulfillment atelier routinely verifies shipping addresses and courier connectivity to guarantee seamless delivery. As soon as review finishes, your jewelry will be prepped for dispatch.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items in Order -->
          <tr>
            <td style="padding: 0 35px 20px 35px;">
              <div style="border: 1px solid #EBE3F2; border-radius: 14px; padding: 18px; background-color: #FAF7FC;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #8F82A0; font-weight: 700; padding-bottom: 12px; border-bottom: 1px solid #EBE3F2;">
                      Order Summary
                    </td>
                    <td align="right" style="font-size: 11px; color: #8F82A0; font-weight: 600; padding-bottom: 12px; border-bottom: 1px solid #EBE3F2;">
                      Total: <strong style="color: #26153D; font-size: 13px;">₹<?= $total ?></strong>
                    </td>
                  </tr>

                  <?php foreach ($items as $item): ?>
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #F0EAF5;">
                      <div style="font-size: 13px; font-weight: 600; color: #26153D;">
                        <?= htmlspecialchars($item['product_name'] ?? 'Luxury Jewelry Piece') ?>
                      </div>
                      <?php if (!empty($item['variant_title'])): ?>
                      <div style="font-size: 11px; color: #8366B0; margin-top: 2px;">
                        <?= htmlspecialchars($item['variant_title']) ?>
                      </div>
                      <?php endif; ?>
                    </td>
                    <td align="right" style="padding: 12px 0; border-bottom: 1px solid #F0EAF5; font-size: 13px; font-weight: 700; color: #26153D;">
                      ₹<?= number_format((float)($item['total_price'] ?? 0), 2) ?>
                    </td>
                  </tr>
                  <?php endforeach; ?>
                </table>
              </div>
            </td>
          </tr>

          <!-- Instant Resolution Box -->
          <tr>
            <td style="padding: 0 35px 30px 35px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="18" style="background-color: #F8F5FB; border-radius: 12px; border: 1px solid #EBE4F3; text-align: center;">
                <tr>
                  <td>
                    <h4 style="margin: 0 0 6px 0; font-size: 13px; color: #26153D; font-weight: 700;">
                      Want to expedite dispatch immediately?
                    </h4>
                    <p style="margin: 0 0 14px 0; font-size: 12px; color: #6D5E7A; line-height: 18px;">
                      Confirm your shipping landmark or check with our concierge team directly on WhatsApp for priority processing.
                    </p>
                    <table border="0" cellspacing="0" cellpadding="0" align="center">
                      <tr>
                        <td style="padding: 0 6px;">
                          <a href="https://wa.me/917016347945?text=<?= urlencode("Hello Valerie Jewels, I would like to verify my order " . $orderNumber . " which is on hold.") ?>" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #25D366; color: #FFFFFF; text-decoration: none; font-size: 11.5px; font-weight: 700; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                            Verify on WhatsApp &rarr;
                          </a>
                        </td>
                        <td style="padding: 0 6px;">
                          <a href="<?= htmlspecialchars($trackingUrl) ?>" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #8366B0; color: #FFFFFF; text-decoration: none; font-size: 11.5px; font-weight: 700; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                            Track Order Status
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 25px 35px; background-color: #FAF7FC; border-top: 1px solid #F2ECF7;">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #8F82A0; font-weight: 600;">
                18K PVD Anti-Tarnish • 100% Waterproof &amp; Shower-Safe • Complimentary Express Shipping Across India
              </p>
              <p style="margin: 0; font-size: 10px; color: #B3A8C2;">
                &copy; <?= date('Y') ?> Valerie Jewels. Concierge: +91 70163 47945 • orders@valeriejewels.in
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
