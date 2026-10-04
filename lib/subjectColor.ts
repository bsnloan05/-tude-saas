export const NO_SUBJECT_LABEL = "Sans matière";

// Couleur stable par matière (même nom = même couleur à chaque chargement),
// choisie parmi une palette fixe plutôt que générée au hasard.
const SUBJECT_COLORS = [
  "text-[#38bdf8]", // bleu
  "text-emerald-400",
  "text-amber-400",
  "text-violet-400",
  "text-rose-400",
  "text-teal-400",
  "text-orange-400",
  "text-sky-400",
];

export function subjectColorClass(subject: string): string {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = (hash * 31 + subject.charCodeAt(i)) | 0;
  }
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
}
