import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Un enregistrement resté "actif" plus longtemps que ça est considéré comme
// abandonné (onglet fermé, crash, mise en veille...) et n'empêche plus d'en
// démarrer un nouveau, pour ne jamais bloquer quelqu'un définitivement par
// erreur. Confirmé en test réel (signalement client) : 6h est bien trop long
// — un onglet fermé brutalement (crash, veille, réseau coupé) laisse le
// verrou bloquer l'utilisateur sur SON PROPRE compte pendant des heures,
// avec un message trompeur ("sur un autre appareil"). Abaissé à une durée
// cohérente avec un vrai cours (jamais plusieurs heures d'affilée).
const STALE_AFTER_MS = 90 * 60 * 1000;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("recording_started_at")
    .eq("id", user.id)
    .single();

  const startedAt = profile?.recording_started_at
    ? new Date(profile.recording_started_at)
    : null;
  const isStale = !startedAt || Date.now() - startedAt.getTime() > STALE_AFTER_MS;

  if (startedAt && !isStale) {
    return NextResponse.json(
      {
        error:
          "Un enregistrement est déjà en cours sur ce compte, sur un autre appareil.",
        code: "recording_in_progress",
      },
      { status: 409 },
    );
  }

  await supabase
    .from("profiles")
    .update({ recording_started_at: new Date().toISOString() })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
