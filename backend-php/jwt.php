<?php
/**
 * jwt.php — Gestion des tokens JWT (JSON Web Tokens)
 * 
 * Implémentation légère sans librairie externe.
 * Utilise HMAC-SHA256 pour la signature.
 */

// Clé secrète pour signer les tokens — lue depuis les variables d'environnement
define('JWT_SECRET', getenv('JWT_SECRET') ?: 'foodquant_jwt_secret_2026_change_me');
define('JWT_EXPIRATION', 86400 * 7); // 7 jours

/**
 * Encoder en Base64 URL-safe (pas de +, /, =)
 */
function base64UrlEncode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/**
 * Décoder du Base64 URL-safe
 */
function base64UrlDecode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/'));
}

/**
 * Générer un token JWT
 */
function genererJWT(array $payload): string {
    $header = base64UrlEncode(json_encode([
        'alg' => 'HS256',
        'typ' => 'JWT'
    ]));

    // Ajouter les timestamps
    $payload['iat'] = time();
    $payload['exp'] = time() + JWT_EXPIRATION;

    $payloadEncoded = base64UrlEncode(json_encode($payload));

    // Signature
    $signature = base64UrlEncode(
        hash_hmac('sha256', "$header.$payloadEncoded", JWT_SECRET, true)
    );

    return "$header.$payloadEncoded.$signature";
}

/**
 * Vérifier et décoder un token JWT
 * Retourne le payload si valide, null si invalide
 */
function verifierJWT(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    [$header, $payload, $signature] = $parts;

    // Vérifier la signature
    $signatureAttendue = base64UrlEncode(
        hash_hmac('sha256', "$header.$payload", JWT_SECRET, true)
    );

    if (!hash_equals($signatureAttendue, $signature)) {
        return null; // Signature invalide
    }

    // Décoder le payload
    $data = json_decode(base64UrlDecode($payload), true);
    if (!$data) return null;

    // Vérifier l'expiration
    if (isset($data['exp']) && $data['exp'] < time()) {
        return null; // Token expiré
    }

    return $data;
}

/**
 * Extraire le token JWT depuis les headers de la requête
 * Cherche dans : Authorization: Bearer <token>
 */
function extraireJWT(): ?string {
    // Méthode 1 : Header Authorization
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (preg_match('/Bearer\s+(.+)$/i', $authHeader, $matches)) {
        return $matches[1];
    }

    // Méthode 2 : Paramètre GET (fallback, moins sécurisé)
    if (isset($_GET['token'])) {
        return $_GET['token'];
    }

    return null;
}

/**
 * Vérifier l'authentification et retourner le userId
 * Arrête le script si non authentifié
 */
function authentifier(): int {
    $token = extraireJWT();

    if (!$token) {
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "Token manquant. Connectez-vous."]);
        exit;
    }

    $payload = verifierJWT($token);

    if (!$payload || !isset($payload['userId'])) {
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "Token invalide ou expiré. Reconnectez-vous."]);
        exit;
    }

    return (int) $payload['userId'];
}

/**
 * Générer un token CSRF
 */
function genererCSRFToken(): string {
    return bin2hex(random_bytes(32));
}

/**
 * Vérifier un token CSRF
 */
function verifierCSRF(string $token, string $tokenAttendu): bool {
    return hash_equals($tokenAttendu, $token);
}