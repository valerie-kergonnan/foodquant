function NavBar({ pageActive, onChangePage, isLoggedIn, onLogout }) {
  const onglets = [
    { id: "accueil", label: "Accueil", icone: "🏠" },
    { id: "majournee", label: "Ma Journée", icone: "📅" },
    { id: "dashboard", label: "Stats", icone: "📊" },
    { id: isLoggedIn ? "profil" : "login", label: isLoggedIn ? "Profil" : "Connexion", icone: isLoggedIn ? "👤" : "🔑" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-amber-100 shadow-lg z-50">
      <div className="flex justify-around items-center py-3">
        {onglets.map((onglet) => {
          const estActif = pageActive === onglet.id;

          return (
            <button
              key={onglet.id}
              onClick={() => onChangePage(onglet.id)}
              className={`flex flex-col items-center px-3 py-2 rounded-2xl transition-all duration-300 ease-out
                ${estActif ? "bg-amber-50/50" : "hover:bg-gray-50 active:scale-90"}`}
            >
              <span className={`text-xl transition-transform duration-300 
                ${estActif ? "text-amber-700 scale-110" : "text-gray-400 hover:scale-125"}`}>
                {onglet.icone}
              </span>
              <span className={`text-[10px] mt-1 transition-colors duration-300 
                ${estActif ? "text-amber-700 font-bold" : "text-gray-400 font-medium"}`}>
                {onglet.label}
              </span>
            </button>
          );
        })}

        {/* Bouton déconnexion */}
        {isLoggedIn && (
          <button
            onClick={onLogout}
            className="flex flex-col items-center px-3 py-2 rounded-2xl transition-all hover:bg-red-50 active:scale-90"
          >
            <span className="text-xl text-gray-400 hover:text-red-500 transition-colors">🚪</span>
            <span className="text-[10px] mt-1 text-gray-400 font-medium">Quitter</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default NavBar;