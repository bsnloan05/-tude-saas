import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client Supabase "admin" : utilise la cle secrete (service role), qui
// contourne les regles de securite (RLS). A n'utiliser que dans du code
// serveur de confiance (ex: le webhook Stripe), jamais expose au navigateur.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
