import type { Metadata } from "next";
import CrispChat from "@/components/CrispChat";
import "./globals.css";

export const metadata: Metadata = {
  title: "Memoflash",
  description: "Transforme la voix du prof en fiche de révision",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <CrispChat />
      </body>
    </html>
  );
}
