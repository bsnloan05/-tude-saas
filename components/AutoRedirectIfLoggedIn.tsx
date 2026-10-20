"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Remplace l'ancienne redirection côté serveur (dans le middleware) pour un
// visiteur déjà connecté qui revisite / ou /login : la vérification se fait
// maintenant ici, côté client, après l'affichage de la page — elle ne
// bloque donc jamais le premier rendu pour les nombreux visiteurs qui ne
// sont pas connectés (l'immense majorité sur ces pages publiques).
export default function AutoRedirectIfLoggedIn() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace("/app");
    });
  }, [router]);

  return null;
}
