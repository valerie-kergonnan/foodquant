<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') exit;

require_once 'db.php';

$action = $_REQUEST['action'] ?? '';

// ─── INSCRIPTION ───
if ($action === 'inscription') {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    $prenom = trim($data['prenom'] ?? '');
    $email = trim($data['email'] ?? '');
    $mdp = $data['mot_de_passe'] ?? '';

    if (empty($prenom) || empty($email) || empty($mdp)) {
        echo json_encode(["success" => false, "message" => "Tous les champs sont requis."]);
        exit;
    }

    if (strlen($mdp) < 6) {
        echo json_encode(["success" => false, "message" => "Le mot de passe doit faire au moins 6 caractères."]);
        exit;
    }

    // Vérifier si l'email existe déjà
    $stmt = $pdo->prepare("SELECT idutilisateurs FROM utilisateurs WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        echo json_encode(["success" => false, "message" => "Cet email est déjà utilisé."]);
        exit;
    }

    // Hasher le mot de passe
    $mdpHash = password_hash($mdp, PASSWORD_DEFAULT);

    try {
        $stmt = $pdo->prepare("INSERT INTO utilisateurs (prenom, email, mot_de_passe) VALUES (?, ?, ?)");
        $stmt->execute([$prenom, $email, $mdpHash]);
        $userId = $pdo->lastInsertId();

        echo json_encode([
            "success" => true,
            "message" => "Inscription réussie !",
            "user" => [
                "id" => (int)$userId,
                "prenom" => $prenom,
                "email" => $email
            ]
        ]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Erreur : " . $e->getMessage()]);
    }
}

// ─── CONNEXION ───
elseif ($action === 'connexion') {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    $email = trim($data['email'] ?? '');
    $mdp = $data['mot_de_passe'] ?? '';

    if (empty($email) || empty($mdp)) {
        echo json_encode(["success" => false, "message" => "Email et mot de passe requis."]);
        exit;
    }

    $stmt = $pdo->prepare("SELECT idutilisateurs, prenom, email, mot_de_passe, age, weight, height, gender, goal, diet, besoin_calorique FROM utilisateurs WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !password_verify($mdp, $user['mot_de_passe'])) {
        echo json_encode(["success" => false, "message" => "Email ou mot de passe incorrect."]);
        exit;
    }

    echo json_encode([
        "success" => true,
        "message" => "Connexion réussie !",
        "user" => [
            "id" => (int)$user['idutilisateurs'],
            "prenom" => $user['prenom'],
            "email" => $user['email'],
            "age" => $user['age'],
            "poids" => $user['weight'],
            "taille" => $user['height'],
            "genre" => $user['gender'],
            "objectif" => $user['goal'],
            "regime" => $user['diet'],
            "calories" => $user['besoin_calorique']
        ]
    ]);
}

// ─── MISE À JOUR PROFIL ───
elseif ($action === 'updateProfil') {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    $userId = (int)($data['userId'] ?? 0);
    if ($userId === 0) {
        echo json_encode(["success" => false, "message" => "Utilisateur non identifié."]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("UPDATE utilisateurs SET age=?, weight=?, height=?, gender=?, goal=?, diet=?, besoin_calorique=? WHERE idutilisateurs=?");
        $stmt->execute([
            (int)$data['age'],
            (float)$data['weight'],
            (float)$data['height'],
            $data['gender'],
            $data['goal'],
            $data['diet'] ?? '',
            (int)($data['calories'] ?? 0),
            $userId
        ]);
        echo json_encode(["success" => true, "message" => "Profil mis à jour."]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Erreur : " . $e->getMessage()]);
    }
}

else {
    echo json_encode(["success" => false, "message" => "Action non reconnue."]);
}