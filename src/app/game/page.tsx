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
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
        <Link 
          href="/select"
          className="inline-flex items-center rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-sm font-medium text-[#2F3437] transition hover:bg-[#F7F6F3] active:scale-[0.98]"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Grid selection
        </Link>
      </div>
      <LockGrid gridSize={validSize} />
    </main>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl text-[#787774]">Loading...</div>
      </div>
    }>
      <GameContent />
    </Suspense>
  );
}
