<?php
/**
 * VALERIE JEWELS — Admin Product Reviews & Rating Management API
 * Provides full control to:
 * 1. View, filter, search, add, edit, and delete customer reviews.
 * 2. Upload product/customer review photos.
 * 3. Manage category-wise product rating overrides (setting average rating and review counts).
 */

require_once dirname(__DIR__) . '/utils/admin_auth.php';

$adminUser = AdminAuth::authenticate(['admin', 'staff']);
$pdo = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];

// Helper to sanitize and format image URLs
function normalizeReviewUrl(?string $url): ?string {
    if (empty($url)) return null;
    $url = trim($url);
    if ($url === '') return null;
    return preg_replace('#^(https?://[^/]+)?/uploads/#i', '$1/api/uploads/', $url);
}

// Helper to handle uploaded file in $_FILES
function handleUploadedReviewPhoto(array $file): ?string {
    if ($file['error'] !== UPLOAD_ERR_OK) {
        return null;
    }
    $allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']);
    if (!in_array($mime, $allowedTypes, true)) {
        throw new InvalidArgumentException("Invalid photo type: {$mime}. Only JPG, PNG, and WEBP are supported.");
    }
    if ($file['size'] > 15 * 1024 * 1024) {
        throw new InvalidArgumentException("Review photo exceeds the 15MB maximum size limit.");
    }

    $ext = match ($mime) {
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
        default      => 'jpg'
    };
    $filename = 'rev_' . bin2hex(random_bytes(12)) . '.' . $ext;
    $uploadDir = dirname(__DIR__) . '/uploads';
    if (!is_dir($uploadDir)) {
        @mkdir($uploadDir, 0777, true);
    }
    @chmod($uploadDir, 0777);

    $destination = $uploadDir . '/' . $filename;
    if (!@move_uploaded_file($file['tmp_name'], $destination)) {
        throw new RuntimeException("Failed to save uploaded review photo to disk.");
    }

    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? '127.0.0.1:8000';
    return "{$protocol}://{$host}/api/uploads/{$filename}";
}

try {
    // ─────────────────────────────────────────────────────────────────────────────
    // GET REQUESTS
    // ─────────────────────────────────────────────────────────────────────────────
    if ($method === 'GET') {
        $action = trim($_GET['action'] ?? '');

        // 1. Category-wise Product Ratings List
        if ($action === 'category_ratings') {
            $catStmt = $pdo->query("
                SELECT id, name, slug, display_order, rating_avg, is_active
                FROM categories
                ORDER BY display_order ASC, name ASC
            ");
            $categories = $catStmt->fetchAll(PDO::FETCH_ASSOC);

            // Fetch all products with their rating info and review stats
            $prodStmt = $pdo->query("
                SELECT 
                    p.id,
                    p.category_id,
                    p.name,
                    p.sku,
                    p.slug,
                    p.price,
                    p.mrp,
                    p.rating_avg,
                    p.review_count,
                    p.is_active,
                    p.is_bestseller,
                    COALESCE(
                        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 AND image_url NOT LIKE '%.mp4%' LIMIT 1),
                        (SELECT image_url FROM product_images WHERE product_id = p.id AND image_url NOT LIKE '%.mp4%' ORDER BY display_order ASC, id ASC LIMIT 1)
                    ) AS primary_image,
                    (SELECT COUNT(*) FROM reviews WHERE product_id = p.id AND status = 'approved') AS real_reviews_count,
                    (SELECT AVG(rating) FROM reviews WHERE product_id = p.id AND status = 'approved') AS real_reviews_avg
                FROM products p
                ORDER BY p.is_bestseller DESC, p.name ASC
            ");
            $allProducts = $prodStmt->fetchAll(PDO::FETCH_ASSOC);

            // Group products by category
            $productsByCategory = [];
            foreach ($allProducts as &$prod) {
                if (!empty($prod['primary_image'])) {
                    $prod['primary_image'] = normalizeReviewUrl($prod['primary_image']);
                }
                $prod['real_reviews_count'] = (int)$prod['real_reviews_count'];
                $prod['real_reviews_avg'] = $prod['real_reviews_avg'] !== null ? round((float)$prod['real_reviews_avg'], 1) : null;
                $prod['effective_rating'] = !empty($prod['rating_avg']) && (float)$prod['rating_avg'] > 0
                    ? (float)$prod['rating_avg']
                    : ($prod['real_reviews_avg'] ?? 4.9);
                $prod['effective_reviews_count'] = !empty($prod['review_count']) && (int)$prod['review_count'] > 0
                    ? (int)$prod['review_count']
                    : max($prod['real_reviews_count'], 128);

                $catId = (int)$prod['category_id'];
                if (!isset($productsByCategory[$catId])) {
                    $productsByCategory[$catId] = [];
                }
                $productsByCategory[$catId][] = $prod;
            }
            unset($prod);

            // Format category payload
            $resultCategories = [];
            foreach ($categories as $cat) {
                $cId = (int)$cat['id'];
                $catProds = $productsByCategory[$cId] ?? [];
                $cat['products'] = $catProds;
                $cat['products_count'] = count($catProds);
                
                // Compute average rating across this category's products
                $ratingsList = array_filter(array_column($catProds, 'effective_rating'));
                $cat['average_product_rating'] = !empty($ratingsList) 
                    ? round(array_sum($ratingsList) / count($ratingsList), 2)
                    : 4.9;

                $resultCategories[] = $cat;
            }

            ApiResponse::success([
                'categories' => $resultCategories,
                'total_products' => count($allProducts),
            ], 'Category ratings retrieved successfully');
        }

        // 2. Simple list of products for dropdown selection in Add/Edit review modal
        if ($action === 'products_dropdown') {
            $stmt = $pdo->query("
                SELECT p.id, p.name, p.sku, p.category_id, c.name AS category_name,
                       COALESCE(
                           (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 AND image_url NOT LIKE '%.mp4%' LIMIT 1),
                           (SELECT image_url FROM product_images WHERE product_id = p.id AND image_url NOT LIKE '%.mp4%' ORDER BY display_order ASC LIMIT 1)
                       ) AS primary_image
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.is_active = 1
                ORDER BY p.name ASC
            ");
            $prods = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($prods as &$p) {
                $p['primary_image'] = normalizeReviewUrl($p['primary_image'] ?? null);
            }
            ApiResponse::success($prods, 'Products dropdown loaded');
        }

        // 3. Single Review Detail
        $reviewId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($reviewId > 0) {
            $stmt = $pdo->prepare("
                SELECT r.*, p.name AS product_name, p.slug AS product_slug, c.name AS category_name
                FROM reviews r
                LEFT JOIN products p ON r.product_id = p.id
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE r.id = ?
            ");
            $stmt->execute([$reviewId]);
            $review = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$review) {
                ApiResponse::error('Review not found', 404);
            }
            $review['image_url'] = normalizeReviewUrl($review['image_url']);
            $review['images'] = !empty($review['images']) ? json_decode($review['images'], true) : [];
            ApiResponse::success($review, 'Review details fetched');
        }

        // 4. Default: Filtered List of Reviews + Overall Statistics
        $search = trim($_GET['search'] ?? '');
        $productId = isset($_GET['product_id']) && is_numeric($_GET['product_id']) ? (int)$_GET['product_id'] : null;
        $categoryId = isset($_GET['category_id']) && is_numeric($_GET['category_id']) ? (int)$_GET['category_id'] : null;
        $status = trim($_GET['status'] ?? 'all');
        $rating = isset($_GET['rating']) && is_numeric($_GET['rating']) ? (int)$_GET['rating'] : null;
        $withPhotos = isset($_GET['with_photos']) ? (int)$_GET['with_photos'] : null;
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(100, max(1, (int)($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;

        $where = ['1=1'];
        $params = [];

        if ($search !== '') {
            $where[] = '(r.reviewer_name LIKE ? OR r.title LIKE ? OR r.comment LIKE ? OR p.name LIKE ?)';
            $term = "%{$search}%";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        if ($productId !== null && $productId > 0) {
            $where[] = 'r.product_id = ?';
            $params[] = $productId;
        }

        if ($categoryId !== null && $categoryId > 0) {
            $where[] = 'p.category_id = ?';
            $params[] = $categoryId;
        }

        if ($status !== 'all' && in_array($status, ['approved', 'pending', 'rejected'], true)) {
            $where[] = 'r.status = ?';
            $params[] = $status;
        }

        if ($rating !== null && $rating >= 1 && $rating <= 5) {
            $where[] = 'r.rating = ?';
            $params[] = $rating;
        }

        if ($withPhotos === 1) {
            $where[] = "(r.image_url IS NOT NULL AND r.image_url != '' OR r.images IS NOT NULL AND r.images != '[]')";
        }

        $whereSql = implode(' AND ', $where);

        // Count matching records
        $countSql = "
            SELECT COUNT(*)
            FROM reviews r
            LEFT JOIN products p ON r.product_id = p.id
            WHERE {$whereSql}
        ";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($params);
        $totalItems = (int)$countStmt->fetchColumn();
        $totalPages = (int)ceil($totalItems / $limit);

        // Fetch paginated reviews
        $listSql = "
            SELECT 
                r.id,
                r.product_id,
                r.user_id,
                r.reviewer_name,
                r.rating,
                r.title,
                r.comment,
                r.image_url,
                r.images,
                r.is_verified_buyer,
                r.status,
                r.created_at,
                p.name AS product_name,
                p.slug AS product_slug,
                c.name AS category_name,
                COALESCE(
                    (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 AND image_url NOT LIKE '%.mp4%' LIMIT 1),
                    (SELECT image_url FROM product_images WHERE product_id = p.id AND image_url NOT LIKE '%.mp4%' ORDER BY display_order ASC, id ASC LIMIT 1)
                ) AS product_primary_image
            FROM reviews r
            LEFT JOIN products p ON r.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE {$whereSql}
            ORDER BY r.id DESC
            LIMIT {$limit} OFFSET {$offset}
        ";
        $listStmt = $pdo->prepare($listSql);
        $listStmt->execute($params);
        $reviews = $listStmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($reviews as &$rev) {
            $rev['image_url'] = normalizeReviewUrl($rev['image_url']);
            $rev['product_primary_image'] = normalizeReviewUrl($rev['product_primary_image'] ?? null);
            $parsedImages = [];
            if (!empty($rev['images'])) {
                $decoded = json_decode($rev['images'], true);
                if (is_array($decoded)) {
                    $parsedImages = array_values(array_filter(array_map('normalizeReviewUrl', $decoded)));
                }
            }
            if (empty($parsedImages) && !empty($rev['image_url'])) {
                $parsedImages = [$rev['image_url']];
            }
            $rev['images'] = $parsedImages;
        }
        unset($rev);

        // Overall review metrics
        $metricsStmt = $pdo->query("
            SELECT 
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
                SUM(CASE WHEN (image_url IS NOT NULL AND image_url != '') OR (images IS NOT NULL AND images != '[]') THEN 1 ELSE 0 END) AS with_photos,
                AVG(CASE WHEN status = 'approved' THEN rating ELSE NULL END) AS avg_rating,
                SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) AS stars_5,
                SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) AS stars_4,
                SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) AS stars_3,
                SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) AS stars_2,
                SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS stars_1
            FROM reviews
        ");
        $metrics = $metricsStmt->fetch(PDO::FETCH_ASSOC);

        $stats = [
            'total'               => (int)($metrics['total'] ?? 0),
            'approved'            => (int)($metrics['approved'] ?? 0),
            'pending'             => (int)($metrics['pending'] ?? 0),
            'rejected'            => (int)($metrics['rejected'] ?? 0),
            'with_photos'         => (int)($metrics['with_photos'] ?? 0),
            'avg_rating'          => $metrics['avg_rating'] !== null ? round((float)$metrics['avg_rating'], 1) : 4.9,
            'breakdown'           => [
                5 => (int)($metrics['stars_5'] ?? 0),
                4 => (int)($metrics['stars_4'] ?? 0),
                3 => (int)($metrics['stars_3'] ?? 0),
                2 => (int)($metrics['stars_2'] ?? 0),
                1 => (int)($metrics['stars_1'] ?? 0),
            ],
        ];

        ApiResponse::success([
            'reviews'     => $reviews,
            'stats'       => $stats,
            'pagination'  => [
                'page'        => $page,
                'limit'       => $limit,
                'total_items' => $totalItems,
                'total_pages' => $totalPages,
            ],
        ], 'Reviews list retrieved successfully');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // POST / PUT / DELETE REQUESTS
    // ─────────────────────────────────────────────────────────────────────────────
    $rawInput = file_get_contents('php://input');
    $jsonInput = json_decode($rawInput, true) ?: [];
    $input = array_merge($_POST, $jsonInput);
    $action = trim($_GET['action'] ?? ($input['action'] ?? ''));

    // 1. Upload review photo standalone
    if ($action === 'upload_photo') {
        $fileKey = isset($_FILES['file']) ? 'file' : (isset($_FILES['photo']) ? 'photo' : (isset($_FILES['image']) ? 'image' : null));
        if (!$fileKey || empty($_FILES[$fileKey]['tmp_name'])) {
            ApiResponse::error('No photo file uploaded in request.', 422);
        }
        $uploadedUrl = handleUploadedReviewPhoto($_FILES[$fileKey]);
        AdminAuth::logActivity($adminUser['id'], 'upload_review_photo', 'review', null, ['url' => $uploadedUrl]);
        ApiResponse::success(['url' => $uploadedUrl], 'Review photo uploaded successfully', 201);
    }

    // 2. Set Product Rating & Review Count Override
    if ($action === 'update_product_rating') {
        $productId = (int)($input['product_id'] ?? 0);
        if ($productId <= 0) {
            ApiResponse::error('Valid Product ID is required', 422);
        }

        $ratingAvg = isset($input['rating_avg']) && $input['rating_avg'] !== '' ? (float)$input['rating_avg'] : null;
        $reviewCount = isset($input['review_count']) && $input['review_count'] !== '' ? (int)$input['review_count'] : null;

        if ($ratingAvg !== null && ($ratingAvg < 1.0 || $ratingAvg > 5.0)) {
            ApiResponse::error('Average rating must be between 1.0 and 5.0', 422);
        }

        $stmt = $pdo->prepare("UPDATE products SET rating_avg = ?, review_count = ? WHERE id = ?");
        $stmt->execute([$ratingAvg, $reviewCount, $productId]);

        AdminAuth::logActivity($adminUser['id'], 'update_product_rating', 'product', $productId, [
            'rating_avg' => $ratingAvg,
            'review_count' => $reviewCount,
        ]);

        ApiResponse::success([
            'product_id' => $productId,
            'rating_avg' => $ratingAvg,
            'review_count' => $reviewCount,
        ], 'Product rating configuration updated successfully');
    }

    // 3. Batch apply Category Rating
    if ($action === 'bulk_category_rating') {
        $categoryId = (int)($input['category_id'] ?? 0);
        if ($categoryId <= 0) {
            ApiResponse::error('Valid Category ID is required', 422);
        }

        $ratingAvg = isset($input['rating_avg']) && $input['rating_avg'] !== '' ? (float)$input['rating_avg'] : 4.9;
        $reviewCount = isset($input['review_count']) && $input['review_count'] !== '' ? (int)$input['review_count'] : null;
        $applyToAll = !empty($input['apply_to_all_products']);

        if ($ratingAvg < 1.0 || $ratingAvg > 5.0) {
            ApiResponse::error('Average rating must be between 1.0 and 5.0', 422);
        }

        // Update category default
        $catStmt = $pdo->prepare("UPDATE categories SET rating_avg = ? WHERE id = ?");
        $catStmt->execute([$ratingAvg, $categoryId]);

        $updatedCount = 0;
        if ($applyToAll) {
            if ($reviewCount !== null && $reviewCount > 0) {
                $prodStmt = $pdo->prepare("UPDATE products SET rating_avg = ?, review_count = ? WHERE category_id = ?");
                $prodStmt->execute([$ratingAvg, $reviewCount, $categoryId]);
            } else {
                $prodStmt = $pdo->prepare("UPDATE products SET rating_avg = ? WHERE category_id = ?");
                $prodStmt->execute([$ratingAvg, $categoryId]);
            }
            $updatedCount = $prodStmt->rowCount();
        }

        AdminAuth::logActivity($adminUser['id'], 'bulk_category_rating', 'category', $categoryId, [
            'rating_avg' => $ratingAvg,
            'review_count' => $reviewCount,
            'apply_to_all' => $applyToAll,
            'updated_products' => $updatedCount,
        ]);

        ApiResponse::success([
            'category_id' => $categoryId,
            'rating_avg' => $ratingAvg,
            'review_count' => $reviewCount,
            'updated_products' => $updatedCount,
        ], "Category rating set to {$ratingAvg}" . ($applyToAll ? " and applied to {$updatedCount} products." : '.'));
    }

    // 4. Create New Customer Review
    if ($action === 'create' || ($method === 'POST' && empty($action))) {
        $productId = (int)($input['product_id'] ?? 0);
        $reviewerName = trim($input['reviewer_name'] ?? '');
        $rating = (int)($input['rating'] ?? 5);
        $title = trim($input['title'] ?? '');
        $comment = trim($input['comment'] ?? '');
        $isVerifiedBuyer = isset($input['is_verified_buyer']) ? (int)$input['is_verified_buyer'] : 1;
        $status = in_array($input['status'] ?? '', ['approved', 'pending', 'rejected'], true) ? $input['status'] : 'approved';
        $createdAt = !empty($input['created_at']) ? date('Y-m-d H:i:s', strtotime($input['created_at'])) : date('Y-m-d H:i:s');

        if ($productId <= 0) {
            ApiResponse::error('Please select a valid product for the review', 422);
        }
        if (empty($reviewerName)) {
            ApiResponse::error('Reviewer name is required', 422);
        }
        if ($rating < 1 || $rating > 5) {
            ApiResponse::error('Rating must be between 1 and 5 stars', 422);
        }

        // Handle uploaded review photo(s)
        $imageUrl = !empty($input['image_url']) ? trim($input['image_url']) : null;
        $imagesList = [];
        if (!empty($input['images'])) {
            $imagesList = is_array($input['images']) ? $input['images'] : (json_decode($input['images'], true) ?: []);
        }

        // Check if a direct file was uploaded
        if (!empty($_FILES['image']['tmp_name'])) {
            $uploadedUrl = handleUploadedReviewPhoto($_FILES['image']);
            if ($uploadedUrl) {
                $imageUrl = $uploadedUrl;
                $imagesList[] = $uploadedUrl;
            }
        }
        if (!empty($_FILES['photo']['tmp_name'])) {
            $uploadedUrl = handleUploadedReviewPhoto($_FILES['photo']);
            if ($uploadedUrl) {
                $imageUrl = $uploadedUrl;
                $imagesList[] = $uploadedUrl;
            }
        }

        if ($imageUrl && empty($imagesList)) {
            $imagesList = [$imageUrl];
        }

        $imagesJson = !empty($imagesList) ? json_encode(array_values(array_unique($imagesList))) : null;

        $insertStmt = $pdo->prepare("
            INSERT INTO reviews (product_id, reviewer_name, rating, title, comment, image_url, images, is_verified_buyer, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $insertStmt->execute([
            $productId,
            $reviewerName,
            $rating,
            $title,
            $comment,
            $imageUrl,
            $imagesJson,
            $isVerifiedBuyer,
            $status,
            $createdAt,
        ]);
        $newReviewId = (int)$pdo->lastInsertId();

        AdminAuth::logActivity($adminUser['id'], 'create_review', 'review', $newReviewId, [
            'product_id' => $productId,
            'reviewer' => $reviewerName,
            'rating' => $rating,
            'has_photo' => !empty($imageUrl),
        ]);

        ApiResponse::success(['id' => $newReviewId], 'Product review created successfully', 201);
    }

    // 5. Update Existing Review
    if ($action === 'update') {
        $id = (int)($input['id'] ?? 0);
        if ($id <= 0) {
            ApiResponse::error('Review ID is required for updating', 422);
        }

        $checkStmt = $pdo->prepare("SELECT * FROM reviews WHERE id = ?");
        $checkStmt->execute([$id]);
        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);
        if (!$existing) {
            ApiResponse::error('Review not found', 404);
        }

        $productId = isset($input['product_id']) && (int)$input['product_id'] > 0 ? (int)$input['product_id'] : (int)$existing['product_id'];
        $reviewerName = isset($input['reviewer_name']) ? trim($input['reviewer_name']) : $existing['reviewer_name'];
        $rating = isset($input['rating']) ? max(1, min(5, (int)$input['rating'])) : (int)$existing['rating'];
        $title = isset($input['title']) ? trim($input['title']) : $existing['title'];
        $comment = isset($input['comment']) ? trim($input['comment']) : $existing['comment'];
        $isVerifiedBuyer = isset($input['is_verified_buyer']) ? (int)$input['is_verified_buyer'] : (int)$existing['is_verified_buyer'];
        $status = isset($input['status']) && in_array($input['status'], ['approved', 'pending', 'rejected'], true) ? $input['status'] : $existing['status'];
        $createdAt = !empty($input['created_at']) ? date('Y-m-d H:i:s', strtotime($input['created_at'])) : $existing['created_at'];

        // Photos handling
        $imageUrl = isset($input['image_url']) ? trim($input['image_url']) : $existing['image_url'];
        $imagesList = [];
        if (isset($input['images'])) {
            $imagesList = is_array($input['images']) ? $input['images'] : (json_decode($input['images'], true) ?: []);
        } elseif (!empty($existing['images'])) {
            $imagesList = json_decode($existing['images'], true) ?: [];
        }

        if (!empty($_FILES['image']['tmp_name'])) {
            $uploadedUrl = handleUploadedReviewPhoto($_FILES['image']);
            if ($uploadedUrl) {
                $imageUrl = $uploadedUrl;
                $imagesList[] = $uploadedUrl;
            }
        }
        if (!empty($_FILES['photo']['tmp_name'])) {
            $uploadedUrl = handleUploadedReviewPhoto($_FILES['photo']);
            if ($uploadedUrl) {
                $imageUrl = $uploadedUrl;
                $imagesList[] = $uploadedUrl;
            }
        }

        if ($imageUrl && empty($imagesList)) {
            $imagesList = [$imageUrl];
        }

        $imagesJson = !empty($imagesList) ? json_encode(array_values(array_unique($imagesList))) : null;

        $updateStmt = $pdo->prepare("
            UPDATE reviews SET
                product_id = ?,
                reviewer_name = ?,
                rating = ?,
                title = ?,
                comment = ?,
                image_url = ?,
                images = ?,
                is_verified_buyer = ?,
                status = ?,
                created_at = ?
            WHERE id = ?
        ");
        $updateStmt->execute([
            $productId,
            $reviewerName,
            $rating,
            $title,
            $comment,
            $imageUrl,
            $imagesJson,
            $isVerifiedBuyer,
            $status,
            $createdAt,
            $id,
        ]);

        AdminAuth::logActivity($adminUser['id'], 'update_review', 'review', $id, [
            'product_id' => $productId,
            'reviewer' => $reviewerName,
            'rating' => $rating,
            'status' => $status,
        ]);

        ApiResponse::success(['id' => $id], 'Review updated successfully');
    }

    // 6. Delete Single Review
    if ($action === 'delete') {
        $id = (int)($input['id'] ?? ($_GET['id'] ?? 0));
        if ($id <= 0) {
            ApiResponse::error('Review ID is required', 422);
        }

        $stmt = $pdo->prepare("DELETE FROM reviews WHERE id = ?");
        $stmt->execute([$id]);

        AdminAuth::logActivity($adminUser['id'], 'delete_review', 'review', $id);
        ApiResponse::success(['id' => $id], 'Review deleted successfully');
    }

    // 7. Bulk Delete Reviews
    if ($action === 'bulk_delete') {
        $ids = $input['ids'] ?? [];
        if (!is_array($ids) || empty($ids)) {
            ApiResponse::error('No review IDs provided for bulk deletion', 422);
        }

        $validIds = array_filter(array_map('intval', $ids), fn($id) => $id > 0);
        if (empty($validIds)) {
            ApiResponse::error('No valid IDs found', 422);
        }

        $placeholders = implode(',', array_fill(0, count($validIds), '?'));
        $stmt = $pdo->prepare("DELETE FROM reviews WHERE id IN ({$placeholders})");
        $stmt->execute($validIds);
        $deletedCount = $stmt->rowCount();

        AdminAuth::logActivity($adminUser['id'], 'bulk_delete_reviews', 'review', null, [
            'count' => $deletedCount,
            'ids'   => $validIds,
        ]);

        ApiResponse::success(['deleted_count' => $deletedCount], "{$deletedCount} reviews deleted successfully");
    }

    // 8. Bulk Status Change (Approve / Reject)
    if ($action === 'bulk_status') {
        $ids = $input['ids'] ?? [];
        $newStatus = trim($input['status'] ?? '');
        if (!in_array($newStatus, ['approved', 'pending', 'rejected'], true)) {
            ApiResponse::error('Invalid status. Must be approved, pending, or rejected.', 422);
        }

        $validIds = array_filter(array_map('intval', $ids), fn($id) => $id > 0);
        if (empty($validIds)) {
            ApiResponse::error('No valid IDs provided', 422);
        }

        $placeholders = implode(',', array_fill(0, count($validIds), '?'));
        $params = array_merge([$newStatus], $validIds);
        $stmt = $pdo->prepare("UPDATE reviews SET status = ? WHERE id IN ({$placeholders})");
        $stmt->execute($params);
        $updatedCount = $stmt->rowCount();

        AdminAuth::logActivity($adminUser['id'], 'bulk_status_reviews', 'review', null, [
            'status' => $newStatus,
            'count'  => $updatedCount,
        ]);

        ApiResponse::success(['updated_count' => $updatedCount], "{$updatedCount} reviews marked as {$newStatus}");
    }

    ApiResponse::error("Unrecognized review action: '{$action}'", 400);

} catch (InvalidArgumentException $e) {
    ApiResponse::error($e->getMessage(), 422);
} catch (Throwable $e) {
    error_log('api/admin/reviews.php error: ' . $e->getMessage());
    ApiResponse::error('Review management error: ' . $e->getMessage(), 500);
}
