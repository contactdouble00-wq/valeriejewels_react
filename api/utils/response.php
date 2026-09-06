<?php
/**
 * Valerie Jewels - Unified API Response Formatter
 * Standardized JSON envelope for all API responses.
 */

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
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');

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
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');

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
}
