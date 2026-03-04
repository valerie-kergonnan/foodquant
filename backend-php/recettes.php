<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') exit;

$apiKey = getenv('SPOONACULAR_KEY') ?: "VOTRE_CLE_ICI";
$totalCalories = $_REQUEST['targetCalories'] ?? 2000;
$diet = $_REQUEST['diet'] ?? '';
$refreshIndex = isset($_REQUEST['refreshIndex']) ? (int)$_REQUEST['refreshIndex'] : null;

// ─── Cache fichier (évite de brûler les points API) ───
$cacheDir = __DIR__ . '/cache';
if (!is_dir($cacheDir)) mkdir($cacheDir, 0755, true);

function getCacheKey($type, $calories, $diet) {
    return md5("$type-$calories-$diet");
}

function getFromCache($key, $cacheDir, $duree = 3600) {
    $fichier = "$cacheDir/$key.json";
    if (file_exists($fichier) && (time() - filemtime($fichier)) < $duree) {
        $data = json_decode(file_get_contents($fichier), true);
        if ($data && count($data) > 0) return $data;
    }
    return null;
}

function saveToCache($key, $data, $cacheDir) {
    file_put_contents("$cacheDir/$key.json", json_encode($data));
}

// ─── Recherche de repas ───
function chercherRepas($type, $calories, $apiKey, $diet, $index, $cacheDir, $forceRefresh = false) {
    $cacheKey = getCacheKey($type, round($calories, -1), $diet);

    // Vérifier le cache (sauf si refresh forcé)
    if (!$forceRefresh) {
        $cached = getFromCache($cacheKey, $cacheDir);
        if ($cached) {
            // Prendre une recette au hasard dans le cache
            $recipe = $cached[array_rand($cached)];
            error_log("✅ CACHE HIT pour $type (index $index)");
            return formatRecipe($recipe, $calories, $index);
        }
    }

    $baseUrl = "https://api.spoonacular.com/recipes/complexSearch";

    $params = [
        'apiKey'               => $apiKey,
        'type'                 => $type,
        'minCalories'          => max(0, $calories - 200),
        'maxCalories'          => $calories + 300,
        'number'               => 10,
        'offset'               => rand(0, 30),
        'addRecipeInformation' => 'true',
        'addRecipeNutrition'   => 'true',
    ];

    if (!empty($diet)) {
        $params['diet'] = $diet;
    }

    $url = $baseUrl . "?" . http_build_query($params);
    error_log("🌐 API CALL pour $type (index $index): $url");

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

    $rawResponse = curl_exec($ch);
    $httpCode    = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if (curl_error($ch) || $httpCode !== 200) {
        error_log("❌ Spoonacular error [$type] HTTP $httpCode : " . curl_error($ch));
    }

    $decoded = json_decode($rawResponse, true);
    $results = $decoded['results'] ?? [];

    error_log("📦 Résultats pour $type : " . count($results));

    if (count($results) > 0) {
        // Sauvegarder TOUS les résultats en cache
        saveToCache($cacheKey, $results, $cacheDir);

        $recipe = $results[array_rand($results)];
        return formatRecipe($recipe, $calories, $index);
    }

    // Fallback
    error_log("⚠️ FALLBACK pour $type (index $index)");
    return getFallback($calories, $index);
}

function formatRecipe($recipe, $calories, $index) {
    $nutrients     = $recipe['nutrition']['nutrients'] ?? [];
    $vraiesCal     = 0;
    $vraiesProtein = "N/A";

    foreach ($nutrients as $n) {
        match($n['name']) {
            'Calories' => $vraiesCal     = round($n['amount']),
            'Protein'  => $vraiesProtein = round($n['amount']) . "g",
            default    => null
        };
    }

    return [
        "id"        => $recipe['id'],
        "title"     => $recipe['title'],
        "image"     => $recipe['image'] ?? "https://img.spoonacular.com/recipes/{$recipe['id']}-312x231.jpg",
        "sourceUrl" => $recipe['sourceUrl'] ?? "",
        "calories"  => $vraiesCal > 0 ? $vraiesCal : $calories,
        "protein"   => $vraiesProtein,
        "nutrition" => $recipe['nutrition'],
        "source"    => "spoonacular"
    ];
}

function getFallback($calories, $index) {
    $secours = [
        ["title" => "Porridge aux fruits",   "img" => "659109"],
        ["title" => "Poulet grillé légumes", "img" => "716426"],
        ["title" => "Smoothie protéiné",     "img" => "715446"],
        ["title" => "Saumon quinoa",         "img" => "782601"]
    ];

    return [
        "id"        => 100 + $index,
        "title"     => $secours[$index]['title'],
        "image"     => "https://img.spoonacular.com/recipes/" . $secours[$index]['img'] . "-312x231.jpg",
        "sourceUrl" => "",
        "calories"  => $calories,
        "protein"   => "15g",
        "nutrition" => [
            "nutrients" => [
                ["name" => "Calories", "amount" => $calories],
                ["name" => "Protein",  "amount" => 15]
            ]
        ],
        "source"    => "fallback"
    ];
}

// ─── Exécution ───
$repartition = [0.25, 0.35, 0.10, 0.30];
$types = ['breakfast', 'main course', 'snack', 'main course'];

$resultatFinal = [];
for ($i = 0; $i < 4; $i++) {
    $cal = round($totalCalories * $repartition[$i]);
    $forceRefresh = ($refreshIndex !== null && $refreshIndex === $i);
    $resultatFinal[] = chercherRepas($types[$i], $cal, $apiKey, $diet, $i, $cacheDir, $forceRefresh);
}

echo json_encode($resultatFinal);