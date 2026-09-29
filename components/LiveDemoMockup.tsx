"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

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
      <div className="relative w-full" style={{ aspectRatio: "3220 / 2100" }}>
        <Image
          src="/mockup-recording.png"
          alt="Memoflash en train d'enregistrer un cours"
          fill
          priority
          sizes="(min-width: 768px) 768px, 100vw"
          className={`object-contain transition-opacity duration-1000 ${
            showFiche ? "opacity-0" : "opacity-100"
          }`}
        />
        <Image
          src="/mockup-fiche.png"
          alt="Fiche de révision générée par Memoflash"
          fill
          sizes="(min-width: 768px) 768px, 100vw"
          className={`object-contain transition-opacity duration-1000 ${
            showFiche ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>
    </div>
  );
}
