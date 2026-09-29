"use client";

import { useEffect, useState } from "react";

export default function LiveDemoMockup() {
  const [showFiche, setShowFiche] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowFiche((prev) => !prev);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-3xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/mockup-recording.png"
        alt="Memoflash en train d'enregistrer un cours"
        className={`block w-full h-auto transition-opacity duration-1000 ${
          showFiche ? "opacity-0" : "opacity-100"
        }`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/mockup-fiche.png"
        alt="Fiche de révision générée par Memoflash"
        className={`absolute inset-0 block w-full h-full transition-opacity duration-1000 ${
          showFiche ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
