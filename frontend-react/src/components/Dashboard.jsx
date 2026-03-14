import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line } from 'recharts';

// ─── V2 : Définition des badges ───
const BADGES_CONFIG = [
  {
    id: 'premier_menu',
    emoji: '🏆',
    titre: 'Premier pas',
    description: 'Premier menu sauvegardé',
    condition: (stats) => stats.total_jours >= 1,
  },
  {
    id: 'trois_jours',
    emoji: '🌱',
    titre: 'Bonne habitude',
    description: '3 jours de suivi',
    condition: (stats) => stats.total_jours >= 3,
  },
  {
    id: 'streak_7',
    emoji: '🔥',
    titre: 'En feu !',
    description: '7 jours consécutifs',
    condition: (stats) => stats.streak >= 7,
  },
  {
    id: 'streak_14',
    emoji: '💎',
    titre: 'Diamant',
    description: '14 jours consécutifs',
    condition: (stats) => stats.streak >= 14,
  },
  {
    id: 'total_30',
    emoji: '🌟',
    titre: 'Un mois !',
    description: '30 jours de suivi',
    condition: (stats) => stats.total_jours >= 30,
  },
  {
    id: 'calories_ok',
    emoji: '💪',
    titre: 'Bien calibré',
    description: 'Moyenne calories dans l\'objectif',
    condition: (stats, besoins) => {
      if (!besoins?.calories || !stats.moy_calories) return false;
      const ecart = Math.abs(stats.moy_calories - besoins.calories) / besoins.calories;
      return ecart < 0.15 && stats.total_jours >= 3;
    },
  },
  {
    id: 'regulier',
    emoji: '📅',
    titre: 'Régulier',
    description: '10 jours de suivi total',
    condition: (stats) => stats.total_jours >= 10,
  },
  {
    id: 'streak_30',
    emoji: '👑',
    titre: 'Roi du suivi',
    description: '30 jours consécutifs',
    condition: (stats) => stats.streak >= 30,
  },
];

// ─── Composant Badge ───
const Badge = ({ badge, debloque }) => (
  <div className={`flex flex-col items-center p-3 rounded-2xl border transition-all ${
    debloque
      ? 'bg-white border-amber-200 shadow-sm'
      : 'bg-gray-50 border-gray-100 opacity-40 grayscale'
  }`}>
    <span className="text-3xl mb-1">{badge.emoji}</span>
    <p className="text-[10px] font-black text-gray-700 text-center leading-tight">{badge.titre}</p>
    <p className="text-[9px] text-gray-400 text-center mt-0.5">{badge.description}</p>
  </div>
);

function Dashboard({ user, besoins }) {
  const [historique, setHistorique] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periode, setPeriode] = useState(7);
  // V2 : Afficher/masquer les badges
  const [showBadges, setShowBadges] = useState(true);

  const API_URL = 'https://foodquant-production.up.railway.app';

  useEffect(() => {
    if (user?.id) {
      chargerDonnees();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, periode]);

  const chargerDonnees = async () => {
    setLoading(true);
    try {
      const [histRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/historique.php?action=historique&userId=${user.id}&jours=${periode}`),
        fetch(`${API_URL}/historique.php?action=stats&userId=${user.id}`)
      ]);
      const histData = await histRes.json();
      const statsData = await statsRes.json();

      if (histData.success) {
        const formatted = histData.historique.map(j => ({
          ...j,
          date: new Date(j.date_repas).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
          calories: j.total_calories,
          proteines: j.total_proteines
        })).reverse();
        setHistorique(formatted);
      }

      if (statsData.success) {
        setStats(statsData.stats);
      }
    } catch {
      console.error("Erreur chargement dashboard");
    } finally {
      setLoading(false);
    }
  };

  // V2 : Calculer les badges débloqués
  const badgesDebloques = stats
    ? BADGES_CONFIG.filter(b => b.condition(stats, besoins))
    : [];
  const nbDebloques = badgesDebloques.length;
  const nbTotal = BADGES_CONFIG.length;

  if (loading) {
    return (
      <div className="w-full max-w-md px-4 mx-auto pb-20 flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 rounded-full border-4 border-amber-100 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md px-4 mx-auto pb-20">
      <h1 className="text-3xl font-black text-gray-800 pt-6 mb-2">Tableau de bord</h1>
      <p className="text-gray-500 mb-8">Salut {user.prenom} 👋</p>

      {/* ─── Stats rapides ─── */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-center">
            <p className="text-2xl font-black text-amber-600">{stats.streak}</p>
            <p className="text-[10px] font-bold text-amber-800/50 uppercase">Jours consécutifs</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 text-center">
            <p className="text-2xl font-black text-orange-600">{stats.total_jours}</p>
            <p className="text-[10px] font-bold text-orange-800/50 uppercase">Jours suivis</p>
          </div>
          <div className="bg-green-50 p-4 rounded-2xl border border-green-100 text-center">
            <p className="text-2xl font-black text-green-600">{stats.moy_calories}</p>
            <p className="text-[10px] font-bold text-green-800/50 uppercase">Moy. kcal</p>
          </div>
        </div>
      )}

      {/* ─── V2 : Badges / Gamification ─── */}
      {stats && (
        <div className="mb-8 bg-white rounded-3xl border border-amber-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowBadges(prev => !prev)}
            className="w-full p-4 flex items-center justify-between hover:bg-amber-50/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🏅</span>
              <span className="font-bold text-gray-700">Mes badges</span>
              <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">
                {nbDebloques}/{nbTotal}
              </span>
            </div>
            <span className="text-gray-400 text-sm">
              {showBadges ? '▲' : '▼'}
            </span>
          </button>

          {showBadges && (
            <div className="px-4 pb-4">
              {/* Barre de progression globale */}
              <div className="mb-4">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-1000"
                    style={{ width: `${(nbDebloques / nbTotal) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1 text-right">
                  {nbDebloques === nbTotal ? '🎉 Tous les badges débloqués !' : `${nbTotal - nbDebloques} badge${nbTotal - nbDebloques > 1 ? 's' : ''} restant${nbTotal - nbDebloques > 1 ? 's' : ''}`}
                </p>
              </div>

              {/* Grille de badges */}
              <div className="grid grid-cols-4 gap-2">
                {BADGES_CONFIG.map(badge => (
                  <Badge
                    key={badge.id}
                    badge={badge}
                    debloque={badgesDebloques.some(b => b.id === badge.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Sélecteur de période ─── */}
      <div className="flex gap-2 mb-6">
        {[7, 14, 30].map(j => (
          <button
            key={j}
            onClick={() => setPeriode(j)}
            className={`flex-1 py-2 rounded-2xl text-sm font-bold transition-all border ${
              periode === j
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-50'
            }`}
          >
            {j}j
          </button>
        ))}
      </div>

      {/* ─── Graphique Calories ─── */}
      {historique.length > 0 ? (
        <>
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-lg mb-8">
            <h2 className="font-bold text-gray-700 mb-4">📊 Calories par jour</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={historique}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: '1px solid #f5f5f5' }}
                  formatter={(value) => [`${value} kcal`, 'Calories']}
                />
                <Bar dataKey="calories" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                {besoins?.calories && (
                  <Line type="monotone" dataKey={() => besoins.calories} stroke="#ef4444" strokeDasharray="5 5" dot={false} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ─── Graphique Protéines ─── */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-lg mb-8">
            <h2 className="font-bold text-gray-700 mb-4">💪 Protéines par jour</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={historique}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: '1px solid #f5f5f5' }}
                  formatter={(value) => [`${value} g`, 'Protéines']}
                />
                <Bar dataKey="proteines" fill="#f97316" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ─── Historique détaillé ─── */}
          <div className="space-y-3">
            <h2 className="font-bold text-gray-700 mb-2">📅 Historique récent</h2>
            {historique.slice().reverse().map((jour, i) => (
              <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-800">{jour.date}</p>
                  <p className="text-xs text-gray-500">{jour.recettes?.length || 0} repas</p>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="font-bold text-amber-600">{jour.calories} kcal</span>
                  <span className="font-bold text-orange-500">{jour.proteines}g prot</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-amber-50/50 p-8 rounded-3xl border border-amber-100 text-center">
          <p className="text-4xl mb-4">📊</p>
          <p className="font-bold text-gray-700 mb-2">Pas encore de données</p>
          <p className="text-sm text-gray-500">Génère et sauvegarde ton premier menu pour voir tes stats apparaître ici !</p>
        </div>
      )}
    </div>
  );
}

export default Dashboard;