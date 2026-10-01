<?php
/**
 * Dynamic XML Sitemap Generator for Google Search Console
 * Automatically indexes homepage, policies, categories, and products.
 * Also synchronizes static sitemap.xml and sitemap_index.xml to root directory.
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
        $catStmt = $pdo->query("SELECT slug, created_at FROM categories WHERE is_active = 1 OR is_active IS NULL");
        $categories = $catStmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($categories as $cat) {
            $lastmod = !empty($cat['created_at']) ? date('Y-m-d', strtotime($cat['created_at'])) : date('Y-m-d');
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

    // Query active products with primary images
    try {
        $prodStmt = $pdo->query("
            SELECT 
                p.id, 
                p.slug, 
                p.created_at,
                (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC LIMIT 1) AS image_url
            FROM products p 
            WHERE p.is_active = 1 OR p.is_active IS NULL 
            ORDER BY p.id DESC 
            LIMIT 500
        ");
        $products = $prodStmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($products as $prod) {
            $lastmod = !empty($prod['created_at']) ? date('Y-m-d', strtotime($prod['created_at'])) : date('Y-m-d');
            $item = [
                'loc' => $baseUrl . '/?product=' . rawurlencode($prod['slug']),
                'lastmod' => $lastmod,
                'changefreq' => 'daily',
                'priority' => '0.9'
            ];
            if (!empty($prod['image_url'])) {
                $imgUrl = $prod['image_url'];
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

// Generate Main Sitemap XML
$xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
$xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"' . "\n";
$xml .= '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">' . "\n";

foreach ($urls as $u) {
    $xml .= '  <url>' . "\n";
    $xml .= '    <loc>' . htmlspecialchars($u['loc'], ENT_XML1, 'UTF-8') . '</loc>' . "\n";
    if (!empty($u['lastmod'])) {
        $xml .= '    <lastmod>' . htmlspecialchars($u['lastmod'], ENT_XML1, 'UTF-8') . '</lastmod>' . "\n";
    } else {
        $xml .= '    <lastmod>' . date('Y-m-d') . '</lastmod>' . "\n";
    }
    $xml .= '    <changefreq>' . htmlspecialchars($u['changefreq'] ?? 'weekly', ENT_XML1, 'UTF-8') . '</changefreq>' . "\n";
    $xml .= '    <priority>' . htmlspecialchars($u['priority'] ?? '0.8', ENT_XML1, 'UTF-8') . '</priority>' . "\n";
    
    if (!empty($u['image'])) {
        $xml .= '    <image:image>' . "\n";
        $xml .= '      <image:loc>' . htmlspecialchars($u['image'], ENT_XML1, 'UTF-8') . '</image:loc>' . "\n";
        $xml .= '    </image:image>' . "\n";
    }
    
    $xml .= '  </url>' . "\n";
}

$xml .= '</urlset>' . "\n";

// Generate Sitemap Index XML (for crawlers that check sitemap_index.xml)
$indexXml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
$indexXml .= '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
$indexXml .= '  <sitemap>' . "\n";
$indexXml .= '    <loc>' . $baseUrl . '/sitemap.xml</loc>' . "\n";
$indexXml .= '    <lastmod>' . date('Y-m-d') . '</lastmod>' . "\n";
$indexXml .= '  </sitemap>' . "\n";
$indexXml .= '</sitemapindex>' . "\n";

// Keep static files synchronized on root if writable
$rootDir = dirname(__DIR__);
@file_put_contents($rootDir . '/sitemap.xml', $xml);
@file_put_contents($rootDir . '/sitemap_index.xml', $indexXml);

// Check if request is specifically for sitemap_index.xml
$requestUri = $_SERVER['REQUEST_URI'] ?? '';
if (strpos($requestUri, 'sitemap_index') !== false) {
    echo $indexXml;
} else {
    echo $xml;
}
