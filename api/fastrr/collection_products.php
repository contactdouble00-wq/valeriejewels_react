<?php
/**
 * VALERIE JEWELS — Shiprocket Fastrr Catalog API: Fetch Products by Collection
 * Conforms to Shiprocket Checkout Custom Integration Specification
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/config/database.php';

handleCors();

$collectionId = (int)($_GET['collection_id'] ?? 0);
$page = max(1, (int)($_GET['page'] ?? 1));
$limit = min(250, max(1, (int)($_GET['limit'] ?? 100)));
$offset = ($page - 1) * $limit;

try {
    $pdo = Database::getConnection();

    $whereClause = "p.is_active = 1";
    $params = [];

    if ($collectionId > 0) {
        $whereClause .= " AND p.category_id = :cat_id";
        $params[':cat_id'] = $collectionId;
    }

    $stmt = $pdo->prepare("
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE {$whereClause}
        ORDER BY p.id ASC
        LIMIT :limit OFFSET :offset
    ");

    foreach ($params as $k => $v) {
        $stmt->bindValue($k, $v);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $products = [];
    foreach ($rows as $r) {
        $pId = (int)$r['id'];

        $imgStmt = $pdo->prepare("SELECT image_url FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, display_order ASC");
        $imgStmt->execute([$pId]);
        $imgs = $imgStmt->fetchAll(PDO::FETCH_COLUMN);

        $primaryImg = !empty($imgs[0]) ? $imgs[0] : 'https://valeriejewels.in/hero-jewelry-model.jpg';
        if (str_starts_with($primaryImg, '/')) {
            $primaryImg = 'https://valeriejewels.in' . $primaryImg;
        }

        $varStmt = $pdo->prepare("SELECT * FROM product_variants WHERE product_id = ? AND is_active = 1 ORDER BY id ASC");
        $varStmt->execute([$pId]);
        $variantsRaw = $varStmt->fetchAll(PDO::FETCH_ASSOC);

        $variants = [];
        if (!empty($variantsRaw)) {
            foreach ($variantsRaw as $v) {
                $variants[] = [
                    'id'               => (int)$v['id'],
                    'title'            => $v['title'] ?: 'Default',
                    'price'            => number_format((float)($v['price'] ?: $r['price']), 2, '.', ''),
                    'compare_at_price' => number_format((float)($v['mrp'] ?: $r['mrp']), 2, '.', ''),
                    'sku'              => $v['sku'] ?: ($r['sku'] . '-' . $v['id']),
                    'created_at'       => date('c', strtotime($v['created_at'] ?? 'now')),
                    'updated_at'       => date('c', strtotime($v['created_at'] ?? 'now')),
                    'quantity'         => (int)($v['stock_quantity'] ?? 50),
                    'taxable'          => true,
                    'grams'            => 50,
                    'image'            => ['src' => $primaryImg],
                    'weight'           => 0.05,
                    'weight_unit'      => 'kg',
                    'option_values'    => [
                        ($v['option1_name'] ?: 'Option') => ($v['option1_value'] ?: 'Standard')
                    ]
                ];
            }
        } else {
            $variants[] = [
                'id'               => $pId,
                'title'            => 'Standard Edition',
                'price'            => number_format((float)$r['price'], 2, '.', ''),
                'compare_at_price' => number_format((float)$r['mrp'], 2, '.', ''),
                'sku'              => $r['sku'] ?: ('VJ-PRD-' . $pId),
                'created_at'       => date('c', strtotime($r['created_at'] ?? 'now')),
                'updated_at'       => date('c', strtotime($r['created_at'] ?? 'now')),
                'quantity'         => (int)($r['stock_quantity'] ?? 50),
                'taxable'          => true,
                'grams'            => 50,
                'image'            => ['src' => $primaryImg],
                'weight'           => 0.05,
                'weight_unit'      => 'kg',
                'option_values'    => [
                    'Material' => $r['material'] ?: '18K Gold Plated Stainless Steel'
                ]
            ];
        }

        $createdAt = date('c', strtotime($r['created_at'] ?? 'now'));

        $products[] = [
            'id'           => $pId,
            'title'        => $r['name'],
            'body_html'    => '<p>' . htmlspecialchars($r['description'] ?: $r['short_description'] ?: $r['name']) . '</p>',
            'vendor'       => 'VALERIÉ',
            'product_type' => $r['category_name'] ?: 'Jewelry',
            'created_at'   => $createdAt,
            'handle'       => $r['slug'] ?: ('product-' . $pId),
            'updated_at'   => $createdAt,
            'tags'         => 'Jewelry, 18K Gold, Anti-Tarnish, Waterproof',
            'status'       => 'active',
            'variants'     => $variants,
            'image'        => ['src' => $primaryImg],
            'options'      => [
                [
                    'name'   => 'Material',
                    'values' => ['18K Gold Plated Stainless Steel']
                ]
            ]
        ];
    }

    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['products' => $products], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => $e->getMessage()]);
}
