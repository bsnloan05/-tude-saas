"use client";

import { useEffect, useId, useRef, useState } from "react";
import mermaid from "mermaid";

let initialized = false;
function ensureInitialized() {
  if (initialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    securityLevel: "strict",
    suppressErrorRendering: true,
  });
  initialized = true;
}

export default function MermaidDiagram({ code }: { code: string }) {
  const rawId = useId();
  const safeId = `mermaid-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ensureInitialized();

    // Mermaid, quand le texte est mal formé, peut injecter son propre
    // bandeau d'erreur directement dans la page au lieu de simplement
    // rejeter la promesse — on valide donc la syntaxe à part, AVANT tout
    // rendu, pour ne jamais laisser mermaid tenter d'afficher quoi que ce
    // soit par lui-même sur un schéma invalide.
    mermaid
      .parse(code, { suppressErrors: true })
      .then((isValid) => {
        if (cancelled) return;
        if (!isValid) {
          setFailed(true);
          return;
        }
        return mermaid.render(safeId, code).then(({ svg }) => {
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
  }, [code, safeId]);

  if (failed) {
    return (
      <pre className="my-3 overflow-x-auto rounded-md bg-[#0b1120] p-3 text-xs text-[#8b97b0]">
        {code}
      </pre>
    );
  }

  return <div ref={containerRef} className="my-4 flex justify-center overflow-x-auto" />;
}
