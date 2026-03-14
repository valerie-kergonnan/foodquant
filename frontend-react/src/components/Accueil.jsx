import React from 'react';
import shaker from '../assets/shaker.png';
import Footer from './Footer';

function Accueil({ onCommencer }) {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* 1. Header / Hero Section */}
      <header className="relative px-6 pt-16 pb-20 text-center bg-linear-to-b from-amber-50 via-white to-white">
        <div className="mx-auto max-w-4xl">
          
          <div className="mb-8 inline-block transform -rotate-6 rounded-3xl border border-amber-100 bg-white p-4 shadow-sm animate-in fade-in zoom-in duration-700">
            <img src={shaker} alt="Shaker" className="h-20 w-20" />
          </div>

          <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-gray-900 md:text-6xl animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
            La nutrition <span className="text-orange-700/80">intelligente</span> <br /> pour ton corps.
          </h1>
          
          <p className="mx-auto mb-10 max-w-2xl text-xl leading-relaxed text-gray-500 animate-in fade-in duration-1000 delay-500">
            Plus qu'un simple compteur, un guide quotidien pour équilibrer tes repas selon tes besoins réels.
          </p>

          <button 
            onClick={onCommencer} 
            className="mb-16 rounded-2xl bg-orange-500 px-10 py-5 text-lg font-bold text-white shadow-2xl transition-all hover:bg-orange-600 active:scale-95 animate-in fade-in zoom-in duration-700 delay-700"
          >
            Commencer l'expérience
          </button>
        </div>
      </header>

      {/* 2. Section des Avantages */}
      <section className="px-6 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-1000">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
          
          <div className="group rounded-3xl border border-gray-100 bg-amber-50/50 p-10 transition-all hover:-translate-y-2 hover:bg-white hover:shadow-2xl">
            <div className="mb-6 inline-block text-4xl transition-transform group-hover:scale-110">🎯</div>
            <h3 className="mb-3 text-xl font-bold text-gray-900">Précision</h3>
            <p className="leading-relaxed text-gray-500">
              Calcul exact de tes besoins en protéines et calories selon ton profil unique.
            </p>
          </div>

          <div className="group rounded-3xl border border-gray-100 bg-amber-50/50 p-10 transition-all hover:-translate-y-2 hover:bg-white hover:shadow-2xl">
            <div className="mb-6 inline-block text-4xl transition-transform group-hover:scale-110">🥗</div>
            <h3 className="mb-3 text-xl font-bold text-gray-900">Variété</h3>
            <p className="leading-relaxed text-gray-500">
              Accède à des recettes savoureuses qui respectent tes macros sans sacrifier le goût.
            </p>
          </div>

          <div className="group rounded-3xl border border-gray-100 bg-amber-50/50 p-10 transition-all hover:-translate-y-2 hover:bg-white hover:shadow-2xl">
            <div className="mb-6 inline-block text-4xl transition-transform group-hover:scale-110">⚡</div>
            <h3 className="mb-3 text-xl font-bold text-gray-900">Simplicité</h3>
            <p className="leading-relaxed text-gray-500">
              Génère ton menu complet en un clic et simplifie ton organisation quotidienne.
            </p>
          </div>

        </div>
      </section>

      {/* 3. Section : Comment ça marche */}
      <section className="w-full bg-amber-50/30 py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">
            Ton parcours vers l'équilibre 🟠
          </h2>

          <div className="grid gap-12 md:grid-cols-3">
            <div className="flex flex-col items-center text-center md:items-start md:text-left md:flex-row md:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xl font-bold text-white shadow-lg mb-4 md:mb-0">
                1
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900">Ton Profil</h4>
                <p className="text-sm text-gray-600">Entre tes données et tes objectifs santé.</p>
              </div>
            </div>

            <div className="flex flex-col items-center text-center md:items-start md:text-left md:flex-row md:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xl font-bold text-white shadow-lg mb-4 md:mb-0">
                2
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900">L'Analyse</h4>
                <p className="text-sm text-gray-600">Notre algorithme calcule tes besoins précis.</p>
              </div>
            </div>

            <div className="flex flex-col items-center text-center md:items-start md:text-left md:flex-row md:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xl font-bold text-white shadow-lg mb-4 md:mb-0">
                3
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900">Tes Recettes</h4>
                <p className="text-sm text-gray-600">Savoure des plats adaptés à ton métabolisme.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Footer avec liens légaux */}
      <Footer />
    </div>
  );
}

export default Accueil;