<?php
/**
 * VALERIE JEWELS — Public Homepage Settings & Banners Endpoint
 * Returns dynamic configuration for top ribbon, hero banner, jhumka hero, catalog headers, and trust pillars.
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/config/database.php';

handleCors();

try {
    $pdo = Database::getConnection();

    $stmt = $pdo->prepare("SELECT `value` FROM `site_settings` WHERE `key` = 'homepage_content' LIMIT 1");
    $stmt->execute();
    $raw = $stmt->fetchColumn();

    if ($raw) {
        $data = json_decode($raw, true);
        if (is_array($data)) {
            if (isset($data['heroBanner']) && is_array($data['heroBanner']) && !isset($data['heroBanner']['rightImageUrl'])) {
                $data['heroBanner']['rightImageUrl'] = '/hero-jewelry-model.jpg';
            }
            if (!isset($data['mobileSlider']) || !is_array($data['mobileSlider'])) {
                $data['mobileSlider'] = [
                    'enabled'  => true,
                    'autoPlay' => true,
                    'interval' => 4500,
                    'slides'   => [
                        [
                            'id'         => 'slide-1',
                            'imageUrl'   => 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=85',
                            'title'      => 'The Everyday Diamond Edit',
                            'subtitle'   => 'Under ₹999 Luxury Collection',
                            'buttonText' => 'SHOP NOW',
                            'linkUrl'    => '#catalog',
                            'isActive'   => true,
                        ],
                        [
                            'id'         => 'slide-2',
                            'imageUrl'   => 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=85',
                            'title'      => 'The 4 Signature Jhumka Boxes',
                            'subtitle'   => 'Viral 5 to 6 Pair Festive Keepsakes',
                            'buttonText' => 'EXPLORE BOXES',
                            'linkUrl'    => '#jhumka-boxes',
                            'isActive'   => true,
                        ],
                        [
                            'id'         => 'slide-3',
                            'imageUrl'   => 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=85',
                            'title'      => '18K Anti-Tarnish Everyday Edit',
                            'subtitle'   => 'Waterproof & Shower-Safe PVD Gold',
                            'buttonText' => 'SHOP COLLECTION',
                            'linkUrl'    => '#catalog',
                            'isActive'   => true,
                        ],
                        [
                            'id'         => 'slide-4',
                            'imageUrl'   => 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=900&q=85',
                            'title'      => 'Statement Pairings & Duos',
                            'subtitle'   => 'Layered Elegance with Free Express Delivery',
                            'buttonText' => 'VIEW PIECES',
                            'linkUrl'    => '#jhumka-boxes',
                            'isActive'   => true,
                        ],
                    ],
                ];
            }
            ApiResponse::success($data, 'Homepage content retrieved successfully.');
            exit;
        }
    }

    // Fallback default structure if not yet seeded
    $defaults = [
        'mobileSlider' => [
            'enabled'  => true,
            'autoPlay' => true,
            'interval' => 4500,
            'slides'   => [
                [
                    'id'         => 'slide-1',
                    'imageUrl'   => 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=85',
                    'title'      => 'The Everyday Diamond Edit',
                    'subtitle'   => 'Under ₹999 Luxury Collection',
                    'buttonText' => 'SHOP NOW',
                    'linkUrl'    => '#catalog',
                    'isActive'   => true,
                ],
                [
                    'id'         => 'slide-2',
                    'imageUrl'   => 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=85',
                    'title'      => 'The 4 Signature Jhumka Boxes',
                    'subtitle'   => 'Viral 5 to 6 Pair Festive Keepsakes',
                    'buttonText' => 'EXPLORE BOXES',
                    'linkUrl'    => '#jhumka-boxes',
                    'isActive'   => true,
                ],
                [
                    'id'         => 'slide-3',
                    'imageUrl'   => 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=85',
                    'title'      => '18K Anti-Tarnish Everyday Edit',
                    'subtitle'   => 'Waterproof & Shower-Safe PVD Gold',
                    'buttonText' => 'SHOP COLLECTION',
                    'linkUrl'    => '#catalog',
                    'isActive'   => true,
                ],
                [
                    'id'         => 'slide-4',
                    'imageUrl'   => 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=900&q=85',
                    'title'      => 'Statement Pairings & Duos',
                    'subtitle'   => 'Layered Elegance with Free Express Delivery',
                    'buttonText' => 'VIEW PIECES',
                    'linkUrl'    => '#jhumka-boxes',
                    'isActive'   => true,
                ],
            ],
        ],
        'topRibbon' => [
            'enabled'         => true,
            'text'            => 'COMPLIMENTARY EXPRESS DELIVERY ON ALL ORDERS ABOVE',
            'highlightAmount' => '₹999',
            'suffix'          => '• 18K GOLD PVD ANTI-TARNISH',
        ],
        'heroBanner' => [
            'badgeText'       => '18K PVD Anti-Tarnish Everyday Luxury',
            'headline'        => 'Curated everyday jewelry,',
            'accentText'      => 'designed to shine forever.',
            'subtitle'        => 'Waterproof, shower-safe, and hypoallergenic accessories crafted in premium 316L stainless steel and 18K gold. Priced honestly from ₹500 to ₹1,500.',
            'primaryBtnText'  => 'Shop 4 Jhumka Boxes',
            'primaryBtnLink'  => '#jhumka-boxes',
            'secondaryBtnText'=> 'All Everyday Jewelry',
            'secondaryBtnLink'=> '#catalog',
            'rightImageUrl'   => '/hero-jewelry-model.jpg',
        ],
        'jhumkaHero' => [
            'badgeText'  => '#1 Ad Bestseller Collection • 12,000+ Delivered',
            'titleLine1' => 'The 4 Signature',
            'titleLine2' => 'Jhumka Treasure Boxes',
            'subtitle'   => 'Our most viral handcrafted collections. Each box brings 5 to 6 curated jhumka pairs inside a luxury keepsake box with anti-tarnish micro gold polish and lightweight comfort.',
            'pill1'      => '5–6 Curated Pairs Per Box',
            'pill2'      => 'Zero Earache • Featherlight',
            'pill3'      => 'Save up to 50% vs Single Pairs',
            'showBoxNumber'   => false,
            'showPricePerPair'=> false,
        ],
        'catalogHeader' => [
            'eyebrow' => 'Curated Catalog',
            'title'   => 'Discover Everyday Fine Jewelry',
        ],
        'combosHeader' => [
            'eyebrow'  => 'Curated Pairings',
            'title'    => 'Jewelry Combo Sets & Duos',
            'subtitle' => 'Expertly styled layered pairings with bundle-exclusive discounts up to 45%.',
        ],
        'trustStrip' => [
            [
                'id'    => 'pillar1',
                'title' => '100% Anti-Tarnish',
                'desc'  => 'High-grade 18K PVD coating guaranteed not to fade or tarnish.',
            ],
            [
                'id'    => 'pillar2',
                'title' => 'Water & Sweat Proof',
                'desc'  => 'Wear comfortably in the shower, gym, or pool with zero worry.',
            ],
            [
                'id'    => 'pillar3',
                'title' => 'Hypoallergenic Skin-Safe',
                'desc'  => 'Zero nickel, zero lead. Designed for the most sensitive skin.',
            ],
            [
                'id'    => 'pillar4',
                'title' => 'Shiprocket Express',
                'desc'  => 'Dispatched via premium couriers across 29,000+ Indian pincodes.',
            ],
        ],
        'telemetryBanner' => [
            'enabled'  => false,
            'title'    => 'Phase 4 Authentication & Guest Mode Active',
            'subtitle' => 'Guest checkout supported • Customer JWT optional • Secure staff role partitioning active.',
        ],
    ];

    ApiResponse::success($defaults, 'Default homepage content retrieved.');
} catch (Throwable $e) {
    error_log('get.php error: ' . $e->getMessage());
    ApiResponse::error('Failed to load homepage content: ' . $e->getMessage(), 500);
}
