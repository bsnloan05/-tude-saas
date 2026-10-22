import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Endpoint public, ne renvoie que des horodatages anonymes (aucun user_id,
// email ou contenu) pour alimenter la bannière "activité récente" sur la
// page d'accueil.
export async function GET() {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("fiches")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({ timestamps: (data ?? []).map((f) => f.created_at) });
}
