import posthog from "posthog-js";

declare global {
  interface Window {
    posthog?: typeof posthog;
  }
}

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (POSTHOG_KEY) {
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
    session_recording: {
      // On masque tout texte saisi par défaut (et pas seulement les mots de
      // passe) : plus prudent côté vie privée tant qu'aucun bandeau de
      // consentement n'est en place.
      maskAllInputs: true,
    },
  });
}

export function onRouterTransitionStart(url: string) {
  if (POSTHOG_KEY) {
    posthog.capture("$pageview", { $current_url: window.location.origin + url });
  }
}
