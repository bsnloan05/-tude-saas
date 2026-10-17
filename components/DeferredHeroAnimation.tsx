"use client";

import { useEffect, useState } from "react";

// L'animation du canvas tourne en boucle continue (requestAnimationFrame) et
// peut être coûteuse en calcul sur un téléphone moins puissant. Comme elle
// est visible dès l'arrivée sur la page, l'attribut HTML "loading=lazy" ne
// la retarde pas réellement (le navigateur la charge dès que l'élément est
// dans l'écran). On ne lui donne donc un "src" qu'après que la page se soit
// chargée, pour ne jamais la faire entrer en concurrence avec le contenu
// principal (texte, bouton) pendant le premier affichage.
export default function DeferredHeroAnimation() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
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
      className="aspect-[1400/980] w-full border-0 bg-transparent"
    />
  );
}
