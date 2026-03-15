import { useState, useEffect } from 'react';
import Accueil from './components/Accueil';
import Profil from './components/Profil';
import MaJournee from './components/MaJournee';
import NavBar from './components/NavBar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Footer from './components/Footer';

const API_URL = 'https://foodquant-production.up.railway.app';

// V2 Sécurité : Helper pour les requêtes authentifiées
const authHeaders = () => {
  const token = localStorage.getItem('jwt_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

function App() {
  const getSaved = (key, defaultValue) => {
    const saved = localStorage.getItem(key);
    if (!saved) return defaultValue;
    try {
      return JSON.parse(saved);
    } catch {
      localStorage.removeItem(key);
      return defaultValue;
    }
  };

  const [user, setUser] = useState(() => getSaved('user', null));
  const [recipes, setRecipes] = useState(() => getSaved('recipes', []));
  const [nutrimentsJour, setNutrimentsJour] = useState(() => getSaved('nutrimentsJour', null));
  const [besoins, setBesoins] = useState(() => getSaved('besoins', { calories: 0, proteines: 0 }));
  const [page, setPage] = useState(() => getSaved('currentPage', 'accueil'));
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [menuSauvegarde, setMenuSauvegarde] = useState(false);
  const [sauvLoading, setSauvLoading] = useState(false);
  const [sauvErreur, setSauvErreur] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    localStorage.setItem('besoins', JSON.stringify(besoins));
    localStorage.setItem('currentPage', JSON.stringify(page));
  }, [besoins, page]);

  useEffect(() => {
    if (recipes.length > 0) {
      localStorage.setItem('recipes', JSON.stringify(recipes));
    }
  }, [recipes]);

  useEffect(() => {
    if (nutrimentsJour) {
      localStorage.setItem('nutrimentsJour', JSON.stringify(nutrimentsJour));
    }
  }, [nutrimentsJour]);

  const handleLogin = (userData, mode) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));

    const prenom = userData.prenom || 'toi';
    if (mode === 'inscription') {
      setToast({ emoji: '🎉', message: `Bienvenue ${prenom} ! Commence par remplir ton profil.` });
    } else {
      setToast({ emoji: '👋', message: `Content de te revoir ${prenom} !` });
    }
    setTimeout(() => setToast(null), 4000);
    setPage('profil');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('jwt_token');
    setRecipes([]);
    setNutrimentsJour(null);
    localStorage.removeItem('recipes');
    localStorage.removeItem('nutrimentsJour');
    setPage('accueil');
  };

  const calculerTotaux = (listeRecettes) => {
    let totalCal = 0;
    let totalProt = 0;
    listeRecettes.forEach(recette => {
      const nuts = recette.nutrition?.nutrients || [];
      totalCal += nuts.find(n => n.name === "Calories")?.amount || 0;
      totalProt += nuts.find(n => n.name === "Protein")?.amount || 0;
    });
    return { totalCal: Math.round(totalCal), totalProt: Math.round(totalProt) };
  };

  const messagesChargement = [
    "🍳 Préparation du petit-déjeuner...",
    "🥗 Sélection de recettes fraîches...",
    "🔥 Calcul des calories...",
    "🧑‍🍳 Notre chef choisit tes plats...",
    "✨ Finalisation de ton menu..."
  ];

  // ─── Sauvegarder le menu du jour (avec JWT) ───
  const sauvegarderMenu = async () => {
    if (!user || recipes.length !== 4) return;

    const userId = user.id || user.idutilisateurs;
    if (!userId) {
      setSauvErreur("❌ Erreur : utilisateur non identifié. Reconnectez-vous.");
      setTimeout(() => setSauvErreur(''), 4000);
      return;
    }

    setSauvLoading(true);
    setSauvErreur('');

    const { totalCal, totalProt } = calculerTotaux(recipes);

    const recettesLegeres = recipes.map(r => {
      const nuts = r.nutrition?.nutrients || [];
      return {
        id: r.id,
        title: r.title,
        title_fr: r.title_fr || r.title,
        image: r.image,
        sourceUrl: r.sourceUrl,
        calories: Math.round(nuts.find(n => n.name === "Calories")?.amount || 0),
        protein: Math.round(nuts.find(n => n.name === "Protein")?.amount || 0),
        fat: Math.round(nuts.find(n => n.name === "Fat")?.amount || 0),
        carbs: Math.round(nuts.find(n => n.name === "Carbohydrates")?.amount || 0),
      };
    });

    try {
      const response = await fetch(`${API_URL}/historique.php?action=sauvegarder`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          userId: userId,
          recettes: recettesLegeres,
          totalCalories: totalCal,
          totalProteines: totalProt,
          date: new Date().toISOString().split('T')[0]
        })
      });

      if (!response.ok) throw new Error(`Erreur serveur (${response.status})`);

      const data = await response.json();

      if (data.success) {
        setMenuSauvegarde(true);
        setTimeout(() => setMenuSauvegarde(false), 3000);
      } else {
        setSauvErreur(`❌ ${data.message || "Erreur lors de la sauvegarde"}`);
        setTimeout(() => setSauvErreur(''), 4000);
      }
    } catch {
      setSauvErreur("❌ Impossible de sauvegarder. Vérifie ta connexion.");
      setTimeout(() => setSauvErreur(''), 4000);
    } finally {
      setSauvLoading(false);
    }
  };

  // ─── Remplacer une seule recette ───
  const remplacerUneRecette = async (indexARemplacer) => {
    setLoading(true);
    setLoadingMessage("🔄 Recherche d'une alternative...");

    const url = `${API_URL}/recettes.php?targetCalories=${besoins.calories}&refreshIndex=${indexARemplacer}`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Erreur réseau");
      const data = await response.json();

      if (data) {
        const nouvellesRecettes = [...recipes];
        nouvellesRecettes[indexARemplacer] = Array.isArray(data) ? data[indexARemplacer] : data;
        setRecipes(nouvellesRecettes);
        const { totalCal, totalProt } = calculerTotaux(nouvellesRecettes);
        setNutrimentsJour({ calories: totalCal, protein: totalProt });
        setMenuSauvegarde(false);
      }
    } catch {
      console.error("Erreur lors du remplacement");
    } finally {
      setLoading(false);
    }
  };

  // ─── Chercher toutes les recettes ───
  const chercherRecettes = async (donnees) => {
    setLoading(true);
    setMenuSauvegarde(false);
    let messageIndex = 0;
    setLoadingMessage(messagesChargement[0]);

    const interval = setInterval(() => {
      messageIndex = (messageIndex + 1) % messagesChargement.length;
      setLoadingMessage(messagesChargement[messageIndex]);
    }, 1500);

    const calculBase = (10 * donnees.weight) + (6.25 * donnees.height) - (5 * donnees.age);
    let caloriesFinales = donnees.gender === "homme" ? calculBase + 5 : calculBase - 161;

    if (donnees.goal === "perte") caloriesFinales *= 0.85;
    else if (donnees.goal === "muscle") caloriesFinales *= 1.10;

    const multiplier = donnees.goal === "perte" ? 1.2 : donnees.goal === "muscle" ? 1.8 : 0.8;
    const proteinResult = donnees.weight * multiplier;

    const nouveauxBesoins = {
      calories: Math.round(caloriesFinales),
      proteines: Math.round(proteinResult)
    };
    setBesoins(nouveauxBesoins);

    // Mise à jour profil (avec JWT)
    if (user) {
      try {
        await fetch(`${API_URL}/auth.php?action=updateProfil`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            userId: user.id || user.idutilisateurs,
            ...donnees,
            calories: nouveauxBesoins.calories
          })
        });
      } catch {
        console.error("Erreur update profil");
      }
    }

    const url = `${API_URL}/recettes.php?targetCalories=${Math.round(caloriesFinales)}&diet=${donnees.diet || ''}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Erreur réseau");
      const data = await response.json();

      setRecipes(data);
      const { totalCal, totalProt } = calculerTotaux(data);
      setNutrimentsJour({ calories: totalCal, protein: totalProt });
      setPage("majournee");
    } catch {
      alert("Impossible de récupérer les recettes. Vérifie ta connexion.");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  // ─── Écran de chargement ───
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-linear-to-b from-amber-50 to-white">
        <div className="relative mb-8">
          <div className="w-20 h-20 rounded-full border-4 border-amber-100 border-t-amber-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">🍽️</div>
        </div>
        <p className="text-lg font-bold text-amber-800 animate-pulse text-center px-6">
          {loadingMessage}
        </p>
        <p className="text-sm text-amber-600/60 mt-2">Cela peut prendre quelques secondes...</p>
      </div>
    );
  }

  // ─── Déterminer si le footer doit s'afficher ───
  // Le footer s'affiche sur toutes les pages sauf pendant le chargement
  const afficherFooter = page === 'accueil' || page === 'login' || page === 'profil' || page === 'majournee' || page === 'dashboard';

  return (
    <>
      {/* ─── V3 Responsive : Structure Flexbox sticky footer ─── */}
      <div className="flex flex-col min-h-screen font-sans text-gray-800">

        {/* ─── NavBar fixe en haut ─── */}
        <NavBar pageActive={page} onChangePage={setPage} isLoggedIn={!!user} onLogout={handleLogout} />

        {/* ─── Toast notification (z-60 pour rester au-dessus de la NavBar z-50) ─── */}
        {toast && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-60 animate-toastIn">
            <div className="bg-white border border-amber-200 shadow-xl rounded-2xl px-6 py-4 flex items-center gap-3 max-w-[90vw] sm:max-w-sm">
              <span className="text-2xl">{toast.emoji}</span>
              <p className="text-sm font-bold text-gray-700">{toast.message}</p>
            </div>
          </div>
        )}

        <style>{`
          @keyframes toastIn {
            from { opacity: 0; transform: translate(-50%, -20px); }
            to { opacity: 1; transform: translate(-50%, 0); }
          }
          .animate-toastIn { animation: toastIn 0.4s ease-out; }
        `}</style>

        {/* ─── V3 Responsive : Contenu principal avec flex-grow ───
             pt-20 compense la NavBar fixe en haut (~80px)
             pb-6 padding bas normal (plus de NavBar en bas)          */}
        <main className="grow flex flex-col items-center p-4 pt-20 sm:p-6 sm:pt-20">

          {page === "accueil" && <Accueil onCommencer={() => setPage(user ? "profil" : "login")} />}
          {page === "login" && <Login onLogin={handleLogin} />}
          {page === "profil" && <Profil onResultats={chercherRecettes} />}

          {page === "majournee" && (
            recipes.length === 4 ? (
              <div className="w-full">
                <MaJournee
                  recipes={recipes}
                  nutrients={nutrimentsJour}
                  besoins={besoins}
                  onRefreshRecipe={remplacerUneRecette}
                  onEditProfil={() => setPage("profil")}
                />
                {user && (
                  <div className="w-full max-w-md mx-auto px-4 mb-8">
                    <button
                      onClick={sauvegarderMenu}
                      disabled={sauvLoading}
                      className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${
                        menuSauvegarde
                          ? 'bg-green-500 text-white'
                          : sauvLoading
                            ? 'bg-amber-300 text-white cursor-not-allowed opacity-70'
                            : 'bg-linear-to-r from-amber-500 to-amber-600 text-white shadow-lg hover:-translate-y-1 active:translate-y-0'
                      }`}
                    >
                      {menuSauvegarde ? '✅ Menu sauvegardé !' : sauvLoading ? '⏳ Sauvegarde en cours...' : '💾 Sauvegarder mon menu du jour'}
                    </button>
                    {sauvErreur && (
                      <p className="text-red-500 text-sm font-medium text-center mt-2 animate-pulse">{sauvErreur}</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <p className="text-gray-500 text-lg">Aucun repas généré</p>
                <button onClick={() => setPage("profil")} className="bg-amber-500 text-white font-bold py-3 px-6 rounded-2xl hover:-translate-y-1 transition-all">
                  ✏️ Remplir mon profil
                </button>
              </div>
            )
          )}

          {page === "dashboard" && (
            user ? (
              <Dashboard user={user} besoins={besoins} />
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <p className="text-gray-500 text-lg">Connecte-toi pour voir tes stats</p>
                <button onClick={() => setPage("login")} className="bg-amber-500 text-white font-bold py-3 px-6 rounded-2xl">
                  🔑 Se connecter
                </button>
              </div>
            )
          )}

        </main>

        {/* ─── V3 Responsive : Footer visible sur toutes les pages ─── */}
        {afficherFooter && <Footer />}

      </div>
    </>
  );
}

export default App;