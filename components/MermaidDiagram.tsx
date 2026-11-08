"use client";

import { useEffect, useId, useRef, useState } from "react";
import mermaid from "mermaid";

// Filet de sécurité : malgré la consigne du prompt, le modèle laisse parfois
// échapper des parenthèses/deux-points/guillemets dans un label de nœud
// (ex: "Activation de biais(s)"), ce qui casse tout le schéma Mermaid. On
// nettoie uniquement le texte à l'intérieur des crochets [...] (jamais le
// reste de la syntaxe, qui a besoin de ":" pour classDef/style).
function sanitizeMermaidLabels(code: string): string {
  return code.replace(/\[([^[\]]*)\]/g, (_match, label: string) => {
    const cleaned = label.replace(/[()":;]/g, (char) => (char === ":" || char === ";" ? "," : ""));
    return `[${cleaned}]`;
  });
}

let initialized = false;
function ensureInitialized() {
  if (initialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    securityLevel: "strict",
    suppressErrorRendering: true,
    themeVariables: {
      primaryColor: "#1b2440",
      primaryBorderColor: "#38bdf8",
      primaryTextColor: "#e7ecf5",
      lineColor: "#38bdf8",
      secondaryColor: "#1b2440",
      tertiaryColor: "#1b2440",
      background: "#0b1120",
    },
  });
  initialized = true;
}

export default function MermaidDiagram({ code }: { code: string }) {
  const rawId = useId();
  const safeId = `mermaid-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  const safeCode = sanitizeMermaidLabels(code);

  useEffect(() => {
    let cancelled = false;
    ensureInitialized();

    // Mermaid, quand le texte est mal formé, peut injecter son propre
    // bandeau d'erreur directement dans la page au lieu de simplement
    // rejeter la promesse — on valide donc la syntaxe à part, AVANT tout
    // rendu, pour ne jamais laisser mermaid tenter d'afficher quoi que ce
    // soit par lui-même sur un schéma invalide.
    mermaid
      .parse(safeCode, { suppressErrors: true })
      .then((isValid) => {
        if (cancelled) return;
        if (!isValid) {
          setFailed(true);
          return;
        }
        return mermaid.render(safeId, safeCode).then(({ svg }) => {
          if (!cancelled && containerRef.current) {
            containerRef.current.innerHTML = svg;
          }
        });
      })
      .catch(() => {
        // Filet de sécurité final si quoi que ce soit d'autre échoue.
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [safeCode, safeId]);

  if (failed) {
    return (
      <pre className="my-3 overflow-x-auto rounded-md bg-[#0b1120] p-3 text-xs text-[#8b97b0]">
        {code}
      </pre>
    );
  }

  return <div ref={containerRef} className="my-4 flex justify-center overflow-x-auto" />;
}
