import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Depuis l'ajout du heartbeat (voir recording/heartbeat/route.ts, appelé
// toutes les ~60s par app/app/page.tsx pendant l'enregistrement),
// `recording_started_at` reflète en réalité le DERNIER signe de vie reçu,
// pas l'heure de démarrage initiale — donc ce délai n'a plus besoin de
// couvrir la durée d'un cours entier, juste l'intervalle entre deux
// battements (avec une marge pour un réseau lent ou un onglet mis en
// veille par l'OS). Confirmé en test réel (deux signalements clients) que
// sans heartbeat, même un délai d'1h30 laissait des utilisateurs bloqués
// sur leur propre compte après une fermeture brutale (surtout sur mobile,
// où ni beforeunload ni le démontage React ne se déclenchent de façon
// fiable).
const STALE_AFTER_MS = 5 * 60 * 1000;

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
