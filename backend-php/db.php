<?php
$host = "nozomi.proxy.rlwy.net";
$dbname = "railway";
$username = "root";
$password = "ylSfYVKOsqEFYmPMgeEFDAMsYgsTNFRH";
$port = "54599";

$dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8";

try {
    $pdo = new PDO($dsn, $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die(json_encode(["error" => $e->getMessage()]));
}
?>