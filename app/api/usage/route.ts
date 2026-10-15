import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getQuotaSeconds } from "@/lib/plans";
import { startOfMonthParis } from "@/lib/parisDate";

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

  const { data: sessions } = await supabase
    .from("usage_sessions")
    .select("duration_seconds")
    .eq("user_id", user.id)
    .gte("created_at", startOfMonthParis());

  const usedSeconds = (sessions ?? []).reduce(
    (total, session) => total + session.duration_seconds,
    0,
  );

  // Le prénom vient soit du champ saisi à l'inscription par email, soit du
  // nom fourni par Google (format "Prénom Nom") pour une connexion OAuth.
  // Les comptes créés avant l'ajout du champ prénom n'ont ni l'un ni
  // l'autre : on retombe alors sur l'email côté affichage.
  const firstName =
    (user.user_metadata?.first_name as string | undefined) ||
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
    (user.user_metadata?.name as string | undefined)?.split(" ")[0] ||
    null;

  return NextResponse.json({
    plan,
    usedSeconds,
    quotaSeconds,
    email: user.email,
    firstName,
  });
}
