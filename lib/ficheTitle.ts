// Nom affiché pour une fiche : le titre personnalisé s'il existe, sinon
// dérivé automatiquement du contenu (premier titre ## ou première ligne).
export function ficheTitle(title: string | null | undefined, content: string): string {
  if (title?.trim()) return title.trim();
  const firstHeading = content.match(/^##\s+(.+)$/m);
  if (firstHeading) return firstHeading[1].trim();
  const firstLine = content.split("\n").find((line) => line.trim().length > 0);
  return firstLine?.trim() ?? "Fiche de révision";
}
