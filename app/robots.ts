import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app/", "/admin/", "/api/", "/auth/", "/onboarding", "/reset-password"],
    },
    sitemap: "https://memoflash.io/sitemap.xml",
  };
}
