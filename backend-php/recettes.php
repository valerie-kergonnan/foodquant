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

// FIX 1 : Fichier marqueur quand le quota est dépassé (évite de retenter pendant 1h)
$quotaLockFile = "$cacheDir/_quota_locked.txt";

function isQuotaLocked($quotaLockFile) {
    if (file_exists($quotaLockFile)) {
        $lockTime = (int)file_get_contents($quotaLockFile);
        // Bloqué pendant 1h après une erreur 402
        if (time() - $lockTime < 3600) {
            return true;
        }
        // Le verrou a expiré, on le supprime
        unlink($quotaLockFile);
    }
    return false;
}

function lockQuota($quotaLockFile) {
    file_put_contents($quotaLockFile, time());
}

// FIX 2 : Arrondir les calories par tranche de 50 pour mutualiser le cache
function getCacheKey($type, $calories, $diet) {
    $calArrondi = round($calories / 50) * 50;
    return md5("$type-$calArrondi-$diet");
}

function getFromCache($key, $cacheDir, $duree = 3600) {
    $fichier = "$cacheDir/$key.json";
    if (file_exists($fichier) && (time() - filemtime($fichier)) < $duree) {
        $data = json_decode(file_get_contents($fichier), true);
        if ($data && count($data) > 0) return $data;
    }
    return null;
}

// FIX 3 : Si le cache frais est vide, chercher un cache expiré (mieux que rien)
function getFromCacheExpired($key, $cacheDir) {
    $fichier = "$cacheDir/$key.json";
    if (file_exists($fichier)) {
        $data = json_decode(file_get_contents($fichier), true);
        if ($data && count($data) > 0) return $data;
    }
    return null;
}

function saveToCache($key, $data, $cacheDir) {
    file_put_contents("$cacheDir/$key.json", json_encode($data));
}

// ─── Recherche de repas ───
function chercherRepas($type, $calories, $apiKey, $diet, $index, $cacheDir, $quotaLockFile, $forceRefresh = false) {
    $cacheKey = getCacheKey($type, $calories, $diet);

    // Vérifier le cache (sauf si refresh forcé)
    if (!$forceRefresh) {
        $cached = getFromCache($cacheKey, $cacheDir);
        if ($cached) {
            $recipe = $cached[array_rand($cached)];
            error_log("✅ CACHE HIT pour $type (index $index)");
            return formatRecipe($recipe, $calories, $index);
        }
    }

    // FIX 4 : Si le quota est verrouillé, ne pas appeler l'API
    if (isQuotaLocked($quotaLockFile)) {
        error_log("🔒 Quota verrouillé — utilisation cache/fallback pour $type");
        // Essayer le cache expiré
        $expired = getFromCacheExpired($cacheKey, $cacheDir);
        if ($expired) {
            $recipe = $expired[array_rand($expired)];
            return formatRecipe($recipe, $calories, $index);
        }
        return getFallback($type, $calories, $index);
    }

    // ─── Appel API Spoonacular ───
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
    error_log("🌐 API CALL pour $type (index $index)");

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

    $rawResponse = curl_exec($ch);
    $httpCode    = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError   = curl_error($ch);
    

    // FIX 5 : Gestion spécifique des erreurs 402 et 429
    if ($httpCode === 402) {
        error_log("🚫 QUOTA DÉPASSÉ (402) — verrouillage pendant 1h");
        lockQuota($quotaLockFile);
        // Essayer le cache expiré avant le fallback
        $expired = getFromCacheExpired($cacheKey, $cacheDir);
        if ($expired) {
            $recipe = $expired[array_rand($expired)];
            return formatRecipe($recipe, $calories, $index);
        }
        return getFallback($type, $calories, $index);
    }

    if ($httpCode === 429) {
        error_log("⏳ RATE LIMIT (429) — fallback pour $type");
        $expired = getFromCacheExpired($cacheKey, $cacheDir);
        if ($expired) {
            $recipe = $expired[array_rand($expired)];
            return formatRecipe($recipe, $calories, $index);
        }
        return getFallback($type, $calories, $index);
    }

    if ($curlError || $httpCode !== 200) {
        error_log("❌ Spoonacular error [$type] HTTP $httpCode : $curlError");
        $expired = getFromCacheExpired($cacheKey, $cacheDir);
        if ($expired) {
            $recipe = $expired[array_rand($expired)];
            return formatRecipe($recipe, $calories, $index);
        }
        return getFallback($type, $calories, $index);
    }

    $decoded = json_decode($rawResponse, true);
    $results = $decoded['results'] ?? [];

    error_log("📦 Résultats pour $type : " . count($results));

    if (count($results) > 0) {
        saveToCache($cacheKey, $results, $cacheDir);
        $recipe = $results[array_rand($results)];
        return formatRecipe($recipe, $calories, $index);
    }

    // Aucun résultat — essayer cache expiré
    $expired = getFromCacheExpired($cacheKey, $cacheDir);
    if ($expired) {
        $recipe = $expired[array_rand($expired)];
        return formatRecipe($recipe, $calories, $index);
    }

    error_log("⚠️ FALLBACK pour $type (index $index)");
    return getFallback($type, $calories, $index);
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

// FIX 6 : Fallback élargi avec plus de variété par type de repas
function getFallback($type, $calories, $index) {
    $fallbacks = [
        "breakfast" => [
            ["title" => "Porridge aux fruits rouges",      "img" => "659109"],
            ["title" => "Omelette aux légumes",            "img" => "640062"],
            ["title" => "Tartines avocat œuf poché",       "img" => "795751"],
            ["title" => "Pancakes à la banane",            "img" => "665186"],
            ["title" => "Smoothie bowl protéiné",          "img" => "716437"],
            ["title" => "Yaourt grec granola miel",        "img" => "663136"],
        ],
        "main course" => [
            ["title" => "Poulet grillé et légumes",        "img" => "716426"],
            ["title" => "Saumon quinoa brocoli",           "img" => "782601"],
            ["title" => "Pâtes complètes sauce tomate",    "img" => "715594"],
            ["title" => "Bowl poulet teriyaki riz",        "img" => "716408"],
            ["title" => "Salade César au poulet",          "img" => "649931"],
            ["title" => "Curry de lentilles corail",       "img" => "648279"],
            ["title" => "Risotto aux champignons",         "img" => "659135"],
            ["title" => "Wok de tofu légumes croquants",   "img" => "716627"],
        ],
        "snack" => [
            ["title" => "Smoothie protéiné",               "img" => "715446"],
            ["title" => "Pomme beurre de cacahuète",       "img" => "641975"],
            ["title" => "Houmous bâtonnets de carottes",   "img" => "660306"],
            ["title" => "Fromage blanc et fruits secs",    "img" => "658509"],
            ["title" => "Energy balls chocolat",           "img" => "639851"],
            ["title" => "Amandes et chocolat noir",        "img" => "644783"],
        ],
    ];

    // Sélectionner le bon pool selon le type
    $pool = $fallbacks[$type] ?? $fallbacks["main course"];
    $choix = $pool[array_rand($pool)];

    // Protéines estimées selon le type de repas
    $protEstimee = match($type) {
        'breakfast'   => rand(10, 20),
        'snack'       => rand(5, 12),
        'main course' => rand(20, 35),
        default       => 15
    };

    return [
        "id"        => 100 + $index + rand(0, 900),
        "title"     => $choix['title'],
        "image"     => "https://img.spoonacular.com/recipes/" . $choix['img'] . "-312x231.jpg",
        "sourceUrl" => "",
        "calories"  => $calories,
        "protein"   => $protEstimee . "g",
        "nutrition" => [
            "nutrients" => [
                ["name" => "Calories", "amount" => $calories],
                ["name" => "Protein",  "amount" => $protEstimee]
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
    $resultatFinal[] = chercherRepas($types[$i], $cal, $apiKey, $diet, $i, $cacheDir, $quotaLockFile, $forceRefresh);
}

echo json_encode($resultatFinal);