"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import LockGrid from "@/components/LockGrid";
import Link from "next/link";

function GameContent() {
  const searchParams = useSearchParams();
  const sizeParam = searchParams.get("size");
  const gridSize = sizeParam ? parseInt(sizeParam) : 3;

  // Validate grid size
  const validSize = [3, 5, 7].includes(gridSize) ? gridSize : 3;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl px-3 pt-4 sm:px-4 lg:px-6">
        <Link 
          href="/select"
          className="inline-flex items-center rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
      </div>
      <LockGrid gridSize={validSize} />
    </main>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-xl text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    }>
      <GameContent />
    </Suspense>
  );
}
