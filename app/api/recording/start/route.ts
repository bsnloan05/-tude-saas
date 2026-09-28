import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Un enregistrement resté "actif" plus longtemps que ça est considéré comme
// abandonné (onglet fermé, crash...) et n'empêche plus d'en démarrer un
// nouveau, pour ne jamais bloquer quelqu'un définitivement par erreur.
const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

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
