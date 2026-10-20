"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

const CRISP_WEBSITE_ID = "d06431e7-2828-4d73-ac08-7d4d67a066ef";

// Le widget de chat n'est jamais chargé sur la page d'accueil : sa connexion
// temps réel (WebSocket vers client.relay.crisp.chat) reste ouverte en
// arrière-plan bien après l'affichage de la page, ce qui peut laisser
// l'indicateur de chargement du navigateur actif plusieurs secondes de plus
// sur un réseau mobile lent — mesuré en conditions réelles (inspecteur web
// iOS) sur /, la toute première page vue par un visiteur. Chargé normalement
// partout ailleurs (onboarding, tarifs, connexion, app).
export default function CrispChat() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <Script id="crisp-chat" strategy="lazyOnload">
      {`
        window.$crisp = [];
        window.CRISP_WEBSITE_ID = "${CRISP_WEBSITE_ID}";
        (function () {
          const d = document;
          const s = d.createElement("script");
          s.src = "https://client.crisp.chat/l.js";
          s.async = 1;
          // Sur un réseau qui bloque/ralentit ce domaine, la requête
          // peut sinon rester "en vol" très longtemps en arrière-plan.
          // On retire le script s'il n'a pas chargé sous 4s, ce qui
          // annule la requête en cours dans la plupart des navigateurs.
          const giveUp = setTimeout(function () { s.remove(); }, 4000);
          s.onload = function () { clearTimeout(giveUp); };
          d.getElementsByTagName("head")[0].appendChild(s);
        })();
      `}
    </Script>
  );
}
