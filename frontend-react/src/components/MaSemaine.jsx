import React, { useState, useEffect } from "react";

const API_URL = "https://foodquant-production.up.railway.app";

// ─── Config ───
const JOURS = [
  { num: 1, label: "Lundi",    short: "Lun" },
  { num: 2, label: "Mardi",    short: "Mar" },
  { num: 3, label: "Mercredi", short: "Mer" },
  { num: 4, label: "Jeudi",    short: "Jeu" },
  { num: 5, label: "Vendredi", short: "Ven" },
  { num: 6, label: "Samedi",   short: "Sam" },
  { num: 7, label: "Dimanche", short: "Dim" },
];

const REPAS = [
  { type: "breakfast", label: "Petit-déj", emoji: "🌅" },
  { type: "lunch",     label: "Déjeuner",  emoji: "☀️" },
  { type: "snack",     label: "Collation",  emoji: "🍎" },
  { type: "dinner",    label: "Dîner",      emoji: "🌙" },
];

// ─── Helper : semaine ISO courante ───
function getSemaineISO(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset * 7);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

// ─── Helper : headers JWT ───
function authHeaders() {
  const token = localStorage.getItem("jwt_token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

// ─── Carte de recette (choix) ───
function CarteRecette({ recette, isSelected, onSelect, petit = false }) {
  const cal = recette.calories || 0;
  const titre = recette.title_fr || recette.title || "Recette";
  const marmitonUrl = `https://www.marmiton.org/recettes/recherche.aspx?aqt=${encodeURIComponent(titre)}`;

  return (
    <div className={`w-full text-left rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
      isSelected
        ? "border-amber-500 shadow-lg shadow-amber-100 scale-[1.02]"
        : "border-gray-100 hover:border-amber-200 hover:shadow-md"
    }`}>
      <button onClick={onSelect} className="w-full text-left">
        <div className="relative">
          {recette.source === 'local_fr' ? (
            <div className={`w-full bg-linear-to-br from-amber-50 to-orange-100 flex items-center justify-center ${petit ? "h-24" : "h-32"}`}>
              <span className="text-3xl">🍽️</span>
            </div>
          ) : (
            <img
              src={recette.image}
              alt={titre}
              className={`w-full object-cover ${petit ? "h-24" : "h-32"}`}
              loading="lazy"
            />
          )}
          {isSelected && (
            <div className="absolute top-2 right-2 w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/60 to-transparent px-3 py-2">
            <span className="text-white text-[10px] font-bold">{cal} kcal</span>
          </div>
        </div>
        <div className="p-2.5 pb-1">
          <p className={`font-bold text-gray-800 leading-tight ${petit ? "text-[11px]" : "text-xs"} line-clamp-2`}>
            {titre}
          </p>
        </div>
      </button>
      {/* Lien Marmiton visible quand sélectionné */}
      {isSelected && (
        <div className="px-2.5 pb-2">
          <a
            href={marmitonUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-amber-600 hover:text-amber-800 font-bold underline"
            onClick={(e) => e.stopPropagation()}
          >
            📖 Voir recette
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Composant principal ───
function MaSemaine() {
  const [semaine, setSemaine] = useState(getSemaineISO());
  const [menu, setMenu] = useState(null);
  const [erreur, setErreur] = useState("");
  const [jourActif, setJourActif] = useState(new Date().getDay() || 7); // 1-7, lundi=1
  const [saving, setSaving] = useState(null);
  const [loadingJour, setLoadingJour] = useState(0); // 0 = pas en cours, 1-7 = jour en chargement
  const [showCourses, setShowCourses] = useState(false);
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationOk, setValidationOk] = useState(false);
  const [validationErreur, setValidationErreur] = useState("");

  const JOURS_LABELS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  // ─── V3 : Chargement parallèle AJAX — 7 jours lancés en même temps ───
  const chargerMenu = async (sem) => {
    setErreur("");
    setMenu({});
    setLoadingJour(7); // Indique qu'on charge

    // Lancer les 7 requêtes en parallèle
    const promesses = [];
    for (let jour = 1; jour <= 7; jour++) {
      const p = fetch(
        `${API_URL}/menu_hebdo.php?action=generer&semaine=${sem}&jour=${jour}`,
        { headers: authHeaders() }
      )
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`Erreur ${res.status}`))))
        .then((data) => {
          if (data.success && data.menu) {
            setMenu((prev) => ({ ...prev, [jour]: data.menu }));
          }
          return { jour, ok: true };
        })
        .catch((e) => {
          console.error(`Erreur jour ${jour}:`, e.message);
          return { jour, ok: false, error: e.message };
        });
      promesses.push(p);
    }

    // Attendre que tout soit terminé
    const resultats = await Promise.all(promesses);

    // Vérifier si tout a échoué
    const tousEchoues = resultats.every((r) => !r.ok);
    if (tousEchoues && resultats[0]?.error) {
      setErreur(resultats[0].error);
    }

    setLoadingJour(0);
  };

  useEffect(() => {
    chargerMenu(semaine);
   
  }, [semaine]);

  // ─── Sélectionner un choix ───
  const selectionnerChoix = async (jour, typeRepas, indexChoix) => {
    const key = `${jour}-${typeRepas}`;
    setSaving(key);

    // Mise à jour optimiste locale
    setMenu((prev) => {
      const updated = { ...prev };
      if (updated[jour] && updated[jour][typeRepas]) {
        updated[jour] = { ...updated[jour] };
        updated[jour][typeRepas] = {
          ...updated[jour][typeRepas],
          selection: indexChoix,
        };
      }
      return updated;
    });

    try {
      await fetch(`${API_URL}/menu_hebdo.php?action=selectionner`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          semaine,
          jour,
          type_repas: typeRepas,
          selection_index: indexChoix,
        }),
      });
    } catch {
      console.error("Erreur sauvegarde sélection");
    } finally {
      setSaving(null);
    }
  };

  // ─── Navigation semaine ───
  const changerSemaine = (offset) => {
    // Calculer la nouvelle semaine
    const match = semaine.match(/^(\d{4})-W(\d{2})$/);
    if (!match) return;
    const year = parseInt(match[1]);
    const week = parseInt(match[2]);

    // Créer une date à partir de la semaine ISO
    const d = new Date(year, 0, 1 + (week - 1) * 7);
    d.setDate(d.getDate() + offset * 7);

    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const newWeek = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);

    const nouvelleSemaine = `${d.getFullYear()}-W${String(newWeek).padStart(2, "0")}`;
    setSemaine(nouvelleSemaine);
    setMenu(null);
    setValidationOk(false);
    setValidationErreur("");
  };

  // ─── Valider la semaine (injecte dans historique_repas) ───
  const validerSemaine = async () => {
    setValidationLoading(true);
    setValidationErreur("");

    try {
      const res = await fetch(`${API_URL}/menu_hebdo.php?action=valider`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ semaine }),
      });

      const data = await res.json();

      if (data.success) {
        setValidationOk(true);
        setTimeout(() => setValidationOk(false), 4000);
      } else {
        setValidationErreur(`❌ ${data.error || "Erreur lors de la validation"}`);
        setTimeout(() => setValidationErreur(""), 4000);
      }
    } catch {
      setValidationErreur("❌ Impossible de valider. Vérifie ta connexion.");
      setTimeout(() => setValidationErreur(""), 4000);
    } finally {
      setValidationLoading(false);
    }
  };

  // ─── Stats de complétion ───
  const getCompletion = () => {
    if (!menu) return { fait: 0, total: 28 };
    let fait = 0;
    for (let j = 1; j <= 7; j++) {
      for (const r of REPAS) {
        if (menu[j]?.[r.type]?.selection !== null && menu[j]?.[r.type]?.selection !== undefined) {
          fait++;
        }
      }
    }
    return { fait, total: 28 };
  };

  const { fait, total } = getCompletion();
  const isLoading = loadingJour > 0;

  // ─── Erreur ───
  if (erreur && !menu) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-4xl">😕</p>
        <p className="text-gray-600 text-center font-medium">{erreur}</p>
        <button
          onClick={() => chargerMenu(semaine)}
          className="bg-amber-500 text-white font-bold py-3 px-6 rounded-2xl hover:-translate-y-1 transition-all"
        >
          🔄 Réessayer
        </button>
      </div>
    );
  }

  if (!menu || Object.keys(menu).length === 0) {
    if (!isLoading) return null;
    // Premier chargement : afficher un écran d'attente initial
    return (
      <div className="w-full max-w-lg mx-auto px-4 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-full border-4 border-amber-100 border-t-amber-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-xl">📅</div>
        </div>
        <p className="text-base font-bold text-amber-800 animate-pulse text-center">
          🍳 Préparation de tes menus...
        </p>
        <p className="text-xs text-amber-600/50 mt-2">Les 7 jours arrivent en parallèle !</p>
      </div>
    );
  }

  const jourData = menu[jourActif];

  return (
    <div className="w-full max-w-lg mx-auto px-4 pb-8">

      {/* ─── Header avec navigation semaine ─── */}
      <div className="pt-6 mb-5">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-800">Ma Semaine</h1>
          <div className="flex items-center gap-1 bg-amber-50 rounded-2xl border border-amber-100 px-1">
            <button
              onClick={() => changerSemaine(-1)}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-amber-100 transition-colors text-amber-700 font-bold"
            >
              ‹
            </button>
            <span className="text-xs font-bold text-amber-800 px-2">{semaine}</span>
            <button
              onClick={() => changerSemaine(1)}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-amber-100 transition-colors text-amber-700 font-bold"
            >
              ›
            </button>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="flex items-center gap-3 mt-3">
          <div className="grow h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${(fait / total) * 100}%` }}
            />
          </div>
          <span className="text-xs font-bold text-gray-400 shrink-0">{fait}/{total}</span>
        </div>
      </div>

      {/* ─── Sélecteur de jours (scroll horizontal) ─── */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {JOURS.map((jour) => {
          const jourCharge = !!menu[jour.num];
          const enChargement = isLoading && !jourCharge;

          // Compter les sélections pour ce jour
          let nbSelect = 0;
          if (menu[jour.num]) {
            REPAS.forEach((r) => {
              if (menu[jour.num][r.type]?.selection !== null && menu[jour.num][r.type]?.selection !== undefined) {
                nbSelect++;
              }
            });
          }
          const isActif = jourActif === jour.num;
          const isComplet = nbSelect === 4;

          return (
            <button
              key={jour.num}
              onClick={() => jourCharge && setJourActif(jour.num)}
              disabled={!jourCharge && !enChargement}
              className={`flex flex-col items-center shrink-0 w-14 py-2.5 rounded-2xl transition-all duration-300 ${
                enChargement
                  ? "bg-amber-100 text-amber-600 border border-amber-300 animate-pulse"
                  : isActif
                    ? "bg-amber-500 text-white shadow-lg shadow-amber-200"
                    : isComplet
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : jourCharge
                        ? "bg-gray-50 text-gray-500 hover:bg-gray-100"
                        : "bg-gray-50 text-gray-300 opacity-50"
              }`}
            >
              <span className={`text-[10px] font-bold ${isActif ? "text-amber-100" : ""}`}>
                {jour.short}
              </span>
              {enChargement ? (
                <span className="text-xs mt-0.5">⏳</span>
              ) : (
                <span className={`text-sm font-black`}>
                  {jour.num}
                </span>
              )}
              {isComplet && !isActif && !enChargement && (
                <span className="text-[8px] mt-0.5">✅</span>
              )}
              {!isComplet && jourCharge && !enChargement && (
                <span className={`text-[8px] mt-0.5 ${isActif ? "text-amber-200" : "text-gray-300"}`}>
                  {nbSelect}/4
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Indicateur de chargement progressif ─── */}
      {isLoading && (
        <div className="mb-4 p-3 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-amber-200 border-t-amber-500 animate-spin shrink-0" />
          <p className="text-sm font-bold text-amber-700">
            Chargement des menus... ({Object.keys(menu).length}/7)
          </p>
        </div>
      )}

      {/* ─── Repas du jour sélectionné ─── */}
      <div className="space-y-6">
        {REPAS.map((repas) => {
          const data = jourData?.[repas.type];
          if (!data || !data.choix || data.choix.length === 0) return null;

          const selIndex = data.selection;
          const isSaving = saving === `${jourActif}-${repas.type}`;

          return (
            <div key={repas.type}>
              {/* Label du repas */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-black text-gray-700 flex items-center gap-2">
                  <span>{repas.emoji}</span>
                  {repas.label}
                </h2>
                {selIndex !== null && selIndex !== undefined && (
                  <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                    ✓ Choisi
                  </span>
                )}
                {isSaving && (
                  <span className="text-[10px] font-bold text-amber-600 animate-pulse">
                    Sauvegarde...
                  </span>
                )}
              </div>

              {/* Grille des 4 choix */}
              <div className="grid grid-cols-2 gap-2.5">
                {data.choix.map((recette, idx) => (
                  <CarteRecette
                    key={`${jourActif}-${repas.type}-${idx}`}
                    recette={recette}
                    isSelected={selIndex === idx}
                    onSelect={() => selectionnerChoix(jourActif, repas.type, idx)}
                    petit={true}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Boutons d'action en bas ─── */}
      <div className="mt-8 space-y-3">

        {/* Bouton Liste de courses */}
        {fait > 0 && (
          <button
            onClick={() => setShowCourses(true)}
            className="w-full py-3.5 rounded-2xl font-bold text-sm bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-all flex items-center justify-center gap-2"
          >
            🛒 Liste de courses ({fait} repas sélectionnés)
          </button>
        )}

        {/* Bouton Valider ma semaine */}
        {fait > 0 && (
          <button
            onClick={validerSemaine}
            disabled={validationLoading}
            className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${
              validationOk
                ? 'bg-green-500 text-white'
                : validationLoading
                  ? 'bg-amber-300 text-white cursor-not-allowed opacity-70'
                  : 'bg-linear-to-r from-amber-500 to-amber-600 text-white shadow-lg hover:-translate-y-1 active:translate-y-0'
            }`}
          >
            {validationOk
              ? '✅ Semaine validée !'
              : validationLoading
                ? '⏳ Validation en cours...'
                : `💾 Valider ma semaine (${fait}/28 repas)`
            }
          </button>
        )}

        {validationErreur && (
          <p className="text-red-500 text-sm font-medium text-center animate-pulse">{validationErreur}</p>
        )}
      </div>

      {/* ─── Modale Liste de courses hebdo ─── */}
      {showCourses && (
        <ModalCoursesHebdo
          semaine={semaine}
          onClose={() => setShowCourses(false)}
        />
      )}

      {/* ─── CSS utilitaire ─── */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Parsing intelligent des ingrédients (hebdo)
// ═══════════════════════════════════════════════════════

const INGREDIENTS_ENTIERS = [
  'oeuf', 'œuf', 'egg', 'oignon', 'onion', 'ail', 'garlic', 'tomate', 'tomato',
  'pomme', 'apple', 'banane', 'banana', 'citron', 'lemon', 'orange', 'avocat', 'avocado',
  'poivron', 'pepper', 'concombre', 'cucumber', 'carotte', 'carrot', 'pomme de terre', 'potato',
  'courgette', 'zucchini', 'aubergine', 'eggplant',
];

function parseIngHebdo(texte) {
  if (!texte) return { quantite: null, unite: '', nom: texte || '' };
  let t = texte.trim();
  const match = t.match(/^(\d+\s*\/\s*\d+|\d+[.,]\d+|\d+)\s*/);
  let quantite = null;
  let reste = t;
  if (match) {
    const q = match[1].replace(',', '.');
    quantite = q.includes('/') ? parseFloat(q.split('/')[0]) / parseFloat(q.split('/')[1]) : parseFloat(q);
    reste = t.slice(match[0].length).trim();
  }
  // Séparer unité et nom simplement
  const uniteMatch = reste.match(/^(g|kg|ml|cl|l|tsp|tbsp|cup|cups|tasse|tasses|c\.à\.s|c\.à\.c|oz|lb|pièces?|tranches?|gousses?|boîtes?|pincées?|poignées?|brins?|feuilles?)\s+/i);
  let unite = '', nom = reste;
  if (uniteMatch) {
    unite = uniteMatch[1].toLowerCase();
    nom = reste.slice(uniteMatch[0].length).replace(/^de\s+|^d'/i, '').trim();
  } else {
    nom = reste.replace(/^de\s+|^d'/i, '').trim();
  }
  if (!nom) nom = texte.trim();
  return { quantite, unite, nom };
}

function normaliserNomHebdo(nom) {
  return nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function arrondirHebdo(q, unite, nom) {
  if (q === null || q === 0) return q;
  const n = nom.toLowerCase();
  if (INGREDIENTS_ENTIERS.some(ie => n.includes(ie))) return Math.ceil(q);
  if (['g'].includes(unite)) {
    if (q <= 50) return Math.ceil(q / 5) * 5;
    if (q <= 200) return Math.ceil(q / 10) * 10;
    return Math.ceil(q / 50) * 50;
  }
  if (unite === 'ml') {
    if (q <= 50) return Math.ceil(q / 5) * 5;
    if (q <= 200) return Math.ceil(q / 10) * 10;
    return Math.ceil(q / 50) * 50;
  }
  if (unite === 'cl') return q <= 10 ? Math.ceil(q) : Math.ceil(q / 5) * 5;
  if (['l', 'tasse', 'tasses', 'cup', 'cups'].includes(unite)) return Math.ceil(q * 4) / 4;
  if (['tsp', 'tbsp', 'c.à.c', 'c.à.s'].includes(unite)) return Math.ceil(q * 2) / 2;
  if (['pièce', 'tranche', 'gousse', 'boîte', 'feuille', 'brin', 'pincée', 'poignée'].includes(unite)) return Math.ceil(q);
  if (['oz', 'lb'].includes(unite)) return Math.ceil(q * 2) / 2;
  return Math.ceil(q * 10) / 10;
}

function formaterQteHebdo(q, unite) {
  if (q === null) return '';
  let s;
  if (Number.isInteger(q)) s = q.toString();
  else if (q === 0.25) s = '¼';
  else if (q === 0.5) s = '½';
  else if (q === 0.75) s = '¾';
  else s = q.toFixed(1).replace('.0', '');
  return unite ? `${s} ${unite}` : s;
}

function traiterIngredientsHebdo(rawIngredients) {
  const cumul = {};
  rawIngredients.forEach((ing) => {
    const { quantite, unite, nom } = parseIngHebdo(ing.texte);
    const cle = normaliserNomHebdo(nom);
    if (!cle) return;
    if (cumul[cle]) {
      if (quantite !== null && cumul[cle].quantite !== null && cumul[cle].unite === unite) {
        cumul[cle].quantite += quantite;
      }
      cumul[cle].count++;
    } else {
      cumul[cle] = { quantite, unite, nomOriginal: nom, count: 1 };
    }
  });

  return Object.entries(cumul).map(([, data]) => {
    const qArr = arrondirHebdo(data.quantite, data.unite, data.nomOriginal);
    const qStr = formaterQteHebdo(qArr, data.unite);
    const texte = qStr ? `${qStr} ${data.nomOriginal}` : data.nomOriginal;
    return {
      texte: texte.charAt(0).toUpperCase() + texte.slice(1),
      count: data.count,
    };
  }).sort((a, b) => b.count !== a.count ? b.count - a.count : a.texte.localeCompare(b.texte, 'fr'));
}

// ═══════════════════════════════════════════════════════
// Modale Liste de courses hebdomadaire
// ═══════════════════════════════════════════════════════

function ModalCoursesHebdo({ semaine, onClose }) {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [coches, setCoches] = useState({});
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    const charger = async () => {
      try {
        const res = await fetch(
          `${API_URL}/menu_hebdo.php?action=courses&semaine=${semaine}`,
          { headers: authHeaders() }
        );
        const data = await res.json();
        if (data.success && data.ingredients) {
          setIngredients(traiterIngredientsHebdo(data.ingredients));
        }
      } catch {
        console.error("Erreur chargement courses");
      } finally {
        setLoading(false);
      }
    };
    charger();
  }, [semaine]);

  const toggleCoche = (idx) => {
    setCoches((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const copierListe = () => {
    const texte = ingredients
      .map((ing, i) => `${coches[i] ? "✅" : "⬜"} ${ing.texte}`)
      .join("\n");
    navigator.clipboard.writeText(texte).then(() => {
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    });
  };

  const nbCoches = Object.values(coches).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full max-w-md max-h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-slideUp">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-black text-gray-800">🛒 Courses de la semaine</h2>
            <p className="text-xs text-gray-400 mt-1">
              {ingredients.length} ingrédient{ingredients.length > 1 ? "s" : ""}
              {nbCoches > 0 && ` · ${nbCoches} coché${nbCoches > 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-10 h-10 mx-auto rounded-full border-3 border-amber-200 border-t-amber-500 animate-spin mb-3" />
              <p className="text-gray-400 text-sm">Chargement des ingrédients...</p>
            </div>
          ) : ingredients.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-3">📝</p>
              <p className="text-gray-400 text-sm">Aucun ingrédient.</p>
              <p className="text-gray-300 text-xs mt-1">Sélectionne des repas pour voir la liste de courses.</p>
            </div>
          ) : (
            ingredients.map((ing, idx) => (
              <button
                key={idx}
                onClick={() => toggleCoche(idx)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all duration-200 ${
                  coches[idx]
                    ? "bg-green-50 border border-green-200"
                    : "bg-gray-50 border border-transparent hover:bg-amber-50"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    coches[idx]
                      ? "bg-green-500 border-green-500 text-white"
                      : "border-gray-300"
                  }`}
                >
                  {coches[idx] && <span className="text-xs">✓</span>}
                </span>
                <span
                  className={`text-sm flex-1 transition-all ${
                    coches[idx] ? "text-gray-400 line-through" : "text-gray-700 font-medium"
                  }`}
                >
                  {ing.texte}
                </span>
                {ing.count > 1 && (
                  <span className="text-[10px] text-amber-500 font-bold bg-amber-50 px-2 py-0.5 rounded-full">
                    ×{ing.count}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        {ingredients.length > 0 && (
          <div className="p-5 border-t border-gray-100 flex gap-3 shrink-0">
            <button
              onClick={copierListe}
              className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all ${
                copie ? "bg-green-500 text-white" : "bg-amber-500 hover:bg-amber-600 text-white"
              }`}
            >
              {copie ? "✅ Copié !" : "📋 Copier la liste"}
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

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(100px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
      `}</style>
    </div>
  );
}

export default MaSemaine;