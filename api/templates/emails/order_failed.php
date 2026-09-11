<?php
/**
 * VALERIE JEWELS — Order Failed / Payment Drop-off Luxury HTML Email Template
 * 
 * Available Variables:
 * - $order (array): Master order record from orders table
 * - $items (array): Itemized product list from order_items table
 * - $storeUrl (string): Base URL of the storefront
 * - $reason (string|null): Optional failure reason / bank code
 */
$storeUrl = $storeUrl ?? 'http://localhost:5173';
$logoUrl = rtrim($storeUrl, '/') . '/valerie.png';
$retryUrl = rtrim($storeUrl, '/') . '/#checkout?order=' . urlencode($order['order_number'] ?? '');
$orderNumber = htmlspecialchars($order['order_number'] ?? '');
$customerName = htmlspecialchars($order['customer_name'] ?? 'Valued Customer');
$total = number_format((float)($order['total_amount'] ?? 0), 2);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Incomplete — Valerie Jewels</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F8F5FB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #26153D; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    img { border: 0; outline: none; text-decoration: none; }
    .btn-retry:hover { background-color: #6C4F99 !important; }
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

          <!-- Alert Banner -->
          <tr>
            <td style="padding: 35px 35px 20px 35px; text-align: center;">
              <div style="display: inline-block; width: 50px; height: 50px; line-height: 50px; border-radius: 50%; background-color: #FFF1F2; color: #E11D48; font-size: 22px; margin-bottom: 15px; font-weight: bold; border: 1px solid #FFE4E6;">
                ✕
              </div>
              <h2 style="margin: 0 0 8px 0; font-family: 'Georgia', serif; font-size: 22px; color: #26153D; font-weight: 600;">
                Payment Incomplete — Your Pieces Are Safe
              </h2>
              <p style="margin: 0; font-size: 13.5px; line-height: 22px; color: #6D5E7A;">
                Hello <strong><?= $customerName ?></strong>, we noticed that your checkout for order reference <strong style="color: #8366B0; font-family: monospace;"><?= $orderNumber ?></strong> could not be completed.
              </p>
            </td>
          </tr>

          <!-- Reassurance Box -->
          <tr>
            <td style="padding: 0 35px 20px 35px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="14" style="background-color: #FFF5F5; border-radius: 12px; border: 1px solid #FED7D7;">
                <tr>
                  <td>
                    <p style="margin: 0 0 6px 0; font-size: 12.5px; color: #9B2C2C; font-weight: bold;">
                      🛡️ Was money debited from your account?
                    </p>
                    <p style="margin: 0; font-size: 12px; line-height: 18px; color: #742A2A;">
                      If an amount was deducted from your UPI or bank, please rest assured: banking networks automatically refund interrupted transactions within 24–48 hours. No duplicate charge will occur.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Saved in Bag -->
          <tr>
            <td style="padding: 0 35px 20px 35px;">
              <div style="border: 1px solid #EBE3F2; border-radius: 14px; padding: 18px; background-color: #FAF7FC;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #8F82A0; font-weight: 700; padding-bottom: 12px; border-bottom: 1px solid #EBE3F2;">
                      Reserved Jewelry Pieces
                    </td>
                    <td align="right" style="font-size: 11px; color: #8F82A0; font-weight: 600; padding-bottom: 12px; border-bottom: 1px solid #EBE3F2;">
                      Order Amount: <strong style="color: #26153D; font-size: 13px;">₹<?= $total ?></strong>
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

          <!-- Prominent Call to Action -->
          <tr>
            <td align="center" style="padding: 5px 35px 25px 35px;">
              <table border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="border-radius: 12px; background-color: #8366B0; box-shadow: 0 4px 15px rgba(131, 102, 176, 0.35);">
                    <a href="<?= htmlspecialchars($retryUrl) ?>" target="_blank" class="btn-retry" style="display: inline-block; padding: 16px 36px; font-size: 13px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #FFFFFF; text-decoration: none; border-radius: 12px;">
                      Complete Your Order / Retry Payment &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 12px 0 0 0; font-size: 11px; color: #8F82A0;">
                Prefer Cash on Delivery? You can easily switch to COD on checkout.
              </p>
            </td>
          </tr>

          <!-- Personal Concierge Help -->
          <tr>
            <td style="padding: 0 35px 30px 35px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="16" style="background-color: #F8F5FB; border-radius: 12px; border: 1px solid #EBE4F3; text-align: center;">
                <tr>
                  <td>
                    <h4 style="margin: 0 0 6px 0; font-size: 13px; color: #26153D; font-weight: 700;">
                      Need Instant Help Completing This Order?
                    </h4>
                    <p style="margin: 0 0 14px 0; font-size: 12px; color: #6D5E7A; line-height: 18px;">
                      Our Valerie Jewels Concierge can assist you with alternative payment methods, direct UPI links, or placing the order manually over WhatsApp.
                    </p>
                    <table border="0" cellspacing="0" cellpadding="0" align="center">
                      <tr>
                        <td style="padding: 0 6px;">
                          <a href="https://wa.me/917016347945?text=<?= urlencode("Hello Valerie Jewels, I need help completing my order " . $orderNumber) ?>" target="_blank" style="display: inline-block; padding: 8px 16px; background-color: #25D366; color: #FFFFFF; text-decoration: none; font-size: 11px; font-weight: 700; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                            Chat on WhatsApp
                          </a>
                        </td>
                        <td style="padding: 0 6px;">
                          <a href="tel:+919023422392" style="display: inline-block; padding: 8px 16px; background-color: #FFFFFF; color: #26153D; text-decoration: none; font-size: 11px; font-weight: 700; border-radius: 8px; border: 1px solid #D5C7E6; text-transform: uppercase; letter-spacing: 0.5px;">
                            Call +91 90234 22392
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
                18K PVD Anti-Tarnish • 100% Waterproof & Shower-Safe • Complimentary Express Shipping Across India
              </p>
              <p style="margin: 0; font-size: 10px; color: #B3A8C2;">
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
