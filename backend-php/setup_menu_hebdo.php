<?php
/**
 * setup_menu_hebdo.php
 * 
 * UTILISATION : Accède à cette URL une seule fois dans ton navigateur :
 * https://foodquant-production.up.railway.app/setup_menu_hebdo.php
 * 
 * La table sera créée automatiquement.
 * Tu peux supprimer ce fichier après.
 */

header("Content-Type: application/json");

require_once __DIR__ . '/db.php';

try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS menu_hebdomadaire (
            id INT AUTO_INCREMENT PRIMARY KEY,
            utilisateur_id INT NOT NULL,
            semaine VARCHAR(10) NOT NULL COMMENT 'Format ISO : 2026-W12',
            jour TINYINT NOT NULL COMMENT '1=lundi, 2=mardi ... 7=dimanche',
            type_repas VARCHAR(20) NOT NULL COMMENT 'breakfast, lunch, snack, dinner',
            choix_json MEDIUMTEXT NOT NULL COMMENT 'JSON : tableau de 4 recettes proposees',
            selection_index TINYINT DEFAULT NULL COMMENT 'Index 0-3 de la recette choisie',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(idutilisateurs) ON DELETE CASCADE,
            UNIQUE KEY unique_menu (utilisateur_id, semaine, jour, type_repas)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    echo json_encode([
        "success" => true,
        "message" => "Table menu_hebdomadaire créée avec succès ! Tu peux supprimer ce fichier."
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Erreur : " . $e->getMessage()
    ]);
}