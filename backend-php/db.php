<?php
/**
 * db.php — Connexion base de données sécurisée
 * 
 * SÉCURITÉ : Les identifiants sont lus depuis les variables d'environnement.
 * Ne JAMAIS mettre de mots de passe en dur dans le code.
 * Les variables sont déjà configurées dans Railway.
 */

$host     = getenv('MYSQLHOST')     ?: 'localhost';
$dbname   = getenv('MYSQLDATABASE') ?: 'foodquant';
$username = getenv('MYSQLUSER')     ?: 'root';
$password = getenv('MYSQLPASSWORD') ?: '';
$port     = getenv('MYSQLPORT')     ?: '3306';

$dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8";

try {
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    die(json_encode(["error" => "Erreur de connexion à la base de données"]));
}