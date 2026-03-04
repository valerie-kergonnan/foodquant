<?php
header("ACCESS-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $json = file_get_contents('php://input');
    // On le transforme en tableau PHP
    $data = json_decode($json, true);

    $prenom = $data['prenom'];
    $age    = (int)$data['age'];
    $weight = (float)$data['weight']; // (float) car le poids peut avoir une virgule ⚖️
    $height = (float)$data['height'];
    $gender = $data['gender'];
    $goal = $data['goal'];
    $diet = $data['diet'];
    // Calcul des besoins caloriques
    if ($gender === 'male') {
        $calories = 10 * $weight + 6.25 * $height - 5 * $age + 5;
    } else {
        $calories = 10 * $weight + 6.25 * $height - 5 * $age - 161;
    }

    // On ajuste selon l'objectif choisi
if ($goal === 'perte') {
    $calories = $calories * 0.85; // On retire 15% pour créer un déficit 📉
} elseif ($goal === 'muscle') {
    $calories = $calories * 1.10; // On ajoute 10% pour la construction 🏗️
} else {
    // Si c'est 'maintien', on ne change rien ! ⚖️
    $calories = $calories; 
}

// On arrondit pour avoir un joli chiffre entier
$calories = round($calories);

    try {
        //echo "Données reçues : Prénom=$prenom, Age=$age, Poids=$weight, Taille=$height";
        // On prépare la requête d'insertion
        $sql = "INSERT INTO utilisateurs (prenom, age, weight, height, gender, goal, diet, besoin_calorique) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        // On exécute avec les données du profil
       if ($stmt->execute([$prenom, $age, $weight, $height, $gender, $goal, $diet, $calories])) {
    // On prépare un paquet de données propre
    $reponse = [
        "success" => true,
        "message" => "Utilisateur ajouté avec succès !",
        "prenom" => $prenom,
        "calories" => $calories
    ];
    // On l'envoie au format JSON
    echo json_encode($reponse);
}
    } catch (PDOException $e) {
        echo "Erreur : " . $e->getMessage();
    }
} else {
    echo "Méthode non autorisée.";
}
