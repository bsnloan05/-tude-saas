import type { Metadata } from "next";
import CrispChat from "@/components/CrispChat";
import "./globals.css";

const TITLE = "Memoflash — Transforme tes cours en fiches de révision avec l'IA";
const DESCRIPTION =
  "Memoflash écoute ton cours en direct et génère automatiquement une fiche de révision claire, des flashcards et des quiz. Essaie gratuitement.";

export const metadata: Metadata = {
  metadataBase: new URL("https://memoflash.io"),
  title: {
    default: TITLE,
    template: "%s — Memoflash",
  },
  description: DESCRIPTION,
  keywords: [
    "fiche de révision IA",
    "transformer cours en fiche",
    "application révision étudiant",
    "flashcards IA",
    "quiz IA",
    "transcription de cours",
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://memoflash.io",
    siteName: "Memoflash",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <CrispChat />
      </body>
    </html>
  );
}
