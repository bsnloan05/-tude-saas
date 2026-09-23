import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getQuotaSeconds } from "@/lib/plans";

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
    .select("plan")
    .eq("id", user.id)
    .single();

  const plan = profile?.plan ?? "free";
  const quotaSeconds = getQuotaSeconds(plan);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: sessions } = await supabase
    .from("usage_sessions")
    .select("duration_seconds")
    .eq("user_id", user.id)
    .gte("created_at", startOfMonth.toISOString());

  const usedSeconds = (sessions ?? []).reduce(
    (total, session) => total + session.duration_seconds,
    0,
  );

  return NextResponse.json({ plan, usedSeconds, quotaSeconds, email: user.email });
}
