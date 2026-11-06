"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export default function QuizPracticePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  // Résultat de la tentative précédente (avant celle en cours), affiché à
  // côté du score actuel une fois le quiz terminé. null tant qu'il n'y a
  // jamais eu de tentative précédente sur ce quiz.
  const [previousScore, setPreviousScore] = useState<{ score: number; total: number } | null>(
    null,
  );

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("quiz_sets")
      .select("title, questions, last_score, last_total")
      .eq("id", params.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data || !Array.isArray(data.questions) || data.questions.length === 0) {
          setError("Ce quiz est introuvable.");
          return;
        }
        setTitle(data.title || "Quiz");
        setQuestions(data.questions);
        if (typeof data.last_score === "number" && typeof data.last_total === "number") {
          setPreviousScore({ score: data.last_score, total: data.last_total });
        }
      });
  }, [params.id]);

  const handleDelete = async () => {
    if (!window.confirm("Supprimer définitivement ce quiz ?")) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("quiz_sets").delete().eq("id", params.id);
    router.push("/app/revision");
  };

  const finishQuiz = (finalScore: number) => {
    setFinished(true);
    const supabase = createClient();
    supabase
      .from("quiz_sets")
      .update({ last_score: finalScore, last_total: questions?.length ?? 0 })
      .eq("id", params.id)
      .then(() => {});
  };

  const restart = () => {
    // La note qu'on vient d'afficher devient la "précédente" pour la
    // prochaine tentative, avant de remettre le score courant à zéro.
    if (questions) setPreviousScore({ score, total: questions.length });
    setIndex(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
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

  if (!questions) {
    return (
      <div className="flex flex-col items-center px-4 py-12">
        <p className="text-sm text-[#8b97b0]">Chargement...</p>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center px-4 py-16">
        <div className="w-full max-w-2xl text-center">
          <h1 className="mb-3 text-3xl font-bold text-[#e7ecf5]">{title}</h1>
          <p className="mb-10 text-base text-[#8b97b0]">Quiz terminé</p>
          {(() => {
            // Bleu = meilleur score des deux, rouge = le moins bon. Si égal
            // (ou pas de tentative précédente), les deux/le score actuel
            // restent en bleu, par défaut neutre.
            const currentColor =
              previousScore && score < previousScore.score ? "text-red-400" : "text-[#38bdf8]";
            const previousColor =
              previousScore && score > previousScore.score ? "text-red-400" : "text-[#38bdf8]";
            return (
              <>
                <p className={`mb-3 text-7xl font-bold ${currentColor}`}>
                  {score} / {questions.length}
                </p>
                <p className="mb-12 text-base text-[#8b97b0]">
                  {previousScore ? (
                    <>
                      Tentative précédente :{" "}
                      <span className={`font-semibold ${previousColor}`}>
                        {previousScore.score} / {previousScore.total}
                      </span>
                    </>
                  ) : (
                    "Première tentative sur ce quiz"
                  )}
                </p>
              </>
            );
          })()}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={restart}
              className="rounded-full bg-[#2563eb] px-8 py-3.5 text-base font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95"
            >
              Recommencer
            </button>
            <Link
              href="/app/revision"
              className="rounded-full border border-[#2a3552] px-8 py-3.5 text-base font-medium text-[#c3cbdc] transition-colors transition-transform duration-150 hover:bg-[#1b2440] active:scale-95"
            >
              Retour à Révision
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[index];

  return (
    <div className="flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/app/revision"
            className="text-base font-medium text-[#8b97b0] transition-colors hover:text-[#e7ecf5]"
          >
            ← Révision
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-base font-medium text-red-300 transition-colors hover:text-red-200 disabled:opacity-50"
          >
            Supprimer
          </button>
        </div>

        <h1 className="mb-1 text-3xl font-bold text-[#e7ecf5]">{title}</h1>
        <p className="mb-8 text-base text-[#8b97b0]">
          Question {index + 1} / {questions.length}
        </p>

        <div className="rounded-xl border border-[#232d45] bg-[#0d1424]/60 p-10">
          <p className="mb-8 text-xl font-medium text-[#e7ecf5]">{q.question}</p>
          <div className="flex flex-col gap-3.5">
            {q.options.map((option, optionIndex) => {
              const isCorrect = optionIndex === q.correctIndex;
              const isSelected = optionIndex === selected;
              const showFeedback = selected !== null;

              let style =
                "border-[#2a3552] bg-[#0b1120] text-[#c3cbdc] hover:bg-[#1b2440]";
              if (showFeedback && isCorrect) {
                style = "border-emerald-500 bg-emerald-500/10 text-emerald-200";
              } else if (showFeedback && isSelected && !isCorrect) {
                style = "border-red-600 bg-red-950/50 text-red-200";
              }

              return (
                <button
                  key={optionIndex}
                  onClick={() => {
                    if (selected !== null) return;
                    setSelected(optionIndex);
                    if (isCorrect) setScore((s) => s + 1);
                  }}
                  disabled={selected !== null}
                  className={`rounded-md border px-5 py-3.5 text-left text-base font-medium transition-colors duration-150 disabled:cursor-default ${style}`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        {selected !== null && (
          <div className="mt-8 flex justify-end">
            <button
              onClick={() => {
                if (index + 1 < questions.length) {
                  setIndex((i) => i + 1);
                  setSelected(null);
                } else {
                  finishQuiz(score);
                }
              }}
              className="rounded-full bg-[#2563eb] px-7 py-3 text-base font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95"
            >
              {index + 1 < questions.length ? "Suivant" : "Voir le score"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
