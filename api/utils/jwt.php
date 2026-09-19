<?php
/**
 * VALERIE JEWELS — Lightweight JSON Web Token (JWT) Implementation
 * RFC 7519 compliant HMAC-SHA256 JWT parser and generator.
 * Zero external dependencies — optimized for shared hosting environments.
 */

class JWT {
    /**
     * Encode a PHP array payload into a signed JWT string.
     *
     * @param array $payload
     * @param string $secret
     * @param string $algo
     * @return string
     */
    public static function encode(array $payload, string $secret, string $algo = 'HS256'): string {
        $header = [
            'typ' => 'JWT',
            'alg' => $algo,
        ];

        $segments = [];
        $segments[] = self::base64UrlEncode(json_encode($header, JSON_UNESCAPED_SLASHES));
        $segments[] = self::base64UrlEncode(json_encode($payload, JSON_UNESCAPED_SLASHES));

        $signingInput = implode('.', $segments);
        $signature = self::sign($signingInput, $secret, $algo);
        $segments[] = self::base64UrlEncode($signature);

        return implode('.', $segments);
    }

    /**
     * Decode and verify a JWT string.
     *
     * @param string $jwt
     * @param string $secret
     * @param array $allowedAlgos
     * @throws Exception
     * @return array
     */
    public static function decode(string $jwt, string $secret, array $allowedAlgos = ['HS256']): array {
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) {
            throw new Exception('Invalid token segment count');
        }

        list($headb64, $bodyb64, $sigb64) = $parts;

        $header = json_decode(self::base64UrlDecode($headb64), true);
        if (!$header || empty($header['alg'])) {
            throw new Exception('Invalid token header');
        }

        if (!in_array($header['alg'], $allowedAlgos, true)) {
            throw new Exception('Algorithm not supported: ' . $header['alg']);
        }

        $payload = json_decode(self::base64UrlDecode($bodyb64), true);
        if (!$payload) {
            throw new Exception('Invalid token payload');
        }

        $sig = self::base64UrlDecode($sigb64);
        $expectedSig = self::sign("{$headb64}.{$bodyb64}", $secret, $header['alg']);

        // Constant-time signature comparison to prevent timing attacks
        if (!hash_equals($expectedSig, $sig)) {
            throw new Exception('Signature verification failed');
        }

        $now = time();

        // Check not before
        if (isset($payload['nbf']) && $payload['nbf'] > $now) {
            throw new Exception('Token is not yet active');
        }

        // Check expiration
        if (isset($payload['exp']) && $payload['exp'] < $now) {
            throw new Exception('Token has expired');
        }

        return $payload;
    }

    private static function sign(string $msg, string $key, string $algo = 'HS256'): string {
        $hashAlgo = match ($algo) {
            'HS256' => 'sha256',
            'HS384' => 'sha384',
            'HS512' => 'sha512',
            default => throw new Exception('Unsupported HMAC algorithm'),
        };

        return hash_hmac($hashAlgo, $msg, $key, true);
    }

    public static function base64UrlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    public static function base64UrlDecode(string $data): string {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $data .= str_repeat('=', 4 - $remainder);
        }
        return base64_decode(strtr($data, '-_', '+/'));
    }
}

if (!class_exists('JwtUtil')) {
    class_alias('JWT', 'JwtUtil');
}
