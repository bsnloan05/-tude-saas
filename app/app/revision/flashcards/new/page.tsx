"use client";

import Link from "next/link";
import RevisionCreate from "@/components/RevisionCreate";

export default function NewFlashcardsPage() {
  return (
    <div className="flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <Link
          href="/app/revision"
          className="mb-4 inline-block text-sm font-medium text-[#8b97b0] transition-colors hover:text-[#e7ecf5]"
        >
          ← Révision
        </Link>
        <h1 className="mb-6 text-2xl font-bold text-[#e7ecf5]">Nouvelles flashcards</h1>
        <RevisionCreate type="flashcards" />
      </div>
    </div>
  );
}
