import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateUnsubscribeToken } from "@/lib/unsubscribe";

const FROM_ADDRESS = "Memoflash <bonjour@memoflash.io>";
const APP_URL = "https://memoflash.io";

function buildEmailHtml(unsubscribeUrl: string): string {
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8" /></head>
<body style="margin:0;background:#0b1120;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b1120;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#141b2e;border:1px solid #232d45;border-radius:12px;padding:32px;">
          <tr>
            <td style="color:#e7ecf5;font-size:16px;font-weight:600;padding-bottom:16px;">
              Memoflash
            </td>
          </tr>
          <tr>
            <td style="color:#e7ecf5;font-size:18px;font-weight:600;padding-bottom:12px;">
              Tes cours méritent mieux que des notes en vrac
            </td>
          </tr>
          <tr>
            <td style="color:#c3cbdc;font-size:14px;line-height:1.6;padding-bottom:16px;">
              Tu t'es inscrit sur Memoflash il y a peu, mais tu n'as pas encore généré ta première fiche. Le principe est simple : tu lances l'enregistrement en cours, et à la fin tu obtiens une fiche de révision claire et structurée, automatiquement.
            </td>
          </tr>
          <tr>
            <td style="color:#c3cbdc;font-size:14px;line-height:1.6;padding-bottom:24px;">
              Si tu as des questions avant de te lancer, tu peux nous écrire directement depuis le site.
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:24px;">
              <a href="${APP_URL}/pricing" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:999px;">
                Voir les forfaits
              </a>
            </td>
          </tr>
          <tr>
            <td style="color:#6b7690;font-size:12px;border-top:1px solid #232d45;padding-top:16px;">
              Tu reçois cet email car tu t'es inscrit sur memoflash.io.
              <a href="${unsubscribeUrl}" style="color:#6b7690;">Se désinscrire</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: candidates, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("plan", "free")
    .eq("marketing_opt_out", false)
    .is("relance_email_sent_at", null)
    .lte("created_at", cutoff);

  if (error) {
    console.error("Erreur requête relance:", error);
    return NextResponse.json({ error: "Erreur requête." }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const candidate of candidates ?? []) {
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
      candidate.id,
    );
    const email = userData?.user?.email;
    if (userError || !email) {
      failed++;
      continue;
    }

    const token = generateUnsubscribeToken(candidate.id);
    const unsubscribeUrl = `${APP_URL}/api/unsubscribe?u=${candidate.id}&t=${token}`;

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_ADDRESS,
          to: email,
          subject: "Tes cours méritent mieux que des notes en vrac",
          html: buildEmailHtml(unsubscribeUrl),
        }),
      });

      if (!response.ok) {
        failed++;
        console.error("Erreur envoi Resend:", await response.text());
        continue;
      }

      await supabase
        .from("profiles")
        .update({ relance_email_sent_at: new Date().toISOString() })
        .eq("id", candidate.id);
      sent++;
    } catch (sendError) {
      failed++;
      console.error("Erreur envoi relance:", sendError);
    }
  }

  return NextResponse.json({ sent, failed, total: candidates?.length ?? 0 });
}
