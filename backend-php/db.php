<?php
// Détecte si on est en local ou sur Railway
if (getenv('MYSQLHOST')) {
    // Railway
    $host = getenv('MYSQLHOST');
    $dbname = getenv('MYSQLDATABASE');
    $username = getenv('MYSQLUSER');
    $password = getenv('MYSQLPASSWORD');
    $port = getenv('MYSQLPORT');
} else {
    // Local
    $host = "localhost";
    $dbname = "foodquant";
    $username = "root";
    $password = "";
    $port = "3306";
}

$dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8";

try {
    $pdo = new PDO($dsn, $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Erreur de connexion : " . $e->getMessage());
}
?>