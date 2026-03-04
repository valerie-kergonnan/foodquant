<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') exit;

require_once 'db.php';

$action = $_REQUEST['action'] ?? '';

// ─── SAUVEGARDER LE MENU DU JOUR ───
if ($action === 'sauvegarder') {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    $userId = (int)($data['userId'] ?? 0);
    $recettes = $data['recettes'] ?? [];
    $totalCalories = (int)($data['totalCalories'] ?? 0);
    $totalProteines = (int)($data['totalProteines'] ?? 0);
    $dateRepas = $data['date'] ?? date('Y-m-d');

    if ($userId === 0 || empty($recettes)) {
        echo json_encode(["success" => false, "message" => "Données manquantes."]);
        exit;
    }

    try {
        // INSERT ou UPDATE si la date existe déjà
        $stmt = $pdo->prepare("
            INSERT INTO historique_repas (utilisateur_id, date_repas, recettes_json, total_calories, total_proteines)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                recettes_json = VALUES(recettes_json),
                total_calories = VALUES(total_calories),
                total_proteines = VALUES(total_proteines)
        ");
        $stmt->execute([
            $userId,
            $dateRepas,
            json_encode($recettes),
            $totalCalories,
            $totalProteines
        ]);

        echo json_encode(["success" => true, "message" => "Menu sauvegardé !"]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Erreur : " . $e->getMessage()]);
    }
}

// ─── RÉCUPÉRER L'HISTORIQUE (7 derniers jours) ───
elseif ($action === 'historique') {
    $userId = (int)($_REQUEST['userId'] ?? 0);
    $jours = (int)($_REQUEST['jours'] ?? 7);

    if ($userId === 0) {
        echo json_encode(["success" => false, "message" => "Utilisateur non identifié."]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("
            SELECT date_repas, recettes_json, total_calories, total_proteines 
            FROM historique_repas 
            WHERE utilisateur_id = ? 
            AND date_repas >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            ORDER BY date_repas DESC
        ");
        $stmt->execute([$userId, $jours]);
        $historique = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Décoder le JSON des recettes
        foreach ($historique as &$jour) {
            $jour['recettes'] = json_decode($jour['recettes_json'], true);
            unset($jour['recettes_json']);
        }

        echo json_encode([
            "success" => true,
            "historique" => $historique
        ]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Erreur : " . $e->getMessage()]);
    }
}

// ─── STATS GLOBALES ───
elseif ($action === 'stats') {
    $userId = (int)($_REQUEST['userId'] ?? 0);

    if ($userId === 0) {
        echo json_encode(["success" => false, "message" => "Utilisateur non identifié."]);
        exit;
    }

    try {
        // Nombre total de jours suivis
        $stmt = $pdo->prepare("SELECT COUNT(*) as total_jours FROM historique_repas WHERE utilisateur_id = ?");
        $stmt->execute([$userId]);
        $totalJours = $stmt->fetch(PDO::FETCH_ASSOC)['total_jours'];

        // Moyenne calories/protéines sur 7 jours
        $stmt = $pdo->prepare("
            SELECT 
                ROUND(AVG(total_calories)) as moy_calories,
                ROUND(AVG(total_proteines)) as moy_proteines
            FROM historique_repas 
            WHERE utilisateur_id = ? 
            AND date_repas >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        ");
        $stmt->execute([$userId]);
        $moyennes = $stmt->fetch(PDO::FETCH_ASSOC);

        // Jours consécutifs (streak)
        $stmt = $pdo->prepare("
            SELECT date_repas FROM historique_repas 
            WHERE utilisateur_id = ? 
            ORDER BY date_repas DESC
        ");
        $stmt->execute([$userId]);
        $dates = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $streak = 0;
        $today = new DateTime();
        foreach ($dates as $d) {
            $dateObj = new DateTime($d);
            $diff = $today->diff($dateObj)->days;
            if ($diff === $streak) {
                $streak++;
            } else {
                break;
            }
        }

        echo json_encode([
            "success" => true,
            "stats" => [
                "total_jours" => (int)$totalJours,
                "streak" => $streak,
                "moy_calories" => (int)($moyennes['moy_calories'] ?? 0),
                "moy_proteines" => (int)($moyennes['moy_proteines'] ?? 0)
            ]
        ]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Erreur : " . $e->getMessage()]);
    }
}

else {
    echo json_encode(["success" => false, "message" => "Action non reconnue."]);
}