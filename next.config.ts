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
};

export default nextConfig;
