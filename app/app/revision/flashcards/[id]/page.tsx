"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface FlashcardItem {
  front: string;
  back: string;
}

export default function FlashcardsPracticePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [cards, setCards] = useState<FlashcardItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("flashcard_sets")
      .select("title, cards")
      .eq("id", params.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data || !Array.isArray(data.cards) || data.cards.length === 0) {
          setError("Ce set de flashcards est introuvable.");
          return;
        }
        setTitle(data.title || "Flashcards");
        setCards(data.cards);
      });
  }, [params.id]);

  const handleDelete = async () => {
    if (!window.confirm("Supprimer définitivement ces flashcards ?")) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("flashcard_sets").delete().eq("id", params.id);
    router.push("/app/revision");
  };

  if (error) {
    return (
      <div className="flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-xl text-center">
          <p className="mb-4 text-sm text-red-200">{error}</p>
          <Link href="/app/revision" className="text-sm font-medium text-[#38bdf8] hover:underline">
            ← Retour à Révision
          </Link>
        </div>
      </div>
    );
  }

  if (!cards) {
    return (
      <div className="flex flex-col items-center px-4 py-12">
        <p className="text-sm text-[#8b97b0]">Chargement...</p>
      </div>
    );
  }

  const card = cards[index];

  return (
    <div className="flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/app/revision"
            className="text-sm font-medium text-[#8b97b0] transition-colors hover:text-[#e7ecf5]"
          >
            ← Révision
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm font-medium text-red-300 transition-colors hover:text-red-200 disabled:opacity-50"
          >
            Supprimer
          </button>
        </div>

        <h1 className="mb-1 text-xl font-bold text-[#e7ecf5]">{title}</h1>
        <p className="mb-6 text-sm text-[#8b97b0]">
          Carte {index + 1} / {cards.length}
        </p>

        <button
          onClick={() => setFlipped((f) => !f)}
          className="flex min-h-56 w-full flex-col items-center justify-center rounded-xl border border-[#232d45] bg-[#0d1424]/60 p-8 text-center transition-colors duration-150 hover:bg-[#121a30]"
        >
          <span className="mb-3 text-xs font-semibold tracking-wide text-[#6b7690] uppercase">
            {flipped ? "Réponse" : "Question"}
          </span>
          <span className="text-lg font-medium text-[#e7ecf5]">
            {flipped ? card.back : card.front}
          </span>
          <span className="mt-4 text-xs text-[#6b7690]">Clique pour retourner</span>
        </button>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              setIndex((i) => Math.max(0, i - 1));
              setFlipped(false);
            }}
            disabled={index === 0}
            className="rounded-full border border-[#2a3552] px-5 py-2 text-sm font-medium text-[#c3cbdc] transition-colors transition-transform duration-150 hover:bg-[#1b2440] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Précédent
          </button>
          <button
            onClick={() => {
              setIndex((i) => Math.min(cards.length - 1, i + 1));
              setFlipped(false);
            }}
            disabled={index === cards.length - 1}
            className="rounded-full bg-[#2563eb] px-5 py-2 text-sm font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  );
}
