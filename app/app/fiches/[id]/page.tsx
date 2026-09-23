"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { marked } from "marked";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import FicheContent from "@/components/FicheContent";
import { downloadFichePdf } from "@/lib/downloadFichePdf";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FicheDetailPage() {
  const params = useParams<{ id: string }>();
  const [notes, setNotes] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [highlightMode, setHighlightMode] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("fiches")
      .select("content, created_at")
      .eq("id", params.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setError("Cette fiche est introuvable.");
          return;
        }
        setNotes(data.content);
        setCreatedAt(data.created_at);
      });
  }, [params.id]);

  return (
    <div className="dot-grid flex min-h-screen flex-col items-center bg-[#0b1120] px-4 py-12">
      <div className="mb-10 flex w-full max-w-2xl items-center justify-between">
        <Link
          href="/app/fiches"
          className="text-sm font-medium text-[#8b97b0] transition-colors transition-transform duration-150 hover:text-[#e7ecf5] active:scale-95"
        >
          ← Mes fiches
        </Link>
        <span className="text-sm font-semibold text-[#e7ecf5]">Elyo</span>
      </div>

      <div className="w-full max-w-2xl">
        {error && (
          <p className="rounded-md border border-red-900/50 bg-red-950/50 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        {!error && notes === null && (
          <p className="text-sm text-[#8b97b0]">Chargement...</p>
        )}

        {!error && notes !== null && (
          <div className="fiche-enter rounded-lg border border-[#232d45] bg-[#141b2e] p-6">
            <div className="mb-5 flex flex-col gap-3 border-b border-[#232d45] pb-4 sm:flex-row sm:items-center sm:justify-between">
              {createdAt && (
                <p className="text-xs text-[#8b97b0]">{formatDate(createdAt)}</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-full bg-[#0b1120] p-1 text-xs font-medium">
                  <button
                    onClick={() => setHighlightMode(false)}
                    className={`rounded-full px-3 py-1 transition-colors transition-transform duration-150 active:scale-95 ${
                      !highlightMode
                        ? "bg-[#2563eb] text-white"
                        : "text-[#8b97b0] hover:text-[#e7ecf5]"
                    }`}
                  >
                    Sobre
                  </button>
                  <button
                    onClick={() => setHighlightMode(true)}
                    className={`rounded-full px-3 py-1 transition-colors transition-transform duration-150 active:scale-95 ${
                      highlightMode
                        ? "bg-[#2563eb] text-white"
                        : "text-[#8b97b0] hover:text-[#e7ecf5]"
                    }`}
                  >
                    Surligné
                  </button>
                </div>
                <button
                  onClick={async () => {
                    const html = await marked.parse(notes);
                    await navigator.clipboard.write([
                      new ClipboardItem({
                        "text/html": new Blob([html], { type: "text/html" }),
                        "text/plain": new Blob([notes], { type: "text/plain" }),
                      }),
                    ]);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="rounded-full border border-[#2a3552] px-3 py-1.5 text-xs font-medium text-[#c3cbdc] transition-colors transition-transform duration-150 hover:bg-[#1b2440] active:scale-95 sm:px-4 sm:text-sm"
                >
                  {copied ? "Copié !" : "Copier la fiche"}
                </button>
                <button
                  onClick={() =>
                    downloadFichePdf(notes, highlightMode, (message) => setError(message))
                  }
                  className="rounded-full border border-[#2a3552] px-3 py-1.5 text-xs font-medium text-[#c3cbdc] transition-colors transition-transform duration-150 hover:bg-[#1b2440] active:scale-95 sm:px-4 sm:text-sm"
                >
                  Télécharger en PDF
                </button>
              </div>
            </div>
            <FicheContent notes={notes} highlightMode={highlightMode} />
          </div>
        )}
      </div>
    </div>
  );
}
