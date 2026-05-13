"use client";

import React from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { GRID_CONFIGS } from "@/lib/lockRules";

interface GridOption {
  size: 3 | 5 | 7;
  name: string;
  difficulty: string;
  totalPoints: number;
  totalSlopes: number;
  description: string;
  accent: string;
}

const gridOptions: GridOption[] = [
  {
    size: 3,
    name: "3x3",
    difficulty: GRID_CONFIGS[3].difficulty,
    totalPoints: GRID_CONFIGS[3].totalPoints,
    totalSlopes: 8,
    description: "Learn the rule set on the classic nine-dot grid.",
    accent: "#2563eb",
  },
  {
    size: 5,
    name: "5x5",
    difficulty: GRID_CONFIGS[5].difficulty,
    totalPoints: GRID_CONFIGS[5].totalPoints,
    totalSlopes: 24,
    description: "More points, more blocked paths, and a wider slope catalog.",
    accent: "#7c3aed",
  },
  {
    size: 7,
    name: "7x7",
    difficulty: GRID_CONFIGS[7].difficulty,
    totalPoints: GRID_CONFIGS[7].totalPoints,
    totalSlopes: 48,
    description: "A dense search space for complete slope coverage.",
    accent: "#dc2626",
  },
];

const rules = [
  "Choose a grid and draw one continuous lock pattern by swiping or clicking numbered points.",
  "Each point may be used at most once.",
  "A long straight jump is legal only after every intermediate point on that line has already been selected.",
  "Every segment has a slope: horizontal is 0, vertical is infinity, diagonals and other lines are reduced fractions.",
  "The goal is to use every unique slope available in the chosen grid at least once.",
  "The slope panel updates live; select a slope there to highlight the matching segments in your pattern.",
];

export default function SelectPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-5"
          >
            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                slope coverage puzzle
              </p>
              <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-zinc-950 dark:text-white sm:text-5xl lg:text-6xl">
                The Most Complicated Lock Pattern Game
              </h1>
              <p className="max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300 sm:text-lg">
                Draw an Android-style lock pattern that covers every possible line slope on the grid.
                The larger the grid, the more slopes you must discover without reusing points.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {gridOptions.map((option, index) => (
                <motion.button
                  key={option.size}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.08 }}
                  onClick={() => router.push(`/game?size=${option.size}`)}
                  className="group min-h-52 rounded-lg border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-3xl font-semibold" style={{ color: option.accent }}>
                        {option.name}
                      </div>
                      <div className="mt-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        {option.difficulty}
                      </div>
                    </div>
                    <span className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                      Play
                    </span>
                  </div>
                  <p className="mt-5 min-h-12 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                    {option.description}
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-md bg-zinc-100 p-3 dark:bg-zinc-800">
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">Points</div>
                      <div className="mt-1 font-semibold">{option.totalPoints}</div>
                    </div>
                    <div className="rounded-md bg-zinc-100 p-3 dark:bg-zinc-800">
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">Slopes</div>
                      <div className="mt-1 font-semibold">{option.totalSlopes}</div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h2 className="text-lg font-semibold">Rules</h2>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              {rules.map((rule, index) => (
                <li key={rule} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                    {index + 1}
                  </span>
                  <span>{rule}</span>
                </li>
              ))}
            </ol>
          </motion.aside>
        </section>

        <section className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-5 text-sm leading-6 text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="font-semibold text-zinc-950 dark:text-white">Concept</h2>
            <p className="mt-1">
              Inspired by the lock-pattern idea discussed in{" "}
              <a
                href="https://www.youtube.com/watch?v=PKjbBQ0PBCQ"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-blue-600 underline-offset-4 hover:underline dark:text-blue-400"
              >
                this concept video
              </a>
              . This website was generated by codex + gpt-5.5.
            </p>
          </div>
          <button
            onClick={() => router.push("/game?size=3")}
            className="rounded-md bg-zinc-950 px-4 py-2 font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Start with 3x3
          </button>
        </section>
      </div>
    </main>
  );
}
