"use client";

import { useState } from "react";

const FAQ = [
  {
    question: "Est-ce que je peux essayer avant de payer ?",
    answer:
      "Oui, tu peux lancer une transcription gratuitement et voir le résultat. Un forfait est nécessaire uniquement au moment de générer la fiche finale.",
  },
  {
    question: "Est-ce que l'IA invente des informations ?",
    answer:
      "Non. La fiche est générée uniquement à partir de ce qui a été dit pendant ton cours — rien n'est ajouté ou inventé.",
  },
  {
    question: "Et si l'IA ne capte pas bien certains mots ?",
    answer:
      "Si un mot est mal capté (bruit, débit rapide...), l'IA s'appuie sur le contexte du cours pour le reconstituer correctement — sans jamais inventer de nouvelles informations qui n'ont pas été dites.",
  },
  {
    question: "Qu'est-ce qui se passe si mon cours est très long ?",
    answer:
      "Memoflash gère aussi les cours longs : le texte est traité en plusieurs étapes automatiquement, tu n'as rien à faire de particulier.",
  },
  {
    question: "Mes données et l'audio de mes cours sont-ils sécurisés ?",
    answer:
      "Les paiements passent uniquement par Stripe (jamais tes coordonnées bancaires chez nous), et tes fiches sont liées uniquement à ton compte.",
  },
];

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col">
      {FAQ.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={item.question} className="border-b border-[#232d45]">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full items-center justify-between gap-4 py-5 text-left"
            >
              <span className="text-base font-medium text-[#e7ecf5]">
                {item.question}
              </span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`h-4 w-4 shrink-0 text-[#8b97b0] transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {isOpen && (
              <p className="pb-5 text-sm text-[#8b97b0]">{item.answer}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
