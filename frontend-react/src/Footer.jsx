import { useState } from 'react';

// ─── Modale générique pour les pages légales ───
const ModaleLegale = ({ titre, contenu, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-white w-full max-w-lg max-h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-slideUp">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
        <h2 className="text-lg font-black text-gray-800">{titre}</h2>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 text-sm text-gray-600 leading-relaxed space-y-4">
        {contenu}
      </div>
    </div>
    <style>{`
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(100px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-slideUp { animation: slideUp 0.3s ease-out; }
    `}</style>
  </div>
);

// ─── Contenu RGPD ───
const ContenuRGPD = () => (
  <>
    <p className="font-bold text-gray-800">Politique de confidentialité — FoodQuant</p>
    <p>Dernière mise à jour : 14 mars 2026</p>

    <p className="font-bold text-gray-700 mt-4">1. Responsable du traitement</p>
    <p>Valérie Kergonnan — Projet étudiant FoodQuant<br />Contact : via le formulaire de l'application</p>

    <p className="font-bold text-gray-700 mt-4">2. Données collectées</p>
    <p>Nous collectons les données suivantes :</p>
    <p>• <strong>Données de compte :</strong> prénom, adresse email, mot de passe (hashé)</p>
    <p>• <strong>Données de profil :</strong> âge, poids, taille, sexe, objectif nutritionnel, régime alimentaire</p>
    <p>• <strong>Données d'utilisation :</strong> historique des menus sauvegardés, calories et protéines par jour</p>

    <p className="font-bold text-gray-700 mt-4">3. Finalité du traitement</p>
    <p>Vos données sont utilisées pour :</p>
    <p>• Calculer vos besoins caloriques personnalisés</p>
    <p>• Générer des menus adaptés à votre profil</p>
    <p>• Afficher votre historique et vos statistiques</p>
    <p>• Assurer le fonctionnement de l'authentification</p>

    <p className="font-bold text-gray-700 mt-4">4. Base légale</p>
    <p>Le traitement est fondé sur votre consentement (article 6.1.a du RGPD) donné lors de votre inscription.</p>

    <p className="font-bold text-gray-700 mt-4">5. Durée de conservation</p>
    <p>Vos données sont conservées tant que votre compte est actif. Vous pouvez demander la suppression de votre compte et de toutes vos données à tout moment.</p>

    <p className="font-bold text-gray-700 mt-4">6. Partage des données</p>
    <p>Vos données ne sont jamais vendues ni partagées avec des tiers à des fins commerciales. Les services tiers utilisés sont :</p>
    <p>• <strong>Spoonacular API :</strong> recherche de recettes (aucune donnée personnelle transmise)</p>
    <p>• <strong>Anthropic Claude API :</strong> traduction des recettes (aucune donnée personnelle transmise)</p>
    <p>• <strong>Railway :</strong> hébergement de la base de données (sous-traitant technique)</p>

    <p className="font-bold text-gray-700 mt-4">7. Sécurité</p>
    <p>Les mots de passe sont hashés avec bcrypt. L'authentification utilise des tokens JWT signés. Les communications sont chiffrées via HTTPS.</p>

    <p className="font-bold text-gray-700 mt-4">8. Vos droits (RGPD)</p>
    <p>Conformément au RGPD, vous disposez des droits suivants :</p>
    <p>• <strong>Droit d'accès :</strong> obtenir une copie de vos données</p>
    <p>• <strong>Droit de rectification :</strong> corriger vos données via la page Profil</p>
    <p>• <strong>Droit à l'effacement :</strong> demander la suppression de votre compte</p>
    <p>• <strong>Droit à la portabilité :</strong> récupérer vos données dans un format lisible</p>
    <p>• <strong>Droit d'opposition :</strong> vous opposer au traitement de vos données</p>
    <p>Pour exercer ces droits, contactez-nous via l'application.</p>

    <p className="font-bold text-gray-700 mt-4">9. Cookies</p>
    <p>FoodQuant n'utilise pas de cookies. Les données de session sont stockées dans le localStorage de votre navigateur.</p>
  </>
);

// ─── Contenu Mentions Légales ───
const ContenuMentions = () => (
  <>
    <p className="font-bold text-gray-800">Mentions légales — FoodQuant</p>

    <p className="font-bold text-gray-700 mt-4">Éditeur</p>
    <p>Valérie Kergonnan<br />Projet réalisé dans le cadre d'une formation<br />Email : disponible via l'application</p>

    <p className="font-bold text-gray-700 mt-4">Hébergement</p>
    <p>• Frontend : Vercel Inc. — San Francisco, CA, USA<br />• Backend et base de données : Railway Corp. — San Francisco, CA, USA</p>

    <p className="font-bold text-gray-700 mt-4">Propriété intellectuelle</p>
    <p>Le code source de FoodQuant est la propriété de Valérie Kergonnan. Les recettes proviennent de l'API Spoonacular et appartiennent à leurs auteurs respectifs.</p>

    <p className="font-bold text-gray-700 mt-4">Responsabilité</p>
    <p>FoodQuant est un outil d'aide à la nutrition et ne remplace en aucun cas un avis médical ou diététique professionnel. Les informations nutritionnelles sont fournies à titre indicatif.</p>
  </>
);

// ─── Contenu CGU ───
const ContenuCGU = () => (
  <>
    <p className="font-bold text-gray-800">Conditions Générales d'Utilisation — FoodQuant</p>
    <p>Dernière mise à jour : 14 mars 2026</p>

    <p className="font-bold text-gray-700 mt-4">1. Objet</p>
    <p>Les présentes CGU régissent l'utilisation de l'application FoodQuant, accessible à l'adresse https://foodquant.vercel.app.</p>

    <p className="font-bold text-gray-700 mt-4">2. Inscription</p>
    <p>L'inscription est gratuite et nécessite un prénom, une adresse email valide et un mot de passe d'au moins 6 caractères. Chaque utilisateur est responsable de la confidentialité de ses identifiants.</p>

    <p className="font-bold text-gray-700 mt-4">3. Services proposés</p>
    <p>FoodQuant propose :</p>
    <p>• Le calcul des besoins caloriques personnalisés</p>
    <p>• La génération de menus quotidiens de 4 repas</p>
    <p>• Le suivi nutritionnel avec historique et statistiques</p>
    <p>• Une liste de courses basée sur les menus générés</p>

    <p className="font-bold text-gray-700 mt-4">4. Limitations</p>
    <p>FoodQuant ne garantit pas la disponibilité permanente du service. Les recettes sont fournies par un service tiers (Spoonacular) et peuvent varier. Les informations nutritionnelles sont indicatives.</p>

    <p className="font-bold text-gray-700 mt-4">5. Propriété intellectuelle</p>
    <p>L'ensemble du contenu de l'application (code, design, textes) est protégé par le droit d'auteur. Toute reproduction non autorisée est interdite.</p>

    <p className="font-bold text-gray-700 mt-4">6. Résiliation</p>
    <p>L'utilisateur peut supprimer son compte à tout moment. L'éditeur se réserve le droit de suspendre un compte en cas d'utilisation abusive.</p>

    <p className="font-bold text-gray-700 mt-4">7. Droit applicable</p>
    <p>Les présentes CGU sont soumises au droit français. Tout litige sera porté devant les tribunaux compétents.</p>
  </>
);

// ─── Composant Footer ───
function Footer() {
  const [modale, setModale] = useState(null);

  const liens = [
    { label: 'Politique de confidentialité', id: 'rgpd' },
    { label: 'Mentions légales', id: 'mentions' },
    { label: "Conditions d'utilisation", id: 'cgu' },
  ];

  const modales = {
    rgpd: { titre: '🔒 Politique de confidentialité', contenu: <ContenuRGPD /> },
    mentions: { titre: '📄 Mentions légales', contenu: <ContenuMentions /> },
    cgu: { titre: '📋 Conditions d\'utilisation', contenu: <ContenuCGU /> },
  };

  return (
    <>
      <footer className="w-full bg-gray-50 border-t border-gray-100 py-8 px-6 mt-12">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <p className="text-sm font-bold text-gray-700">FoodQuant</p>
          <div className="flex flex-wrap justify-center gap-4">
            {liens.map(lien => (
              <button
                key={lien.id}
                onClick={() => setModale(lien.id)}
                className="text-xs text-gray-400 hover:text-amber-600 transition-colors underline"
              >
                {lien.label}
              </button>
            ))}
            <a
              href="mailto:contact@foodquant.app"
              className="text-xs text-gray-400 hover:text-amber-600 transition-colors underline"
            >
              Contact
            </a>
          </div>
          <p className="text-[10px] text-gray-300">© 2026 FoodQuant — Valérie K. Tous droits réservés.</p>
        </div>
      </footer>

      {modale && modales[modale] && (
        <ModaleLegale
          titre={modales[modale].titre}
          contenu={modales[modale].contenu}
          onClose={() => setModale(null)}
        />
      )}
    </>
  );
}

export default Footer;