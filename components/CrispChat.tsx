"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

const CRISP_WEBSITE_ID = "d06431e7-2828-4d73-ac08-7d4d67a066ef";

declare global {
  interface Window {
    $crisp?: unknown[];
    CRISP_WEBSITE_ID?: string;
  }
}

// Charge et ouvre Crisp pour de vrai, uniquement au moment où quelqu'un
// clique sur la bulle — avant ça, aucun script Crisp n'est injecté, donc
// aucune connexion (ni la requête initiale, ni la connexion temps réel qui
// reste ouverte en arrière-plan ensuite) ne démarre pour les visiteurs qui
// n'utilisent jamais le chat.
function loadAndOpenCrisp() {
  window.$crisp = [];
  window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;
  const s = document.createElement("script");
  s.src = "https://client.crisp.chat/l.js";
  s.async = true;
  s.onload = () => {
    window.$crisp?.push(["do", "chat:open"]);
  };
  // Même filet de sécurité que pour le chargement différé précédent : si le
  // domaine est lent/bloqué sur ce réseau, on annule plutôt que de laisser
  // la requête traîner indéfiniment.
  const giveUp = setTimeout(() => s.remove(), 4000);
  s.addEventListener("load", () => clearTimeout(giveUp), { once: true });
  document.head.appendChild(s);
}

// Bulle de remplacement, en pur CSS/SVG : visuellement une bulle de chat
// classique (coin bas droit), mais sans aucun code Crisp chargé tant que
// personne n'a cliqué dessus.
export default function CrispChat() {
  const pathname = usePathname();
  const [clicked, setClicked] = useState(false);

  if (pathname === "/" || clicked) return null;

  return (
    <button
      type="button"
      aria-label="Ouvrir le chat"
      onClick={() => {
        setClicked(true);
        loadAndOpenCrisp();
      }}
      className="fixed right-5 bottom-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#2563eb] text-white shadow-lg transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
        <path
          d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 20l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
