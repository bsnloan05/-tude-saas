// Fichier neutre (ni "use client" ni composant) : importé à la fois par le
// composant client (affichage) et par la page serveur (données structurées
// FAQPage pour Google) — un export nommé depuis un fichier "use client" ne
// traverse pas correctement la frontière serveur/client dans Next.js.
export const FAQ = [
  {
    question: "Puis-je annuler à tout moment ?",
    answer:
      "Oui, sans engagement. Tu peux annuler ton abonnement quand tu veux depuis ton espace Stripe, il restera actif jusqu'à la fin de la période déjà payée.",
  },
  {
    question: "Mes données et l'audio de mes cours sont-ils sécurisés ?",
    answer:
      "Les paiements passent uniquement par Stripe (jamais tes coordonnées bancaires chez nous), et tes fiches sont liées uniquement à ton compte.",
  },
  {
    question: "Est-ce que ça fonctionne sur téléphone ?",
    answer:
      "Oui, Memoflash fonctionne directement dans le navigateur de ton téléphone, sans rien à installer.",
  },
];
