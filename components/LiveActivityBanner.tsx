import { createAdminClient } from "@/lib/supabase/admin";
import LiveActivityBannerClient from "@/components/LiveActivityBannerClient";

// Expérience : récupère les horodatages côté serveur (streamé via Suspense,
// voir app/page.tsx) au lieu d'un fetch côté client comme avant — pour
// tester concrètement l'hypothèse d'un "chargement progressif" sur la
// lenteur mobile observée. Ne renvoie que des horodatages anonymes (aucun
// user_id, email ou contenu), comme l'ancien endpoint /api/recent-activity.
export default async function LiveActivityBanner() {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("fiches")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  const timestamps = (data ?? []).map((f) => f.created_at as string);

  return <LiveActivityBannerClient timestamps={timestamps} />;
}
