<?php
/**
 * VALERIE JEWELS — Order Shipped Luxury HTML Email Template
 * 
 * Available Variables:
 * - $order (array): Master order record from orders table
 * - $items (array): Itemized product list
 * - $storeUrl (string): Base URL of the storefront
 */
$storeUrl = $storeUrl ?? 'http://localhost:5173';
$assetLogoFile = dirname(dirname(dirname(__DIR__))) . '/Assets/valerie.png';
if (file_exists($assetLogoFile) && (!isset($logoUrl) || strpos($storeUrl, 'localhost') !== false || strpos($storeUrl, '127.0.0.1') !== false)) {
    $logoUrl = 'data:image/png;base64,' . base64_encode(file_get_contents($assetLogoFile));
} else {
    $logoUrl = $logoUrl ?? (rtrim($storeUrl, '/') . '/valerie.png');
}
$orderNumber = htmlspecialchars($order['order_number'] ?? '');
$customerName = htmlspecialchars($order['customer_name'] ?? 'Valued Customer');
$courierName = htmlspecialchars($order['courier_name'] ?: 'Bluedart Express');
$awbCode = htmlspecialchars($order['shiprocket_awb'] ?? 'PENDING');
$trackingUrl = $order['tracking_url'] ?: "https://shiprocket.co/tracking/{$awbCode}";
$deliveryDate = !empty($order['estimated_delivery_date']) 
    ? date('D, d M Y', strtotime($order['estimated_delivery_date'])) 
    : 'Within 3–5 Business Days';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Piece Has Shipped — Valerie Jewels</title>
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

          <!-- Shipment Announcement -->
          <tr>
            <td style="padding: 35px 35px 20px 35px; text-align: center;">
              <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 50%; background-color: #EDE9F6; color: #8366B0; font-size: 22px; margin-bottom: 15px;">
                ✈️
              </div>
              <h2 style="margin: 0 0 8px 0; font-family: 'Georgia', serif; font-size: 22px; color: #26153D; font-weight: 600;">
                Your Jewelry Piece Has Dispatched
              </h2>
              <p style="margin: 0; font-size: 13px; line-height: 20px; color: #6D5E7A;">
                Great news, <strong><?= $customerName ?></strong>! Your order <strong><?= $orderNumber ?></strong> has cleared quality assurance and has been handed over to <strong><?= $courierName ?> Air</strong>.
              </p>
            </td>
          </tr>

          <!-- Tracking Highlight Card -->
          <tr>
            <td style="padding: 0 35px 25px 35px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="18" style="background: linear-gradient(135deg, #FAF7FC 0%, #F5EFF9 100%); border-radius: 14px; border: 1px solid #E0D4EB; text-align: center;">
                <tr>
                  <td>
                    <div style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #8366B0; font-weight: 700; margin-bottom: 6px;">
                      Shiprocket Courier AWB
                    </div>
                    <div style="font-family: monospace; font-size: 18px; font-weight: 700; color: #26153D; letter-spacing: 1px; margin-bottom: 12px;">
                      <?= $awbCode ?>
                    </div>
                    <div style="font-size: 12px; color: #6D5E7A; margin-bottom: 18px;">
                      Estimated Express Delivery: <strong style="color: #26153D;"><?= $deliveryDate ?></strong>
                    </div>
                    <div>
                      <a href="<?= $trackingUrl ?>" style="display: inline-block; background-color: #8366B0; color: #FFFFFF; text-decoration: none; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; padding: 12px 28px; border-radius: 10px; box-shadow: 0 4px 10px rgba(131, 102, 176, 0.25);">
                        Track Live Shipment
                      </a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items in Shipment -->
          <tr>
            <td style="padding: 0 35px 25px 35px;">
              <h3 style="margin: 0 0 10px 0; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #8F82A0; font-weight: 700;">
                Items in This Package (<?= count($items) ?>)
              </h3>
              
              <table width="100%" border="0" cellspacing="0" cellpadding="8" style="background-color: #FAF7FC; border-radius: 10px; border: 1px solid #EBE3F2;">
                <?php foreach ($items as $item): ?>
                <tr>
                  <td style="font-size: 12px; color: #26153D; font-weight: 600;">
                    <?= (int)$item['quantity'] ?>× <?= htmlspecialchars($item['product_name']) ?>
                  </td>
                  <td align="right" style="font-size: 12px; color: #6D5E7A;">
                    <?= !empty($item['variant_title']) ? htmlspecialchars($item['variant_title']) : 'Anti-Tarnish 18K' ?>
                  </td>
                </tr>
                <?php endforeach; ?>
              </table>
            </td>
          </tr>

          <!-- Delivery Address -->
          <tr>
            <td style="padding: 0 35px 30px 35px;">
              <div style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #8F82A0; font-weight: 700; margin-bottom: 4px;">
                Delivering To
              </div>
              <div style="font-size: 12px; color: #6D5E7A; line-height: 18px;">
                <?= htmlspecialchars($order['shipping_address_line1']) ?>, <?= htmlspecialchars($order['city']) ?>, <?= htmlspecialchars($order['state']) ?> - <?= htmlspecialchars($order['pincode']) ?>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 25px 30px; background-color: #FAF7FC; border-top: 1px solid #F0EAF5;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #6D5E7A;">
                Need help with delivery? Reply to this email or visit <a href="<?= $storeUrl ?>/#track-order" style="color: #8366B0; text-decoration: underline;">Valerie Tracking Portal</a>.
              </p>
              <p style="margin: 0; font-size: 10px; color: #A498B2; letter-spacing: 1px; text-transform: uppercase;">
                © <?= date('Y') ?> VALERIÉ JEWELS • Dispatched with Care
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
