import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel donne automatiquement cette adresse en plus du vrai domaine
  // (memoflash.io), et elle reste active indéfiniment : un vieux lien
  // partagé, un favori ou un résultat Google peut encore y pointer. On
  // renvoie systématiquement vers memoflash.io, en gardant la même page.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "tude-saas.vercel.app" }],
        destination: "https://memoflash.io/:path*",
        permanent: true,
      },
    ];
  },
  // Par défaut, ces pages purement statiques imposaient "max-age=0,
  // must-revalidate" : le navigateur doit revérifier auprès de Vercel à
  // CHAQUE visite avant de pouvoir afficher quoi que ce soit, même si le
  // contenu n'a pas changé. Si cette vérification traîne occasionnellement
  // (visible en conditions réelles sur un téléphone, de façon intermittente,
  // sans lien avec le réseau ni l'appareil), toute la page attend derrière.
  // Avec max-age, le navigateur réaffiche sa propre copie instantanément
  // pendant 60s sans repasser par le réseau, et la rafraîchit en arrière-plan
  // ensuite (stale-while-revalidate) sans jamais bloquer l'affichage.
  async headers() {
    const cacheControl = {
      key: "Cache-Control",
      value: "public, max-age=60, stale-while-revalidate=300",
    };
    return [
      { source: "/", headers: [cacheControl] },
      { source: "/pricing", headers: [cacheControl] },
      { source: "/login", headers: [cacheControl] },
      { source: "/onboarding", headers: [cacheControl] },
    ];
  },
};

export default nextConfig;
