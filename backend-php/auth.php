<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') exit;

require_once 'db.php';
require_once 'jwt.php';

$action = $_REQUEST['action'] ?? '';

// ─── INSCRIPTION ───
if ($action === 'inscription') {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    $prenom = trim($data['prenom'] ?? '');
    $email = trim($data['email'] ?? '');
    $mdp = $data['mot_de_passe'] ?? '';

    // Validation des entrées
    if (empty($prenom) || empty($email) || empty($mdp)) {
        echo json_encode(["success" => false, "message" => "Tous les champs sont requis."]);
        exit;
    }

    if (strlen($prenom) > 100) {
        echo json_encode(["success" => false, "message" => "Le prénom est trop long."]);
        exit;
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(["success" => false, "message" => "Email invalide."]);
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

    $mdpHash = password_hash($mdp, PASSWORD_DEFAULT);

    try {
        $stmt = $pdo->prepare("INSERT INTO utilisateurs (prenom, email, mot_de_passe) VALUES (?, ?, ?)");
        $stmt->execute([$prenom, $email, $mdpHash]);
        $userId = (int) $pdo->lastInsertId();

        // Générer le JWT
        $token = genererJWT([
            'userId' => $userId,
            'email' => $email,
            'prenom' => $prenom
        ]);

        echo json_encode([
            "success" => true,
            "message" => "Inscription réussie !",
            "token" => $token,
            "user" => [
                "id" => $userId,
                "prenom" => $prenom,
                "email" => $email
            ]
        ]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Erreur lors de l'inscription."]);
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

    // Générer le JWT
    $token = genererJWT([
        'userId' => (int) $user['idutilisateurs'],
        'email' => $user['email'],
        'prenom' => $user['prenom']
    ]);

    echo json_encode([
        "success" => true,
        "message" => "Connexion réussie !",
        "token" => $token,
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

// ─── MISE À JOUR PROFIL (protégé par JWT) ───
elseif ($action === 'updateProfil') {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    // Vérifier le JWT si présent, sinon fallback sur userId (rétrocompatibilité)
    $token = extraireJWT();
    if ($token) {
        $payload = verifierJWT($token);
        $userId = $payload ? (int) $payload['userId'] : 0;
    } else {
        $userId = (int)($data['userId'] ?? 0);
    }

    if ($userId === 0) {
        echo json_encode(["success" => false, "message" => "Utilisateur non identifié."]);
        exit;
    }

    // Validation des données
    $age = (int)($data['age'] ?? 0);
    $weight = (float)($data['weight'] ?? 0);
    $height = (float)($data['height'] ?? 0);
    $gender = $data['gender'] ?? '';
    $goal = $data['goal'] ?? '';
    $diet = $data['diet'] ?? '';
    $calories = (int)($data['calories'] ?? 0);

    if ($age < 10 || $age > 120) {
        echo json_encode(["success" => false, "message" => "Âge invalide."]);
        exit;
    }
    if ($weight < 20 || $weight > 500) {
        echo json_encode(["success" => false, "message" => "Poids invalide."]);
        exit;
    }
    if ($height < 80 || $height > 280) {
        echo json_encode(["success" => false, "message" => "Taille invalide."]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("UPDATE utilisateurs SET age=?, weight=?, height=?, gender=?, goal=?, diet=?, besoin_calorique=? WHERE idutilisateurs=?");
        $stmt->execute([$age, $weight, $height, $gender, $goal, $diet, $calories, $userId]);
        echo json_encode(["success" => true, "message" => "Profil mis à jour."]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Erreur lors de la mise à jour."]);
    }
}

else {
    echo json_encode(["success" => false, "message" => "Action non reconnue."]);
}