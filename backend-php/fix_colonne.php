<?php
/**
 * fix_colonne.php — Script à exécuter UNE SEULE FOIS puis à supprimer
 * 
 * URL : https://foodquant-production.up.railway.app/fix_colonne.php
 * 
 * ⚠️ SUPPRIMEZ CE FICHIER APRÈS UTILISATION
 */

header("Content-Type: application/json");
require_once 'db.php';

try {
    $pdo->exec("ALTER TABLE historique_repas MODIFY recettes_json MEDIUMTEXT");
    echo json_encode([
        "success" => true,
        "message" => "Colonne recettes_json modifiée en MEDIUMTEXT avec succès !"
    ]);
} catch (PDOException $e) {
    echo json_encode([
        "success" => false,
        "message" => "Erreur : " . $e->getMessage()
    ]);
}