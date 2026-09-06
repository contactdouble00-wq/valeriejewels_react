<?php
/**
 * VALERIE JEWELS — Database Seeder
 * Populates normalized relational tables with production-grade sample data.
 */

require_once dirname(__DIR__) . '/config/database.php';

try {
    $pdo = Database::getConnection();
    echo "Connected to MySQL successfully.\n";

    // 1. Seed Admin User
    echo "Seeding Admin user...\n";
    $adminPasswordHash = password_hash('Admin@Valerie2026!', PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("
        INSERT INTO `users` (`name`, `email`, `phone`, `password_hash`, `role`, `is_blocked_rto`)
        VALUES (:name, :email, :phone, :hash, 'admin', 0)
        ON DUPLICATE KEY UPDATE `password_hash` = :hash_update, `role` = 'admin'
    ");
    $stmt->execute([
        ':name'        => 'Valerie Jewels Admin',
        ':email'       => 'admin@valeriejewels.com',
        ':phone'       => '+91 98765 43210',
        ':hash'        => $adminPasswordHash,
        ':hash_update' => $adminPasswordHash,
    ]);

    // 2. Seed Customer Account
    $custPasswordHash = password_hash('Customer@123!', PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("
        INSERT INTO `users` (`name`, `email`, `phone`, `password_hash`, `role`, `is_blocked_rto`)
        VALUES (:name, :email, :phone, :hash, 'customer', 0)
        ON DUPLICATE KEY UPDATE `name` = VALUES(`name`)
    ");
    $stmt->execute([
        ':name'  => 'Aanya Sharma',
        ':email' => 'aanya@example.com',
        ':phone' => '+91 98111 22233',
        ':hash'  => $custPasswordHash,
    ]);

    // 3. Seed Categories
    echo "Seeding Categories...\n";
    $categories = [
        ['name' => 'Jhumka Boxes', 'slug' => 'jhumka-boxes', 'desc' => 'Our viral 4 signature curated jhumka boxes designed for weddings, festivities, and daily wear.', 'order' => 1],
        ['name' => 'Necklaces', 'slug' => 'necklaces', 'desc' => 'Everyday statement pendants, chokers, and layered chains.', 'order' => 2],
        ['name' => 'Rings', 'slug' => 'rings', 'desc' => 'Stackable rings, solitaire bands, and statement signets.', 'order' => 3],
        ['name' => 'Earrings', 'slug' => 'earrings', 'desc' => 'Waterproof huggies, hoops, drops, and delicate studs.', 'order' => 4],
        ['name' => 'Bracelets', 'slug' => 'bracelets', 'desc' => 'Tennis bracelets, twisted bangles, and dainty link chains.', 'order' => 5],
        ['name' => 'Combos & Sets', 'slug' => 'combos', 'desc' => 'Curated jewelry bundles with exclusive savings up to 45%.', 'order' => 6],
    ];

    $catMap = [];
    $stmt = $pdo->prepare("
        INSERT INTO `categories` (`name`, `slug`, `description`, `display_order`, `is_active`)
        VALUES (:name, :slug, :desc, :order, 1)
        ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `description` = VALUES(`description`), `display_order` = VALUES(`display_order`)
    ");
    foreach ($categories as $cat) {
        $stmt->execute([
            ':name'  => $cat['name'],
            ':slug'  => $cat['slug'],
            ':desc'  => $cat['desc'],
            ':order' => $cat['order'],
        ]);
        $catMap[$cat['slug']] = $pdo->lastInsertId() ?: $pdo->query("SELECT id FROM categories WHERE slug = " . $pdo->quote($cat['slug']))->fetchColumn();
    }

    // 4. Seed Products
    echo "Seeding Products...\n";
    $products = [
        // === HERO AD BESTSELLERS: 4 SIGNATURE JHUMKA BOXES ===
        [
            'category_slug'     => 'jhumka-boxes',
            'name'              => 'The Royal Noor Jhumka Box (6 Pair Festive Edition)',
            'slug'              => 'royal-noor-jhumka-box-6-pair',
            'short_desc'        => '6 handcrafted antique gold & pearl jhumka pairs curated in our signature royal box.',
            'desc'              => "Valerie Jewels' #1 viral bestseller with over 12,000+ boxes delivered. The Royal Noor Box brings together six distinct heritage jhumka designs: from delicate mini bells for mehendi functions to grand statement chaand jhumkis for sangeet and reception nights. Finished in rich antique micro-gold polish with lustrous seed pearls and hand-painted meenakari accents. Packed in our signature embossed luxury keepsake box.",
            'mrp'               => 2499.00,
            'price'             => 1299.00,
            'cost_price'        => 450.00,
            'sku'               => 'VJ-JHM-001',
            'stock'             => 150,
            'is_bestseller'     => 1,
            'material'          => 'Brass Alloy with 18K Micro Gold Polish & Handset Seed Pearls',
            'images'            => [
                'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=800&q=80',
            ],
            'variants'          => [
                ['title' => 'Antique Gold Polish', 'sku' => 'VJ-JHM-001-GLD', 'opt' => 'Antique Gold', 'price' => 1299.00, 'mrp' => 2499.00, 'stock' => 100],
                ['title' => 'Oxidized Silver Polish', 'sku' => 'VJ-JHM-001-SLV', 'opt' => 'Oxidized Silver', 'price' => 1299.00, 'mrp' => 2499.00, 'stock' => 50],
            ],
        ],
        [
            'category_slug'     => 'jhumka-boxes',
            'name'              => 'The Gulabi Mehal Pastel Jhumka Box (6 Pair Artisanal Edition)',
            'slug'              => 'gulabi-mehal-pastel-jhumka-box-6-pair',
            'short_desc'        => '6 artisanal pastel enamel jhumkas in blush rose, mint, lavender, and ivory.',
            'desc'              => 'Curated specifically for contemporary pastel lehengas and festive day events. Features six lightweight jhumki designs adorned with hand-glazed Meenakari enamel in blush rose, sage mint, royal lilac, and pearlescent ivory, finished with cascading micro-pearl drops. Hypoallergenic titanium ear posts ensure comfortable, irritation-free wear all night.',
            'mrp'               => 2299.00,
            'price'             => 1199.00,
            'cost_price'        => 420.00,
            'sku'               => 'VJ-JHM-002',
            'stock'             => 130,
            'is_bestseller'     => 1,
            'material'          => 'Hand-Glazed Meenakari Enamel & Seed Pearl Clusters',
            'images'            => [
                'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80',
            ],
            'variants'          => [
                ['title' => 'Signature Pastel Palette', 'sku' => 'VJ-JHM-002-PST', 'opt' => 'Pastel Palette', 'price' => 1199.00, 'mrp' => 2299.00, 'stock' => 130],
            ],
        ],
        [
            'category_slug'     => 'jhumka-boxes',
            'name'              => 'The Shahi Kundan Chandbali & Jhumka Box (5 Pair Heritage Set)',
            'slug'              => 'shahi-kundan-chandbali-jhumka-box-5-pair',
            'short_desc'        => '5 royal Jadau Kundan and chaandbali jhumkas with premium emerald and ruby cluster beads.',
            'desc'              => 'The quintessential wedding and festive treasure box. Handset glass kundan stones framed by intricate filigree work and cascading jhumka bells. Designed to deliver majestic royal drama without pulling or weighing down earlobes. Includes 2 chaandbali jhumkas, 2 tiered dome jhumkas, and 1 statement oversized bridal jhumka.',
            'mrp'               => 2799.00,
            'price'             => 1399.00,
            'cost_price'        => 480.00,
            'sku'               => 'VJ-JHM-003',
            'stock'             => 95,
            'is_bestseller'     => 1,
            'material'          => 'Handset Jadau Kundan & 18K Micro Gold Polish',
            'images'            => [
                'https://images.unsplash.com/photo-1629224316810-9d8805b95e76?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=800&q=80',
            ],
            'variants'          => [
                ['title' => 'Royal Heritage Kundan', 'sku' => 'VJ-JHM-003-RGL', 'opt' => 'Royal Kundan', 'price' => 1399.00, 'mrp' => 2799.00, 'stock' => 95],
            ],
        ],
        [
            'category_slug'     => 'jhumka-boxes',
            'name'              => 'The Roohani Daily Wear Jhumka Box (6 Pair Lightweight Set)',
            'slug'              => 'roohani-daily-wear-jhumka-box-6-pair',
            'short_desc'        => '6 featherlight anti-tarnish everyday mini jhumkas for college, office & casual ethnic wear.',
            'desc'              => 'Who says jhumkas are only for big occasions? The Roohani Box offers six featherweight mini jhumkas (weighing under 5 grams per pair) crafted with anti-tarnish 316L stainless steel and 18K gold vacuum PVD plating. Completely water-resistant, shower-safe, and zero earache guaranteed for all-day daily comfort.',
            'mrp'               => 1999.00,
            'price'             => 999.00,
            'cost_price'        => 340.00,
            'sku'               => 'VJ-JHM-004',
            'stock'             => 180,
            'is_bestseller'     => 1,
            'material'          => '18K Gold PVD Stainless Steel (100% Anti-Tarnish & Waterproof)',
            'images'            => [
                'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80',
            ],
            'variants'          => [
                ['title' => '18K Yellow Gold Polish', 'sku' => 'VJ-JHM-004-YGD', 'opt' => 'Yellow Gold', 'price' => 999.00, 'mrp' => 1999.00, 'stock' => 100],
                ['title' => '18K Rose Gold Polish', 'sku' => 'VJ-JHM-004-RGD', 'opt' => 'Rose Gold', 'price' => 999.00, 'mrp' => 1999.00, 'stock' => 80],
            ],
        ],
        // === INDIVIDUAL EVERYDAY PIECES ===
        [
            'category_slug'     => 'necklaces',
            'name'              => 'Aurelia 18K Solitaire Pendant Necklace',
            'slug'              => 'aurelia-18k-solitaire-pendant-necklace',
            'short_desc'        => 'Brilliant cut solitaire pendant on a delicate 18K gold PVD chain.',
            'desc'              => 'The Aurelia Solitaire Pendant is our signature everyday necklace. Featuring a 1-carat equivalent brilliant AAA cubic zirconia set in high-grade 316L stainless steel with vacuum 18K PVD gold plating. Engineered to never tarnish, rust, or turn your skin green—even through showers and workouts.',
            'mrp'               => 1299.00,
            'price'             => 899.00,
            'cost_price'        => 320.00,
            'sku'               => 'VJ-NCK-001',
            'stock'             => 65,
            'is_bestseller'     => 1,
            'material'          => '18K Gold Plated Stainless Steel (Anti-Tarnish)',
            'images'            => [
                'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80',
            ],
            'variants'          => [
                ['title' => '16 Inch (Classic)', 'sku' => 'VJ-NCK-001-16', 'opt' => '16 Inch', 'price' => 899.00, 'mrp' => 1299.00, 'stock' => 35],
                ['title' => '18 Inch (Layering)', 'sku' => 'VJ-NCK-001-18', 'opt' => '18 Inch', 'price' => 899.00, 'mrp' => 1299.00, 'stock' => 30],
            ],
        ],
        [
            'category_slug'     => 'earrings',
            'name'              => 'Vine Climber Pearl Stud Earrings',
            'slug'              => 'vine-climber-pearl-stud-earrings',
            'short_desc'        => 'Nature-inspired crawler earring adorned with organic freshwater seed pearls.',
            'desc'              => 'Ascending effortlessly along the earlobe, these Vine Climber studs combine micro-pavé leaf silhouettes with lustrous freshwater pearls. Hypoallergenic titanium ear posts ensure zero irritation.',
            'mrp'               => 1099.00,
            'price'             => 699.00,
            'cost_price'        => 240.00,
            'sku'               => 'VJ-EAR-002',
            'stock'             => 50,
            'is_bestseller'     => 1,
            'material'          => '18K Gold Vermeil & Freshwater Pearl',
            'images'            => [
                'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80',
            ],
            'variants'          => [
                ['title' => 'Yellow Gold', 'sku' => 'VJ-EAR-002-YG', 'opt' => 'Yellow Gold', 'price' => 699.00, 'mrp' => 1099.00, 'stock' => 50],
            ],
        ],
        [
            'category_slug'     => 'rings',
            'name'              => 'Atelier Eternity Band Ring',
            'slug'              => 'atelier-eternity-band-ring',
            'short_desc'        => 'Continuous channel set eternity ring with waterproof durability.',
            'desc'              => 'Refined and minimal, the Atelier Eternity Band is designed for seamless stacking. High-precision channel settings secure shimmering stones all around.',
            'mrp'               => 1199.00,
            'price'             => 799.00,
            'cost_price'        => 280.00,
            'sku'               => 'VJ-RNG-003',
            'stock'             => 90,
            'is_bestseller'     => 1,
            'material'          => '18K PVD Gold Plating (Waterproof)',
            'images'            => [
                'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80',
            ],
            'variants'          => [
                ['title' => 'Size US 6', 'sku' => 'VJ-RNG-003-US6', 'opt' => 'US 6', 'price' => 799.00, 'mrp' => 1199.00, 'stock' => 30],
                ['title' => 'Size US 7', 'sku' => 'VJ-RNG-003-US7', 'opt' => 'US 7', 'price' => 799.00, 'mrp' => 1199.00, 'stock' => 35],
                ['title' => 'Size US 8', 'sku' => 'VJ-RNG-003-US8', 'opt' => 'US 8', 'price' => 799.00, 'mrp' => 1199.00, 'stock' => 25],
            ],
        ],
        [
            'category_slug'     => 'bracelets',
            'name'              => 'Serpentine Twisted Herringbone Bracelet',
            'slug'              => 'serpentine-twisted-herringbone-bracelet',
            'short_desc'        => 'Liquid-smooth flat serpentine herringbone link with lobster clasp.',
            'desc'              => 'Drapes like molten gold across the wrist. Lightweight yet robust, made with high-tensile waterproof steel that withstands daily sanitizers and lotions.',
            'mrp'               => 1349.00,
            'price'             => 849.00,
            'cost_price'        => 310.00,
            'sku'               => 'VJ-BRC-004',
            'stock'             => 40,
            'is_bestseller'     => 0,
            'material'          => '18K Gold Plated Stainless Steel',
            'images'            => [
                'https://images.unsplash.com/photo-1611591475887-236b2803bcf4?auto=format&fit=crop&w=800&q=80',
            ],
            'variants'          => [
                ['title' => 'Standard (6.5 in + 1.5 in Extender)', 'sku' => 'VJ-BRC-004-STD', 'opt' => 'Standard', 'price' => 849.00, 'mrp' => 1349.00, 'stock' => 40],
            ],
        ],
        [
            'category_slug'     => 'necklaces',
            'name'              => 'Double Row Herringbone & Figarope Choker',
            'slug'              => 'double-row-herringbone-figarope-choker',
            'short_desc'        => 'Pre-layered dual chain with single clasp convenience.',
            'desc'              => 'Get the effortless stacked look with one single clasp. Combines a 3mm sleek herringbone chain with a delicate rope chain at tiered lengths.',
            'mrp'               => 1599.00,
            'price'             => 1099.00,
            'cost_price'        => 390.00,
            'sku'               => 'VJ-NCK-005',
            'stock'             => 35,
            'is_bestseller'     => 1,
            'material'          => '18K PVD Gold Plating (Waterproof)',
            'images'            => [
                'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=800&q=80',
            ],
            'variants'          => [
                ['title' => 'One Size (14 in + 16 in)', 'sku' => 'VJ-NCK-005-OS', 'opt' => 'One Size', 'price' => 1099.00, 'mrp' => 1599.00, 'stock' => 35],
            ],
        ],
        [
            'category_slug'     => 'rings',
            'name'              => 'Celestial Baguette Solitaire Ring',
            'slug'              => 'celestial-baguette-solitaire-ring',
            'short_desc'        => 'Modern emerald-cut baguette cubic zirconia with tapered band.',
            'desc'              => 'Architectural and crisp. High-clarity baguette stone bezel-set in a comfort-fit waterproof band.',
            'mrp'               => 1149.00,
            'price'             => 749.00,
            'cost_price'        => 260.00,
            'sku'               => 'VJ-RNG-006',
            'stock'             => 55,
            'is_bestseller'     => 0,
            'material'          => '18K Gold Plated Stainless Steel',
            'images'            => [
                'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=800&q=80',
            ],
            'variants'          => [
                ['title' => 'Size US 6', 'sku' => 'VJ-RNG-006-US6', 'opt' => 'US 6', 'price' => 749.00, 'mrp' => 1149.00, 'stock' => 20],
                ['title' => 'Size US 7', 'sku' => 'VJ-RNG-006-US7', 'opt' => 'US 7', 'price' => 749.00, 'mrp' => 1149.00, 'stock' => 20],
                ['title' => 'Size US 8', 'sku' => 'VJ-RNG-006-US8', 'opt' => 'US 8', 'price' => 749.00, 'mrp' => 1149.00, 'stock' => 15],
            ],
        ],
    ];

    $prodMap = [];
    $prodStmt = $pdo->prepare("
        INSERT INTO `products` (`category_id`, `name`, `slug`, `short_description`, `description`, `mrp`, `price`, `cost_price`, `sku`, `stock_quantity`, `is_anti_tarnish`, `material`, `is_bestseller`, `is_active`, `meta_title`, `meta_description`)
        VALUES (:cat_id, :name, :slug, :short_desc, :desc, :mrp, :price, :cost, :sku, :stock, 1, :mat, :best, 1, :meta_t, :meta_d)
        ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `mrp` = VALUES(`mrp`), `price` = VALUES(`price`), `stock_quantity` = VALUES(`stock_quantity`)
    ");

    $imgStmt = $pdo->prepare("
        INSERT INTO `product_images` (`product_id`, `image_url`, `alt_text`, `display_order`, `is_primary`)
        VALUES (:p_id, :url, :alt, :order, :primary)
    ");

    $varStmt = $pdo->prepare("
        INSERT INTO `product_variants` (`product_id`, `sku`, `title`, `option1_name`, `option1_value`, `mrp`, `price`, `stock_quantity`, `is_active`)
        VALUES (:p_id, :sku, :title, 'Size', :opt_val, :mrp, :price, :stock, 1)
        ON DUPLICATE KEY UPDATE `price` = VALUES(`price`), `stock_quantity` = VALUES(`stock_quantity`)
    ");

    foreach ($products as $p) {
        $catId = $catMap[$p['category_slug']] ?? 1;
        $prodStmt->execute([
            ':cat_id'     => $catId,
            ':name'       => $p['name'],
            ':slug'       => $p['slug'],
            ':short_desc' => $p['short_desc'],
            ':desc'       => $p['desc'],
            ':mrp'        => $p['mrp'],
            ':price'      => $p['price'],
            ':cost'       => $p['cost_price'],
            ':sku'        => $p['sku'],
            ':stock'      => $p['stock'],
            ':mat'        => $p['material'],
            ':best'       => $p['is_bestseller'],
            ':meta_t'     => $p['name'] . ' | Valerie Jewels',
            ':meta_d'     => $p['short_desc'],
        ]);

        $productId = $pdo->lastInsertId() ?: $pdo->query("SELECT id FROM products WHERE sku = " . $pdo->quote($p['sku']))->fetchColumn();
        $prodMap[$p['sku']] = $productId;

        // Clean existing images before re-inserting
        $pdo->exec("DELETE FROM `product_images` WHERE `product_id` = " . (int)$productId);
        foreach ($p['images'] as $idx => $imgUrl) {
            $imgStmt->execute([
                ':p_id'    => $productId,
                ':url'     => $imgUrl,
                ':alt'     => $p['name'],
                ':order'   => $idx,
                ':primary' => ($idx === 0) ? 1 : 0,
            ]);
        }

        // Insert variants
        foreach ($p['variants'] as $v) {
            $varStmt->execute([
                ':p_id'    => $productId,
                ':sku'     => $v['sku'],
                ':title'   => $v['title'],
                ':opt_val' => $v['opt'],
                ':mrp'     => $v['mrp'],
                ':price'   => $v['price'],
                ':stock'   => $v['stock'],
            ]);
        }
    }

    // 5. Seed Bundles / Combos (Per SRS Section 4)
    echo "Seeding Bundles...\n";
    $bundleStmt = $pdo->prepare("
        INSERT INTO `bundles` (`title`, `slug`, `description`, `bundle_price`, `compare_price`, `badge_text`, `is_active`)
        VALUES (:title, :slug, :desc, :b_price, :c_price, :badge, 1)
        ON DUPLICATE KEY UPDATE `bundle_price` = VALUES(`bundle_price`), `compare_price` = VALUES(`compare_price`)
    ");
    $bundleStmt->execute([
        ':title'   => 'Atelier Stacking Ring Duo Set',
        ':slug'    => 'atelier-stacking-ring-duo-set',
        ':desc'    => 'Pair the Atelier Eternity Band with the Celestial Baguette Ring for an effortless luxury stack.',
        ':b_price' => 1199.00,
        ':c_price' => 2099.00,
        ':badge'   => 'Save 42% (Curated Bundle)',
    ]);
    $bundleId = $pdo->lastInsertId() ?: $pdo->query("SELECT id FROM bundles WHERE slug = 'atelier-stacking-ring-duo-set'")->fetchColumn();

    $pdo->exec("DELETE FROM `bundle_items` WHERE `bundle_id` = " . (int)$bundleId);
    $bItemStmt = $pdo->prepare("INSERT INTO `bundle_items` (`bundle_id`, `product_id`, `quantity`) VALUES (?, ?, 1)");
    if (!empty($prodMap['VJ-RNG-003'])) {
        $bItemStmt->execute([$bundleId, $prodMap['VJ-RNG-003']]);
    }
    if (!empty($prodMap['VJ-RNG-006'])) {
        $bItemStmt->execute([$bundleId, $prodMap['VJ-RNG-006']]);
    }

    // 6. Seed Coupons
    echo "Seeding Coupons...\n";
    $coupons = [
        ['code' => 'VALERIE10', 'type' => 'percentage', 'val' => 10.00, 'min' => 499.00, 'max' => 300.00, 'limit' => 1000],
        ['code' => 'SPARKLE100', 'type' => 'fixed', 'val' => 100.00, 'min' => 999.00, 'max' => 100.00, 'limit' => 500],
        ['code' => 'FIRSTBUY', 'type' => 'percentage', 'val' => 15.00, 'min' => 599.00, 'max' => 250.00, 'limit' => 2000],
    ];
    $coupStmt = $pdo->prepare("
        INSERT INTO `coupons` (`code`, `discount_type`, `discount_value`, `min_order_amount`, `max_discount_amount`, `usage_limit`, `is_active`)
        VALUES (:code, :type, :val, :min, :max, :limit, 1)
        ON DUPLICATE KEY UPDATE `discount_value` = VALUES(`discount_value`), `min_order_amount` = VALUES(`min_order_amount`)
    ");
    foreach ($coupons as $c) {
        $coupStmt->execute([
            ':code'  => $c['code'],
            ':type'  => $c['type'],
            ':val'   => $c['val'],
            ':min'   => $c['min'],
            ':max'   => $c['max'],
            ':limit' => $c['limit'],
        ]);
    }

    // 7. Seed Sample Reviews (for social proof)
    echo "Seeding Sample Reviews...\n";
    $revStmt = $pdo->prepare("
        INSERT INTO `reviews` (`product_id`, `reviewer_name`, `rating`, `title`, `comment`, `is_verified_buyer`, `status`)
        VALUES (?, ?, ?, ?, ?, 1, 'approved')
    ");

    if (!empty($prodMap['VJ-JHM-001'])) {
        $revStmt->execute([
            $prodMap['VJ-JHM-001'],
            'Meera Sen',
            5,
            'Saw this on Instagram and it exceeded all expectations!',
            'I ordered after seeing their ad reel and was blown away by the unboxing! 6 full pairs of gorgeous jhumkas for just ₹1,299. The velvet box itself looks like a luxury keepsake.',
        ]);
        $revStmt->execute([
            $prodMap['VJ-JHM-001'],
            'Ananya Deshmukh',
            5,
            'Wore them for my sister\'s wedding functions!',
            'Every single pair matches a different outfit—mehendi, haldi, cocktail. Super lightweight too, my ears did not hurt at all!',
        ]);
    }

    if (!empty($prodMap['VJ-JHM-002'])) {
        $revStmt->execute([
            $prodMap['VJ-JHM-002'],
            'Rhea Kapur',
            5,
            'The pastel shades are so dreamy!',
            'The blush pink and mint enamel jhumkas are stunning in person. Getting compliments from everyone at office ethnic day.',
        ]);
    }

    if (!empty($prodMap['VJ-NCK-001'])) {
        $revStmt->execute([
            $prodMap['VJ-NCK-001'],
            'Priya K.',
            5,
            'Literally hasn’t tarnished in 3 months!',
            'I wear this necklace daily, even in the shower and gym. Looks as sparkling and gold as day one. Best ₹899 spent!',
        ]);
        $revStmt->execute([
            $prodMap['VJ-NCK-001'],
            'Tanvi M.',
            5,
            'So dainty and premium',
            'The packaging and the chain quality are top notch. Rivals international brands charging 4x the price.',
        ]);
    }

    // 8. Log Initial Activity
    $adminId = $pdo->query("SELECT id FROM users WHERE email = 'admin@valeriejewels.com'")->fetchColumn();
    $logStmt = $pdo->prepare("
        INSERT INTO `admin_activity_log` (`admin_id`, `action`, `target_entity`, `target_id`, `details`, `ip_address`)
        VALUES (?, 'system_seed', 'database', 'phase1', ?, '127.0.0.1')
    ");
    $logStmt->execute([
        $adminId ?: null,
        json_encode(['message' => 'Initial database seed completed for Phase 1', 'products_seeded' => count($products)]),
    ]);

    echo "Database seeding completed successfully!\n";

} catch (Throwable $e) {
    echo "Seeding Error: " . $e->getMessage() . "\n";
    exit(1);
}
