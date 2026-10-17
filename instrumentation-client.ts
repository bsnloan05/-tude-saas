import posthog from "posthog-js";

declare global {
  interface Window {
    posthog?: typeof posthog;
  }
}

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

function startPostHog() {
  if (!POSTHOG_KEY) return;
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
    session_recording: {
      // On masque tout texte saisi par défaut (et pas seulement les mots de
      // passe) : plus prudent côté vie privée tant qu'aucun bandeau de
      // consentement n'est en place.
      maskAllInputs: true,
    },
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
