import { marked } from "marked";

export function downloadFichePdf(
  notes: string,
  highlightMode: boolean,
  onError: (message: string) => void,
) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    onError("Impossible d'ouvrir la fenêtre d'impression. Autorise les pop-ups pour ce site.");
    return;
  }

  const headingColor = highlightMode ? "#b45309" : "#1f2937";
  const subheadingColor = highlightMode ? "#0f766e" : "#4b5563";
  const strongBg = highlightMode ? "#fef3c7" : "transparent";
  const strongColor = highlightMode ? "#78350f" : "#1f2937";
  const blockquoteBorder = highlightMode ? "#10b981" : "#9ca3af";
  const blockquoteBg = highlightMode ? "#ecfdf5" : "transparent";
  const blockquoteColor = highlightMode ? "#065f46" : "#4b5563";

  Promise.resolve(marked.parse(notes)).then((html) => {
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Fiche de cours</title>
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    background: #fbf6ea;
    color: #1f2937;
    max-width: 700px;
    margin: 0 auto;
    padding: 32px 32px 32px 56px;
    line-height: 1.6;
  }
  h2 { color: ${headingColor}; font-size: 1.5em; margin-top: 1.5em; }
  h2:first-child { margin-top: 0; }
  h3 { color: ${subheadingColor}; font-size: 1.1em; margin-top: 1.2em; }
  strong { background: ${strongBg}; color: ${strongColor}; padding: 0 2px; border-radius: 2px; }
  blockquote {
    border-left: 4px solid ${blockquoteBorder};
    background: ${blockquoteBg};
    color: ${blockquoteColor};
    margin: 1em 0;
    padding: 0.5em 1em;
    border-radius: 0 6px 6px 0;
  }
  blockquote p { margin: 0; }
  ul { padding-left: 1.5em; }
  li { margin-bottom: 0.4em; }
</style>
</head>
<body>${html}</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 150);
  });
}
