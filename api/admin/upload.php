<?php
/**
 * VALERIE JEWELS — Admin Media Upload Handler
 * Supports multi-image product photos and short video try-on/unboxing clips.
 * Validates file types, extensions, and file sizes server-side.
 */

require_once dirname(__DIR__) . '/utils/admin_auth.php';

try {
    $adminUser = AdminAuth::authenticate(['admin', 'staff']);

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        ApiResponse::error('Method not allowed. Use POST multipart/form-data', 405);
    }

    if (empty($_FILES['file'])) {
        $contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
        if ($contentLength > 0) {
            ApiResponse::error('Uploaded file exceeds the server upload limit. Please choose a smaller file (max 30MB).', 413);
        }
        ApiResponse::error('No file provided under "file" field', 422);
    }

    $file = $_FILES['file'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $errMap = [
            UPLOAD_ERR_INI_SIZE   => 'The uploaded file exceeds the upload_max_filesize directive in php.ini.',
            UPLOAD_ERR_FORM_SIZE  => 'The uploaded file exceeds the MAX_FILE_SIZE specified in the form.',
            UPLOAD_ERR_PARTIAL    => 'The uploaded file was only partially uploaded.',
            UPLOAD_ERR_NO_FILE    => 'No file was uploaded.',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing a temporary folder on the server.',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk.',
            UPLOAD_ERR_EXTENSION  => 'A PHP extension stopped the file upload.',
        ];
        $errMsg = $errMap[$file['error']] ?? ('File upload failed with error code: ' . $file['error']);
        ApiResponse::error($errMsg, 400);
    }

    if (empty($file['tmp_name']) || !file_exists($file['tmp_name'])) {
        ApiResponse::error('Uploaded temporary file is missing or unreadable', 400);
    }

    // Allowed MIME types & extensions
    $allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    $allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    $allowedMimes = array_merge($allowedImageTypes, $allowedVideoTypes);

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']);

    $mimeToExtMap = [
        'image/jpeg'      => 'jpg',
        'image/png'       => 'png',
        'image/webp'      => 'webp',
        'video/mp4'       => 'mp4',
        'video/quicktime' => 'mov',
        'video/webm'      => 'webm',
    ];

    if (!isset($mimeToExtMap[$mime])) {
        ApiResponse::error("Unsupported file type: {$mime}. Only JPG, PNG, WEBP, and MP4/MOV videos allowed.", 422);
    }

    $isVideo = str_starts_with($mime, 'video/');
    $maxSize = $isVideo ? (30 * 1024 * 1024) : (5 * 1024 * 1024); // 30MB video, 5MB image

    if ($file['size'] > $maxSize) {
        $maxMb = $isVideo ? '30MB' : '5MB';
        ApiResponse::error("File exceeds maximum allowed size of {$maxMb}", 422);
    }

    // Generate unique, strictly-typed filename (extension derived from MIME, immune to client spoofing)
    $ext = $mimeToExtMap[$mime];
    $prefix = $isVideo ? 'video_' : 'img_';
    $filename = $prefix . bin2hex(random_bytes(16)) . '.' . $ext;

    $uploadDir = dirname(__DIR__) . '/uploads';
    if (!is_dir($uploadDir)) {
        @mkdir($uploadDir, 0777, true);
    }
    if (!is_writable($uploadDir)) {
        @chmod($uploadDir, 0777);
    }

    $destination = $uploadDir . '/' . $filename;
    if (!@move_uploaded_file($file['tmp_name'], $destination)) {
        ApiResponse::error('Failed to move uploaded file to target storage directory. Check server folder permissions.', 500);
    }

    // Compute public URL
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? '127.0.0.1:8000';
    $publicUrl = "{$protocol}://{$host}/api/uploads/{$filename}";

    AdminAuth::logActivity($adminUser['id'], 'upload_media', 'media', $filename, [
        'mime'      => $mime,
        'size_kb'   => round($file['size'] / 1024, 1),
        'is_video'  => $isVideo,
    ]);

    ApiResponse::success([
        'filename' => $filename,
        'url'      => $publicUrl,
        'mime'     => $mime,
        'is_video' => $isVideo,
        'size'     => $file['size'],
    ], 'File uploaded successfully', 201);

} catch (Throwable $e) {
    error_log('upload.php error: ' . $e->getMessage());
    ApiResponse::error('Upload failed: ' . $e->getMessage(), 500);
}
