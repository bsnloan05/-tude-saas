"use client";

import { useEffect, useState } from "react";

// L'animation du canvas tourne en boucle continue (requestAnimationFrame) et
// peut être coûteuse en calcul sur un téléphone moins puissant. Comme elle
// est visible dès l'arrivée sur la page, l'attribut HTML "loading=lazy" ne
// la retarde pas réellement (le navigateur la charge dès que l'élément est
// dans l'écran). On ne lui donne donc un "src" qu'après un court délai fixe,
// pour ne jamais la faire entrer en concurrence avec le contenu principal
// (texte, bouton) pendant le tout premier affichage.
//
// Volontairement un délai fixe plutôt que l'événement "load" du navigateur
// (qui attend que TOUTES les ressources de la page aient fini de charger,
// y compris celles ajoutées plus tard ailleurs sur la page comme les logos
// plus bas) : ça a déjà causé un vrai retard d'affichage sur connexion
// lente le jour où d'autres images ont été ajoutées à la page, sans aucun
// rapport avec cette animation elle-même.
export default function DeferredHeroAnimation() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setShouldLoad(true), 150);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <iframe
      src={shouldLoad ? "/memoflash-hero.html" : undefined}
      title="Démonstration animée de Memoflash"
      className="aspect-[1400/980] w-full border-0 bg-transparent"
    />
  );
}
