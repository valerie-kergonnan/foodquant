import { useState } from 'react';

function Login({ onLogin }) {
  const [mode, setMode] = useState('connexion');
  const [form, setForm] = useState({ prenom: '', email: '', mot_de_passe: '' });
  const [erreur, setErreur] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = 'https://foodquant-production.up.railway.app';

  const handleChange = (champ, valeur) => {
    setForm(prev => ({ ...prev, [champ]: valeur }));
    setErreur('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErreur('');

    try {
      const response = await fetch(`${API_URL}/auth.php?action=${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await response.json();

      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        // V2 : on transmet aussi le mode pour le message de bienvenue
        onLogin(data.user, mode);
      } else {
        setErreur(data.message);
      }
    } catch  {
      setErreur("Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-white pt-10 pb-24 px-4">
      <div className="mx-auto max-w-sm space-y-6 bg-amber-50/40 p-8 rounded-3xl border border-amber-100 shadow-sm">
        
        {/* Titre */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-amber-900/80">
            {mode === 'connexion' ? 'Connexion' : 'Inscription'}
          </h2>
          <div className="h-1 w-12 bg-amber-200 mx-auto mt-2 rounded-full"></div>
        </div>

        {/* Erreur */}
        {erreur && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm text-center">
            {erreur}
          </div>
        )}

        {/* Formulaire */}
        <div className="space-y-4">
          {mode === 'inscription' && (
            <div className="flex flex-col">
              <label className="mb-1 ml-1 text-xs font-bold uppercase tracking-wider text-amber-800/60">Prénom</label>
              <input
                type="text"
                placeholder="Ton prénom"
                className="bg-white border border-amber-200 p-3 rounded-2xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-50 transition-all text-gray-700 placeholder:text-gray-300"
                value={form.prenom}
                onChange={(e) => handleChange('prenom', e.target.value)}
                required
              />
            </div>
          )}

          <div className="flex flex-col">
            <label className="mb-1 ml-1 text-xs font-bold uppercase tracking-wider text-amber-800/60">Email</label>
            <input
              type="email"
              placeholder="ton@email.com"
              className="bg-white border border-amber-200 p-3 rounded-2xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-50 transition-all text-gray-700 placeholder:text-gray-300"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-1 ml-1 text-xs font-bold uppercase tracking-wider text-amber-800/60">Mot de passe</label>
            <input
              type="password"
              placeholder="Min. 6 caractères"
              className="bg-white border border-amber-200 p-3 rounded-2xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-50 transition-all text-gray-700 placeholder:text-gray-300"
              value={form.mot_de_passe}
              onChange={(e) => handleChange('mot_de_passe', e.target.value)}
              required
            />
          </div>
        </div>

        {/* Bouton Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-linear-to-r from-amber-500 to-amber-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-amber-100 hover:shadow-amber-200 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50"
        >
          {loading ? '⏳ Chargement...' : (mode === 'connexion' ? '🔑 Se connecter' : '✨ Créer mon compte')}
        </button>

        {/* Switch mode */}
        <p className="text-center text-sm text-gray-500">
          {mode === 'connexion' ? "Pas encore de compte ?" : "Déjà un compte ?"}
          <button
            onClick={() => { setMode(mode === 'connexion' ? 'inscription' : 'connexion'); setErreur(''); }}
            className="ml-1 text-amber-600 font-bold hover:underline"
          >
            {mode === 'connexion' ? "S'inscrire" : "Se connecter"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;