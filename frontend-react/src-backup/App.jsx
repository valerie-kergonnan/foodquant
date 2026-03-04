import { useState, useEffect } from 'react';
import Accueil from './components/Accueil';
import Profil from './components/Profil';
import MaJournee from './components/MaJournee';
import NavBar from './components/NavBar';

function App() {
  // ─── Helpers ───
  const getSaved = (key, defaultValue) => {
    const saved = localStorage.getItem(key);
    if (!saved) return defaultValue;
    try {
      return JSON.parse(saved);
    } catch (error) {
      console.error(`Erreur de lecture pour ${key}:`, error);
      localStorage.removeItem(key);
      return defaultValue;
    }
  };

  // ─── State ───
  const [recipes, setRecipes] = useState(() => getSaved('recipes', []));
  const [nutrimentsJour, setNutrimentsJour] = useState(() => getSaved('nutrimentsJour', null));
  const [besoins, setBesoins] = useState(() => getSaved('besoins', { calories: 0, proteines: 0 }));
  const [page, setPage] = useState(() => getSaved('currentPage', 'accueil'));
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // ─── Sauvegarde auto ───
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

  // ─── Calcul des totaux ───
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

  // ─── Messages de chargement aléatoires ───
  const messagesChargement = [
    "🍳 Préparation du petit-déjeuner...",
    "🥗 Sélection de recettes fraîches...",
    "🔥 Calcul des calories...",
    "🧑‍🍳 Notre chef choisit tes plats...",
    "✨ Finalisation de ton menu..."
  ];

  // ─── Remplacer une seule recette ───
  const remplacerUneRecette = async (indexARemplacer) => {
    setLoading(true);
    setLoadingMessage("🔄 Recherche d'une alternative...");

    const url = `https://foodquant-production.up.railway.app/recettes.php?targetCalories=${besoins.calories}&refreshIndex=${indexARemplacer}`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Erreur réseau");
      const data = await response.json();

      if (data) {
        const nouvellesRecettes = [...recipes];
        // L'API renvoie un tableau de 4, on prend celle à l'index voulu
        nouvellesRecettes[indexARemplacer] = Array.isArray(data) ? data[indexARemplacer] : data;
        setRecipes(nouvellesRecettes);
        const { totalCal, totalProt } = calculerTotaux(nouvellesRecettes);
        setNutrimentsJour({ calories: totalCal, protein: totalProt });
      }
    } catch (error) {
      console.error("Erreur lors du remplacement :", error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Chercher toutes les recettes ───
  const chercherRecettes = async (donnees) => {
    setLoading(true);
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

    const url = `https://foodquant-production.up.railway.app/recettes.php?targetCalories=${Math.round(caloriesFinales)}&diet=${donnees.diet || ''}`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Erreur réseau");
      const data = await response.json();

      setRecipes(data);
      const { totalCal, totalProt } = calculerTotaux(data);
      setNutrimentsJour({ calories: totalCal, protein: totalProt });
      setPage("majournee");
    } catch (error) {
      console.error("Erreur :", error);
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

  // ─── Rendu principal ───
  return (
    <div className="flex flex-col items-center min-h-screen p-6 pb-24 font-sans text-gray-800">
      {page === "accueil" && <Accueil onCommencer={() => setPage("profil")} />}

      {page === "profil" && (
        <Profil onResultats={chercherRecettes} />
      )}

      {page === "majournee" && (
        recipes.length === 4 ? (
          <MaJournee
            recipes={recipes}
            nutrients={nutrimentsJour}
            besoins={besoins}
            onRefreshRecipe={remplacerUneRecette}
            onEditProfil={() => setPage("profil")}
          />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <p className="text-gray-500 text-lg">Aucun repas généré</p>
            <button
              onClick={() => setPage("profil")}
              className="bg-amber-500 text-white font-bold py-3 px-6 rounded-2xl hover:-translate-y-1 transition-all"
            >
              ✏️ Remplir mon profil
            </button>
          </div>
        )
      )}

      <NavBar pageActive={page} onChangePage={setPage} />
    </div>
  );
}

export default App;