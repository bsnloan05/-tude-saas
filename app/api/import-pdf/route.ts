import { NextRequest, NextResponse } from "next/server";
import { getDocumentProxy, extractText } from "unpdf";
import { createClient } from "@/lib/supabase/server";
import { hasImportAccess } from "@/lib/plans";
import {
  buildFicheFromDocumentPrompt,
  generateSingleCallFiche,
  isGroqRateLimitError,
  SINGLE_CALL_MAX_CHARS,
  CHUNK_CHAR_SIZE,
  splitIntoChunks,
} from "@/lib/fiche-generation";

export const maxDuration = 60;

// Les fonctions Vercel limitent la taille du corps de requête à ~4,5 Mo :
// on reste en dessous pour laisser de la marge à l'encodage multipart.
const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;

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
        error: "L'import de PDF est réservé aux forfaits Pro et À vie.",
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
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Le fichier doit être un PDF." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Ce PDF est trop lourd (4 Mo maximum)." },
      { status: 400 },
    );
  }

  let extractedText = "";
  try {
    const buffer = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocumentProxy(buffer);
    const { text } = await extractText(pdf, { mergePages: true });
    extractedText = text.trim();
  } catch (error) {
    console.error("Erreur extraction PDF:", error);
    return NextResponse.json(
      { error: "Impossible de lire ce PDF. Vérifie qu'il n'est pas protégé par un mot de passe ou corrompu." },
      { status: 400 },
    );
  }

  if (!extractedText) {
    return NextResponse.json(
      {
        error:
          "Aucun texte trouvé dans ce PDF. S'il s'agit d'un document scanné (image), le texte n'est pas reconnaissable automatiquement.",
      },
      { status: 400 },
    );
  }

  const enableDiagrams = profile?.plan === "lifetime";

  // Un document assez long dépasse la limite de débit Groq en un seul appel
  // et doit être découpé, ce qui prend plusieurs minutes — au-delà des 60s
  // max d'une fonction Vercel sur le plan gratuit. Le navigateur pilote alors
  // la suite via generate-notes/chunk puis generate-notes/finalize.
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
    console.error("Erreur Groq API (import PDF):", error);
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
