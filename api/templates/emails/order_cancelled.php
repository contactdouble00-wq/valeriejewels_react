<?php
/**
 * VALERIE JEWELS — Order Cancelled & Refund Luxury HTML Email Template
 * 
 * Available Variables:
 * - $order (array): Master order record from orders table
 * - $storeUrl (string): Base URL of the storefront
 */
$storeUrl = $storeUrl ?? 'http://localhost:5173';
$logoUrl = rtrim($storeUrl, '/') . '/valerie.png';
$orderNumber = htmlspecialchars($order['order_number'] ?? '');
$customerName = htmlspecialchars($order['customer_name'] ?? 'Valued Customer');
$reason = htmlspecialchars($order['cancellation_reason'] ?? 'Customer requested cancellation prior to dispatch');
$refundAmount = (float)($order['refund_amount'] ?? 0);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Cancellation & Refund Notice — Valerie Jewels</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F8F5FB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #26153D; }
    table { border-collapse: collapse; }
  </style>
</head>
<body style="margin: 0; padding: 30px 10px; background-color: #F8F5FB;">

  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #EBE4F3; overflow: hidden; box-shadow: 0 4px 20px rgba(131, 102, 176, 0.08);">
          
          <!-- Header with Logo on Top -->
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

          <!-- Banner -->
          <tr>
            <td style="padding: 35px 35px 20px 35px; text-align: center;">
              <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 50%; background-color: #FDF2F4; color: #E11D48; font-size: 22px; margin-bottom: 15px;">
                ✕
              </div>
              <h2 style="margin: 0 0 8px 0; font-family: 'Georgia', serif; font-size: 22px; color: #26153D; font-weight: 600;">
                Order Cancelled
              </h2>
              <p style="margin: 0; font-size: 13px; line-height: 20px; color: #6D5E7A;">
                Dear <strong><?= $customerName ?></strong>, your cancellation request for order <strong><?= $orderNumber ?></strong> has been processed successfully.
              </p>
            </td>
          </tr>

          <!-- Refund Details Card -->
          <tr>
            <td style="padding: 0 35px 25px 35px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="18" style="background-color: #FAF7FC; border-radius: 14px; border: 1px solid #EBE3F2;">
                <tr>
                  <td>
                    <?php if ($refundAmount > 0): ?>
                    <div style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #10B981; font-weight: 700; margin-bottom: 6px;">
                      Refund Scheduled to Source Account
                    </div>
                    <div style="font-size: 24px; font-weight: 700; color: #10B981; margin-bottom: 10px;">
                      ₹<?= number_format($refundAmount, 2) ?>
                    </div>
                    <p style="margin: 0; font-size: 12px; color: #6D5E7A; line-height: 18px;">
                      A full refund for your upfront payment has been initiated. Funds will be credited directly back to your original payment method within <strong>3–5 business banking days</strong>.
                    </p>
                    <?php else: ?>
                    <div style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #8F82A0; font-weight: 700; margin-bottom: 6px;">
                      Cash on Delivery Cancellation
                    </div>
                    <p style="margin: 0; font-size: 12px; color: #6D5E7A; line-height: 18px;">
                      Since this was a Cash on Delivery order, no payment was collected upfront and no refund is required.
                    </p>
                    <?php endif; ?>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Cancellation Reason -->
          <tr>
            <td style="padding: 0 35px 25px 35px;">
              <div style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #8F82A0; font-weight: 700; margin-bottom: 4px;">
                Cancellation Note
              </div>
              <div style="font-size: 12px; color: #6D5E7A; line-height: 18px;">
                "<?= $reason ?>"
              </div>
            </td>
          </tr>

          <!-- Explore Catalog CTA -->
          <tr>
            <td align="center" style="padding: 0 35px 35px 35px;">
              <a href="<?= $storeUrl ?>" style="display: inline-block; background-color: #8366B0; color: #FFFFFF; text-decoration: none; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; padding: 12px 28px; border-radius: 10px; box-shadow: 0 4px 10px rgba(131, 102, 176, 0.25);">
                Browse New Arrivals
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 25px 30px; background-color: #FAF7FC; border-top: 1px solid #F0EAF5;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #6D5E7A;">
                Have questions about your refund? Contact Concierge at <a href="mailto:support@valeriejewels.com" style="color: #8366B0; text-decoration: underline;">support@valeriejewels.com</a>
              </p>
              <p style="margin: 0; font-size: 10px; color: #A498B2; letter-spacing: 1px; text-transform: uppercase;">
                © <?= date('Y') ?> VALERIÉ JEWELS • Transparent Returns Assurance
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
