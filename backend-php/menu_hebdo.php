<?php
/**
 * menu_hebdo.php — API Menu Hebdomadaire FoodQuant V3
 * 
 * GET  ?action=generer&semaine=2026-W12  → Génère ou récupère le menu de la semaine (7j × 4 repas × 4 choix)
 * POST ?action=selectionner               → Enregistre le choix de l'utilisateur pour un repas
 * GET  ?action=courses&semaine=2026-W12   → Liste de courses consolidée pour la semaine
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/jwt.php';
require_once __DIR__ . '/traduction.php';

// ─── Auth JWT ───
$token = extraireJWT();
$userId = null;

if ($token) {
    $decoded = verifierJWT($token);
    if ($decoded) {
        $userId = $decoded['userId'] ?? null;
    }
}

if (!$userId) {
    http_response_code(401);
    echo json_encode(["error" => "Non authentifié"]);
    exit;
}

$action = $_REQUEST['action'] ?? '';

// ═══════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════

$apiKey = getenv('SPOONACULAR_KEY') ?: "VOTRE_CLE_ICI";
$cacheDir = __DIR__ . '/cache';
if (!is_dir($cacheDir)) mkdir($cacheDir, 0755, true);
$quotaLockFile = "$cacheDir/_quota_locked.txt";

// Répartition calorique par type de repas
$REPARTITION = [
    'breakfast'  => 0.25,
    'lunch'      => 0.35,
    'snack'      => 0.10,
    'dinner'     => 0.30,
];

$TYPES_REPAS = ['breakfast', 'lunch', 'snack', 'dinner'];
$LABELS_REPAS = [
    'breakfast' => 'Petit-déjeuner',
    'lunch'     => 'Déjeuner',
    'snack'     => 'Collation',
    'dinner'    => 'Dîner',
];

$NB_CHOIX = 4; // Nombre de propositions par repas

// ═══════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES (réutilisées de recettes.php)
// ═══════════════════════════════════════════════════════

function isQuotaLocked_h($quotaLockFile) {
    if (file_exists($quotaLockFile)) {
        $lockTime = (int)file_get_contents($quotaLockFile);
        if (time() - $lockTime < 3600) return true;
        unlink($quotaLockFile);
    }
    return false;
}

function lockQuota_h($quotaLockFile) {
    file_put_contents($quotaLockFile, time());
}

function getCacheKey_h($type, $calories, $diet) {
    $calArrondi = round($calories / 50) * 50;
    return md5("$type-$calArrondi-$diet");
}

function getFromCache_h($key, $cacheDir, $duree = 3600) {
    $fichier = "$cacheDir/$key.json";
    if (file_exists($fichier) && (time() - filemtime($fichier)) < $duree) {
        $data = json_decode(file_get_contents($fichier), true);
        if ($data && count($data) > 0) return $data;
    }
    return null;
}

function getFromCacheExpired_h($key, $cacheDir) {
    $fichier = "$cacheDir/$key.json";
    if (file_exists($fichier)) {
        $data = json_decode(file_get_contents($fichier), true);
        if ($data && count($data) > 0) return $data;
    }
    return null;
}

function saveToCache_h($key, $data, $cacheDir) {
    file_put_contents("$cacheDir/$key.json", json_encode($data));
}

// ─── Récupérer N recettes depuis Spoonacular ou cache ───
function obtenirChoixRecettes($type, $calories, $apiKey, $diet, $cacheDir, $quotaLockFile, $nbChoix = 4) {
    $spoonType = ($type === 'lunch' || $type === 'dinner') ? 'main course' : $type;
    $cacheKey = getCacheKey_h($spoonType, $calories, $diet);

    // 1) Cache valide
    $cached = getFromCache_h($cacheKey, $cacheDir);
    if ($cached && count($cached) >= $nbChoix) {
        $keys = array_rand($cached, min($nbChoix, count($cached)));
        if (!is_array($keys)) $keys = [$keys];
        $selection = array_map(fn($k) => $cached[$k], $keys);
        error_log("✅ CACHE HIT hebdo pour $type : " . count($selection) . " recettes");
        return $selection;
    }

    // 2) Quota verrouillé → cache expiré ou fallback
    if (isQuotaLocked_h($quotaLockFile)) {
        $expired = getFromCacheExpired_h($cacheKey, $cacheDir);
        if ($expired && count($expired) >= $nbChoix) {
            $keys = array_rand($expired, min($nbChoix, count($expired)));
            if (!is_array($keys)) $keys = [$keys];
            return array_map(fn($k) => $expired[$k], $keys);
        }
        return genererFallbacks($type, $calories, $nbChoix);
    }

    // 3) Appel API Spoonacular
    $baseUrl = "https://api.spoonacular.com/recipes/complexSearch";
    $params = [
        'apiKey'               => $apiKey,
        'type'                 => $spoonType,
        'minCalories'          => max(0, $calories - 200),
        'maxCalories'          => $calories + 300,
        'number'               => 10,
        'offset'               => rand(0, 30),
        'addRecipeInformation' => 'true',
        'addRecipeNutrition'   => 'true',
    ];
    if (!empty($diet)) $params['diet'] = $diet;

    $url = $baseUrl . "?" . http_build_query($params);
    error_log("🌐 API CALL hebdo pour $type");

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

    $rawResponse = curl_exec($ch);
    $httpCode    = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    // curl_close n'est plus nécessaire en PHP 8.2+ (auto-close)

    if ($httpCode === 402) {
        lockQuota_h($quotaLockFile);
        $expired = getFromCacheExpired_h($cacheKey, $cacheDir);
        if ($expired && count($expired) >= $nbChoix) {
            $keys = array_rand($expired, min($nbChoix, count($expired)));
            if (!is_array($keys)) $keys = [$keys];
            return array_map(fn($k) => $expired[$k], $keys);
        }
        return genererFallbacks($type, $calories, $nbChoix);
    }

    if ($httpCode !== 200) {
        $expired = getFromCacheExpired_h($cacheKey, $cacheDir);
        if ($expired && count($expired) >= $nbChoix) {
            $keys = array_rand($expired, min($nbChoix, count($expired)));
            if (!is_array($keys)) $keys = [$keys];
            return array_map(fn($k) => $expired[$k], $keys);
        }
        return genererFallbacks($type, $calories, $nbChoix);
    }

    $decoded = json_decode($rawResponse, true);
    $results = $decoded['results'] ?? [];

    if (count($results) > 0) {
        saveToCache_h($cacheKey, $results, $cacheDir);
        $keys = array_rand($results, min($nbChoix, count($results)));
        if (!is_array($keys)) $keys = [$keys];
        return array_map(fn($k) => $results[$k], $keys);
    }

    return genererFallbacks($type, $calories, $nbChoix);
}

// ─── Fallback (recettes françaises par défaut) ───
function genererFallbacks($type, $calories, $nb = 4) {
    $fallbacks = [
        "breakfast" => [
            ["title" => "Porridge aux fruits rouges",      "img" => "659109"],
            ["title" => "Omelette aux légumes",            "img" => "640062"],
            ["title" => "Tartines avocat œuf poché",       "img" => "795751"],
            ["title" => "Pancakes à la banane",            "img" => "665186"],
            ["title" => "Smoothie bowl protéiné",          "img" => "716437"],
            ["title" => "Yaourt grec granola miel",        "img" => "663136"],
        ],
        "lunch" => [
            ["title" => "Poulet grillé et légumes",        "img" => "716426"],
            ["title" => "Saumon quinoa brocoli",           "img" => "782601"],
            ["title" => "Salade César au poulet",          "img" => "649931"],
            ["title" => "Curry de lentilles corail",       "img" => "648279"],
            ["title" => "Bowl poulet teriyaki riz",        "img" => "716408"],
            ["title" => "Risotto aux champignons",         "img" => "659135"],
        ],
        "snack" => [
            ["title" => "Smoothie protéiné",               "img" => "715446"],
            ["title" => "Pomme beurre de cacahuète",       "img" => "641975"],
            ["title" => "Houmous bâtonnets de carottes",   "img" => "660306"],
            ["title" => "Energy balls chocolat",           "img" => "639851"],
            ["title" => "Fromage blanc et fruits secs",    "img" => "658509"],
            ["title" => "Amandes et chocolat noir",        "img" => "644783"],
        ],
        "dinner" => [
            ["title" => "Pâtes complètes sauce tomate",    "img" => "715594"],
            ["title" => "Wok de tofu légumes croquants",   "img" => "716627"],
            ["title" => "Filet de cabillaud purée",        "img" => "633344"],
            ["title" => "Gratin de courgettes",            "img" => "646512"],
            ["title" => "Soupe de pois cassés",            "img" => "658509"],
            ["title" => "Quiche lorraine légère",          "img" => "654959"],
        ],
    ];

    $pool = $fallbacks[$type] ?? $fallbacks["lunch"];
    shuffle($pool);
    $selection = array_slice($pool, 0, $nb);

    $protBase = match($type) {
        'breakfast' => 15, 'snack' => 8, default => 25
    };

    return array_map(function($choix, $i) use ($calories, $protBase, $type) {
        $prot = $protBase + rand(-3, 5);
        return [
            "id"             => 10000 + rand(0, 89999),
            "title"          => $choix['title'],
            "title_fr"       => $choix['title'],
            "ingredients_fr" => [],
            "image"          => "https://img.spoonacular.com/recipes/" . $choix['img'] . "-312x231.jpg",
            "sourceUrl"      => "",
            "calories"       => $calories,
            "protein"        => $prot . "g",
            "nutrition"      => [
                "nutrients" => [
                    ["name" => "Calories", "amount" => $calories],
                    ["name" => "Protein",  "amount" => $prot],
                    ["name" => "Fat",      "amount" => round($calories * 0.3 / 9)],
                    ["name" => "Carbohydrates", "amount" => round($calories * 0.5 / 4)],
                    ["name" => "Fiber",    "amount" => rand(3, 8)],
                ]
            ],
            "source" => "fallback"
        ];
    }, $selection, array_keys($selection));
}

// ─── Formater une recette pour stockage ───
function formaterRecettePourStockage($recipe, $calories) {
    $nutrients = $recipe['nutrition']['nutrients'] ?? [];
    $cal = 0; $prot = 0;
    foreach ($nutrients as $n) {
        if ($n['name'] === 'Calories') $cal = round($n['amount']);
        if ($n['name'] === 'Protein')  $prot = round($n['amount']);
    }

    return [
        "id"        => $recipe['id'] ?? rand(10000, 99999),
        "title"     => $recipe['title'] ?? 'Recette',
        "title_fr"  => $recipe['title_fr'] ?? null,
        "image"     => $recipe['image'] ?? "",
        "sourceUrl" => $recipe['sourceUrl'] ?? "",
        "calories"  => $cal > 0 ? $cal : $calories,
        "protein"   => $prot . "g",
        "nutrition" => $recipe['nutrition'] ?? null,
        "source"    => $recipe['source'] ?? 'spoonacular',
    ];
}


// ═══════════════════════════════════════════════════════
// ACTION : GENERER
// ═══════════════════════════════════════════════════════

if ($action === 'generer') {
    $semaine = $_REQUEST['semaine'] ?? date('o-\WW'); // Semaine courante par défaut

    // Valider le format de la semaine (ex: 2026-W12)
    if (!preg_match('/^\d{4}-W\d{2}$/', $semaine)) {
        http_response_code(400);
        echo json_encode(["error" => "Format de semaine invalide. Utilisez YYYY-Wxx (ex: 2026-W12)"]);
        exit;
    }

    // Récupérer le profil utilisateur pour les calories
    $stmt = $pdo->prepare("SELECT besoin_calorique, diet FROM utilisateurs WHERE idutilisateurs = ?");
    $stmt->execute([$userId]);
    $profil = $stmt->fetch();

    if (!$profil || !$profil['besoin_calorique']) {
        http_response_code(400);
        echo json_encode(["error" => "Profil incomplet. Remplissez d'abord votre profil."]);
        exit;
    }

    $totalCalories = (int)$profil['besoin_calorique'];
    $diet = $profil['diet'] ?? '';
    if ($diet === 'classique') $diet = '';

    // Vérifier si le menu existe déjà pour cette semaine
    $stmt = $pdo->prepare("SELECT jour, type_repas, choix_json, selection_index FROM menu_hebdomadaire WHERE utilisateur_id = ? AND semaine = ?");
    $stmt->execute([$userId, $semaine]);
    $existants = $stmt->fetchAll();

    if (count($existants) === 28) {
        // Menu complet : 7 jours × 4 repas = 28 lignes
        $menu = [];
        foreach ($existants as $row) {
            $jour = (int)$row['jour'];
            $type = $row['type_repas'];
            $menu[$jour][$type] = [
                'choix'     => json_decode($row['choix_json'], true),
                'selection' => $row['selection_index'] !== null ? (int)$row['selection_index'] : null,
            ];
        }
        echo json_encode([
            "success" => true,
            "semaine" => $semaine,
            "menu"    => $menu,
            "source"  => "bdd",
        ]);
        exit;
    }

    // Générer le menu pour les 7 jours
    $menu = [];

    for ($jour = 1; $jour <= 7; $jour++) {
        $menu[$jour] = [];

        foreach ($TYPES_REPAS as $type) {
            $calRepas = round($totalCalories * $REPARTITION[$type]);

            // Obtenir 4 choix
            $recettesRaw = obtenirChoixRecettes($type, $calRepas, $apiKey, $diet, $cacheDir, $quotaLockFile, $NB_CHOIX);

            // Formater et traduire
            $choix = [];
            foreach ($recettesRaw as $recette) {
                $formatted = formaterRecettePourStockage($recette, $calRepas);
                // Traduire sauf fallback
                if (($recette['source'] ?? '') !== 'fallback' && !isset($recette['title_fr'])) {
                    $formatted = traduireRecette($formatted);
                }
                $choix[] = $formatted;
            }

            $menu[$jour][$type] = [
                'choix'     => $choix,
                'selection' => null,
            ];

            // Sauvegarder en BDD (INSERT ... ON DUPLICATE KEY UPDATE)
            $stmt = $pdo->prepare("
                INSERT INTO menu_hebdomadaire (utilisateur_id, semaine, jour, type_repas, choix_json, selection_index)
                VALUES (?, ?, ?, ?, ?, NULL)
                ON DUPLICATE KEY UPDATE choix_json = VALUES(choix_json), selection_index = NULL, updated_at = NOW()
            ");
            $stmt->execute([$userId, $semaine, $jour, $type, json_encode($choix)]);
        }
    }

    echo json_encode([
        "success" => true,
        "semaine" => $semaine,
        "menu"    => $menu,
        "source"  => "nouveau",
    ]);
    exit;
}


// ═══════════════════════════════════════════════════════
// ACTION : SELECTIONNER (un choix pour un repas)
// ═══════════════════════════════════════════════════════

if ($action === 'selectionner') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(["error" => "Méthode POST requise"]);
        exit;
    }

    $body = json_decode(file_get_contents('php://input'), true);
    $semaine        = $body['semaine'] ?? '';
    $jour           = (int)($body['jour'] ?? 0);
    $typeRepas      = $body['type_repas'] ?? '';
    $selectionIndex = (int)($body['selection_index'] ?? -1);

    // Validations
    if (!preg_match('/^\d{4}-W\d{2}$/', $semaine) || $jour < 1 || $jour > 7 || !in_array($typeRepas, $TYPES_REPAS) || $selectionIndex < 0 || $selectionIndex > 3) {
        http_response_code(400);
        echo json_encode(["error" => "Paramètres invalides"]);
        exit;
    }

    $stmt = $pdo->prepare("
        UPDATE menu_hebdomadaire 
        SET selection_index = ?, updated_at = NOW()
        WHERE utilisateur_id = ? AND semaine = ? AND jour = ? AND type_repas = ?
    ");
    $stmt->execute([$selectionIndex, $userId, $semaine, $jour, $typeRepas]);

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(["error" => "Menu non trouvé pour ce jour/repas"]);
        exit;
    }

    echo json_encode(["success" => true, "message" => "Sélection enregistrée"]);
    exit;
}


// ═══════════════════════════════════════════════════════
// ACTION : COURSES (liste consolidée pour la semaine)
// ═══════════════════════════════════════════════════════

if ($action === 'courses') {
    $semaine = $_REQUEST['semaine'] ?? date('o-\WW');

    // Récupérer tous les repas sélectionnés de la semaine
    $stmt = $pdo->prepare("
        SELECT jour, type_repas, choix_json, selection_index 
        FROM menu_hebdomadaire 
        WHERE utilisateur_id = ? AND semaine = ? AND selection_index IS NOT NULL
    ");
    $stmt->execute([$userId, $semaine]);
    $rows = $stmt->fetchAll();

    $ingredients = [];

    foreach ($rows as $row) {
        $choix = json_decode($row['choix_json'], true);
        $selIdx = (int)$row['selection_index'];

        if (!isset($choix[$selIdx])) continue;
        $recette = $choix[$selIdx];

        // Extraire les ingrédients
        $ings = [];
        if (!empty($recette['ingredients_fr'])) {
            $ings = $recette['ingredients_fr'];
        } elseif (!empty($recette['nutrition']['ingredients'])) {
            foreach ($recette['nutrition']['ingredients'] as $ing) {
                $amount = isset($ing['amount']) ? round($ing['amount'], 1) : '';
                $unit = $ing['unit'] ?? '';
                $name = $ing['name'] ?? '';
                $ings[] = trim("$amount $unit $name");
            }
        }

        foreach ($ings as $ing) {
            if ($ing && trim($ing)) {
                $ingredients[] = [
                    'texte' => trim($ing),
                    'jour'  => (int)$row['jour'],
                    'repas' => $row['type_repas'],
                ];
            }
        }
    }

    echo json_encode([
        "success"     => true,
        "semaine"     => $semaine,
        "ingredients" => $ingredients,
        "nb_repas"    => count($rows),
    ]);
    exit;
}


// ═══════════════════════════════════════════════════════
// ACTION INCONNUE
// ═══════════════════════════════════════════════════════

http_response_code(400);
echo json_encode(["error" => "Action inconnue. Actions disponibles : generer, selectionner, courses"]);