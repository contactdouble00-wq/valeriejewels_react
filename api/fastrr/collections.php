<?php
/**
 * VALERIE JEWELS — Shiprocket Fastrr Catalog API: Fetch Collections
 * Conforms to Shiprocket Checkout Custom Integration Specification
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/config/database.php';

handleCors();

$page = max(1, (int)($_GET['page'] ?? 1));
$limit = min(250, max(1, (int)($_GET['limit'] ?? 100)));
$offset = ($page - 1) * $limit;

try {
    $pdo = Database::getConnection();

    $stmt = $pdo->prepare("
        SELECT * FROM categories
        WHERE is_active = 1
        ORDER BY display_order ASC, id ASC
        LIMIT :limit OFFSET :offset
    ");
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $collections = [];
    foreach ($rows as $r) {
        $cId = (int)$r['id'];
        $img = !empty($r['image_url']) ? $r['image_url'] : 'https://valeriejewels.in/hero-jewelry-model.jpg';
        if (str_starts_with($img, '/')) {
            $img = 'https://valeriejewels.in' . $img;
        }

        $createdAt = date('c', strtotime($r['created_at'] ?? 'now'));

        $collections[] = [
            'id'         => $cId,
            'updated_at' => $createdAt,
            'body_html'  => '<p>' . htmlspecialchars($r['description'] ?: $r['name']) . '</p>',
            'handle'     => $r['slug'] ?: ('collection-' . $cId),
            'image'      => ['src' => $img],
            'title'      => $r['name'],
            'created_at' => $createdAt
        ];
    }

    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['collections' => $collections], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => $e->getMessage()]);
}
