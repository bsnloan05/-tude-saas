import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Pose la date de première arrivée sur /pricing une seule fois par compte
// (jamais réinitialisée ensuite, même si le visiteur revient des jours
// après) — contrairement à un cookie, ça reste valable peu importe
// l'appareil ou le navigateur utilisé, et un nouveau compte a toujours son
// propre minuteur, même sur un navigateur déjà utilisé pour un compte
// précédent.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }

  // Client admin (clé service role) : la lecture/écriture avec le client
  // normal échouait silencieusement, bloquée par les règles de sécurité
  // (RLS) de la table "profiles" — résultat, le minuteur ne démarrait
  // jamais vraiment, et le tarif plein (200€ au lieu de 59,99€) s'appliquait
  // par sécurité faute de date enregistrée. Confirmé en base : tous les
  // comptes créés avaient "pricing_timer_started_at" resté à null malgré
  // plusieurs passages sur /pricing.
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("pricing_timer_started_at")
    .eq("id", user.id)
    .single();

  if (profile?.pricing_timer_started_at) {
    return NextResponse.json({ startedAt: profile.pricing_timer_started_at });
  }

  const startedAt = new Date().toISOString();
  const { error } = await admin
    .from("profiles")
    .update({ pricing_timer_started_at: startedAt })
    .eq("id", user.id);

  if (error) {
    console.error("Échec de l'écriture de pricing_timer_started_at:", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }

  return NextResponse.json({ startedAt });
}
