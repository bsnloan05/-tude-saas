"use client";

import { useEffect, useId, useRef, useState } from "react";
import mermaid from "mermaid";

let initialized = false;
function ensureInitialized() {
  if (initialized) return;
  mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "strict" });
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

    mermaid
      .render(safeId, code)
      .then(({ svg }) => {
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      })
      .catch(() => {
        // Schéma mal formé renvoyé par l'IA : on affiche le texte brut plutôt
        // que de casser l'affichage de toute la fiche.
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
