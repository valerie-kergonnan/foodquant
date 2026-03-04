<?php
require_once 'db.php';

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

    echo json_encode(["success" => true, "message" => "Tables créées !"]);
} catch (PDOException $e) {
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}