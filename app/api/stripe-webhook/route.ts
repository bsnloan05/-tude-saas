import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPostHogServerClient } from "@/lib/posthog-server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function mapPriceToPlan(
  priceId: string | undefined,
): "standard" | "premium" | "trimestriel" | "free" {
  if (priceId === process.env.STRIPE_PRICE_STANDARD) return "standard";
  if (priceId === process.env.STRIPE_PRICE_PREMIUM) return "premium";
  if (priceId === process.env.STRIPE_PRICE_TRIMESTRIEL) return "trimestriel";
  return "free";
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (error) {
    console.error("Signature webhook Stripe invalide:", error);
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  const supabase = createAdminClient();
  // Suivi côté serveur plutôt que client : une conversion payante ou une
  // résiliation doit être comptée même si le client ferme l'onglet juste
  // après, contrairement à un événement envoyé depuis le navigateur.
  const posthogServer = getPostHogServerClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      if (!userId) break;

      // "lifetime" est un paiement unique : pas d'abonnement Stripe associé,
      // donc jamais touché par les events subscription.updated/deleted
      // ci-dessous — le forfait reste actif pour toujours.
      if (session.mode === "payment") {
        await supabase
          .from("profiles")
          .update({ plan: "lifetime", stripe_customer_id: session.customer as string })
          .eq("id", userId);
        posthogServer?.capture({
          distinctId: userId,
          event: "checkout_completed",
          properties: { plan: "lifetime" },
        });
        break;
      }

      if (!session.subscription) break;
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string,
      );
      const priceId = subscription.items.data[0]?.price.id;
      const plan = mapPriceToPlan(priceId);

      await supabase
        .from("profiles")
        .update({ plan, stripe_customer_id: session.customer as string })
        .eq("id", userId);
      posthogServer?.capture({
        distinctId: userId,
        event: "checkout_completed",
        properties: { plan },
      });
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const priceId = subscription.items.data[0]?.price.id;
      const isActive = ["active", "trialing"].includes(subscription.status);
      const plan = isActive ? mapPriceToPlan(priceId) : "free";

      await supabase
        .from("profiles")
        .update({ plan })
        .eq("stripe_customer_id", subscription.customer as string);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;

      const { data: affected } = await supabase
        .from("profiles")
        .update({ plan: "free" })
        .eq("stripe_customer_id", subscription.customer as string)
        .select("id");
      for (const profile of affected ?? []) {
        posthogServer?.capture({
          distinctId: profile.id,
          event: "subscription_cancelled",
        });
      }
      break;
    }
  }

  await posthogServer?.shutdown();
  return NextResponse.json({ received: true });
}
