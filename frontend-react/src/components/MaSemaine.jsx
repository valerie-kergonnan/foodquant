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

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
        isSelected
          ? "border-amber-500 shadow-lg shadow-amber-100 scale-[1.02]"
          : "border-gray-100 hover:border-amber-200 hover:shadow-md"
      }`}
    >
      <div className="relative">
        <img
          src={recette.image}
          alt={titre}
          className={`w-full object-cover ${petit ? "h-24" : "h-32"}`}
          loading="lazy"
        />
        {isSelected && (
          <div className="absolute top-2 right-2 w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white text-xs font-bold">✓</span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/60 to-transparent px-3 py-2">
          <span className="text-white text-[10px] font-bold">{cal} kcal</span>
        </div>
      </div>
      <div className="p-2.5">
        <p className={`font-bold text-gray-800 leading-tight ${petit ? "text-[11px]" : "text-xs"} line-clamp-2`}>
          {titre}
        </p>
      </div>
    </button>
  );
}

// ─── Composant principal ───
function MaSemaine() {
  const [semaine, setSemaine] = useState(getSemaineISO());
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");
  const [jourActif, setJourActif] = useState(new Date().getDay() || 7); // 1-7, lundi=1
  const [saving, setSaving] = useState(null); // "jour-type" en cours de sauvegarde
  const [loadingMessage, setLoadingMessage] = useState("");

  const messages = [
    "🍳 Préparation de tes menus...",
    "📅 Organisation de la semaine...",
    "🥗 Sélection des meilleures recettes...",
    "🧑‍🍳 Nos chefs composent tes choix...",
    "✨ Plus que quelques secondes...",
  ];

  // ─── Charger le menu de la semaine ───
  const chargerMenu = async (sem) => {
    setLoading(true);
    setErreur("");
    let msgIdx = 0;
    setLoadingMessage(messages[0]);
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % messages.length;
      setLoadingMessage(messages[msgIdx]);
    }, 2000);

    try {
      const res = await fetch(
        `${API_URL}/menu_hebdo.php?action=generer&semaine=${sem}`,
        { headers: authHeaders() }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erreur ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        setMenu(data.menu);
      } else {
        throw new Error(data.error || "Erreur inconnue");
      }
    } catch (e) {
      setErreur(e.message);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  useEffect(() => {
    chargerMenu(semaine);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ─── Écran de chargement ───
  if (loading) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-full border-4 border-amber-100 border-t-amber-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-xl">📅</div>
        </div>
        <p className="text-base font-bold text-amber-800 animate-pulse text-center">{loadingMessage}</p>
        <p className="text-xs text-amber-600/50 mt-2">La première génération peut prendre un moment...</p>
      </div>
    );
  }

  // ─── Erreur ───
  if (erreur) {
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

  if (!menu) return null;

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
              onClick={() => setJourActif(jour.num)}
              className={`flex flex-col items-center shrink-0 w-14 py-2.5 rounded-2xl transition-all duration-300 ${
                isActif
                  ? "bg-amber-500 text-white shadow-lg shadow-amber-200"
                  : isComplet
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              <span className={`text-[10px] font-bold ${isActif ? "text-amber-100" : ""}`}>
                {jour.short}
              </span>
              <span className={`text-sm font-black ${isActif ? "" : ""}`}>
                {jour.num}
              </span>
              {isComplet && !isActif && (
                <span className="text-[8px] mt-0.5">✅</span>
              )}
              {!isComplet && (
                <span className={`text-[8px] mt-0.5 ${isActif ? "text-amber-200" : "text-gray-300"}`}>
                  {nbSelect}/4
                </span>
              )}
            </button>
          );
        })}
      </div>

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

export default MaSemaine;