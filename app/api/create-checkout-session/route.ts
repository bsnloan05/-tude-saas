import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_IDS: Record<string, string> = {
  standard: process.env.STRIPE_PRICE_STANDARD!,
  trimestriel: process.env.STRIPE_PRICE_TRIMESTRIEL!,
  lifetime: process.env.STRIPE_PRICE_LIFETIME!,
};

export async function POST(request: NextRequest) {
  const { plan } = await request.json();

  if (plan !== "standard" && plan !== "trimestriel" && plan !== "lifetime") {
    return NextResponse.json({ error: "Forfait invalide." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }

  const origin = request.nextUrl.origin;

  // Petit message de réassurance juste au-dessus du bouton de paiement,
  // au moment précis où l'hésitation est la plus forte. Reprend ce qui est
  // déjà affiché sur /pricing (vrai, vérifiable), pas une garantie qu'on
  // n'offre pas réellement (contrairement à un "satisfait ou remboursé").
  const reassuranceMessage =
    plan === "lifetime"
      ? "Paiement unique, accès à vie : aucun autre prélèvement ensuite."
      : "Sans engagement : résiliable à tout moment depuis ton espace client.";

  // "lifetime" est un paiement unique (pas d'abonnement), "standard" reste
  // un abonnement mensuel classique. Pour un paiement unique, Stripe ne crée
  // pas de vrai objet "client" par défaut (seulement un paiement "orphelin"
  // regroupé sous un badge "Invité" dans le dashboard) : "customer_creation"
  // force sa création, pour que stripe_customer_id soit toujours renseigné.
  //
  // ui_mode "embedded_page" : le formulaire de paiement s'affiche dans une
  // fenêtre intégrée directement sur memoflash.io (une iframe Stripe),
  // plutôt que de rediriger vers checkout.stripe.com. Un seul "return_url"
  // couvre tous les cas (succès, échec, abandon) : la page qui le reçoit
  // vérifie elle-même le statut de la session pour savoir quoi afficher.
  const session = await stripe.checkout.sessions.create({
    mode: plan === "lifetime" ? "payment" : "subscription",
    ui_mode: "embedded_page" as const,
    ...(plan === "lifetime" ? { customer_creation: "always" as const } : {}),
    line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
    client_reference_id: user.id,
    customer_email: user.email,
    metadata: { plan },
    custom_text: { submit: { message: reassuranceMessage } },
    return_url: `${origin}/app?checkout_session_id={CHECKOUT_SESSION_ID}`,
  });

  return NextResponse.json({ clientSecret: session.client_secret });
}
