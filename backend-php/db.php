<?php
$host = "localhost";
$dbname = "foodquant";
$username = "root";
$password = "";

$dsn = "mysql:host=$host;dbname=$dbname;charset=utf8";

try {
    $pdo = new PDO($dsn, $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    // On retire l'écho ici pour ne pas polluer la réponse JSON
    // echo "Connexion réussie à la base de données ! 🎉"; 
} catch (PDOException $e) {
    die("Erreur de connexion : " . $e->getMessage());
}
?>