"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ficheTitle } from "@/lib/ficheTitle";
import { NO_SUBJECT_LABEL, subjectColorClass } from "@/lib/subjectColor";

interface Fiche {
  id: string;
  content: string;
  created_at: string;
  subject: string | null;
  title: string | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FichesPage() {
  const [fiches, setFiches] = useState<Fiche[] | null>(null);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("fiches")
      .select("id, content, created_at, subject, title")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          setError("Impossible de charger tes fiches.");
          return;
        }
        setFiches(data ?? []);
      });
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer définitivement cette fiche ?")) return;
    setDeletingId(id);
    const supabase = createClient();
    const { error } = await supabase.from("fiches").delete().eq("id", id);
    setDeletingId(null);
    if (error) {
      setError("Impossible de supprimer cette fiche.");
      return;
    }
    setFiches((prev) => prev?.filter((f) => f.id !== id) ?? null);
  };

  // Regroupe les fiches par matière, "Sans matière" toujours en dernier,
  // les autres triées alphabétiquement.
  const groups = useMemo(() => {
    if (!fiches) return [];
    const map = new Map<string, Fiche[]>();
    for (const fiche of fiches) {
      const key = fiche.subject?.trim() || NO_SUBJECT_LABEL;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(fiche);
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === NO_SUBJECT_LABEL) return 1;
      if (b === NO_SUBJECT_LABEL) return -1;
      return a.localeCompare(b, "fr");
    });
  }, [fiches]);

  return (
    <div className="flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <h1 className="mb-8 text-2xl font-bold text-[#e7ecf5]">Mes fiches</h1>

        {error && (
          <p className="rounded-md border border-red-900/50 bg-red-950/50 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        {!error && fiches === null && (
          <p className="text-sm text-[#8b97b0]">Chargement...</p>
        )}

        {!error && fiches !== null && fiches.length === 0 && (
          <div className="rounded-lg border border-[#232d45] bg-[#141b2e] p-8 text-center">
            <p className="text-sm text-[#8b97b0]">
              Tu n&apos;as encore aucune fiche enregistrée. Génère ta première
              fiche depuis la page principale !
            </p>
            <Link
              href="/app"
              className="mt-4 inline-block rounded-full bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95"
            >
              Créer une fiche
            </Link>
          </div>
        )}

        {!error && fiches !== null && fiches.length > 0 && (
          <div className="flex flex-col gap-8">
            {groups.map(([subject, subjectFiches]) => (
              <div key={subject} id={encodeURIComponent(subject)} className="scroll-mt-6">
                <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                  {subject === NO_SUBJECT_LABEL ? (
                    <span className="text-[#8b97b0]">{subject}</span>
                  ) : (
                    <span
                      className={`name-glow rounded-full px-2.5 py-1 ${subjectColorClass(subject)}`}
                    >
                      {subject}
                    </span>
                  )}
                  <span className="rounded-full bg-[#232d45] px-2 py-0.5 text-[#8b97b0]">
                    {subjectFiches.length}
                  </span>
                </h2>
                <ul className="flex flex-col gap-3">
                  {subjectFiches.map((fiche) => (
                    <li key={fiche.id} className="relative">
                      <Link
                        href={`/app/fiches/${fiche.id}`}
                        className="block rounded-lg border border-[#232d45] bg-[#141b2e] p-4 pr-12 transition-colors transition-transform duration-150 hover:border-[#2a3552] hover:bg-[#1b2440] active:scale-[0.99]"
                      >
                        <p className="truncate text-sm font-medium text-[#e7ecf5]">
                          {ficheTitle(fiche.title, fiche.content)}
                        </p>
                        <p className="mt-1 text-xs text-[#8b97b0]">
                          {formatDate(fiche.created_at)}
                        </p>
                      </Link>
                      <button
                        onClick={() => handleDelete(fiche.id)}
                        disabled={deletingId === fiche.id}
                        aria-label="Supprimer la fiche"
                        className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full text-[#6b7690] transition-colors transition-transform duration-150 hover:bg-red-950/50 hover:text-red-300 active:scale-90 disabled:opacity-50"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                          <path d="M4 7h16M9 7V4h6v3m-8 0 1 13a1 1 0 001 1h6a1 1 0 001-1l1-13" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
