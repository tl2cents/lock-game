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
    accent: "#1F6C9F",
  },
  {
    size: 5,
    name: "5x5",
    difficulty: GRID_CONFIGS[5].difficulty,
    totalPoints: GRID_CONFIGS[5].totalPoints,
    totalSlopes: 24,
    description: "More points, more blocked paths, and a wider slope catalog.",
    accent: "#956400",
  },
  {
    size: 7,
    name: "7x7",
    difficulty: GRID_CONFIGS[7].difficulty,
    totalPoints: GRID_CONFIGS[7].totalPoints,
    totalSlopes: 48,
    description: "A dense search space for complete slope coverage.",
    accent: "#9F2F2D",
  },
];

const rules = [
  "Each point may be used at most once.",
  "A long straight jump is legal only after every intermediate point on that line has already been selected.",
  "The goal is to use every unique slope available in the chosen grid at least once.",
];

const examplePath = [1, 8, 3, 4, 9, 7, 5, 2, 6];
const examplePositions: Record<number, { x: number; y: number }> = {
  1: { x: 24, y: 24 },
  2: { x: 90, y: 24 },
  3: { x: 156, y: 24 },
  4: { x: 24, y: 90 },
  5: { x: 90, y: 90 },
  6: { x: 156, y: 90 },
  7: { x: 24, y: 156 },
  8: { x: 90, y: 156 },
  9: { x: 156, y: 156 },
};

export default function SelectPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen text-[#2F3437]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
        <section className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-5"
          >
            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#787774]">
                slope coverage puzzle
              </p>
              <h1 className="editorial-serif max-w-4xl text-5xl text-[#2F3437] sm:text-6xl lg:text-7xl">
                The Most Complicated Lock Pattern Game
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[#787774] sm:text-lg">
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
                  className="minimal-card group min-h-52 p-5 text-left transition hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-3xl font-semibold" style={{ color: option.accent }}>
                        {option.name}
                      </div>
                      <div className="mt-1 text-sm font-medium text-[#787774]">
                        {option.difficulty}
                      </div>
                    </div>
                    <span className="rounded-md border border-[#EAEAEA] px-2 py-1 text-xs font-medium text-[#787774]">
                      Play
                    </span>
                  </div>
                  <p className="mt-5 min-h-12 text-sm leading-6 text-[#787774]">
                    {option.description}
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
                    <div className="soft-panel p-3">
                      <div className="text-xs text-[#787774]">Points</div>
                      <div className="mt-1 font-semibold">{option.totalPoints}</div>
                    </div>
                    <div className="soft-panel p-3">
                      <div className="text-xs text-[#787774]">Slopes</div>
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
            className="minimal-card p-6"
          >
            <h2 className="text-lg font-semibold">Rules</h2>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-[#787774]">
              {rules.map((rule, index) => (
                <li key={rule} className="flex gap-3">
                  <span className="mono mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#EAEAEA] bg-[#F7F6F3] text-xs font-semibold text-[#2F3437]">
                    {index + 1}
                  </span>
                  <span>{rule}</span>
                </li>
              ))}
            </ol>

            <div className="mt-6 border-t border-[#EAEAEA] pt-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[#2F3437]">
                  3x3 example
                </h3>
                <span className="mono text-xs text-[#787774]">1 8 3 4 9 7 5 2 6</span>
              </div>
              <div className="mt-4 rounded-lg border border-[#EAEAEA] bg-[#FBFBFA] p-4">
                <svg viewBox="0 0 180 180" className="h-auto w-full" role="img" aria-label="3 by 3 example pattern 1 8 3 4 9 7 5 2 6">
                  {[24, 90, 156].map((offset) => (
                    <React.Fragment key={offset}>
                      <line x1="24" y1={offset} x2="156" y2={offset} stroke="#EAEAEA" strokeWidth="1" />
                      <line x1={offset} y1="24" x2={offset} y2="156" stroke="#EAEAEA" strokeWidth="1" />
                    </React.Fragment>
                  ))}
                  {examplePath.slice(0, -1).map((point, index) => {
                    const from = examplePositions[point];
                    const to = examplePositions[examplePath[index + 1]];
                    return (
                      <line
                        key={`${point}-${examplePath[index + 1]}`}
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke="#5F7F5B"
                        strokeWidth="4"
                        strokeLinecap="round"
                        opacity="0.9"
                      />
                    );
                  })}
                  {Object.entries(examplePositions).map(([point, position]) => (
                    <g key={point}>
                      <circle cx={position.x} cy={position.y} r="12" fill="#FFFFFF" stroke="#2F3437" strokeWidth="2" />
                      <text
                        x={position.x}
                        y={position.y + 4}
                        textAnchor="middle"
                        className="fill-[#2F3437] text-[11px] font-semibold"
                      >
                        {point}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          </motion.aside>
        </section>

        <section className="minimal-card grid gap-4 p-6 text-sm leading-6 text-[#787774] md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="font-semibold text-[#2F3437]">Concept</h2>
            <p className="mt-1">
              A visualization game by the lock-pattern idea discussed in{" "}
              <a
                href="https://www.youtube.com/watch?v=PKjbBQ0PBCQ"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[#1F6C9F] underline-offset-4 hover:underline"
              >
                this concept video
              </a>
              . This website was generated by Codex + GPT-5.5.
            </p>
          </div>
          <button
            onClick={() => router.push("/game?size=3")}
            className="rounded-md bg-[#111111] px-4 py-2 font-medium text-white transition hover:bg-[#333333] active:scale-[0.98]"
          >
            Start with 3x3
          </button>
        </section>
      </div>
    </main>
  );
}
