import React, { useState } from "react";

// ─── Extracteur de nutriments ───
const obtenirValeur = (recette, nomCible) => {
  if (!recette?.nutrition?.nutrients) return 0;
  const nutriment = recette.nutrition.nutrients.find(n => n.name === nomCible);
  return nutriment ? nutriment.amount : 0;
};

// ─── Anneau de progression animé ───
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

// ─── Composant principal ───
function MaJournee({ recipes, nutrients, besoins, onRefreshRecipe, onEditProfil }) {
  const [refreshingIndex, setRefreshingIndex] = useState(null);

  // Sécurité
  if (!recipes || recipes.length === 0 || recipes.every(r => !r)) {
    return (
      <div className="w-full max-w-md px-4 mx-auto pb-20 flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-gray-500 text-lg mb-4">Aucun repas trouvé</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-amber-500 text-white font-bold py-3 px-6 rounded-2xl"
        >
          🔄 Recharger mes repas
        </button>
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

  return (
    <div className="w-full max-w-md px-4 mx-auto pb-20">

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between pt-6 mb-8">
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

      {/* ─── Dashboard global ─── */}
      {besoins && (
        <div className="mb-12 p-8 bg-white border border-amber-100 rounded-[3rem] shadow-xl flex justify-around items-center">
          <AnneauProgression
            pourcentage={nutrients ? (nutrients.calories / besoins.calories) * 100 : 0}
            label="Total Calories"
            valeur={nutrients ? Math.round(nutrients.calories) : 0}
            unite="kcal" taille={140} couleur="text-amber-500"
          />
          <AnneauProgression
            pourcentage={nutrients ? (nutrients.protein / besoins.proteines) * 100 : 0}
            label="Total Protéines"
            valeur={nutrients ? Math.round(nutrients.protein) : 0}
            unite="g" taille={110} couleur="text-orange-500"
          />
        </div>
      )}

      {/* ─── Objectifs journaliers ─── */}
      {besoins && besoins.calories > 0 && (
        <div className="mb-8 p-4 bg-amber-50/50 rounded-2xl border border-amber-100 flex justify-around text-center">
          <div>
            <p className="text-[10px] font-bold text-amber-800/50 uppercase">Objectif cal.</p>
            <p className="font-black text-amber-900">{besoins.calories} <span className="text-xs font-medium">kcal</span></p>
          </div>
          <div className="w-px bg-amber-200" />
          <div>
            <p className="text-[10px] font-bold text-amber-800/50 uppercase">Objectif prot.</p>
            <p className="font-black text-amber-900">{besoins.proteines} <span className="text-xs font-medium">g</span></p>
          </div>
        </div>
      )}

      {/* ─── Liste des repas ─── */}
      <div className="space-y-8">
        {listeRepas.map((repas, index) => {
          if (!repas.donnee) return null;

          const calPlat = obtenirValeur(repas.donnee, "Calories");
          const protPlat = obtenirValeur(repas.donnee, "Protein");
          const multiProt = [0.3, 0.35, 0.1, 0.25][index];
          const divCal = index === 0 ? 3 : (index === 2 ? 6 : 4);
          const objCal = besoins?.calories ? besoins.calories / divCal : 500;
          const objProt = besoins?.proteines ? besoins.proteines * multiProt : 30;

          const isRefreshing = refreshingIndex === index;

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
                    alt={repas.donnee.title}
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
                    {repas.donnee.title}
                  </h3>

                  {/* Mini-anneaux par repas */}
                  <div className="flex justify-around items-center bg-amber-50/50 p-4 rounded-3xl mb-6 border border-amber-100">
                    <AnneauProgression
                      pourcentage={(calPlat / objCal) * 100}
                      valeur={Math.round(calPlat)}
                      unite={`/ ${Math.round(objCal)} kcal`}
                      label="Calories" taille={85} couleur="text-amber-500"
                    />
                    <AnneauProgression
                      pourcentage={(protPlat / objProt) * 100}
                      valeur={Math.round(protPlat)}
                      unite={`/ ${Math.round(objProt)} g`}
                      label="Protéines" taille={85} couleur="text-orange-500"
                    />
                  </div>

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

      {/* ─── Animation CSS ─── */}
      <style>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default MaJournee;