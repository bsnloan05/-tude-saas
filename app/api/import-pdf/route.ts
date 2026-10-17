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

const BUCKET = "audio-imports";
// Le bucket de stockage plafonne déjà à 25 Mo ; on reste un peu en dessous
// côté PDF pour garder de la marge.
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

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

  const { path } = await request.json();

  // On ne fait jamais confiance au chemin fourni par le client : il doit
  // obligatoirement commencer par l'identifiant de l'utilisateur connecté,
  // comme l'exigent déjà les règles de sécurité du stockage.
  if (typeof path !== "string" || !path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Fichier invalide." }, { status: 400 });
  }

  const cleanup = async () => {
    await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
  };

  const folder = path.slice(0, path.lastIndexOf("/"));
  const filename = path.slice(path.lastIndexOf("/") + 1);
  const { data: filesInFolder } = await supabase.storage.from(BUCKET).list(folder);
  const fileInfo = filesInFolder?.find((f) => f.name === filename);

  if (!fileInfo) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }
  if ((fileInfo.metadata?.size ?? 0) > MAX_FILE_SIZE_BYTES) {
    await cleanup();
    return NextResponse.json(
      { error: "Ce PDF est trop lourd (20 Mo maximum)." },
      { status: 400 },
    );
  }

  let extractedText = "";
  try {
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(path);
    if (downloadError || !fileBlob) {
      throw downloadError ?? new Error("Téléchargement impossible.");
    }

    const buffer = new Uint8Array(await fileBlob.arrayBuffer());
    const pdf = await getDocumentProxy(buffer);
    const { text } = await extractText(pdf, { mergePages: true });
    extractedText = text.trim();
  } catch (error) {
    console.error("Erreur extraction PDF:", error);
    await cleanup();
    return NextResponse.json(
      { error: "Impossible de lire ce PDF. Vérifie qu'il n'est pas protégé par un mot de passe ou corrompu." },
      { status: 400 },
    );
  }

  await cleanup();

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
