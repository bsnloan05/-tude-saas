"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ficheTitle } from "@/lib/ficheTitle";

interface Fiche {
  id: string;
  content: string;
  title: string | null;
  created_at: string;
}

// Doit correspondre à DELAY_BETWEEN_CALLS_MS dans lib/fiche-generation.ts
// (pause nécessaire entre deux appels Groq pour respecter sa limite de débit
// par minute) — même contrainte que pour la génération de fiche classique.
const CHUNK_DELAY_MS = 60000;

export default function RevisionCreate({ type }: { type: "flashcards" | "quiz" }) {
  const router = useRouter();
  const [fiches, setFiches] = useState<Fiche[] | null>(null);
  const [selectedFicheId, setSelectedFicheId] = useState("");
  const [status, setStatus] = useState<"idle" | "generating" | "error">("idle");
  const [progress, setProgress] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPlanError, setIsPlanError] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("fiches")
      .select("id, content, title, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => setFiches(data ?? []));
  }, []);

  const label = type === "flashcards" ? "flashcards" : "quiz";
  const endpoint = `/api/revision/${type}`;
  const finalizeEndpoint = `/api/revision/${type}/finalize`;

  const runChunkedGeneration = async (
    chunks: string[],
    title: string | null,
    sourceFicheId: string | null,
  ): Promise<string> => {
    const condensedChunks: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      if (i > 0) {
        setProgress(`Pause anti-surcharge avant la suite (${i}/${chunks.length})...`);
        await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY_MS));
      }
      setProgress(`Lecture du contenu (${i + 1}/${chunks.length})...`);

      const response = await fetch("/api/generate-notes/chunk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chunk: chunks[i], source: "document" }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "La génération a échoué.");
      }
      const data = await response.json();
      condensedChunks.push(data.condensed ?? "");
    }

    setProgress(`Génération des ${label}...`);
    await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY_MS));

    const finalResponse = await fetch(finalizeEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ condensedChunks, title, sourceFicheId }),
    });
    if (!finalResponse.ok) {
      const data = await finalResponse.json().catch(() => ({}));
      if (data.code === "plan_required") setIsPlanError(true);
      throw new Error(data.error || "La génération a échoué.");
    }
    const finalData = await finalResponse.json();
    return finalData.setId;
  };

  const generateFrom = async (
    text: string,
    title: string | null,
    sourceFicheId: string | null,
  ) => {
    setStatus("generating");
    setErrorMessage("");
    setIsPlanError(false);
    setProgress(`Génération des ${label}...`);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, title, sourceFicheId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.code === "plan_required") setIsPlanError(true);
        throw new Error(data.error || "La génération a échoué.");
      }
      const data = await response.json();
      const setId = data.needsChunking
        ? await runChunkedGeneration(data.chunks, title, sourceFicheId)
        : data.setId;

      router.push(`/app/revision/${type}/${setId}`);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Une erreur est survenue.");
    }
  };

  const handlePickFiche = () => {
    const fiche = fiches?.find((f) => f.id === selectedFicheId);
    if (!fiche) return;
    generateFrom(fiche.content, ficheTitle(fiche.title, fiche.content), fiche.id);
  };

  const handlePdfChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setStatus("error");
      setErrorMessage("Ce PDF est trop lourd (20 Mo maximum).");
      return;
    }

    setStatus("generating");
    setErrorMessage("");
    setIsPlanError(false);
    setProgress("Envoi du PDF...");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const path = `${user.id}/${crypto.randomUUID()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("audio-imports")
        .upload(path, file, { contentType: "application/pdf" });
      if (uploadError) {
        throw new Error("L'envoi du PDF a échoué.");
      }

      setProgress("Lecture du PDF...");
      const extractResponse = await fetch("/api/revision/extract-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      if (!extractResponse.ok) {
        const data = await extractResponse.json().catch(() => ({}));
        if (data.code === "plan_required") setIsPlanError(true);
        throw new Error(data.error || "L'import a échoué.");
      }
      const { text } = await extractResponse.json();
      await generateFrom(text, file.name.replace(/\.pdf$/i, ""), null);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Une erreur est survenue.");
    }
  };

  if (status === "generating") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-[#232d45] bg-[#0d1424]/60 p-8 text-center">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#38bdf8]" />
        <p className="text-sm text-[#8b97b0]">{progress}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {errorMessage && (
        <div className="rounded-md border border-red-900/50 bg-red-950/50 px-3 py-2 text-sm text-red-200">
          <p>{errorMessage}</p>
          {isPlanError && (
            <Link
              href="/pricing"
              className="mt-2 inline-block font-medium text-[#38bdf8] hover:underline"
            >
              Voir les tarifs
            </Link>
          )}
        </div>
      )}

      <div className="rounded-lg border border-[#232d45] bg-[#0d1424]/60 p-5">
        <h2 className="mb-3 text-sm font-semibold text-[#e7ecf5]">
          Depuis une fiche existante
        </h2>
        {fiches === null ? (
          <p className="text-sm text-[#8b97b0]">Chargement...</p>
        ) : fiches.length === 0 ? (
          <p className="text-sm text-[#8b97b0]">
            Tu n&apos;as encore aucune fiche. Importe plutôt un PDF ci-dessous.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedFicheId}
              onChange={(event) => setSelectedFicheId(event.target.value)}
              className="min-w-0 flex-1 rounded-md border border-[#2a3552] bg-[#0b1120] px-3 py-2 text-sm text-[#e7ecf5]"
            >
              <option value="">Choisis une fiche...</option>
              {fiches.map((fiche) => (
                <option key={fiche.id} value={fiche.id}>
                  {ficheTitle(fiche.title, fiche.content)}
                </option>
              ))}
            </select>
            <button
              onClick={handlePickFiche}
              disabled={!selectedFicheId}
              className="rounded-full bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Générer
            </button>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-[#232d45] bg-[#0d1424]/60 p-5">
        <h2 className="mb-3 text-sm font-semibold text-[#e7ecf5]">
          Depuis un nouveau PDF
        </h2>
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handlePdfChange}
        />
        <button
          onClick={() => pdfInputRef.current?.click()}
          className="rounded-full border border-[#2a3552] px-4 py-2 text-sm font-medium text-[#c3cbdc] transition-colors transition-transform duration-150 hover:bg-[#1b2440] active:scale-95"
        >
          Importer un PDF
        </button>
      </div>
    </div>
  );
}
