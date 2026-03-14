<?php
/**
 * traduction.php — Traduction des recettes via API Claude (Haiku)
 * 
 * Traduit titre + ingrédients de l'anglais vers le français.
 * Cache permanent par recette (une recette traduite = jamais retraduite).
 */

function traduireRecette($recette) {
    $apiKey = getenv('ANTHROPIC_API_KEY') ?: '';
    $cacheDir = __DIR__ . '/cache/traductions';

    if (!is_dir($cacheDir)) {
        mkdir($cacheDir, 0755, true);
    }

    // Pas de clé = on renvoie tel quel
    if (empty($apiKey)) {
        error_log("⚠️ ANTHROPIC_API_KEY manquante — pas de traduction");
        return $recette;
    }

    $id = $recette['id'] ?? null;
    if (!$id) return $recette;

    // ─── Cache : déjà traduit ? ───
    $cacheFile = "$cacheDir/$id.json";
    if (file_exists($cacheFile)) {
        $cached = json_decode(file_get_contents($cacheFile), true);
        if ($cached) {
            error_log("✅ CACHE TRADUCTION recette $id");
            return array_merge($recette, $cached);
        }
    }

    // ─── Extraire les ingrédients ───
    $titre = $recette['title'] ?? '';
    $ingredients = [];

    // Depuis extendedIngredients (si présent)
    if (!empty($recette['extendedIngredients'])) {
        foreach ($recette['extendedIngredients'] as $ing) {
            $ingredients[] = $ing['original'] ?? $ing['name'] ?? '';
        }
    }
    // Depuis nutrition.ingredients (alternative)
    elseif (!empty($recette['nutrition']['ingredients'])) {
        foreach ($recette['nutrition']['ingredients'] as $ing) {
            $amount = $ing['amount'] ?? '';
            $unit = $ing['unit'] ?? '';
            $name = $ing['name'] ?? '';
            $ingredients[] = trim("$amount $unit $name");
        }
    }

    // Rien à traduire
    if (empty($titre) && empty($ingredients)) return $recette;

    // ─── Construire le prompt ───
    $ingredientsText = '';
    if (!empty($ingredients)) {
        $ingredientsText = "\n\nIngrédients :\n";
        foreach ($ingredients as $i => $ing) {
            if (!empty(trim($ing))) {
                $ingredientsText .= "- " . trim($ing) . "\n";
            }
        }
    }

    $prompt = "Traduis en français naturel (vocabulaire culinaire). Réponds UNIQUEMENT en JSON valide, sans backticks, sans explication.

Titre de recette : \"$titre\"$ingredientsText
Format de réponse attendu :
{\"title_fr\": \"...\", \"ingredients_fr\": [\"...\", \"...\"]}

Si pas d'ingrédients, renvoie un tableau vide pour ingredients_fr.";

    // ─── Appel API Claude Haiku ───
    $ch = curl_init('https://api.anthropic.com/v1/messages');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'x-api-key: ' . $apiKey,
            'anthropic-version: 2023-06-01'
        ],
        CURLOPT_POSTFIELDS => json_encode([
            'model' => 'claude-haiku-4-5-20251001',
            'max_tokens' => 500,
            'messages' => [
                ['role' => 'user', 'content' => $prompt]
            ]
        ])
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);

    if ($curlError || $httpCode !== 200) {
        error_log("❌ Traduction échouée recette $id — HTTP $httpCode : $curlError");
        return $recette;
    }

    $data = json_decode($response, true);
    $texte = $data['content'][0]['text'] ?? '';

    if (empty($texte)) {
        error_log("❌ Réponse vide de Claude pour recette $id");
        return $recette;
    }

    // ─── Parser le JSON de Claude ───
    // Nettoyer les éventuels backticks
    $texte = trim($texte);
    $texte = preg_replace('/^```json\s*/', '', $texte);
    $texte = preg_replace('/\s*```$/', '', $texte);

    $traduction = json_decode($texte, true);

    if (!$traduction || !isset($traduction['title_fr'])) {
        error_log("❌ JSON invalide de Claude pour recette $id : $texte");
        return $recette;
    }

    // ─── Sauvegarder en cache (permanent) ───
    $tradData = [
        'title_fr' => $traduction['title_fr'],
        'ingredients_fr' => $traduction['ingredients_fr'] ?? []
    ];

    file_put_contents($cacheFile, json_encode($tradData, JSON_UNESCAPED_UNICODE));
    error_log("✅ Traduction recette $id : {$traduction['title_fr']}");

    return array_merge($recette, $tradData);
}