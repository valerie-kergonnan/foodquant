<?php
header('Content-Type: application/json');
require_once 'db.php';
try {
    $pdo->exec("ALTER TABLE historique_repas MODIFY recettes_json LONGTEXT NOT NULL");
    echo json_encode(["success" => true, "message" => "Colonne modifiée !"]);
} catch (PDOException $e) {
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}