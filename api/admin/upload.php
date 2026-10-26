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
            ApiResponse::error('Uploaded file exceeds the server upload limit. Maximum allowed size is 50MB for video reels and 15MB for studio photos.', 413);
        }
        ApiResponse::error('No file provided under "file" field', 422);
    }

    $file = $_FILES['file'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $errMap = [
            UPLOAD_ERR_INI_SIZE   => 'The uploaded file exceeds the upload_max_filesize directive in php.ini (max 64MB).',
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

    // Allowed MIME types & extensions mapping
    $mimeToExtMap = [
        'image/jpeg'      => 'jpg',
        'image/png'       => 'png',
        'image/webp'      => 'webp',
        'video/mp4'       => 'mp4',
        'video/quicktime' => 'mov',
        'video/webm'      => 'webm',
        'video/x-m4v'     => 'mp4',
        'video/m4v'       => 'mp4',
        'video/x-mp4'     => 'mp4',
        'application/mp4' => 'mp4',
    ];

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']);

    // Fallback: If finfo returns application/octet-stream or unrecognized MIME, inspect file header magic bytes
    if (!isset($mimeToExtMap[$mime])) {
        $clientExt = strtolower(pathinfo($file['name'] ?? '', PATHINFO_EXTENSION));
        $handle = @fopen($file['tmp_name'], 'rb');
        $header = $handle ? @fread($handle, 32) : '';
        if ($handle) { @fclose($handle); }

        $isFtyp = (strlen($header) >= 8 && substr($header, 4, 4) === 'ftyp');
        $isWebm = (strlen($header) >= 4 && substr($header, 0, 4) === "\x1A\x45\xDF\xA3");

        if (($clientExt === 'mp4' || $clientExt === 'm4v') && $isFtyp) {
            $mime = 'video/mp4';
        } elseif ($clientExt === 'mov' && $isFtyp) {
            $mime = 'video/quicktime';
        } elseif ($clientExt === 'webm' && $isWebm) {
            $mime = 'video/webm';
        } else {
            ApiResponse::error("Unsupported file type: {$mime}. Only JPG, PNG, WEBP images and MP4, MOV, WEBM videos are allowed.", 422);
        }
    }

    $ext = $mimeToExtMap[$mime] ?? 'mp4';
    $isVideo = str_starts_with($mime, 'video/') || in_array($ext, ['mp4', 'mov', 'webm'], true);
    $maxSize = $isVideo ? (50 * 1024 * 1024) : (15 * 1024 * 1024); // 50MB video, 15MB high-res studio image

    if ($file['size'] > $maxSize) {
        $maxMb = $isVideo ? '50MB' : '15MB';
        ApiResponse::error("File exceeds maximum allowed size of {$maxMb}", 422);
    }

    // Generate unique, strictly-typed filename (extension derived from MIME, immune to client spoofing)
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
    $moved = @move_uploaded_file($file['tmp_name'], $destination);
    if (!$moved && is_file($file['tmp_name'])) {
        $moved = @copy($file['tmp_name'], $destination);
    }
    if (!$moved) {
        ApiResponse::error('Failed to move uploaded file to target storage directory. Check server folder permissions.', 500);
    }

    // Compute public URL
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? '127.0.0.1:8000';
    $publicUrl = "{$protocol}://{$host}/api/uploads/{$filename}";

    // Detect exact image resolution (width x height)
    $dimensions = null;
    if (!$isVideo && function_exists('getimagesize')) {
        $imgInfo = @getimagesize($destination);
        if ($imgInfo && !empty($imgInfo[0]) && !empty($imgInfo[1])) {
            $dimensions = [
                'width'      => $imgInfo[0],
                'height'     => $imgInfo[1],
                'resolution' => "{$imgInfo[0]} × {$imgInfo[1]} px",
                'is_hd'      => ($imgInfo[0] >= 1000 && $imgInfo[1] >= 1000),
            ];
        }
    }

    AdminAuth::logActivity($adminUser['id'], 'upload_media', 'media', $filename, [
        'mime'       => $mime,
        'size_kb'    => round($file['size'] / 1024, 1),
        'is_video'   => $isVideo,
        'dimensions' => $dimensions ? $dimensions['resolution'] : null,
    ]);

    ApiResponse::success([
        'filename'   => $filename,
        'url'        => $publicUrl,
        'mime'       => $mime,
        'is_video'   => $isVideo,
        'size'       => $file['size'],
        'dimensions' => $dimensions,
    ], 'File uploaded successfully', 201);

} catch (Throwable $e) {
    error_log('upload.php error: ' . $e->getMessage());
    ApiResponse::error('Upload failed: ' . $e->getMessage(), 500);
}
