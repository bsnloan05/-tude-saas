"use client";

import { useEffect, useState } from "react";

// L'animation du canvas tourne en boucle continue (requestAnimationFrame,
// jusqu'à 60 fois/seconde) et fait un vrai travail de calcul à chaque image
// (dessin de ~1000 segments sur le canvas, mise à jour de dizaines
// d'éléments du DOM). Mesuré en conditions réelles (Charles Proxy, voir
// l'enquête lenteur mobile) : sur un téléphone, ça peut occuper le fil
// principal au point de retarder de plusieurs secondes tout le reste du
// JavaScript de la page (hydratation, pré-chargement des liens, etc.),
// même si chaque requête réseau individuelle reste rapide. Comme elle ne
// sert qu'à illustrer le produit (sans information essentielle), on ne la
// charge plus du tout sur mobile — seulement sur un écran assez large pour
// qu'elle soit de toute façon affichée (voir le `grid md:grid-cols-...` du
// parent dans app/page.tsx, qui ne montre cette colonne qu'à partir de "md").
export default function DeferredHeroAnimation() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) return;

    if (document.readyState === "complete") {
      setShouldLoad(true);
      return;
    }
    const onLoad = () => setShouldLoad(true);
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return (
    <iframe
      src={shouldLoad ? "/memoflash-hero.html" : undefined}
      title="Démonstration animée de Memoflash"
      className="hidden aspect-[1400/980] w-full border-0 bg-transparent md:block"
    />
  );
}
