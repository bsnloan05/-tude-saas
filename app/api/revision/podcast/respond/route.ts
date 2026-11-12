import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasRevisionAccess } from "@/lib/plans";
import { isGroqRateLimitError } from "@/lib/fiche-generation";
import { getPodcastReply, type PodcastMessage } from "@/lib/podcast-conversation";

export const maxDuration = 60;

// Un tour de conversation du Podcast IA : contrairement à
// /api/revision/flashcards ou /quiz (un seul appel à la création), cette
// route est appelée à CHAQUE tour (y compris le message d'accueil), donc le
// contrôle de forfait est vérifié à chaque appel plutôt qu'une seule fois.
export async function POST(request: NextRequest) {
  const { sourceText, history, message } = await request.json();

  if (!sourceText || typeof sourceText !== "string" || sourceText.trim().length === 0) {
    return NextResponse.json({ error: "Texte source vide." }, { status: 400 });
  }
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "Message vide." }, { status: 400 });
  }
  const safeHistory: PodcastMessage[] = Array.isArray(history) ? history : [];

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

  if (!hasRevisionAccess(profile?.plan)) {
    return NextResponse.json(
      {
        error: "Le podcast IA est réservé aux forfaits payants.",
        code: "plan_required",
      },
      { status: 403 },
    );
  }

  try {
    const reply = await getPodcastReply(sourceText, safeHistory, message);
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Erreur Groq API (podcast):", error);
    return NextResponse.json(
      {
        error: isGroqRateLimitError(error)
          ? "Beaucoup de monde utilise Memoflash en ce moment. Attends quelques minutes puis réessaie."
          : "La génération a rencontré un petit souci. Réessaie.",
      },
      { status: 500 },
    );
  }
}
