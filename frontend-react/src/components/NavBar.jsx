function NavBar({ pageActive, onChangePage }) {
  // 1. Liste des onglets (Données)
  const onglets = [
    { id: "accueil", label: "Accueil", icone: "🏠" },
    { id: "majournee", label: "Ma Journée", icone: "📅" },
    { id: "profil", label: "Profil", icone: "👤" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-amber-100 shadow-lg">
      <div className="flex justify-around items-center py-3">
        
        {/* 2. Boucle pour générer les boutons */}
        {onglets.map((onglet) => {
          const estActif = pageActive === onglet.id;

          return (
            <button
              key={onglet.id}
              onClick={() => onChangePage(onglet.id)}
              // Effet de fond au survol et réduction au clic (active:scale-90)
              className={`flex flex-col items-center px-4 py-2 rounded-2xl transition-all duration-300 ease-out
                ${estActif ? "bg-amber-50/50" : "hover:bg-gray-50 active:scale-90"}`}
            >
              {/* L'icône grossit si actif OU si survolé */}
              <span className={`text-2xl transition-transform duration-300 
                ${estActif ? "text-amber-700 scale-110" : "text-gray-400 hover:scale-125"}`}>
                {onglet.icone}
              </span>

              {/* Le texte change de couleur et devient gras si actif */}
              <span className={`text-xs mt-1 transition-colors duration-300 
                ${estActif ? "text-amber-700 font-bold" : "text-gray-400 font-medium"}`}>
                {onglet.label}
              </span>
            </button>
          );
        })}

      </div>
    </div>
  );
}

export default NavBar;