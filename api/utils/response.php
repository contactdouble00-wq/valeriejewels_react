<?php
/**
 * Valerie Jewels - Unified API Response Formatter
 * Standardized JSON envelope for all API responses.
 * Includes global fatal error and uncaught exception safety nets.
 */

if (!ob_get_level()) {
    ob_start();
}

class ApiResponse {
    /**
     * Send a successful JSON response
     *
     * @param mixed $data Response payload
     * @param string $message User or developer friendly message
     * @param int $statusCode HTTP status code (default 200)
     * @param array $meta Optional pagination or metadata
     */
    public static function success(mixed $data = null, string $message = 'Success', int $statusCode = 200, array $meta = []): void {
        while (ob_get_level()) {
            ob_end_clean();
        }
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');
        header('Expires: 0');

        $response = [
            'success'   => true,
            'message'   => $message,
            'data'      => $data,
            'timestamp' => date('c'),
        ];

        if (!empty($meta)) {
            $response['meta'] = $meta;
        }

        echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    /**
     * Send an error JSON response
     *
     * @param string $message Error message
     * @param int $statusCode HTTP status code (default 400)
     * @param array|null $errors Detailed validation or system errors
     */
    public static function error(string $message = 'An error occurred', int $statusCode = 400, ?array $errors = null): void {
        while (ob_get_level()) {
            ob_end_clean();
        }
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');
        header('Expires: 0');

        $response = [
            'success'   => false,
            'message'   => $message,
            'timestamp' => date('c'),
        ];

        if ($errors !== null) {
            $response['errors'] = $errors;
        }

        echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    /**
     * Inspect database exceptions (PDOException / Throwable) and emit friendly 409 or 422 errors for duplicate keys / constraints
     */
    public static function handleDatabaseException(Throwable $e, string $fallbackMessage = 'Database operation failed'): void {
        $msg = $e->getMessage();
        // Duplicate key / UNIQUE constraint check
        if (stripos($msg, 'UNIQUE constraint failed') !== false || stripos($msg, 'Duplicate entry') !== false || (string)$e->getCode() === '23000') {
            if (stripos($msg, 'sku') !== false) {
                self::error('A product with this SKU already exists. Please choose a unique SKU.', 409);
            } elseif (stripos($msg, 'code') !== false) {
                self::error('A voucher with this coupon code already exists. Please choose a unique code.', 409);
            } elseif (stripos($msg, 'slug') !== false) {
                self::error('An item with this URL slug already exists. Please choose a unique title or slug.', 409);
            } elseif (stripos($msg, 'email') !== false) {
                self::error('An account with this email address already exists.', 409);
            }
            self::error('An item with these unique details already exists.', 409);
        }

        // Foreign key constraint violation
        if (stripos($msg, 'FOREIGN KEY constraint failed') !== false || stripos($msg, 'foreign key constraint') !== false) {
            self::error('Cannot complete operation: This record is currently linked to existing store data.', 409);
        }

        // General fallback
        self::error($fallbackMessage . ': ' . $e->getMessage(), 500);
    }
}

// Global safety net for any uncaught Throwables in the API runtime
set_exception_handler(function (Throwable $e): void {
    error_log('Uncaught API Exception: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    ApiResponse::handleDatabaseException($e, 'Internal Server Error');
});

// Global shutdown safety net for fatal PHP errors (parse errors, fatal out-of-memory, etc.)
register_shutdown_function(function (): void {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        while (ob_get_level()) {
            ob_end_clean();
        }
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success'   => false,
            'message'   => 'Fatal Server Error: ' . $error['message'],
            'timestamp' => date('c'),
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
});

