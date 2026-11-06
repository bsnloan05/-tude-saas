"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { hasRevisionAccess } from "@/lib/plans";

interface SetRow {
  id: string;
  title: string | null;
  created_at: string;
  count: number;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function RevisionHubPage() {
  const [plan, setPlan] = useState<string | null>(null);
  const [flashcardSets, setFlashcardSets] = useState<SetRow[] | null>(null);
  const [quizSets, setQuizSets] = useState<SetRow[] | null>(null);

  useEffect(() => {
    fetch("/api/usage")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setPlan(data?.plan ?? "free"));

    const supabase = createClient();
    supabase
      .from("flashcard_sets")
      .select("id, title, created_at, cards")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setFlashcardSets(
          (data ?? []).map((row) => ({
            id: row.id,
            title: row.title,
            created_at: row.created_at,
            count: Array.isArray(row.cards) ? row.cards.length : 0,
          })),
        );
      });
    supabase
      .from("quiz_sets")
      .select("id, title, created_at, questions")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setQuizSets(
          (data ?? []).map((row) => ({
            id: row.id,
            title: row.title,
            created_at: row.created_at,
            count: Array.isArray(row.questions) ? row.questions.length : 0,
          })),
        );
      });
  }, []);

  if (plan !== null && !hasRevisionAccess(plan)) {
    return (
      <div className="flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-2xl rounded-lg border border-[#232d45] bg-[#0d1424]/60 p-8 text-center">
          <h1 className="mb-2 text-xl font-bold text-[#e7ecf5]">Révision</h1>
          <p className="mb-5 text-sm text-[#8b97b0]">
            Les flashcards et quiz sont réservés aux forfaits payants.
          </p>
          <Link
            href="/pricing"
            className="inline-block rounded-full bg-[#2563eb] px-5 py-2 text-sm font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95"
          >
            Voir les tarifs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-3xl">
        <h1 className="mb-2 text-2xl font-bold text-[#e7ecf5]">Révision</h1>
        <p className="mb-8 text-sm text-[#8b97b0]">
          Entraîne-toi à partir de tes fiches, en flashcards ou en quiz.
        </p>

        <div className="mb-10 grid gap-4 sm:grid-cols-2">
          <Link
            href="/app/revision/flashcards/new"
            className="flex flex-col gap-2 rounded-lg border border-[#232d45] bg-[#0d1424]/60 p-6 transition-colors duration-150 hover:bg-[#121a30]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7 text-[#38bdf8]">
              <rect x="4" y="5" width="13" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 2v4M13 2v4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M20 8v11a2 2 0 01-2 2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-lg font-semibold text-[#e7ecf5]">Flashcards</span>
            <span className="text-sm text-[#8b97b0]">
              Des cartes recto/verso pour mémoriser rapidement.
            </span>
          </Link>
          <Link
            href="/app/revision/quiz/new"
            className="flex flex-col gap-2 rounded-lg border border-[#232d45] bg-[#0d1424]/60 p-6 transition-colors duration-150 hover:bg-[#121a30]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7 text-[#38bdf8]">
              <circle cx="12" cy="12" r="9" />
              <path d="M9.5 9.5a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="16.5" r="0.5" fill="currentColor" />
            </svg>
            <span className="text-lg font-semibold text-[#e7ecf5]">Quiz</span>
            <span className="text-sm text-[#8b97b0]">
              Des questions à choix multiples pour te tester.
            </span>
          </Link>
        </div>

        {flashcardSets && flashcardSets.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-xs font-semibold tracking-wide text-[#6b7690] uppercase">
              Mes flashcards
            </h2>
            <div className="flex flex-col gap-2">
              {flashcardSets.map((set) => (
                <Link
                  key={set.id}
                  href={`/app/revision/flashcards/${set.id}`}
                  className="flex items-center justify-between rounded-md border border-[#232d45] bg-[#0d1424]/60 px-4 py-3 transition-colors duration-150 hover:bg-[#121a30]"
                >
                  <span className="truncate text-sm font-medium text-[#e7ecf5]">
                    {set.title || "Flashcards"}
                  </span>
                  <span className="shrink-0 text-xs text-[#6b7690]">
                    {set.count} cartes · {formatDate(set.created_at)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {quizSets && quizSets.length > 0 && (
          <div>
            <h2 className="mb-3 text-xs font-semibold tracking-wide text-[#6b7690] uppercase">
              Mes quiz
            </h2>
            <div className="flex flex-col gap-2">
              {quizSets.map((set) => (
                <Link
                  key={set.id}
                  href={`/app/revision/quiz/${set.id}`}
                  className="flex items-center justify-between rounded-md border border-[#232d45] bg-[#0d1424]/60 px-4 py-3 transition-colors duration-150 hover:bg-[#121a30]"
                >
                  <span className="truncate text-sm font-medium text-[#e7ecf5]">
                    {set.title || "Quiz"}
                  </span>
                  <span className="shrink-0 text-xs text-[#6b7690]">
                    {set.count} questions · {formatDate(set.created_at)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
