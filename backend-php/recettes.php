<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') exit;

// ─── V3 : Import BDD pour recettes locales ───
require_once __DIR__ . '/db.php';

// ─── V2 : Import du service de traduction ───
require_once __DIR__ . '/traduction.php';

$apiKey = getenv('SPOONACULAR_KEY') ?: "VOTRE_CLE_ICI";
$totalCalories = $_REQUEST['targetCalories'] ?? 2000;
$diet = $_REQUEST['diet'] ?? '';
$refreshIndex = isset($_REQUEST['refreshIndex']) ? (int)$_REQUEST['refreshIndex'] : null;

// ─── Cache fichier ───
$cacheDir = __DIR__ . '/cache';
if (!is_dir($cacheDir)) mkdir($cacheDir, 0755, true);

$quotaLockFile = "$cacheDir/_quota_locked.txt";

function isQuotaLocked($quotaLockFile) {
    if (file_exists($quotaLockFile)) {
        $lockTime = (int)file_get_contents($quotaLockFile);
        if (time() - $lockTime < 3600) return true;
        unlink($quotaLockFile);
    }
    return false;
}

function lockQuota($quotaLockFile) {
    file_put_contents($quotaLockFile, time());
}

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

// ═══════════════════════════════════════════════════════
// V3 : RECHERCHE DANS LES RECETTES LOCALES (prioritaire)
// ═══════════════════════════════════════════════════════

function chercherRecetteLocale($pdo, $type, $calories, $index) {
    // Mapper les types Spoonacular vers les types locaux
    $typeLocal = match($type) {
        'breakfast' => 'breakfast',
        'snack'     => 'snack',
        default     => ($index === 3 ? 'dinner' : 'lunch'),
    };

    $calMin = max(0, $calories - 150);
    $calMax = $calories + 200;

    try {
        $stmt = $pdo->prepare("
            SELECT * FROM recettes_locales 
            WHERE type_repas = ? AND calories BETWEEN ? AND ?
            ORDER BY RAND() 
            LIMIT 1
        ");
        $stmt->execute([$typeLocal, $calMin, $calMax]);
        $row = $stmt->fetch();

        if ($row) {
            $ingredients = json_decode($row['ingredients_json'] ?? '[]', true) ?: [];
            
            error_log("✅ RECETTE LOCALE pour $typeLocal (index $index) : {$row['titre']}");
            
            return [
                "id"             => (int)$row['id'] + 100000,
                "title"          => $row['titre'],
                "title_fr"       => $row['titre'],
                "image"          => $row['image_url'] ?: "https://img.spoonacular.com/recipes/659109-312x231.jpg",
                "sourceUrl"      => $row['source_url'] ?: "",
                "ingredients_fr" => $ingredients,
                "calories"       => (int)$row['calories'],
                "protein"        => (int)$row['proteines'] . "g",
                "nutrition"      => [
                    "nutrients" => [
                        ["name" => "Calories",      "amount" => (int)$row['calories']],
                        ["name" => "Protein",       "amount" => (float)$row['proteines']],
                        ["name" => "Fat",           "amount" => (float)$row['lipides']],
                        ["name" => "Carbohydrates", "amount" => (float)$row['glucides']],
                        ["name" => "Fiber",         "amount" => (float)$row['fibres']],
                    ],
                    "ingredients" => array_map(function($ing) {
                        return ["name" => $ing, "amount" => 0, "unit" => ""];
                    }, $ingredients),
                ],
                "source" => "local_fr",
            ];
        }
    } catch (PDOException $e) {
        error_log("⚠️ Erreur recettes locales : " . $e->getMessage());
    }

    return null; // Pas trouvé en local
}

// ─── Recherche de repas (Spoonacular) ───
function chercherRepas($type, $calories, $apiKey, $diet, $index, $cacheDir, $quotaLockFile, $forceRefresh = false) {
    $cacheKey = getCacheKey($type, $calories, $diet);

    if (!$forceRefresh) {
        $cached = getFromCache($cacheKey, $cacheDir);
        if ($cached) {
            $recipe = $cached[array_rand($cached)];
            error_log("✅ CACHE HIT pour $type (index $index)");
            return formatRecipe($recipe, $calories, $index);
        }
    }

    if (isQuotaLocked($quotaLockFile)) {
        error_log("🔒 Quota verrouillé — cache/fallback pour $type");
        $expired = getFromCacheExpired($cacheKey, $cacheDir);
        if ($expired) {
            $recipe = $expired[array_rand($expired)];
            return formatRecipe($recipe, $calories, $index);
        }
        return getFallback($type, $calories, $index);
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
    if (!empty($diet)) $params['diet'] = $diet;

    $url = $baseUrl . "?" . http_build_query($params);
    error_log("🌐 API CALL pour $type (index $index)");

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

    $rawResponse = curl_exec($ch);
    $httpCode    = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError   = curl_error($ch);

    if ($httpCode === 402) {
        error_log("🚫 QUOTA DÉPASSÉ (402)");
        lockQuota($quotaLockFile);
        $expired = getFromCacheExpired($cacheKey, $cacheDir);
        if ($expired) return formatRecipe($expired[array_rand($expired)], $calories, $index);
        return getFallback($type, $calories, $index);
    }

    if ($httpCode === 429) {
        error_log("⏳ RATE LIMIT (429)");
        $expired = getFromCacheExpired($cacheKey, $cacheDir);
        if ($expired) return formatRecipe($expired[array_rand($expired)], $calories, $index);
        return getFallback($type, $calories, $index);
    }

    if ($curlError || $httpCode !== 200) {
        error_log("❌ Spoonacular error [$type] HTTP $httpCode : $curlError");
        $expired = getFromCacheExpired($cacheKey, $cacheDir);
        if ($expired) return formatRecipe($expired[array_rand($expired)], $calories, $index);
        return getFallback($type, $calories, $index);
    }

    $decoded = json_decode($rawResponse, true);
    $results = $decoded['results'] ?? [];
    error_log("📦 Résultats pour $type : " . count($results));

    if (count($results) > 0) {
        saveToCache($cacheKey, $results, $cacheDir);
        return formatRecipe($results[array_rand($results)], $calories, $index);
    }

    $expired = getFromCacheExpired($cacheKey, $cacheDir);
    if ($expired) return formatRecipe($expired[array_rand($expired)], $calories, $index);

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

    $pool = $fallbacks[$type] ?? $fallbacks["main course"];
    $choix = $pool[array_rand($pool)];

    $protEstimee = match($type) {
        'breakfast'   => rand(10, 20),
        'snack'       => rand(5, 12),
        'main course' => rand(20, 35),
        default       => 15
    };

    // Fallback déjà en français
    return [
        "id"             => 100 + $index + rand(0, 900),
        "title"          => $choix['title'],
        "title_fr"       => $choix['title'],
        "ingredients_fr" => [],
        "image"          => "https://img.spoonacular.com/recipes/" . $choix['img'] . "-312x231.jpg",
        "sourceUrl"      => "",
        "calories"       => $calories,
        "protein"        => $protEstimee . "g",
        "nutrition"      => [
            "nutrients" => [
                ["name" => "Calories", "amount" => $calories],
                ["name" => "Protein",  "amount" => $protEstimee]
            ]
        ],
        "source"         => "fallback"
    ];
}

// ═══════════════════════════════════════════════════════
// EXÉCUTION — V3 : Priorité recettes locales
// ═══════════════════════════════════════════════════════

$repartition = [0.25, 0.35, 0.10, 0.30];
$types = ['breakfast', 'main course', 'snack', 'main course'];

$resultatFinal = [];
for ($i = 0; $i < 4; $i++) {
    $cal = round($totalCalories * $repartition[$i]);
    $forceRefresh = ($refreshIndex !== null && $refreshIndex === $i);
    
    $recette = null;

    // V3 : Essayer d'abord les recettes locales (françaises, gratuites, cohérentes)
    // Priorité donnée aux snacks locaux pour éviter les salades en collation
    if (!$forceRefresh) {
        $recette = chercherRecetteLocale($pdo, $types[$i], $cal, $i);
    }

    // Si pas trouvé en local → Spoonacular (API)
    if (!$recette) {
        $recette = chercherRepas($types[$i], $cal, $apiKey, $diet, $i, $cacheDir, $quotaLockFile, $forceRefresh);

        // V2 : Traduire (sauf fallback et local, déjà en français)
        if (($recette['source'] ?? '') !== 'fallback' && ($recette['source'] ?? '') !== 'local_fr') {
            $recette = traduireRecette($recette);
        }
    }

    $resultatFinal[] = $recette;
}

echo json_encode($resultatFinal);