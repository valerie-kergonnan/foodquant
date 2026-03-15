function NavBar({ pageActive, onChangePage, isLoggedIn, onLogout }) {
  const onglets = [
    { id: "accueil", label: "Accueil", icone: "🏠" },
    { id: "majournee", label: "Ma Journée", icone: "📅" },
    { id: "masemaine", label: "Semaine", icone: "🗓️" },
    { id: "dashboard", label: "Stats", icone: "📊" },
    { id: isLoggedIn ? "profil" : "login", label: isLoggedIn ? "Profil" : "Connexion", icone: isLoggedIn ? "👤" : "🔑" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b-2 border-amber-100 shadow-sm z-50">
      <div className="max-w-4xl mx-auto flex justify-around sm:justify-center sm:gap-2 md:gap-4 items-center py-2 px-2 sm:px-4">
        {onglets.map((onglet) => {
          const estActif = pageActive === onglet.id;

          return (
            <button
              key={onglet.id}
              onClick={() => onChangePage(onglet.id)}
              className={`flex flex-col sm:flex-row items-center gap-0 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-xl transition-all duration-300 ease-out min-h-11
                ${estActif
                  ? "bg-amber-50 text-amber-700"
                  : "text-gray-400 hover:bg-gray-50 hover:text-gray-600 active:scale-95"
                }`}
            >
              <span className={`text-lg sm:text-base transition-transform duration-300 
                ${estActif ? "scale-110" : ""}`}>
                {onglet.icone}
              </span>
              <span className={`text-[10px] sm:text-xs md:text-sm mt-0.5 sm:mt-0 transition-colors duration-300 
                ${estActif ? "font-bold" : "font-medium"}`}>
                {onglet.label}
              </span>
            </button>
          );
        })}

        {/* Bouton déconnexion */}
        {isLoggedIn && (
          <button
            onClick={onLogout}
            className="flex flex-col sm:flex-row items-center gap-0 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-xl transition-all min-h-11 text-gray-400 hover:bg-red-50 hover:text-red-500 active:scale-95"
          >
            <span className="text-lg sm:text-base">🚪</span>
            <span className="text-[10px] sm:text-xs md:text-sm mt-0.5 sm:mt-0 font-medium">Quitter</span>
          </button>
        )}
      </div>
    </nav>
  );
}

export default NavBar;