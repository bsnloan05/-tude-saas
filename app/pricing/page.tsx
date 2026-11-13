import type { Metadata } from "next";
import PricingPageClient from "@/components/PricingPageClient";
import { FAQ } from "@/lib/pricing-faq";

export const metadata: Metadata = {
  title: "Tarifs",
  description:
    "Memoflash : transcription de cours, fiches de révision, flashcards et quiz générés par IA. Sans engagement, garantie remboursée sous conditions.",
};

// Réutilise les questions déjà affichées sur la page (FAQ ci-dessus,
// exportée par le composant client) pour générer les données structurées
// FAQPage — aucun contenu inventé, juste la version lisible par Google de
// ce qui est déjà affiché à l'écran.
function FaqJsonLd() {
  const json = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

export default function PricingPage() {
  return (
    <>
      <FaqJsonLd />
      <PricingPageClient />
    </>
  );
}
