import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { hasRevisionAccess } from "@/lib/plans";

export const maxDuration = 30;

// Appelée une fois par session de conversation (pas à chaque tour, contrairement
// à l'ancienne route /respond) : vérifie auth + forfait, puis émet un jeton
// éphémère Gemini à usage unique. Le navigateur se connecte directement à
// l'API Live de Google avec ce jeton — la vraie clé GEMINI_API_KEY ne quitte
// jamais le serveur, même principe que GROQ_API_KEY.
export async function POST() {
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
    // Les jetons éphémères sont une fonctionnalité expérimentale disponible
    // uniquement sur la version v1alpha de l'API (pas la version par défaut).
    const client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { apiVersion: "v1alpha" },
    });
    const now = Date.now();
    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(now + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(now + 60 * 1000).toISOString(),
      },
    });
    return NextResponse.json({ token: token.name });
  } catch (error) {
    console.error("Erreur Gemini Live (jeton éphémère):", error);
    return NextResponse.json(
      { error: "Impossible de démarrer la session vocale. Réessaie." },
      { status: 500 },
    );
  }
}
