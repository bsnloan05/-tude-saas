import type { MetadataRoute } from "next";

// Seulement les pages publiques destinées à être indexées : le tableau de
// bord (/app/*), l'admin, l'onboarding post-inscription et la connexion
// n'ont aucune valeur de référencement (voir app/robots.ts, déjà exclus).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://memoflash.io/",
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://memoflash.io/pricing",
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://memoflash.io/remboursement",
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
