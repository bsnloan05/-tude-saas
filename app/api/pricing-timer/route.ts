import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("pricing_timer_started_at")
    .eq("id", user.id)
    .single();

  if (profile?.pricing_timer_started_at) {
    return NextResponse.json({ startedAt: profile.pricing_timer_started_at });
  }

  const startedAt = new Date().toISOString();
  await supabase
    .from("profiles")
    .update({ pricing_timer_started_at: startedAt })
    .eq("id", user.id);

  return NextResponse.json({ startedAt });
}
