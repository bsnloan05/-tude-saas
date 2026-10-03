import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";

// Lien cliqué directement depuis l'email, sans connexion requise : accessible
// à n'importe qui qui a le lien exact (jeton signé), comme tout lien de
// désinscription standard.
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("u");
  const token = request.nextUrl.searchParams.get("t");

  if (!userId || !token || !verifyUnsubscribeToken(userId, token)) {
    return NextResponse.json({ error: "Lien invalide." }, { status: 400 });
  }

  const supabase = createAdminClient();
  await supabase.from("profiles").update({ marketing_opt_out: true }).eq("id", userId);

  return new NextResponse(
    `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8" /><title>Désinscription - Memoflash</title></head>
<body style="font-family: system-ui, sans-serif; background: #0b1120; color: #e7ecf5; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
  <div style="text-align: center; max-width: 24rem; padding: 1.5rem;">
    <h1 style="font-size: 1.25rem; margin-bottom: 0.75rem;">Désinscription confirmée</h1>
    <p style="color: #8b97b0; font-size: 0.9rem;">Tu ne recevras plus d'emails de relance de la part de Memoflash.</p>
  </div>
</body>
</html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
