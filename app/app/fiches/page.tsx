"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Fiche {
  id: string;
  content: string;
  created_at: string;
}

function ficheTitle(content: string): string {
  const firstHeading = content.match(/^##\s+(.+)$/m);
  if (firstHeading) return firstHeading[1].trim();
  const firstLine = content.split("\n").find((line) => line.trim().length > 0);
  return firstLine?.trim() ?? "Fiche de révision";
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

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("fiches")
      .select("id, content, created_at")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          setError("Impossible de charger tes fiches.");
          return;
        }
        setFiches(data ?? []);
      });
  }, []);

  return (
    <div className="dot-grid flex min-h-screen flex-col items-center bg-[#0b1120] px-4 py-12">
      <div className="mb-10 flex w-full max-w-2xl items-center justify-between">
        <Link
          href="/app"
          className="text-sm font-medium text-[#8b97b0] transition-colors transition-transform duration-150 hover:text-[#e7ecf5] active:scale-95"
        >
          ← Retour
        </Link>
        <span className="text-sm font-semibold text-[#e7ecf5]">Elyo</span>
      </div>

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
          <ul className="flex flex-col gap-3">
            {fiches.map((fiche) => (
              <li key={fiche.id}>
                <Link
                  href={`/app/fiches/${fiche.id}`}
                  className="block rounded-lg border border-[#232d45] bg-[#141b2e] p-4 transition-colors transition-transform duration-150 hover:border-[#2a3552] hover:bg-[#1b2440] active:scale-[0.99]"
                >
                  <p className="truncate text-sm font-medium text-[#e7ecf5]">
                    {ficheTitle(fiche.content)}
                  </p>
                  <p className="mt-1 text-xs text-[#8b97b0]">
                    {formatDate(fiche.created_at)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
