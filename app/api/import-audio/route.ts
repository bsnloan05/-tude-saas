import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasImportAccess } from "@/lib/plans";
import {
  groqClient,
  buildFicheSystemPrompt,
  buildFicheFromNotesSystemPrompt,
  CONDENSE_SYSTEM_PROMPT,
  generateFicheFromText,
  isGroqRateLimitError,
} from "@/lib/fiche-generation";

const BUCKET = "audio-imports";
// Limite du tier gratuit de Groq Whisper : 25 Mo par fichier (le bucket
// Supabase applique déjà cette limite, ceci est une double vérification).
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
// Durée de validité de l'URL signée donnée à Groq pour récupérer le fichier :
// largement suffisant pour un fichier de quelques dizaines de Mo.
const SIGNED_URL_EXPIRY_SECONDS = 300;

export async function POST(request: NextRequest) {
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

  if (!hasImportAccess(profile?.plan)) {
    return NextResponse.json(
      {
        error: "L'import audio est réservé aux forfaits Pro et À vie.",
        code: "plan_required",
      },
      { status: 403 },
    );
  }

  const { path } = await request.json();

  // On ne fait jamais confiance au chemin fourni par le client : il doit
  // obligatoirement commencer par l'identifiant de l'utilisateur connecté,
  // comme l'exigent déjà les règles de sécurité du stockage.
  if (typeof path !== "string" || !path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Fichier invalide." }, { status: 400 });
  }

  const folder = path.slice(0, path.lastIndexOf("/"));
  const filename = path.slice(path.lastIndexOf("/") + 1);

  const cleanup = async () => {
    await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
  };

  try {
    const { data: filesInFolder } = await supabase.storage.from(BUCKET).list(folder);
    const fileInfo = filesInFolder?.find((f) => f.name === filename);

    if (!fileInfo) {
      return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
    }
    if ((fileInfo.metadata?.size ?? 0) > MAX_FILE_SIZE_BYTES) {
      await cleanup();
      return NextResponse.json(
        { error: "Ce fichier audio est trop lourd (25 Mo maximum)." },
        { status: 400 },
      );
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);

    if (signedUrlError || !signedUrlData) {
      await cleanup();
      return NextResponse.json(
        { error: "Impossible d'accéder au fichier audio." },
        { status: 500 },
      );
    }

    let transcript = "";
    try {
      const transcription = await groqClient.audio.transcriptions.create({
        model: "whisper-large-v3-turbo",
        url: signedUrlData.signedUrl,
        language: "fr",
      });
      transcript = transcription.text?.trim() ?? "";
    } catch (error) {
      console.error("Erreur transcription Groq Whisper:", error);
      await cleanup();
      return NextResponse.json(
        {
          error: isGroqRateLimitError(error)
            ? "Beaucoup de monde utilise Memoflash en ce moment. Attends quelques minutes puis réessaie."
            : "Impossible de transcrire ce fichier audio. Vérifie qu'il n'est pas corrompu.",
        },
        { status: 500 },
      );
    }

    await cleanup();

    if (!transcript) {
      return NextResponse.json(
        { error: "Aucune parole détectée dans ce fichier audio." },
        { status: 400 },
      );
    }

    const enableDiagrams = profile?.plan === "lifetime";

    try {
      const notes = await generateFicheFromText(transcript, {
        singleCallSystemPrompt: buildFicheSystemPrompt(enableDiagrams),
        condenseSystemPrompt: CONDENSE_SYSTEM_PROMPT,
        chunkedSystemPrompt: buildFicheFromNotesSystemPrompt(enableDiagrams),
      });

      if (notes.trim()) {
        await supabase.from("fiches").insert({ user_id: user.id, content: notes });
      }
      return NextResponse.json({ notes });
    } catch (error) {
      console.error("Erreur Groq API (import audio):", error);
      return NextResponse.json(
        {
          error: isGroqRateLimitError(error)
            ? "Beaucoup de monde utilise Memoflash en ce moment. Attends quelques minutes puis réessaie."
            : "La génération a rencontré un petit souci. Réessaie.",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Erreur import audio:", error);
    await cleanup();
    return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
}
