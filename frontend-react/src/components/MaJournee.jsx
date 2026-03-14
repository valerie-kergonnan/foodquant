import React, { useState } from "react";

// ─── Extracteur de nutriments ───
const obtenirValeur = (recette, nomCible) => {
  if (!recette?.nutrition?.nutrients) return 0;
  const nutriment = recette.nutrition.nutrients.find(n => n.name === nomCible);
  return nutriment ? nutriment.amount : 0;
};

// ─── Anneau de progression animé (utilisé uniquement par repas) ───
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

// ─── Composant principal ───
function MaJournee({ recipes, nutrients, besoins, onRefreshRecipe, onEditProfil }) {
  const [refreshingIndex, setRefreshingIndex] = useState(null);
  const [detailOuvert, setDetailOuvert] = useState({});

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
        {onEditProfil && (
          <button
            onClick={onEditProfil}
            className="text-sm bg-amber-50 text-amber-700 font-bold px-4 py-2 rounded-2xl border border-amber-200 hover:bg-amber-100 transition-all"
          >
            ✏️ Profil
          </button>
        )}
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