import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Appelé toutes les ~60s pendant un enregistrement (voir app/app/page.tsx) :
// renouvelle le même timestamp que /api/recording/start, pour que le verrou
// anti-partage de compte reflète "dernier signe de vie" plutôt que "heure de
// démarrage" — voir le commentaire sur STALE_AFTER_MS dans
// recording/start/route.ts pour le raisonnement complet.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }

  await supabase
    .from("profiles")
    .update({ recording_started_at: new Date().toISOString() })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
