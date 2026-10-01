<?php
/**
 * Dynamic XML Sitemap Generator for Google Search Console
 * Automatically indexes homepage, policies, categories, and products.
 */

header('Content-Type: application/xml; charset=utf-8');
header('Cache-Control: public, max-age=3600');

require_once __DIR__ . '/config/database.php';

$baseUrl = 'https://valeriejewels.in';

$staticPages = [
    [
        'loc' => $baseUrl . '/',
        'changefreq' => 'daily',
        'priority' => '1.0'
    ],
    [
        'loc' => $baseUrl . '/faqs',
        'changefreq' => 'weekly',
        'priority' => '0.8'
    ],
    [
        'loc' => $baseUrl . '/shipping-policy',
        'changefreq' => 'monthly',
        'priority' => '0.6'
    ],
    [
        'loc' => $baseUrl . '/refund-policy',
        'changefreq' => 'monthly',
        'priority' => '0.6'
    ],
    [
        'loc' => $baseUrl . '/privacy-policy',
        'changefreq' => 'monthly',
        'priority' => '0.6'
    ],
    [
        'loc' => $baseUrl . '/terms-and-conditions',
        'changefreq' => 'monthly',
        'priority' => '0.6'
    ],
];

$urls = $staticPages;

try {
    $pdo = Database::getConnection();

    // Query categories
    try {
        $catStmt = $pdo->query("SELECT slug, updated_at FROM categories WHERE is_active = 1 OR is_active IS NULL");
        $categories = $catStmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($categories as $cat) {
            $lastmod = !empty($cat['updated_at']) ? date('Y-m-d', strtotime($cat['updated_at'])) : date('Y-m-d');
            $urls[] = [
                'loc' => $baseUrl . '/?category=' . rawurlencode($cat['slug']),
                'lastmod' => $lastmod,
                'changefreq' => 'weekly',
                'priority' => '0.8'
            ];
        }
    } catch (Exception $e) {
        // Fallback or ignore if table differs
    }

    // Query active products
    try {
        $prodStmt = $pdo->query("SELECT slug, updated_at, primary_image FROM products WHERE is_active = 1 OR is_active IS NULL ORDER BY id DESC LIMIT 500");
        $products = $prodStmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($products as $prod) {
            $lastmod = !empty($prod['updated_at']) ? date('Y-m-d', strtotime($prod['updated_at'])) : date('Y-m-d');
            $item = [
                'loc' => $baseUrl . '/?product=' . rawurlencode($prod['slug']),
                'lastmod' => $lastmod,
                'changefreq' => 'daily',
                'priority' => '0.9'
            ];
            if (!empty($prod['primary_image'])) {
                $imgUrl = $prod['primary_image'];
                if (strpos($imgUrl, 'http') !== 0) {
                    $imgUrl = $baseUrl . '/' . ltrim($imgUrl, '/');
                }
                $item['image'] = $imgUrl;
            }
            $urls[] = $item;
        }
    } catch (Exception $e) {
        // Fallback
    }

} catch (Exception $e) {
    // Database connection failed, output static URLs only
}

// Generate XML
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"' . "\n";
echo '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">' . "\n";

foreach ($urls as $u) {
    echo '  <url>' . "\n";
    echo '    <loc>' . htmlspecialchars($u['loc'], ENT_XML1, 'UTF-8') . '</loc>' . "\n";
    if (!empty($u['lastmod'])) {
        echo '    <lastmod>' . htmlspecialchars($u['lastmod'], ENT_XML1, 'UTF-8') . '</lastmod>' . "\n";
    } else {
        echo '    <lastmod>' . date('Y-m-d') . '</lastmod>' . "\n";
    }
    echo '    <changefreq>' . htmlspecialchars($u['changefreq'] ?? 'weekly', ENT_XML1, 'UTF-8') . '</changefreq>' . "\n";
    echo '    <priority>' . htmlspecialchars($u['priority'] ?? '0.8', ENT_XML1, 'UTF-8') . '</priority>' . "\n";
    
    if (!empty($u['image'])) {
        echo '    <image:image>' . "\n";
        echo '      <image:loc>' . htmlspecialchars($u['image'], ENT_XML1, 'UTF-8') . '</image:loc>' . "\n";
        echo '    </image:image>' . "\n";
    }
    
    echo '  </url>' . "\n";
}

echo '</urlset>' . "\n";
