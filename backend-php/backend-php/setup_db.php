<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain');

echo "1. Début du script\n";

echo "2. MYSQLHOST = " . ($_ENV['MYSQLHOST'] ?? $_SERVER['MYSQLHOST'] ?? getenv('MYSQLHOST') ?? 'NON TROUVÉ') . "\n";

echo "3. Chargement db.php\n";
require_once 'db.php';

echo "4. Connexion OK\n";

try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS utilisateurs (
            idutilisateurs INT AUTO_INCREMENT PRIMARY KEY,
            prenom VARCHAR(100),
            email VARCHAR(255) UNIQUE,
            mot_de_passe VARCHAR(255),
            age INT,
            weight FLOAT,
            height FLOAT,
            gender VARCHAR(10),
            goal VARCHAR(20),
            diet VARCHAR(30),
            besoin_calorique INT,
            date_inscription DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ");
    echo "5. Table utilisateurs OK\n";

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS historique_repas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            utilisateur_id INT NOT NULL,
            date_repas DATE NOT NULL,
            recettes_json TEXT NOT NULL,
            total_calories INT NOT NULL,
            total_proteines INT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(idutilisateurs),
            UNIQUE KEY unique_jour (utilisateur_id, date_repas)
        )
    ");
    echo "6. Table historique_repas OK\n";
    echo "SUCCES : Tables créées !";
} catch (PDOException $e) {
    echo "ERREUR : " . $e->getMessage();
}