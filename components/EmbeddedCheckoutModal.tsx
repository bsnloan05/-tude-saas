"use client";

import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";

// Chargé une seule fois au niveau du module (pas à chaque ouverture de la
// modale) : loadStripe() met en cache le script Stripe.js lui-même.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function EmbeddedCheckoutModal({
  clientSecret,
  onClose,
}: {
  clientSecret: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-xl leading-none text-gray-500 transition-colors hover:bg-black/10"
        >
          ×
        </button>
        <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </div>
  );
}
