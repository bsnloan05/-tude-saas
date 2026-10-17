import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const CRISP_WEBSITE_ID = "d06431e7-2828-4d73-ac08-7d4d67a066ef";

export const metadata: Metadata = {
  title: "Memoflash",
  description: "Transforme la voix du prof en fiche de révision",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        {/* "lazyOnload" : charge le widget de chat seulement une fois le
            reste de la page prêt, plutôt que dès l'arrivée — ce n'est pas
            critique pour le premier affichage, et ça évite d'alourdir le
            chargement initial de ~95 Ko sur chaque page. */}
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
      </body>
    </html>
  );
}
