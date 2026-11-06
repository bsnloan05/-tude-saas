import { NextRequest, NextResponse } from "next/server";
import { getDocumentProxy, extractText } from "unpdf";
import { createClient } from "@/lib/supabase/server";
import { hasRevisionAccess } from "@/lib/plans";

export const maxDuration = 60;

const BUCKET = "audio-imports";
// Même plafond que /api/import-pdf (le bucket de stockage plafonne déjà à
// 25 Mo, on reste un peu en dessous côté PDF pour garder de la marge).
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

// Extraction de texte pour la section Révision : logique identique à
// /api/import-pdf, mais dans une route séparée (contrôle d'accès différent —
// Révision est ouverte au forfait Standard, pas l'import PDF classique — et
// pas de génération de fiche ici, juste le texte brut renvoyé au navigateur
// pour générer des flashcards/quiz ensuite).
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

  if (!hasRevisionAccess(profile?.plan)) {
    return NextResponse.json(
      {
        error: "La révision (flashcards/quiz) est réservée aux forfaits payants.",
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
    console.error("Erreur extraction PDF (révision):", error);
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

  return NextResponse.json({ text: extractedText });
}
