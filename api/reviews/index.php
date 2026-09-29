<?php
/**
 * VALERIE JEWELS — Public Product Reviews API
 * Supports:
 * 1. GET ?product_id=X or ?slug=Y — Retrieve approved customer reviews with images & rating breakdown.
 * 2. POST — Customer submits a review with optional product photo upload.
 */

require_once dirname(__DIR__) . '/utils/cors.php';
require_once dirname(__DIR__) . '/utils/response.php';
require_once dirname(__DIR__) . '/config/database.php';

handleCors();

$pdo = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];

function normalizeReviewPhotoUrl(?string $url): ?string {
    if (empty($url)) return null;
    $url = trim($url);
    if ($url === '') return null;
    return preg_replace('#^(https?://[^/]+)?/uploads/#i', '$1/api/uploads/', $url);
}

try {
    if ($method === 'GET') {
        $productId = isset($_GET['product_id']) && is_numeric($_GET['product_id']) ? (int)$_GET['product_id'] : 0;
        $slug = trim($_GET['slug'] ?? '');

        if ($productId <= 0 && !empty($slug)) {
            $stmt = $pdo->prepare("SELECT id FROM products WHERE slug = ? AND is_active = 1 LIMIT 1");
            $stmt->execute([$slug]);
            $productId = (int)$stmt->fetchColumn();
        }

        if ($productId <= 0) {
            ApiResponse::error('Valid product_id or slug is required', 400);
        }

        // Fetch product's rating settings
        $pStmt = $pdo->prepare("
            SELECT p.id, p.name, p.slug, p.rating_avg, p.review_count, c.rating_avg AS category_rating_avg
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ?
        ");
        $pStmt->execute([$productId]);
        $prodInfo = $pStmt->fetch(PDO::FETCH_ASSOC);

        // Fetch approved reviews
        $revStmt = $pdo->prepare("
            SELECT id, reviewer_name, rating, title, comment, image_url, images, is_verified_buyer, created_at
            FROM reviews
            WHERE product_id = ? AND status = 'approved'
            ORDER BY id DESC
        ");
        $revStmt->execute([$productId]);
        $reviews = $revStmt->fetchAll(PDO::FETCH_ASSOC);

        $customerPhotos = [];
        foreach ($reviews as &$rev) {
            $rev['image_url'] = normalizeReviewPhotoUrl($rev['image_url']);
            $imgs = [];
            if (!empty($rev['images'])) {
                $dec = json_decode($rev['images'], true);
                if (is_array($dec)) {
                    $imgs = array_values(array_filter(array_map('normalizeReviewPhotoUrl', $dec)));
                }
            }
            if (empty($imgs) && !empty($rev['image_url'])) {
                $imgs = [$rev['image_url']];
            }
            $rev['images'] = $imgs;

            foreach ($imgs as $pic) {
                if ($pic) {
                    $customerPhotos[] = [
                        'review_id'     => $rev['id'],
                        'reviewer_name' => $rev['reviewer_name'],
                        'rating'        => $rev['rating'],
                        'image_url'     => $pic,
                    ];
                }
            }
        }
        unset($rev);

        // Compute aggregate rating
        $avgRating = 4.9;
        if (!empty($prodInfo['rating_avg']) && (float)$prodInfo['rating_avg'] > 0) {
            $avgRating = (float)$prodInfo['rating_avg'];
        } elseif (!empty($reviews)) {
            $totalRating = array_sum(array_column($reviews, 'rating'));
            $avgRating = round($totalRating / count($reviews), 1);
        } elseif (!empty($prodInfo['category_rating_avg']) && (float)$prodInfo['category_rating_avg'] > 0) {
            $avgRating = (float)$prodInfo['category_rating_avg'];
        }

        $reviewsCount = !empty($prodInfo['review_count']) && (int)$prodInfo['review_count'] > 0
            ? max(count($reviews), (int)$prodInfo['review_count'])
            : (count($reviews) > 0 ? count($reviews) : 128);

        // Rating breakdown
        $breakdown = [5 => 0, 4 => 0, 3 => 0, 2 => 0, 1 => 0];
        foreach ($reviews as $r) {
            $star = (int)$r['rating'];
            if (isset($breakdown[$star])) {
                $breakdown[$star]++;
            }
        }

        ApiResponse::success([
            'product_id'      => $productId,
            'average_rating'  => $avgRating,
            'reviews_count'   => $reviewsCount,
            'reviews'         => $reviews,
            'customer_photos' => $customerPhotos,
            'breakdown'       => $breakdown,
        ], 'Reviews fetched successfully');
    }

    if ($method === 'POST') {
        $raw = file_get_contents('php://input');
        $input = json_decode($raw, true) ?: $_POST;

        $productId = (int)($input['product_id'] ?? 0);
        $reviewerName = trim($input['reviewer_name'] ?? '');
        $rating = max(1, min(5, (int)($input['rating'] ?? 5)));
        $title = trim($input['title'] ?? '');
        $comment = trim($input['comment'] ?? '');

        if ($productId <= 0) {
            ApiResponse::error('Valid product ID is required', 422);
        }
        if (empty($reviewerName)) {
            ApiResponse::error('Your name is required to submit a review', 422);
        }

        $uploadedPhotoUrl = null;
        if (!empty($_FILES['photo']['tmp_name'])) {
            $file = $_FILES['photo'];
            $allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
            $finfo = new finfo(FILEINFO_MIME_TYPE);
            $mime = $finfo->file($file['tmp_name']);
            if (in_array($mime, $allowedTypes, true) && $file['size'] <= 15 * 1024 * 1024) {
                $ext = match ($mime) {
                    'image/jpeg' => 'jpg',
                    'image/png'  => 'png',
                    'image/webp' => 'webp',
                    default      => 'jpg'
                };
                $filename = 'rev_cust_' . bin2hex(random_bytes(10)) . '.' . $ext;
                $uploadDir = dirname(__DIR__) . '/uploads';
                if (!is_dir($uploadDir)) {
                    @mkdir($uploadDir, 0777, true);
                }
                if (@move_uploaded_file($file['tmp_name'], $uploadDir . '/' . $filename)) {
                    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
                    $host = $_SERVER['HTTP_HOST'] ?? '127.0.0.1:8000';
                    $uploadedPhotoUrl = "{$protocol}://{$host}/api/uploads/{$filename}";
                }
            }
        }

        $imagesJson = $uploadedPhotoUrl ? json_encode([$uploadedPhotoUrl]) : null;

        $stmt = $pdo->prepare("
            INSERT INTO reviews (product_id, reviewer_name, rating, title, comment, image_url, images, is_verified_buyer, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'approved', CURRENT_TIMESTAMP)
        ");
        $stmt->execute([
            $productId,
            $reviewerName,
            $rating,
            $title,
            $comment,
            $uploadedPhotoUrl,
            $imagesJson,
        ]);

        ApiResponse::success(['id' => (int)$pdo->lastInsertId()], 'Thank you! Your review has been submitted.', 201);
    }

    ApiResponse::error('Method not allowed', 405);

} catch (Throwable $e) {
    error_log('api/reviews/index.php error: ' . $e->getMessage());
    ApiResponse::error('Review service error: ' . $e->getMessage(), 500);
}
