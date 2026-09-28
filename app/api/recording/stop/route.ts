import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    .update({ recording_started_at: null })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
