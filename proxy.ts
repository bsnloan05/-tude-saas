import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Limité à /app : c'est la seule zone qui exige vraiment une vérification
  // côté serveur (empêcher un visiteur non connecté d'y accéder). Avant,
  // cette vérification (un appel réseau vers Supabase) tournait sur TOUTE
  // visite du site — y compris la page d'accueil, /pricing, /login,
  // /onboarding et chaque appel d'API — alors que son résultat n'était
  // utilisé que pour /app. Une fonction serveur comme celle-ci peut avoir un
  // "démarrage à froid" ponctuel et imprévisible (plusieurs secondes,
  // indépendant du réseau/appareil du visiteur) : limiter son exécution à
  // /app évite que ce risque retombe sur les pages publiques, visitées par
  // beaucoup plus de monde. La redirection "déjà connecté → /app" depuis /
  // et /login est maintenant gérée côté client (voir AutoRedirectIfLoggedIn),
  // sans jamais bloquer l'affichage de la page.
  matcher: ["/app/:path*"],
};
