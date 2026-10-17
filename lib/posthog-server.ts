import { PostHog } from "posthog-node";

let client: PostHog | null = null;

// Utilisé côté serveur (ex : webhook Stripe) pour suivre des événements qui
// ne doivent jamais dépendre du navigateur du client (fiabilité) — par
// exemple une conversion payante, qui doit être comptée même si le client a
// fermé l'onglet juste après avoir payé sur Stripe.
export function getPostHogServerClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  if (!client) {
    client = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return client;
}
