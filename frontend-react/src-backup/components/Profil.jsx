import { useState, useEffect } from 'react';

function Profil({ onResultats }) {
  const [profil, setProfil] = useState(() => {
    const sauvegarde = localStorage.getItem('monProfil');
    return sauvegarde ? JSON.parse(sauvegarde) : {
      prenom: "", age: 30, weight: 70, height: 170, gender: "femme", goal: "maintien", diet: ""
    };
  });

  useEffect(() => {
    localStorage.setItem('monProfil', JSON.stringify(profil));
  }, [profil]);

  const handleChange = (champ, valeur) => {
    setProfil(prev => ({ ...prev, [champ]: valeur }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onResultats({
      ...profil,
      age: parseInt(profil.age),
      weight: parseFloat(profil.weight),
      height: parseFloat(profil.height)
    });
  };

  const regimes = [
    { id: "", label: "Classique", emoji: "🍽️" },
    { id: "vegetarian", label: "Végétarien", emoji: "🥬" },
    { id: "vegan", label: "Végan", emoji: "🌱" },
    { id: "gluten free", label: "Sans gluten", emoji: "🌾" },
  ];

  return (
    <div className="w-full min-h-screen bg-white pt-10 pb-24 px-4">
      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-sm space-y-6 bg-amber-50/40 p-8 rounded-3xl border border-amber-100 shadow-sm"
      >
        {/* Titre */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-amber-900/80">Ton Profil</h2>
          <div className="h-1 w-12 bg-amber-200 mx-auto mt-2 rounded-full"></div>
          {profil.prenom && (
            <p className="text-sm text-amber-700/60 mt-2">Salut {profil.prenom} 👋</p>
          )}
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          {[
            { id: 'prenom', label: 'Prénom', type: 'text', placeholder: 'Ton prénom' },
            { id: 'age', label: 'Âge', type: 'number', placeholder: '25' },
            { id: 'weight', label: 'Poids (kg)', type: 'number', placeholder: '70' },
            { id: 'height', label: 'Taille (cm)', type: 'number', placeholder: '170' }
          ].map((field) => (
            <div key={field.id} className="flex flex-col">
              <label className="mb-1 ml-1 text-xs font-bold uppercase tracking-wider text-amber-800/60">
                {field.label}
              </label>
              <input
                type={field.type}
                placeholder={field.placeholder}
                className="bg-white border border-amber-200 p-3 rounded-2xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-50 transition-all text-gray-700 placeholder:text-gray-300"
                value={profil[field.id]}
                onChange={(e) => handleChange(field.id, e.target.value)}
                required
              />
            </div>
          ))}
        </div>

        {/* Genre */}
        <div className="flex flex-col">
          <label className="mb-2 ml-1 text-xs font-bold uppercase tracking-wider text-amber-800/60">Genre</label>
          <div className="flex gap-3">
            {[
              { id: 'femme', label: 'Femme', emoji: '♀️' },
              { id: 'homme', label: 'Homme', emoji: '♂️' }
            ].map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => handleChange('gender', g.id)}
                className={`flex-1 py-3 rounded-2xl font-bold transition-all border flex items-center justify-center gap-2 ${
                  profil.gender === g.id
                    ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                    : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-50'
                }`}
              >
                <span>{g.emoji}</span> {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Objectif */}
        <div className="flex flex-col">
          <label className="mb-2 ml-1 text-xs font-bold uppercase tracking-wider text-amber-800/60">
            Objectif 🎯
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'perte', label: 'Perdre', emoji: '📉' },
              { id: 'maintien', label: 'Maintenir', emoji: '⚖️' },
              { id: 'muscle', label: 'Muscle', emoji: '💪' }
            ].map((obj) => (
              <button
                key={obj.id}
                type="button"
                onClick={() => handleChange('goal', obj.id)}
                className={`py-3 rounded-2xl font-bold text-sm transition-all border flex flex-col items-center gap-1 ${
                  profil.goal === obj.id
                    ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                    : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-50'
                }`}
              >
                <span className="text-lg">{obj.emoji}</span>
                {obj.label}
              </button>
            ))}
          </div>
        </div>

        {/* Régime alimentaire */}
        <div className="flex flex-col">
          <label className="mb-2 ml-1 text-xs font-bold uppercase tracking-wider text-amber-800/60">
            Régime alimentaire 🥗
          </label>
          <div className="grid grid-cols-2 gap-2">
            {regimes.map((reg) => (
              <button
                key={reg.id}
                type="button"
                onClick={() => handleChange('diet', reg.id)}
                className={`py-3 rounded-2xl font-bold text-sm transition-all border flex items-center justify-center gap-2 ${
                  profil.diet === reg.id
                    ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                    : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-50'
                }`}
              >
                <span>{reg.emoji}</span> {reg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bouton Submit */}
        <button
          type="submit"
          className="w-full bg-linear-to-r from-amber-500 to-amber-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-amber-100 hover:shadow-amber-200 transition-all hover:-translate-y-1 active:scale-95 mt-4"
        >
          🍽️ Générer mon menu
        </button>
      </form>
    </div>
  );
}

export default Profil;