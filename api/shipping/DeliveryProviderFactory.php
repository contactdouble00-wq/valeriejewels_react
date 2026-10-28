<?php
/**
 * VALERIE JEWELS — Delivery Provider Factory
 * Resolves delivery partner adapter instances, routes existing orders to their
 * respective booking provider, and supports multi-carrier rate comparison.
 */

require_once __DIR__ . '/DeliveryProviderInterface.php';
require_once __DIR__ . '/providers/ShiprocketProvider.php';
require_once __DIR__ . '/providers/JustShypProvider.php';
require_once dirname(__DIR__) . '/config/database.php';

class DeliveryProviderFactory
{
    private static array $instances = [];

    /**
     * Get provider by key ('shiprocket' | 'justshyp')
     */
    public static function getProvider(string $providerName = 'shiprocket'): DeliveryProviderInterface
    {
        $key = strtolower(trim($providerName));

        if (!isset(self::$instances[$key])) {
            switch ($key) {
                case 'justshyp':
                    self::$instances[$key] = new JustShypProvider();
                    break;
                case 'shiprocket':
                default:
                    self::$instances[$key] = new ShiprocketProvider();
                    break;
            }
        }

        return self::$instances[$key];
    }

    /**
     * Get default configured provider from site_settings or environment
     */
    public static function getDefaultProvider(): DeliveryProviderInterface
    {
        $defaultKey = getenv('DEFAULT_DELIVERY_PROVIDER') ?: null;

        if (!$defaultKey) {
            try {
                $pdo = Database::getConnection();
                $stmt = $pdo->prepare("SELECT `value` FROM `site_settings` WHERE `key` = 'payment_settings' LIMIT 1");
                $stmt->execute();
                $raw = $stmt->fetchColumn();
                if ($raw) {
                    $settings = json_decode($raw, true) ?: [];
                    $defaultKey = $settings['default_delivery_provider'] ?? null;
                }
            } catch (Throwable $e) {}
        }

        return self::getProvider($defaultKey ?: 'shiprocket');
    }

    /**
     * Get provider responsible for a specific order
     * Guarantees that existing orders route track, cancel, and label requests to their original provider!
     */
    public static function getProviderForOrder(int $orderId): DeliveryProviderInterface
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT delivery_provider, shiprocket_order_id, shiprocket_awb, provider_awb FROM orders WHERE id = ? LIMIT 1");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            return self::getDefaultProvider();
        }

        $providerName = strtolower(trim($order['delivery_provider'] ?? ''));

        // If explicit provider set, route to it
        if (!empty($providerName)) {
            return self::getProvider($providerName);
        }

        // If historical order created with Shiprocket, route to Shiprocket
        if (!empty($order['shiprocket_order_id']) || !empty($order['shiprocket_awb'])) {
            return self::getProvider('shiprocket');
        }

        // Otherwise fallback to default configured provider
        return self::getDefaultProvider();
    }

    /**
     * Compare shipping rates across both Shiprocket and JustShyp
     * @param array $params ['pickup_pincode', 'drop_pincode', 'payment_mode', 'package' => ['weight', 'length', 'breadth', 'height']]
     * @return array Side-by-side rates, cheapest option, and comparison
     */
    public static function compareRates(array $params): array
    {
        $allRates = [];

        // 1. Fetch Shiprocket rates
        try {
            $sr = self::getProvider('shiprocket');
            $srResult = $sr->getRates($params);
            if (!empty($srResult['rates'])) {
                foreach ($srResult['rates'] as $r) {
                    $allRates[] = array_merge($r, ['provider' => 'shiprocket']);
                }
            }
        } catch (Throwable $e) {
            error_log('[RateComparison] Shiprocket error: ' . $e->getMessage());
        }

        // 2. Fetch JustShyp rates
        try {
            $js = self::getProvider('justshyp');
            $jsResult = $js->getRates($params);
            if (!empty($jsResult['rates'])) {
                foreach ($jsResult['rates'] as $r) {
                    $allRates[] = array_merge($r, ['provider' => 'justshyp']);
                }
            }
        } catch (Throwable $e) {
            error_log('[RateComparison] JustShyp error: ' . $e->getMessage());
        }

        // Sort by rate ascending
        usort($allRates, function ($a, $b) {
            return (float)($a['rate'] ?? 0) <=> (float)($b['rate'] ?? 0);
        });

        $shiprocketCheapest = null;
        $justshypCheapest   = null;

        foreach ($allRates as $r) {
            if ($r['provider'] === 'shiprocket' && $shiprocketCheapest === null) {
                $shiprocketCheapest = $r;
            }
            if ($r['provider'] === 'justshyp' && $justshypCheapest === null) {
                $justshypCheapest = $r;
            }
        }

        return [
            'success'             => !empty($allRates),
            'rates'               => $allRates,
            'cheapest_overall'    => $allRates[0] ?? null,
            'shiprocket_cheapest' => $shiprocketCheapest,
            'justshyp_cheapest'   => $justshypCheapest,
            'total_options'       => count($allRates),
        ];
    }
}
