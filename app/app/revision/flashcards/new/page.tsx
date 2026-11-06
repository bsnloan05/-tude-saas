"use client";

import Link from "next/link";
import RevisionCreate from "@/components/RevisionCreate";

export default function NewFlashcardsPage() {
  return (
    <div className="flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-3xl">
        <Link
          href="/app/revision"
          className="mb-5 inline-block text-base font-medium text-[#8b97b0] transition-colors hover:text-[#e7ecf5]"
        >
          ← Révision
        </Link>
        <h1 className="mb-8 text-3xl font-bold text-[#e7ecf5]">Nouvelles flashcards</h1>
        <RevisionCreate type="flashcards" />
      </div>
    </div>
  );
}
