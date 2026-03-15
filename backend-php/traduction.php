<?php
/**
 * traduction.php — V3 : Traduction gratuite via MyMemory API
 * 
 * Remplace l'API Claude Haiku (payante) par MyMemory (gratuit, 5000 mots/jour).
 * Conserve le cache existant (les anciennes traductions Claude restent utilisées).
 * Fallback : lien Google Translate si la traduction échoue.
 * 
 * UTILISATION : require_once 'traduction.php'; puis traduireRecette($recette);
 */

// ─── Config ───
$CACHE_DIR_TRADUCTIONS = __DIR__ . '/cache/traductions';
if (!is_dir($CACHE_DIR_TRADUCTIONS)) mkdir($CACHE_DIR_TRADUCTIONS, 0755, true);

/**
 * Traduire un texte EN → FR via MyMemory API (gratuit)
 * 
 * @param string $texte Texte en anglais
 * @param string $source Langue source (default: en)
 * @param string $cible Langue cible (default: fr)
 * @return array ['texte' => string, 'success' => bool, 'source' => string]
 */
function traduireTexte($texte, $source = 'en', $cible = 'fr') {
    if (empty(trim($texte))) {
        return ['texte' => $texte, 'success' => false, 'source' => 'vide'];
    }

    // Appel MyMemory API (gratuit, pas de clé nécessaire)
    $url = "https://api.mymemory.translated.net/get?" . http_build_query([
        'q'       => $texte,
        'langpair' => "$source|$cible",
    ]);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'FoodQuant/1.0');

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if ($httpCode !== 200 || !$response) {
        error_log("❌ MyMemory erreur HTTP $httpCode pour : $texte");
        return ['texte' => $texte, 'success' => false, 'source' => 'erreur_http'];
    }

    $data = json_decode($response, true);

    if (!$data || !isset($data['responseData']['translatedText'])) {
        error_log("❌ MyMemory réponse invalide pour : $texte");
        return ['texte' => $texte, 'success' => false, 'source' => 'erreur_parse'];
    }

    $traduit = $data['responseData']['translatedText'];
    $match = $data['responseData']['match'] ?? 0;

    // Vérification qualité
    if (!verifierQualiteTraduction($texte, $traduit, $match)) {
        error_log("⚠️ Traduction de faible qualité pour : $texte → $traduit (match: $match)");
        return ['texte' => $texte, 'success' => false, 'source' => 'qualite_faible'];
    }

    // Nettoyer la première lettre en majuscule
    $traduit = mb_strtoupper(mb_substr($traduit, 0, 1)) . mb_substr($traduit, 1);

    return ['texte' => $traduit, 'success' => true, 'source' => 'mymemory'];
}

/**
 * Vérifier la qualité d'une traduction
 */
function verifierQualiteTraduction($original, $traduit, $matchScore = 0) {
    // Texte identique = pas traduit
    if (strtolower(trim($original)) === strtolower(trim($traduit))) {
        return false;
    }

    // Trop court par rapport à l'original (< 30%)
    if (strlen($traduit) < strlen($original) * 0.3) {
        return false;
    }

    // Score de correspondance trop bas (MyMemory renvoie un score 0-1)
    if ($matchScore > 0 && $matchScore < 0.3) {
        return false;
    }

    // Contient des caractères suspects (trop de caractères non-latins)
    $nonLatin = preg_match_all('/[^\p{Latin}\s\d\p{P}]/u', $traduit);
    if ($nonLatin > strlen($traduit) * 0.5) {
        return false;
    }

    return true;
}

/**
 * Générer un lien de traduction Google Translate (fallback)
 */
function genererLienTraduction($texte, $source = 'en', $cible = 'fr') {
    $encoded = urlencode($texte);
    return "https://translate.google.com/?sl={$source}&tl={$cible}&text={$encoded}&op=translate";
}

/**
 * Obtenir la traduction depuis le cache
 */
function getCacheTraduction($recetteId) {
    global $CACHE_DIR_TRADUCTIONS;
    $fichier = "$CACHE_DIR_TRADUCTIONS/$recetteId.json";
    
    if (file_exists($fichier)) {
        $data = json_decode(file_get_contents($fichier), true);
        if ($data) return $data;
    }
    return null;
}

/**
 * Sauvegarder la traduction en cache
 */
function saveCacheTraduction($recetteId, $data) {
    global $CACHE_DIR_TRADUCTIONS;
    file_put_contents(
        "$CACHE_DIR_TRADUCTIONS/$recetteId.json",
        json_encode($data, JSON_UNESCAPED_UNICODE)
    );
}

/**
 * Traduire une recette complète (titre + ingrédients)
 * Compatible avec le format existant du frontend.
 * 
 * @param array $recette Recette au format Spoonacular
 * @return array Recette avec title_fr et ingredients_fr ajoutés
 */
function traduireRecette($recette) {
    $id = $recette['id'] ?? 0;
    
    // 1) Vérifier le cache (compatible avec l'ancien cache Claude Haiku)
    $cached = getCacheTraduction($id);
    if ($cached) {
        $recette['title_fr'] = $cached['title_fr'] ?? $recette['title'];
        $recette['ingredients_fr'] = $cached['ingredients_fr'] ?? [];
        error_log("✅ CACHE traduction pour recette #$id");
        return $recette;
    }

    // 2) Traduire le titre
    $titreOriginal = $recette['title'] ?? '';
    $resultatTitre = traduireTexte($titreOriginal);
    
    if ($resultatTitre['success']) {
        $recette['title_fr'] = $resultatTitre['texte'];
    } else {
        // Fallback : garder le titre anglais + ajouter lien de traduction
        $recette['title_fr'] = $titreOriginal;
        $recette['lien_traduction_titre'] = genererLienTraduction($titreOriginal);
    }

    // 3) Traduire les ingrédients
    $ingredients_fr = [];
    $ingredientsSources = [];

    // Priorité : extendedIngredients > nutrition.ingredients
    if (!empty($recette['extendedIngredients'])) {
        $ingredientsSources = array_map(fn($i) => $i['original'] ?? $i['name'] ?? '', $recette['extendedIngredients']);
    } elseif (!empty($recette['nutrition']['ingredients'])) {
        $ingredientsSources = array_map(function($i) {
            $amount = isset($i['amount']) ? round($i['amount'], 1) : '';
            $unit = $i['unit'] ?? '';
            $name = $i['name'] ?? '';
            return trim("$amount $unit $name");
        }, $recette['nutrition']['ingredients']);
    }

    foreach ($ingredientsSources as $ing) {
        if (empty(trim($ing))) continue;
        
        $resultat = traduireTexte($ing);
        if ($resultat['success']) {
            $ingredients_fr[] = $resultat['texte'];
        } else {
            // Garder l'original si la traduction échoue
            $ingredients_fr[] = $ing;
        }
    }

    $recette['ingredients_fr'] = $ingredients_fr;

    // 4) Sauvegarder en cache (permanent)
    saveCacheTraduction($id, [
        'title_fr'       => $recette['title_fr'],
        'ingredients_fr' => $ingredients_fr,
        'source'         => $resultatTitre['source'] ?? 'unknown',
        'date'           => date('Y-m-d H:i:s'),
    ]);

    error_log("🌐 Traduction MyMemory pour recette #$id : {$recette['title']} → {$recette['title_fr']}");

    return $recette;
}