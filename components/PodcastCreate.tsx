"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ficheTitle } from "@/lib/ficheTitle";
import { hasRevisionAccess } from "@/lib/plans";
import PodcastLive from "@/components/PodcastLive";

interface Fiche {
  id: string;
  content: string;
  title: string | null;
  created_at: string;
}

// Doit correspondre à PODCAST_SOURCE_MAX_CHARS dans lib/podcast-conversation.ts
// (dupliqué ici plutôt qu'importé pour ne pas faire entrer groq-sdk, utilisé
// par ce fichier serveur, dans le bundle client — même logique que
// CHUNK_DELAY_MS dans RevisionCreate.tsx).
const PODCAST_SOURCE_MAX_CHARS = 6000;

export default function PodcastCreate() {
  const router = useRouter();
  const [fiches, setFiches] = useState<Fiche[] | null>(null);
  const [selectedFicheId, setSelectedFicheId] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPlanError, setIsPlanError] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [source, setSource] = useState<{ text: string; title: string | null } | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetch("/api/usage")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setPlan(data?.plan ?? "free"));

    const supabase = createClient();
    supabase
      .from("fiches")
      .select("id, content, title, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => setFiches(data ?? []));
  }, []);

  // Laisse les comptes gratuits voir et essayer cette page (choisir une
  // fiche, importer un PDF) : le mur de paiement n'arrive qu'au moment de
  // vraiment démarrer la conversation, comme pour flashcards/quiz.
  const redirectToPaywall = () => {
    window.posthog?.capture("free_paywall_redirect", { source: "revision_podcast" });
    setStatus("loading");
    setTimeout(() => {
      router.push("/pricing?from=revision");
    }, 1500);
  };

  const startFromFiche = () => {
    const fiche = fiches?.find((f) => f.id === selectedFicheId);
    if (!fiche) return;
    if (!hasRevisionAccess(plan)) {
      redirectToPaywall();
      return;
    }
    setSource({
      text: fiche.content.slice(0, PODCAST_SOURCE_MAX_CHARS),
      title: ficheTitle(fiche.title, fiche.content),
    });
  };

  const handlePdfChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!hasRevisionAccess(plan)) {
      redirectToPaywall();
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setStatus("error");
      setErrorMessage("Ce PDF est trop lourd (20 Mo maximum).");
      return;
    }

    setStatus("loading");
    setErrorMessage("");
    setIsPlanError(false);
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
      setSource({
        text: (text as string).slice(0, PODCAST_SOURCE_MAX_CHARS),
        title: file.name.replace(/\.pdf$/i, ""),
      });
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Une erreur est survenue.");
    }
  };

  if (source) {
    return (
      <PodcastLive
        sourceText={source.text}
        title={source.title}
        onExit={() => setSource(null)}
      />
    );
  }

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-[#232d45] bg-[#0d1424]/60 p-12 text-center">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#38bdf8]" />
        <p className="text-base text-[#8b97b0]">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {errorMessage && (
        <div className="rounded-md border border-red-900/50 bg-red-950/50 px-4 py-3 text-base text-red-200">
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

      <div className="rounded-xl border border-[#232d45] bg-[#0d1424]/60 p-8">
        <h2 className="mb-5 text-lg font-semibold text-[#e7ecf5]">
          Depuis une fiche existante
        </h2>
        {fiches === null ? (
          <p className="text-base text-[#8b97b0]">Chargement...</p>
        ) : fiches.length === 0 ? (
          <p className="text-base text-[#8b97b0]">
            Tu n&apos;as encore aucune fiche. Importe plutôt un PDF ci-dessous.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <select
              value={selectedFicheId}
              onChange={(event) => setSelectedFicheId(event.target.value)}
              className="min-w-0 flex-1 rounded-md border border-[#2a3552] bg-[#0b1120] px-4 py-3 text-base text-[#e7ecf5]"
            >
              <option value="">Choisis une fiche...</option>
              {fiches.map((fiche) => (
                <option key={fiche.id} value={fiche.id}>
                  {ficheTitle(fiche.title, fiche.content)}
                </option>
              ))}
            </select>
            <button
              onClick={startFromFiche}
              disabled={!selectedFicheId}
              className="rounded-full bg-[#2563eb] px-6 py-3 text-base font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Démarrer
            </button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#232d45] bg-[#0d1424]/60 p-8">
        <h2 className="mb-5 text-lg font-semibold text-[#e7ecf5]">
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
          className="rounded-full border border-[#2a3552] px-6 py-3 text-base font-medium text-[#c3cbdc] transition-colors transition-transform duration-150 hover:bg-[#1b2440] active:scale-95"
        >
          Importer un PDF
        </button>
      </div>
    </div>
  );
}
