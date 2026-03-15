import React, { useState } from "react";

// ─── Extracteur de nutriments ───
const obtenirValeur = (recette, nomCible) => {
  if (!recette?.nutrition?.nutrients) return 0;
  const nutriment = recette.nutrition.nutrients.find(n => n.name === nomCible);
  return nutriment ? nutriment.amount : 0;
};

// ─── Anneau de progression animé (par repas) ───
const AnneauProgression = ({ pourcentage, label, valeur, unite, taille = 100, couleur = "text-amber-600" }) => {
  const rayon = 40;
  const perimetre = 2 * Math.PI * rayon;
  const offset = perimetre - (Math.min(pourcentage, 100) / 100) * perimetre;

  return (
    <div className="flex flex-col items-center">
      <svg width={taille} height={taille} viewBox="0 0 100 100" className="transform -rotate-90">
        <circle cx="50" cy="50" r={rayon} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-amber-100/50" />
        <circle
          cx="50" cy="50" r={rayon}
          stroke="currentColor" strokeWidth="8" fill="transparent"
          strokeDasharray={perimetre}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${couleur} transition-all duration-1000 ease-out`}
        />
      </svg>
      <div className="mt-2 text-center">
        <p className="text-[10px] font-bold text-amber-900/40 uppercase tracking-wider">{label}</p>
        <p className="font-black text-amber-900 text-sm">
          {valeur} <span className="text-[10px] font-medium text-amber-800/60">{unite}</span>
        </p>
      </div>
    </div>
  );
};

// ─── Barre de progression avec label ───
const BarreNutriment = ({ label, valeur, objectif, unite, couleur = "bg-amber-400", emoji = "" }) => {
  const pourcentage = objectif > 0 ? Math.min((valeur / objectif) * 100, 100) : 0;
  const depassement = objectif > 0 && valeur > objectif;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-600">{emoji} {label}</span>
        <span className="text-xs font-bold text-gray-800">
          {valeur} <span className="text-gray-400 font-medium">/ {objectif} {unite}</span>
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${depassement ? 'bg-red-400' : couleur} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${pourcentage}%` }}
        />
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// V3 : SYSTÈME INTELLIGENT DE LISTE DE COURSES
// - Parse les quantités depuis les textes d'ingrédients
// - Cumule les ingrédients identiques
// - Arrondit à des quantités réalistes pour les courses
// ═══════════════════════════════════════════════════════════════

// Dictionnaire d'unités reconnues (avec alias)
const UNITES_CONNUES = {
  // Poids
  'g': 'g', 'gr': 'g', 'gram': 'g', 'grams': 'g', 'gramme': 'g', 'grammes': 'g',
  'kg': 'kg', 'kilo': 'kg', 'kilos': 'kg', 'kilogram': 'kg', 'kilogramme': 'kg',
  'oz': 'oz', 'ounce': 'oz', 'ounces': 'oz',
  'lb': 'lb', 'lbs': 'lb', 'pound': 'lb', 'pounds': 'lb',
  // Volume
  'ml': 'ml', 'millilitre': 'ml', 'millilitres': 'ml', 'milliliter': 'ml',
  'cl': 'cl', 'centilitre': 'cl', 'centilitres': 'cl',
  'l': 'L', 'litre': 'L', 'litres': 'L', 'liter': 'L', 'liters': 'L',
  'cup': 'tasse', 'cups': 'tasse', 'tasse': 'tasse', 'tasses': 'tasse',
  'tbsp': 'c.à.s', 'tablespoon': 'c.à.s', 'tablespoons': 'c.à.s',
  'c.à.s': 'c.à.s', 'cas': 'c.à.s', 'cuillère à soupe': 'c.à.s', 'cuillères à soupe': 'c.à.s',
  'tsp': 'c.à.c', 'teaspoon': 'c.à.c', 'teaspoons': 'c.à.c',
  'c.à.c': 'c.à.c', 'cac': 'c.à.c', 'cuillère à café': 'c.à.c', 'cuillères à café': 'c.à.c',
  // Pièces
  'pièce': 'pièce', 'pièces': 'pièce', 'piece': 'pièce',
  'tranche': 'tranche', 'tranches': 'tranche', 'slice': 'tranche', 'slices': 'tranche',
  'gousse': 'gousse', 'gousses': 'gousse', 'clove': 'gousse', 'cloves': 'gousse',
  'feuille': 'feuille', 'feuilles': 'feuille', 'leaf': 'feuille', 'leaves': 'feuille',
  'brin': 'brin', 'brins': 'brin', 'sprig': 'brin', 'sprigs': 'brin',
  'boîte': 'boîte', 'boîtes': 'boîte', 'can': 'boîte', 'cans': 'boîte',
  'sachet': 'sachet', 'sachets': 'sachet', 'packet': 'sachet', 'packets': 'sachet',
  'bunch': 'botte', 'botte': 'botte', 'bottes': 'botte',
  'pinch': 'pincée', 'pincée': 'pincée', 'pincées': 'pincée',
  'dash': 'trait', 'trait': 'trait',
  'handful': 'poignée', 'poignée': 'poignée', 'poignées': 'poignée',
};

// Ingrédients qui se comptent en pièces entières (pas de 0.7 œuf)
const INGREDIENTS_ENTIERS = [
  'oeuf', 'œuf', 'egg', 'oignon', 'onion', 'ail', 'garlic', 'tomate', 'tomato',
  'pomme', 'apple', 'banane', 'banana', 'citron', 'lemon', 'lime', 'orange',
  'avocat', 'avocado', 'poivron', 'pepper', 'concombre', 'cucumber',
  'carotte', 'carrot', 'pomme de terre', 'potato', 'courgette', 'zucchini',
  'aubergine', 'eggplant', 'patate douce', 'sweet potato',
];

// Parse un texte d'ingrédient → { quantite, unite, nom }
function parseIngredient(texte) {
  if (!texte || typeof texte !== 'string') return { quantite: null, unite: '', nom: texte || '' };

  let t = texte.trim();

  // Pattern : "2.5 g de poulet" ou "3 œufs" ou "1/2 tasse de farine" ou "100g poulet"
  // Gère les fractions (1/2, 3/4), les décimaux (2.5), les nombres collés à l'unité (100g)
  const regexQuantite = /^(\d+\s*\/\s*\d+|\d+[.,]\d+|\d+)\s*/;
  const match = t.match(regexQuantite);

  let quantite = null;
  let reste = t;

  if (match) {
    const qStr = match[1].replace(',', '.');
    if (qStr.includes('/')) {
      const [num, den] = qStr.split('/').map(s => parseFloat(s.trim()));
      quantite = den !== 0 ? num / den : null;
    } else {
      quantite = parseFloat(qStr);
    }
    reste = t.slice(match[0].length).trim();
  }

  // Chercher l'unité au début du reste
  let unite = '';
  let nom = reste;

  // Tester les unités multi-mots d'abord (cuillère à soupe, etc.)
  const unitesTriees = Object.keys(UNITES_CONNUES).sort((a, b) => b.length - a.length);
  for (const u of unitesTriees) {
    const regex = new RegExp(`^${u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(?:de\\s+|d')?`, 'i');
    if (regex.test(reste)) {
      unite = UNITES_CONNUES[u.toLowerCase()] || u;
      nom = reste.replace(regex, '').trim();
      break;
    }
  }

  // Nettoyer le nom : retirer "de " au début
  nom = nom.replace(/^de\s+/i, '').replace(/^d'/i, '').trim();

  // Si pas de nom trouvé, garder le texte original
  if (!nom) nom = texte.trim();

  return { quantite, unite, nom };
}

// Normalise un nom d'ingrédient pour le regroupement
function normaliserNom(nom) {
  return nom
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // retirer accents
    .replace(/[^a-z0-9\s]/g, '') // retirer ponctuation
    .replace(/\s+/g, ' ')
    .trim();
}

// Arrondit une quantité à une valeur réaliste pour les courses
function arrondirPourCourses(quantite, unite, nom) {
  if (quantite === null || quantite === 0) return quantite;

  const nomLower = nom.toLowerCase();

  // Ingrédients entiers → arrondi supérieur à l'entier
  const estEntier = INGREDIENTS_ENTIERS.some(ie => nomLower.includes(ie));
  if (estEntier || unite === 'pièce') {
    return Math.ceil(quantite);
  }

  // Petites mesures (c.à.c, c.à.s, pincée) → arrondi au 0.5 supérieur
  if (['c.à.c', 'c.à.s', 'pincée', 'trait'].includes(unite)) {
    return Math.ceil(quantite * 2) / 2;
  }

  // Grammes
  if (unite === 'g') {
    if (quantite <= 10) return Math.ceil(quantite);        // 7g → 7g (épices)
    if (quantite <= 50) return Math.ceil(quantite / 5) * 5; // 23g → 25g
    if (quantite <= 200) return Math.ceil(quantite / 10) * 10; // 183g → 190g
    return Math.ceil(quantite / 50) * 50;                    // 340g → 350g
  }

  // Kilogrammes → arrondi au 0.1 supérieur
  if (unite === 'kg') {
    return Math.ceil(quantite * 10) / 10;
  }

  // Millilitres
  if (unite === 'ml') {
    if (quantite <= 50) return Math.ceil(quantite / 5) * 5;   // 7ml → 10ml
    if (quantite <= 200) return Math.ceil(quantite / 10) * 10; // 183ml → 190ml
    return Math.ceil(quantite / 50) * 50;                       // 340ml → 350ml
  }

  // Centilitres → arrondi au 5cl
  if (unite === 'cl') {
    if (quantite <= 10) return Math.ceil(quantite);
    return Math.ceil(quantite / 5) * 5;
  }

  // Litres → arrondi au 0.25L
  if (unite === 'L') {
    return Math.ceil(quantite * 4) / 4;
  }

  // Tasses → arrondi au 0.25
  if (unite === 'tasse') {
    return Math.ceil(quantite * 4) / 4;
  }

  // Tranches, gousses, feuilles, boîtes → entier supérieur
  if (['tranche', 'gousse', 'feuille', 'brin', 'boîte', 'sachet', 'botte', 'poignée'].includes(unite)) {
    return Math.ceil(quantite);
  }

  // Oz, lb → arrondi au 0.5
  if (['oz', 'lb'].includes(unite)) {
    return Math.ceil(quantite * 2) / 2;
  }

  // Par défaut → arrondi à 1 décimale supérieure
  return Math.ceil(quantite * 10) / 10;
}

// Formate une quantité pour l'affichage
function formaterQuantite(quantite, unite) {
  if (quantite === null) return '';

  // Affichage propre : pas de ".0" inutile
  let qStr;
  if (Number.isInteger(quantite)) {
    qStr = quantite.toString();
  } else if (quantite === 0.25) {
    qStr = '¼';
  } else if (quantite === 0.5) {
    qStr = '½';
  } else if (quantite === 0.75) {
    qStr = '¾';
  } else {
    qStr = quantite.toFixed(1).replace('.0', '');
  }

  if (unite) {
    // Pluriel simple pour les unités françaises
    const pluriels = { 'tasse': 'tasses', 'tranche': 'tranches', 'gousse': 'gousses', 'feuille': 'feuilles', 'brin': 'brins', 'boîte': 'boîtes', 'sachet': 'sachets', 'botte': 'bottes', 'pièce': 'pièces', 'pincée': 'pincées', 'poignée': 'poignées' };
    const uniteAffichee = (quantite > 1 && pluriels[unite]) ? pluriels[unite] : unite;
    return `${qStr} ${uniteAffichee}`;
  }

  return qStr;
}

// Traite tous les ingrédients : parse, cumule, arrondit
function traiterIngredientsIntellligent(recipes) {
  const repasLabels = ["Petit-déjeuner", "Déjeuner", "Collation", "Dîner"];
  const cumul = {}; // clé normalisée → { quantite, unite, nomOriginal, repas[] }

  recipes.forEach((recette, index) => {
    if (!recette) return;

    let ingredients = [];

    if (recette.ingredients_fr && recette.ingredients_fr.length > 0) {
      ingredients = recette.ingredients_fr;
    } else if (recette.extendedIngredients) {
      ingredients = recette.extendedIngredients.map(ing => ing.original || ing.name || '');
    } else if (recette.nutrition?.ingredients) {
      ingredients = recette.nutrition.ingredients.map(ing => {
        const amount = ing.amount ? `${Math.round(ing.amount * 10) / 10}` : '';
        const unit = ing.unit || '';
        const name = ing.name || '';
        return `${amount} ${unit} ${name}`.trim();
      });
    }

    ingredients.forEach(texteIng => {
      if (!texteIng || !texteIng.trim()) return;

      const { quantite, unite, nom } = parseIngredient(texteIng.trim());
      const cle = normaliserNom(nom);

      if (!cle) return;

      if (cumul[cle]) {
        // Cumuler la quantité si même unité (ou sans unité)
        if (quantite !== null && cumul[cle].quantite !== null && cumul[cle].unite === unite) {
          cumul[cle].quantite += quantite;
        } else if (quantite !== null && cumul[cle].quantite === null) {
          cumul[cle].quantite = quantite;
          cumul[cle].unite = unite;
        }
        // Ajouter le repas d'origine
        if (!cumul[cle].repas.includes(repasLabels[index])) {
          cumul[cle].repas.push(repasLabels[index]);
        }
      } else {
        cumul[cle] = {
          quantite,
          unite,
          nomOriginal: nom,
          repas: [repasLabels[index]],
        };
      }
    });
  });

  // Arrondir et formater
  const resultat = Object.entries(cumul).map(([cle, data]) => {
    const qArrondie = arrondirPourCourses(data.quantite, data.unite, data.nomOriginal);
    const texteQuantite = formaterQuantite(qArrondie, data.unite);
    const texteComplet = texteQuantite
      ? `${texteQuantite} ${data.nomOriginal}`
      : data.nomOriginal;

    return {
      id: cle,
      texte: texteComplet.charAt(0).toUpperCase() + texteComplet.slice(1),
      repas: data.repas.join(', '),
      nbRepas: data.repas.length,
    };
  });

  // Trier : ingrédients utilisés dans plusieurs repas en premier, puis alphabétique
  resultat.sort((a, b) => {
    if (b.nbRepas !== a.nbRepas) return b.nbRepas - a.nbRepas;
    return a.texte.localeCompare(b.texte, 'fr');
  });

  return resultat;
}

// ─── V3 : Modale Liste de Courses (intelligente) ───
const ModalListeCourses = ({ recipes, onClose }) => {
  const ingredientsTraites = traiterIngredientsIntellligent(recipes);

  const [coches, setCoches] = useState({});
  const [copie, setCopie] = useState(false);

  const toggleCoche = (id) => {
    setCoches(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copierListe = () => {
    const texte = ingredientsTraites
      .map(ing => `${coches[ing.id] ? '✅' : '⬜'} ${ing.texte}`)
      .join('\n');
    navigator.clipboard.writeText(texte).then(() => {
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    });
  };

  const nbCoches = Object.values(coches).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modale */}
      <div className="relative bg-white w-full max-w-md max-h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-slideUp">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-black text-gray-800">🛒 Liste de courses</h2>
            <p className="text-xs text-gray-400 mt-1">
              {ingredientsTraites.length} ingrédient{ingredientsTraites.length > 1 ? 's' : ''}
              {nbCoches > 0 && ` · ${nbCoches} coché${nbCoches > 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Liste des ingrédients */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {ingredientsTraites.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-3">📝</p>
              <p className="text-gray-400 text-sm">Aucun ingrédient disponible.</p>
              <p className="text-gray-300 text-xs mt-1">Les ingrédients apparaîtront après génération d'un nouveau menu.</p>
            </div>
          ) : (
            ingredientsTraites.map((ing) => (
              <button
                key={ing.id}
                onClick={() => toggleCoche(ing.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all duration-200 ${
                  coches[ing.id]
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-gray-50 border border-transparent hover:bg-amber-50'
                }`}
              >
                <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  coches[ing.id]
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-300'
                }`}>
                  {coches[ing.id] && <span className="text-xs">✓</span>}
                </span>
                <span className={`text-sm flex-1 transition-all ${
                  coches[ing.id]
                    ? 'text-gray-400 line-through'
                    : 'text-gray-700 font-medium'
                }`}>
                  {ing.texte}
                </span>
                <span className="text-[10px] text-gray-300 font-medium shrink-0 max-w-20 text-right">
                  {ing.repas}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer actions */}
        {ingredientsTraites.length > 0 && (
          <div className="p-5 border-t border-gray-100 flex gap-3 shrink-0">
            <button
              onClick={copierListe}
              className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all ${
                copie
                  ? 'bg-green-500 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              {copie ? '✅ Copié !' : '📋 Copier la liste'}
            </button>
            <button
              onClick={() => setCoches({})}
              className="px-4 py-3 rounded-2xl font-bold text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all"
            >
              ↩️
            </button>
          </div>
        )}
      </div>

      {/* Animation */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(100px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

// ─── Composant principal ───
function MaJournee({ recipes, nutrients, besoins, onRefreshRecipe, onEditProfil }) {
  const [refreshingIndex, setRefreshingIndex] = useState(null);
  const [detailOuvert, setDetailOuvert] = useState({});
  const [showListeCourses, setShowListeCourses] = useState(false);

  // Sécurité + message guide
  if (!recipes || recipes.length === 0 || recipes.every(r => !r)) {
    return (
      <div className="w-full max-w-md px-4 mx-auto pb-20 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-5xl mb-4">🍽️</p>
          <h2 className="text-xl font-black text-gray-700 mb-2">Aucun menu généré</h2>
          <p className="text-gray-400 text-sm mb-6">Remplis ton profil pour découvrir ton menu personnalisé du jour !</p>
          {onEditProfil ? (
            <button
              onClick={onEditProfil}
              className="bg-amber-500 text-white font-bold py-3 px-8 rounded-2xl hover:-translate-y-1 transition-all"
            >
              ✏️ Remplir mon profil
            </button>
          ) : (
            <button
              onClick={() => window.location.reload()}
              className="bg-amber-500 text-white font-bold py-3 px-6 rounded-2xl"
            >
              🔄 Recharger mes repas
            </button>
          )}
        </div>
      </div>
    );
  }

  const listeRepas = [
    { label: "Petit-déjeuner", emoji: "🌅", donnee: recipes[0] },
    { label: "Déjeuner", emoji: "☀️", donnee: recipes[1] },
    { label: "Collation", emoji: "🍎", donnee: recipes[2] },
    { label: "Dîner", emoji: "🌙", donnee: recipes[3] },
  ];

  const handleRefresh = async (index) => {
    setRefreshingIndex(index);
    await onRefreshRecipe(index);
    setRefreshingIndex(null);
  };

  const toggleDetail = (index) => {
    setDetailOuvert(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // Calcul des totaux globaux
  const totalCal = nutrients ? Math.round(nutrients.calories) : 0;
  const totalProt = nutrients ? Math.round(nutrients.protein) : 0;
  const totalLipides = Math.round(recipes.reduce((sum, r) => sum + obtenirValeur(r, "Fat"), 0));
  const totalGlucides = Math.round(recipes.reduce((sum, r) => sum + obtenirValeur(r, "Carbohydrates"), 0));
  const totalFibres = Math.round(recipes.reduce((sum, r) => sum + obtenirValeur(r, "Fiber"), 0));

  // Objectifs calculés
  const objCal = besoins?.calories || 2000;
  const objProt = besoins?.proteines || 80;
  const objLipides = Math.round(objCal * 0.30 / 9);
  const objGlucides = Math.round(objCal * 0.50 / 4);
  const objFibres = 30;

  return (
    <div className="w-full max-w-md px-4 mx-auto pb-20">

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between pt-6 mb-6">
        <h1 className="text-3xl font-black text-gray-800">Ma Journée</h1>
        <div className="flex gap-2">
          {/* V2 : Bouton liste de courses */}
          <button
            onClick={() => setShowListeCourses(true)}
            className="text-sm bg-green-50 text-green-700 font-bold px-4 py-2 rounded-2xl border border-green-200 hover:bg-green-100 transition-all"
          >
            🛒
          </button>
          {onEditProfil && (
            <button
              onClick={onEditProfil}
              className="text-sm bg-amber-50 text-amber-700 font-bold px-4 py-2 rounded-2xl border border-amber-200 hover:bg-amber-100 transition-all"
            >
              ✏️ Profil
            </button>
          )}
        </div>
      </div>

      {/* ─── Dashboard compact unifié ─── */}
      {besoins && (
        <div className="mb-8 p-5 bg-white rounded-3xl border border-amber-100 shadow-lg space-y-3">
          <p className="text-[10px] font-bold text-amber-800/50 uppercase tracking-wider">Bilan nutritionnel du jour</p>
          <BarreNutriment label="Calories" valeur={totalCal} objectif={objCal} unite="kcal" couleur="bg-amber-400" emoji="🔥" />
          <BarreNutriment label="Protéines" valeur={totalProt} objectif={objProt} unite="g" couleur="bg-orange-400" emoji="💪" />
          <BarreNutriment label="Lipides" valeur={totalLipides} objectif={objLipides} unite="g" couleur="bg-yellow-400" emoji="🫒" />
          <BarreNutriment label="Glucides" valeur={totalGlucides} objectif={objGlucides} unite="g" couleur="bg-blue-400" emoji="🌾" />
          <BarreNutriment label="Fibres" valeur={totalFibres} objectif={objFibres} unite="g" couleur="bg-green-400" emoji="🥦" />
        </div>
      )}

      {/* ─── Liste des repas ─── */}
      <div className="space-y-8">
        {listeRepas.map((repas, index) => {
          if (!repas.donnee) return null;

          const calPlat = obtenirValeur(repas.donnee, "Calories");
          const protPlat = obtenirValeur(repas.donnee, "Protein");
          const lipPlat = obtenirValeur(repas.donnee, "Fat");
          const glucPlat = obtenirValeur(repas.donnee, "Carbohydrates");
          const fibrePlat = obtenirValeur(repas.donnee, "Fiber");

          const multiProt = [0.3, 0.35, 0.1, 0.25][index];
          const divCal = index === 0 ? 3 : (index === 2 ? 6 : 4);
          const objCalRepas = besoins?.calories ? besoins.calories / divCal : 500;
          const objProtRepas = besoins?.proteines ? besoins.proteines * multiProt : 30;

          const isRefreshing = refreshingIndex === index;
          const showDetail = detailOuvert[index] || false;

          return (
            <div
              key={index}
              className="group"
              style={{ animation: `fadeSlideUp 0.5s ease-out ${index * 0.1}s both` }}
            >
              <h2 className="text-xl font-black text-gray-700 mb-4 ml-4 flex items-center">
                <span className="mr-3 text-lg">{repas.emoji}</span>
                {repas.label}
              </h2>

              <div className={`overflow-hidden bg-white rounded-[2.5rem] shadow-lg border border-gray-100 transition-all duration-300 hover:-translate-y-2 ${isRefreshing ? 'opacity-50 scale-95' : ''}`}>
                <div className="h-52 overflow-hidden relative">
                  <img
                    src={repas.donnee.image}
                    alt={repas.donnee.title_fr || repas.donnee.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  {isRefreshing && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full border-3 border-amber-200 border-t-amber-500 animate-spin" />
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <h3 className="font-extrabold text-gray-800 text-xl leading-tight mb-4 group-hover:text-amber-600 transition-colors">
                    {repas.donnee.title_fr || repas.donnee.title}
                  </h3>

                  {/* Mini-anneaux par repas */}
                  <div className="flex justify-around items-center bg-amber-50/50 p-4 rounded-3xl mb-4 border border-amber-100">
                    <AnneauProgression
                      pourcentage={(calPlat / objCalRepas) * 100}
                      valeur={Math.round(calPlat)}
                      unite={`/ ${Math.round(objCalRepas)} kcal`}
                      label="Calories" taille={85} couleur="text-amber-500"
                    />
                    <AnneauProgression
                      pourcentage={(protPlat / objProtRepas) * 100}
                      valeur={Math.round(protPlat)}
                      unite={`/ ${Math.round(objProtRepas)} g`}
                      label="Protéines" taille={85} couleur="text-orange-500"
                    />
                  </div>

                  {/* Bouton détail nutritionnel */}
                  <button
                    onClick={() => toggleDetail(index)}
                    className="w-full text-center text-xs font-bold text-amber-600/60 hover:text-amber-600 mb-4 transition-colors"
                  >
                    {showDetail ? "▲ Masquer le détail" : "▼ Voir lipides, glucides, fibres"}
                  </button>

                  {showDetail && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-2xl space-y-2 animate-fadeIn">
                      <BarreNutriment label="Lipides" valeur={Math.round(lipPlat)} objectif={Math.round(objLipides / 4)} unite="g" couleur="bg-yellow-400" emoji="" />
                      <BarreNutriment label="Glucides" valeur={Math.round(glucPlat)} objectif={Math.round(objGlucides / 4)} unite="g" couleur="bg-blue-400" emoji="" />
                      <BarreNutriment label="Fibres" valeur={Math.round(fibrePlat)} objectif={Math.round(objFibres / 4)} unite="g" couleur="bg-green-400" emoji="" />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href={repas.donnee.sourceUrl || `https://spoonacular.com/recipes/${repas.donnee.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold py-3 rounded-2xl text-center text-sm transition-all"
                    >
                      📖 Recette
                    </a>
                    <button
                      onClick={() => handleRefresh(index)}
                      disabled={isRefreshing}
                      className="bg-amber-50 hover:bg-amber-500 text-amber-600 hover:text-white font-bold py-3 rounded-2xl text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isRefreshing ? (
                        <span className="animate-spin">⏳</span>
                      ) : (
                        <>🔄 Changer</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── V3 : Modale liste de courses intelligente ─── */}
      {showListeCourses && (
        <ModalListeCourses
          recipes={recipes}
          onClose={() => setShowListeCourses(false)}
        />
      )}

      {/* ─── Animations CSS ─── */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default MaJournee;