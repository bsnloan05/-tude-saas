import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasImportAccess } from "@/lib/plans";
import {
  buildFicheFromDocumentPrompt,
  extractTextFromImage,
  generateSingleCallFiche,
  isGroqRateLimitError,
  SINGLE_CALL_MAX_CHARS,
  CHUNK_CHAR_SIZE,
  splitIntoChunks,
} from "@/lib/fiche-generation";

export const maxDuration = 60;

// Les fonctions Vercel limitent la taille du corps de requête à ~4,5 Mo :
// on reste en dessous pour laisser de la marge à l'encodage multipart (même
// limite que pour l'import PDF).
const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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
        error: "L'import de photo est réservé aux forfaits Pro et À vie.",
        code: "plan_required",
      },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Le fichier doit être une photo (JPEG, PNG ou WebP)." },
      { status: 400 },
    );
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Cette photo est trop lourde (4 Mo maximum)." },
      { status: 400 },
    );
  }

  let extractedText = "";
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64DataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;
    extractedText = await extractTextFromImage(base64DataUrl);
  } catch (error) {
    console.error("Erreur lecture photo (OCR):", error);
    return NextResponse.json(
      {
        error: isGroqRateLimitError(error)
          ? "Beaucoup de monde utilise Memoflash en ce moment. Attends quelques minutes puis réessaie."
          : "Impossible de lire cette photo. Vérifie qu'elle est nette et bien éclairée.",
      },
      { status: 500 },
    );
  }

  if (!extractedText) {
    return NextResponse.json(
      {
        error:
          "Aucun texte lisible sur cette photo. Vérifie qu'elle est nette, bien cadrée et bien éclairée.",
      },
      { status: 400 },
    );
  }

  const enableDiagrams = profile?.plan === "lifetime";

  // Une photo très dense peut, une fois le texte extrait, dépasser la limite
  // de débit Groq en un seul appel : même découpage que pour un PDF long.
  if (extractedText.length > SINGLE_CALL_MAX_CHARS) {
    return NextResponse.json({
      needsChunking: true,
      chunks: splitIntoChunks(extractedText, CHUNK_CHAR_SIZE),
      source: "document",
      requiresImportPlan: true,
    });
  }

  try {
    const notes = await generateSingleCallFiche(
      extractedText,
      buildFicheFromDocumentPrompt(enableDiagrams),
    );

    if (notes.trim()) {
      await supabase.from("fiches").insert({ user_id: user.id, content: notes });
    }
    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Erreur Groq API (import photo):", error);
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
