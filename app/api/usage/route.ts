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
    .select("plan, demo_used_at")
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

  // Sert à savoir si on propose le mode démo (/app/demo) : uniquement tant
  // qu'un compte n'a encore aucune fiche et ne l'a pas déjà utilisé, pour que
  // ça reste un vrai coup de pouce au tout début, pas une offre permanente.
  const { count: ficheCount } = await supabase
    .from("fiches")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const demoAvailable = !profile?.demo_used_at && !ficheCount;

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
    demoAvailable,
    email: user.email,
    firstName,
  });
}
