<?php
/**
 * bot_recettes_fr.php — Bot de récupération de recettes françaises
 * 
 * Récupère des recettes depuis des sources gratuites françaises et les stocke en BDD.
 * Vérifie les doublons avant insertion (par titre normalisé).
 * 
 * ACTIONS :
 *   GET ?action=sync&type=breakfast|lunch|snack|dinner  → Synchronise des recettes
 *   GET ?action=status                                   → Nombre de recettes en BDD
 *   GET ?action=search&q=poulet                          → Recherche locale
 *   GET ?action=random&type=lunch&calories=500&limit=4   → Recettes aléatoires par type
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

require_once __DIR__ . '/db.php';

$action = $_REQUEST['action'] ?? '';

// ═══════════════════════════════════════════════════════
// CRÉATION AUTO DE LA TABLE SI ELLE N'EXISTE PAS
// ═══════════════════════════════════════════════════════

$pdo->exec("
    CREATE TABLE IF NOT EXISTS recettes_locales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titre VARCHAR(500) NOT NULL,
        titre_normalise VARCHAR(500) NOT NULL,
        image_url VARCHAR(1000) DEFAULT '',
        source_url VARCHAR(1000) DEFAULT '',
        ingredients_json MEDIUMTEXT,
        instructions TEXT,
        calories INT DEFAULT 0,
        proteines FLOAT DEFAULT 0,
        lipides FLOAT DEFAULT 0,
        glucides FLOAT DEFAULT 0,
        fibres FLOAT DEFAULT 0,
        type_repas VARCHAR(20) NOT NULL COMMENT 'breakfast, lunch, snack, dinner',
        langue VARCHAR(5) DEFAULT 'fr',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_titre_type (titre_normalise, type_repas)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

// ═══════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES
// ═══════════════════════════════════════════════════════

function normaliserTitre($titre) {
    $titre = mb_strtolower($titre, 'UTF-8');
    $titre = preg_replace('/[^\p{L}\p{N}\s]/u', '', $titre); // Garder lettres + chiffres
    $titre = preg_replace('/\s+/', ' ', $titre);
    return trim($titre);
}

function recetteExiste($pdo, $titreNormalise, $type) {
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM recettes_locales WHERE titre_normalise = ? AND type_repas = ?");
    $stmt->execute([$titreNormalise, $type]);
    return $stmt->fetchColumn() > 0;
}

function insererRecette($pdo, $recette) {
    $titreNorm = normaliserTitre($recette['titre']);
    
    if (recetteExiste($pdo, $titreNorm, $recette['type_repas'])) {
        return false; // Doublon
    }

    $stmt = $pdo->prepare("
        INSERT IGNORE INTO recettes_locales 
        (titre, titre_normalise, image_url, source_url, ingredients_json, instructions, 
         calories, proteines, lipides, glucides, fibres, type_repas, langue)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'fr')
    ");

    return $stmt->execute([
        $recette['titre'],
        $titreNorm,
        $recette['image_url'] ?? '',
        $recette['source_url'] ?? '',
        json_encode($recette['ingredients'] ?? [], JSON_UNESCAPED_UNICODE),
        $recette['instructions'] ?? '',
        $recette['calories'] ?? 0,
        $recette['proteines'] ?? 0,
        $recette['lipides'] ?? 0,
        $recette['glucides'] ?? 0,
        $recette['fibres'] ?? 0,
        $recette['type_repas'],
    ]);
}

// ═══════════════════════════════════════════════════════
// BASE DE RECETTES FRANÇAISES INTÉGRÉE
// (Source gratuite, pas de scraping nécessaire)
// ═══════════════════════════════════════════════════════

function getRecettesBase() {
    return [
        // ─── PETIT-DÉJEUNER ───
        [
            'titre' => 'Porridge aux flocons d\'avoine et fruits rouges',
            'type_repas' => 'breakfast',
            'image_url' => 'https://img.spoonacular.com/recipes/659109-312x231.jpg',
            'calories' => 320, 'proteines' => 12, 'lipides' => 8, 'glucides' => 50, 'fibres' => 6,
            'ingredients' => ['80g flocons d\'avoine', '200ml lait', '100g fruits rouges', '1 c.à.s miel', '10g graines de chia'],
            'instructions' => 'Faire chauffer le lait. Ajouter les flocons et cuire 5 min. Garnir de fruits et miel.',
        ],
        [
            'titre' => 'Omelette aux champignons et fromage',
            'type_repas' => 'breakfast',
            'image_url' => 'https://img.spoonacular.com/recipes/640062-312x231.jpg',
            'calories' => 350, 'proteines' => 24, 'lipides' => 22, 'glucides' => 6, 'fibres' => 2,
            'ingredients' => ['3 œufs', '100g champignons', '30g gruyère râpé', '1 c.à.c beurre', 'Sel, poivre'],
            'instructions' => 'Battre les œufs. Faire revenir les champignons. Verser les œufs, ajouter le fromage, plier.',
        ],
        [
            'titre' => 'Tartines avocat et œuf poché',
            'type_repas' => 'breakfast',
            'image_url' => 'https://img.spoonacular.com/recipes/795751-312x231.jpg',
            'calories' => 380, 'proteines' => 16, 'lipides' => 20, 'glucides' => 35, 'fibres' => 7,
            'ingredients' => ['2 tranches pain complet', '1 avocat', '2 œufs', 'Jus de citron', 'Piment d\'Espelette'],
            'instructions' => 'Toaster le pain. Écraser l\'avocat avec citron et piment. Pocher les œufs 3 min. Assembler.',
        ],
        [
            'titre' => 'Smoothie bowl protéiné banane-beurre de cacahuète',
            'type_repas' => 'breakfast',
            'image_url' => 'https://img.spoonacular.com/recipes/716437-312x231.jpg',
            'calories' => 400, 'proteines' => 18, 'lipides' => 16, 'glucides' => 48, 'fibres' => 5,
            'ingredients' => ['1 banane congelée', '150ml lait d\'amande', '2 c.à.s beurre de cacahuète', '20g granola', '1 c.à.s miel'],
            'instructions' => 'Mixer banane, lait et beurre de cacahuète. Verser dans un bol, garnir de granola et miel.',
        ],
        [
            'titre' => 'Pancakes à la banane et flocons d\'avoine',
            'type_repas' => 'breakfast',
            'image_url' => 'https://img.spoonacular.com/recipes/665186-312x231.jpg',
            'calories' => 340, 'proteines' => 14, 'lipides' => 10, 'glucides' => 46, 'fibres' => 4,
            'ingredients' => ['1 banane mûre', '2 œufs', '40g flocons d\'avoine', '1 pincée cannelle', '1 c.à.c huile de coco'],
            'instructions' => 'Écraser la banane, mélanger avec œufs et flocons. Cuire à la poêle 2 min par face.',
        ],
        [
            'titre' => 'Yaourt grec au granola et fruits frais',
            'type_repas' => 'breakfast',
            'image_url' => 'https://img.spoonacular.com/recipes/663136-312x231.jpg',
            'calories' => 280, 'proteines' => 20, 'lipides' => 8, 'glucides' => 32, 'fibres' => 3,
            'ingredients' => ['200g yaourt grec', '30g granola', '100g fruits de saison', '1 c.à.s miel', '5g noix concassées'],
            'instructions' => 'Déposer le yaourt dans un bol. Ajouter granola, fruits et miel. Parsemer de noix.',
        ],
        [
            'titre' => 'Crêpes complètes jambon-fromage',
            'type_repas' => 'breakfast',
            'image_url' => 'https://img.spoonacular.com/recipes/636228-312x231.jpg',
            'calories' => 420, 'proteines' => 22, 'lipides' => 18, 'glucides' => 40, 'fibres' => 3,
            'ingredients' => ['60g farine de sarrasin', '1 œuf', '150ml lait', '2 tranches jambon', '40g emmental'],
            'instructions' => 'Préparer la pâte. Cuire la crêpe, garnir de jambon et fromage. Plier et servir chaud.',
        ],
        [
            'titre' => 'Bol de fromage blanc aux graines et miel',
            'type_repas' => 'breakfast',
            'image_url' => 'https://img.spoonacular.com/recipes/658509-312x231.jpg',
            'calories' => 250, 'proteines' => 22, 'lipides' => 6, 'glucides' => 28, 'fibres' => 2,
            'ingredients' => ['200g fromage blanc 0%', '1 c.à.s graines de lin', '1 c.à.s graines de tournesol', '1 c.à.s miel', '1 kiwi'],
            'instructions' => 'Verser le fromage blanc, ajouter les graines, le miel et le kiwi coupé.',
        ],

        // ─── DÉJEUNER ───
        [
            'titre' => 'Poulet grillé aux herbes et légumes rôtis',
            'type_repas' => 'lunch',
            'image_url' => 'https://img.spoonacular.com/recipes/716426-312x231.jpg',
            'calories' => 480, 'proteines' => 38, 'lipides' => 18, 'glucides' => 35, 'fibres' => 6,
            'ingredients' => ['150g blanc de poulet', '200g légumes variés', '2 c.à.s huile d\'olive', 'Herbes de Provence', '100g riz complet'],
            'instructions' => 'Griller le poulet assaisonné. Rôtir les légumes au four 25 min. Servir avec le riz.',
        ],
        [
            'titre' => 'Saumon en papillote et quinoa aux légumes',
            'type_repas' => 'lunch',
            'image_url' => 'https://img.spoonacular.com/recipes/782601-312x231.jpg',
            'calories' => 520, 'proteines' => 35, 'lipides' => 22, 'glucides' => 40, 'fibres' => 5,
            'ingredients' => ['150g pavé de saumon', '80g quinoa', '1 courgette', '1 citron', '2 c.à.s huile d\'olive'],
            'instructions' => 'Cuire le saumon en papillote avec citron 20 min à 180°C. Cuire le quinoa, mélanger aux légumes.',
        ],
        [
            'titre' => 'Salade César au poulet croustillant',
            'type_repas' => 'lunch',
            'image_url' => 'https://img.spoonacular.com/recipes/649931-312x231.jpg',
            'calories' => 450, 'proteines' => 32, 'lipides' => 24, 'glucides' => 25, 'fibres' => 4,
            'ingredients' => ['150g poulet', '1 laitue romaine', '30g parmesan', '2 c.à.s sauce César', '40g croûtons'],
            'instructions' => 'Griller le poulet. Assembler la salade avec laitue, parmesan, croûtons et sauce.',
        ],
        [
            'titre' => 'Bowl bouddha aux lentilles et légumes',
            'type_repas' => 'lunch',
            'image_url' => 'https://img.spoonacular.com/recipes/648279-312x231.jpg',
            'calories' => 440, 'proteines' => 22, 'lipides' => 14, 'glucides' => 55, 'fibres' => 12,
            'ingredients' => ['100g lentilles vertes', '1 patate douce', '1 avocat', '100g pois chiches', '2 c.à.s tahini'],
            'instructions' => 'Cuire lentilles et patate douce. Assembler dans un bol, garnir d\'avocat, pois chiches et tahini.',
        ],
        [
            'titre' => 'Curry de lentilles corail au lait de coco',
            'type_repas' => 'lunch',
            'image_url' => 'https://img.spoonacular.com/recipes/716408-312x231.jpg',
            'calories' => 420, 'proteines' => 20, 'lipides' => 12, 'glucides' => 52, 'fibres' => 10,
            'ingredients' => ['150g lentilles corail', '200ml lait de coco', '1 oignon', '2 c.à.c curry', '100g riz basmati'],
            'instructions' => 'Faire revenir l\'oignon, ajouter curry et lentilles. Verser le lait de coco, cuire 20 min. Servir avec riz.',
        ],
        [
            'titre' => 'Wok de nouilles sautées aux crevettes',
            'type_repas' => 'lunch',
            'image_url' => 'https://img.spoonacular.com/recipes/716627-312x231.jpg',
            'calories' => 460, 'proteines' => 28, 'lipides' => 14, 'glucides' => 52, 'fibres' => 4,
            'ingredients' => ['150g crevettes décortiquées', '100g nouilles de riz', '1 poivron', '2 c.à.s sauce soja', '1 gousse d\'ail'],
            'instructions' => 'Cuire les nouilles. Sauter crevettes et légumes. Ajouter sauce soja, mélanger le tout.',
        ],
        [
            'titre' => 'Gratin de courgettes au chèvre',
            'type_repas' => 'lunch',
            'image_url' => 'https://img.spoonacular.com/recipes/646512-312x231.jpg',
            'calories' => 380, 'proteines' => 18, 'lipides' => 20, 'glucides' => 30, 'fibres' => 5,
            'ingredients' => ['3 courgettes', '100g chèvre frais', '2 œufs', '100ml crème légère', '30g parmesan'],
            'instructions' => 'Trancher les courgettes, disposer dans un plat. Mélanger œufs, crème et chèvre. Verser, gratiner 30 min.',
        ],
        [
            'titre' => 'Risotto aux champignons et parmesan',
            'type_repas' => 'lunch',
            'image_url' => 'https://img.spoonacular.com/recipes/659135-312x231.jpg',
            'calories' => 470, 'proteines' => 16, 'lipides' => 16, 'glucides' => 62, 'fibres' => 3,
            'ingredients' => ['150g riz arborio', '200g champignons', '50g parmesan', '1 oignon', '100ml vin blanc'],
            'instructions' => 'Rissoler l\'oignon, ajouter le riz. Mouiller au bouillon petit à petit. Ajouter champignons et parmesan.',
        ],

        // ─── COLLATION ───
        [
            'titre' => 'Energy balls chocolat-avoine',
            'type_repas' => 'snack',
            'image_url' => 'https://img.spoonacular.com/recipes/639851-312x231.jpg',
            'calories' => 180, 'proteines' => 6, 'lipides' => 8, 'glucides' => 22, 'fibres' => 3,
            'ingredients' => ['50g flocons d\'avoine', '2 c.à.s beurre de cacahuète', '1 c.à.s cacao', '1 c.à.s miel', '20g chocolat noir'],
            'instructions' => 'Mélanger tous les ingrédients. Former des boules. Réfrigérer 30 min.',
        ],
        [
            'titre' => 'Pomme et beurre de cacahuète',
            'type_repas' => 'snack',
            'image_url' => 'https://img.spoonacular.com/recipes/641975-312x231.jpg',
            'calories' => 200, 'proteines' => 5, 'lipides' => 10, 'glucides' => 24, 'fibres' => 4,
            'ingredients' => ['1 pomme', '2 c.à.s beurre de cacahuète'],
            'instructions' => 'Couper la pomme en tranches. Tartiner de beurre de cacahuète.',
        ],
        [
            'titre' => 'Houmous maison et bâtonnets de légumes',
            'type_repas' => 'snack',
            'image_url' => 'https://img.spoonacular.com/recipes/660306-312x231.jpg',
            'calories' => 220, 'proteines' => 8, 'lipides' => 12, 'glucides' => 20, 'fibres' => 6,
            'ingredients' => ['100g pois chiches', '2 c.à.s tahini', '1 citron', '1 gousse d\'ail', 'Carottes et concombre'],
            'instructions' => 'Mixer pois chiches, tahini, citron et ail. Servir avec bâtonnets de légumes.',
        ],
        [
            'titre' => 'Smoothie protéiné fruits rouges',
            'type_repas' => 'snack',
            'image_url' => 'https://img.spoonacular.com/recipes/715446-312x231.jpg',
            'calories' => 190, 'proteines' => 15, 'lipides' => 3, 'glucides' => 28, 'fibres' => 3,
            'ingredients' => ['150g fruits rouges', '150ml lait', '100g yaourt grec', '1 c.à.s miel'],
            'instructions' => 'Mixer tous les ingrédients jusqu\'à obtenir une texture lisse.',
        ],
        [
            'titre' => 'Muffin banane-avoine sans sucre ajouté',
            'type_repas' => 'snack',
            'image_url' => 'https://img.spoonacular.com/recipes/665186-312x231.jpg',
            'calories' => 160, 'proteines' => 5, 'lipides' => 4, 'glucides' => 26, 'fibres' => 3,
            'ingredients' => ['1 banane mûre', '60g flocons d\'avoine', '1 œuf', '1 c.à.c levure', '1 pincée cannelle'],
            'instructions' => 'Écraser la banane, mélanger aux ingrédients. Verser en moules. Cuire 20 min à 180°C.',
        ],
        [
            'titre' => 'Amandes grillées et chocolat noir',
            'type_repas' => 'snack',
            'image_url' => 'https://img.spoonacular.com/recipes/644783-312x231.jpg',
            'calories' => 210, 'proteines' => 7, 'lipides' => 16, 'glucides' => 12, 'fibres' => 3,
            'ingredients' => ['20g amandes', '20g chocolat noir 70%'],
            'instructions' => 'Griller les amandes à sec. Déguster avec le chocolat noir.',
        ],
        [
            'titre' => 'Fromage blanc et compote maison',
            'type_repas' => 'snack',
            'image_url' => 'https://img.spoonacular.com/recipes/658509-312x231.jpg',
            'calories' => 150, 'proteines' => 12, 'lipides' => 2, 'glucides' => 22, 'fibres' => 1,
            'ingredients' => ['150g fromage blanc 0%', '100g compote de pomme sans sucre', '1 c.à.c cannelle'],
            'instructions' => 'Verser le fromage blanc, napper de compote et saupoudrer de cannelle.',
        ],

        // ─── DÎNER ───
        [
            'titre' => 'Filet de cabillaud et purée de brocoli',
            'type_repas' => 'dinner',
            'image_url' => 'https://img.spoonacular.com/recipes/633344-312x231.jpg',
            'calories' => 380, 'proteines' => 32, 'lipides' => 10, 'glucides' => 35, 'fibres' => 6,
            'ingredients' => ['150g cabillaud', '200g brocoli', '1 pomme de terre', '1 c.à.s crème fraîche', 'Sel, poivre, citron'],
            'instructions' => 'Cuire le cabillaud au four 15 min. Préparer la purée brocoli-pomme de terre. Servir avec un filet de citron.',
        ],
        [
            'titre' => 'Soupe de lentilles corail au cumin',
            'type_repas' => 'dinner',
            'image_url' => 'https://img.spoonacular.com/recipes/648279-312x231.jpg',
            'calories' => 320, 'proteines' => 18, 'lipides' => 6, 'glucides' => 45, 'fibres' => 10,
            'ingredients' => ['150g lentilles corail', '1 oignon', '2 carottes', '1 c.à.c cumin', '500ml bouillon de légumes'],
            'instructions' => 'Faire revenir oignon et carottes. Ajouter lentilles, cumin et bouillon. Cuire 25 min, mixer.',
        ],
        [
            'titre' => 'Pâtes complètes sauce tomate maison et basilic',
            'type_repas' => 'dinner',
            'image_url' => 'https://img.spoonacular.com/recipes/715594-312x231.jpg',
            'calories' => 420, 'proteines' => 16, 'lipides' => 10, 'glucides' => 65, 'fibres' => 8,
            'ingredients' => ['100g pâtes complètes', '400g tomates pelées', '1 oignon', '2 gousses d\'ail', 'Basilic frais'],
            'instructions' => 'Cuire les pâtes. Faire revenir oignon et ail, ajouter tomates, cuire 20 min. Parsemer de basilic.',
        ],
        [
            'titre' => 'Quiche aux poireaux et saumon fumé',
            'type_repas' => 'dinner',
            'image_url' => 'https://img.spoonacular.com/recipes/654959-312x231.jpg',
            'calories' => 440, 'proteines' => 24, 'lipides' => 24, 'glucides' => 30, 'fibres' => 3,
            'ingredients' => ['1 pâte brisée', '2 poireaux', '100g saumon fumé', '3 œufs', '200ml crème légère'],
            'instructions' => 'Faire fondre les poireaux. Garnir la pâte de poireaux et saumon. Verser le mélange œufs-crème. Cuire 35 min à 180°C.',
        ],
        [
            'titre' => 'Tofu sauté aux légumes et sauce soja',
            'type_repas' => 'dinner',
            'image_url' => 'https://img.spoonacular.com/recipes/716627-312x231.jpg',
            'calories' => 350, 'proteines' => 22, 'lipides' => 14, 'glucides' => 32, 'fibres' => 5,
            'ingredients' => ['200g tofu ferme', '1 poivron', '1 courgette', '2 c.à.s sauce soja', '100g riz basmati'],
            'instructions' => 'Couper le tofu en dés, faire dorer. Sauter les légumes. Assaisonner à la sauce soja. Servir avec riz.',
        ],
        [
            'titre' => 'Gratin dauphinois léger',
            'type_repas' => 'dinner',
            'image_url' => 'https://img.spoonacular.com/recipes/646512-312x231.jpg',
            'calories' => 360, 'proteines' => 12, 'lipides' => 14, 'glucides' => 45, 'fibres' => 4,
            'ingredients' => ['500g pommes de terre', '200ml lait', '100ml crème légère', '1 gousse d\'ail', '30g gruyère'],
            'instructions' => 'Trancher les pommes de terre. Disposer en couches, verser lait et crème aillés. Gratiner 45 min.',
        ],
        [
            'titre' => 'Omelette espagnole aux pommes de terre',
            'type_repas' => 'dinner',
            'image_url' => 'https://img.spoonacular.com/recipes/640062-312x231.jpg',
            'calories' => 400, 'proteines' => 20, 'lipides' => 22, 'glucides' => 30, 'fibres' => 3,
            'ingredients' => ['4 œufs', '2 pommes de terre', '1 oignon', '2 c.à.s huile d\'olive', 'Sel, poivre'],
            'instructions' => 'Faire cuire pommes de terre et oignon. Verser les œufs battus, cuire à feu doux 10 min. Retourner.',
        ],
        [
            'titre' => 'Salade tiède de quinoa aux légumes grillés',
            'type_repas' => 'dinner',
            'image_url' => 'https://img.spoonacular.com/recipes/782601-312x231.jpg',
            'calories' => 380, 'proteines' => 14, 'lipides' => 16, 'glucides' => 44, 'fibres' => 7,
            'ingredients' => ['100g quinoa', '1 aubergine', '1 poivron', '100g feta', '2 c.à.s huile d\'olive'],
            'instructions' => 'Cuire le quinoa. Griller aubergine et poivron. Assembler avec feta émiettée et huile d\'olive.',
        ],
    ];
}


// ═══════════════════════════════════════════════════════
// ACTION : SYNC — Insérer les recettes de base en BDD
// ═══════════════════════════════════════════════════════

if ($action === 'sync') {
    $type = $_REQUEST['type'] ?? ''; // Optionnel : filtrer par type
    $reset = ($_REQUEST['reset'] ?? '') === '1'; // ?reset=1 pour tout réinsérer
    $recettes = getRecettesBase();
    
    // Si reset demandé, vider la table d'abord
    if ($reset) {
        $pdo->exec("TRUNCATE TABLE recettes_locales");
        error_log("🗑️ Table recettes_locales vidée (reset)");
    }

    $inserees = 0;
    $doublons = 0;

    foreach ($recettes as $recette) {
        if ($type && $recette['type_repas'] !== $type) continue;
        
        $result = insererRecette($pdo, $recette);
        if ($result) {
            $inserees++;
        } else {
            $doublons++;
        }
    }

    echo json_encode([
        "success"  => true,
        "inserees" => $inserees,
        "doublons" => $doublons,
        "total"    => $inserees + $doublons,
        "message"  => "$inserees recette(s) ajoutée(s), $doublons doublon(s) ignoré(s)",
    ]);
    exit;
}


// ═══════════════════════════════════════════════════════
// ACTION : STATUS — Comptage des recettes en BDD
// ═══════════════════════════════════════════════════════

if ($action === 'status') {
    $stmt = $pdo->query("SELECT type_repas, COUNT(*) as nb FROM recettes_locales GROUP BY type_repas");
    $stats = $stmt->fetchAll();

    $total = 0;
    $parType = [];
    foreach ($stats as $s) {
        $parType[$s['type_repas']] = (int)$s['nb'];
        $total += (int)$s['nb'];
    }

    echo json_encode([
        "success"  => true,
        "total"    => $total,
        "par_type" => $parType,
    ]);
    exit;
}


// ═══════════════════════════════════════════════════════
// ACTION : SEARCH — Recherche dans les recettes locales
// ═══════════════════════════════════════════════════════

if ($action === 'search') {
    $q = $_REQUEST['q'] ?? '';
    $type = $_REQUEST['type'] ?? '';
    $limit = min((int)($_REQUEST['limit'] ?? 10), 50);

    if (empty($q) && empty($type)) {
        http_response_code(400);
        echo json_encode(["error" => "Paramètre 'q' ou 'type' requis"]);
        exit;
    }

    $sql = "SELECT * FROM recettes_locales WHERE 1=1";
    $params = [];

    if ($q) {
        $sql .= " AND (titre LIKE ? OR titre_normalise LIKE ?)";
        $params[] = "%$q%";
        $params[] = "%" . normaliserTitre($q) . "%";
    }
    if ($type) {
        $sql .= " AND type_repas = ?";
        $params[] = $type;
    }

    $sql .= " ORDER BY titre ASC LIMIT ?";
    $params[] = $limit;

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $results = $stmt->fetchAll();

    // Formater pour compatibilité avec le frontend
    $formatted = array_map(function($r) {
        return formatRecetteLocale($r);
    }, $results);

    echo json_encode([
        "success"  => true,
        "results"  => $formatted,
        "count"    => count($formatted),
    ]);
    exit;
}


// ═══════════════════════════════════════════════════════
// ACTION : RANDOM — Recettes aléatoires (pour le moteur de menus)
// ═══════════════════════════════════════════════════════

if ($action === 'random') {
    $type = $_REQUEST['type'] ?? 'lunch';
    $limit = min((int)($_REQUEST['limit'] ?? 4), 10);
    $caloriesMin = (int)($_REQUEST['caloriesMin'] ?? 0);
    $caloriesMax = (int)($_REQUEST['caloriesMax'] ?? 9999);

    $sql = "SELECT * FROM recettes_locales WHERE type_repas = ?";
    $params = [$type];

    if ($caloriesMin > 0) {
        $sql .= " AND calories >= ?";
        $params[] = $caloriesMin;
    }
    if ($caloriesMax < 9999) {
        $sql .= " AND calories <= ?";
        $params[] = $caloriesMax;
    }

    $sql .= " ORDER BY RAND() LIMIT ?";
    $params[] = $limit;

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $results = $stmt->fetchAll();

    $formatted = array_map(function($r) {
        return formatRecetteLocale($r);
    }, $results);

    echo json_encode([
        "success" => true,
        "results" => $formatted,
        "count"   => count($formatted),
    ]);
    exit;
}


// ═══════════════════════════════════════════════════════
// FORMATAGE — Compatible avec le frontend existant
// ═══════════════════════════════════════════════════════

function formatRecetteLocale($row) {
    $ingredients = json_decode($row['ingredients_json'] ?? '[]', true) ?: [];
    
    return [
        "id"             => (int)$row['id'] + 100000, // Offset pour ne pas confliter avec Spoonacular
        "title"          => $row['titre'],
        "title_fr"       => $row['titre'], // Déjà en français
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


// ═══════════════════════════════════════════════════════
// ACTION INCONNUE
// ═══════════════════════════════════════════════════════

http_response_code(400);
echo json_encode(["error" => "Action inconnue. Actions : sync, status, search, random"]);