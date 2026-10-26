// Import de type uniquement (effacé à la compilation, aucun impact sur le
// bundle) : la vraie valeur est chargée dynamiquement dans startPostHog, voir
// plus bas.
import type posthog from "posthog-js";

declare global {
  interface Window {
    posthog?: typeof posthog;
  }
}

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

async function startPostHog() {
  if (!POSTHOG_KEY) return;
  // Import dynamique plutôt que statique : posthog-js pèse à lui seul plus
  // que tout le reste du JS de la page (~170 Ko compressés, mesuré en
  // conditions réelles). Avec un import statique, le bundler l'inclut dans
  // le code téléchargé/analysé dès le chargement initial de CHAQUE page, même
  // si on n'exécute .init() qu'après "load" (voir plus bas) — seule
  // l'EXÉCUTION était différée, pas le TÉLÉCHARGEMENT du fichier. Avec un
  // import dynamique, le fichier n'est même requis qu'à cet instant.
  const { default: posthog } = await import("posthog-js");
  // Exposé explicitement sur window : "instrumentation-client.ts" s'exécute
  // dans son propre chunk, donc un "import posthog from 'posthog-js'" dans
  // un autre fichier peut résoudre vers une instance différente, jamais
  // initialisée avec le token. En passant par window.posthog partout
  // ailleurs, on garantit de toujours viser cette même instance initialisée.
  window.posthog = posthog;
  posthog.init(POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: true,
    // On n'utilise pas la fonctionnalité "Surveys" de PostHog : évite de
    // charger surveys.js (~33 Ko) sur chaque page pour rien.
    disable_surveys: true,
    // On n'utilise pas les feature flags : évite un appel réseau
    // supplémentaire (/flags) à chaque chargement, sur un domaine qui peut
    // être lent/bloqué sur certains réseaux mobiles.
    advanced_disable_flags: true,
    session_recording: {
      // On masque tout texte saisi par défaut (et pas seulement les mots de
      // passe) : plus prudent côté vie privée tant qu'aucun bandeau de
      // consentement n'est en place.
      maskAllInputs: true,
    },
    // Verrou explicite, indépendant des réglages du dashboard PostHog :
    // l'enregistrement de session ne démarre JAMAIS automatiquement, sur
    // aucune page. Seul /pricing le démarre manuellement (voir
    // app/pricing/page.tsx) — notamment pour ne jamais risquer d'ajouter de
    // latence ou de bug sur /app pendant un enregistrement/une génération
    // de fiche en cours.
    disable_session_recording: true,
  });
}

// On ne démarre PostHog qu'une fois le reste de la page chargé, jamais avant.
// Certains réseaux mobiles/DNS filtrent ou ralentissent fortement les
// domaines d'analytics : si PostHog faisait partie des ressources chargées
// dès le départ, le navigateur attend que CETTE requête réponde (même très
// lentement) avant de considérer la page "chargée" — observé en conditions
// réelles : plus de 15s de blocage dans ce cas, contre <1s normalement.
// window.posthog reste undefined jusque-là ; tous les appels ailleurs dans
// l'app utilisent déjà "window.posthog?.capture(...)" (sans effet si absent),
// donc rien ne casse pendant cette courte fenêtre.
if (document.readyState === "complete") {
  startPostHog();
} else {
  window.addEventListener("load", startPostHog, { once: true });
}

export function onRouterTransitionStart(url: string) {
  window.posthog?.capture("$pageview", { $current_url: window.location.origin + url });
}
