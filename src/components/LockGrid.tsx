"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  calculateAllSlopes,
  canConnectPoint as canConnectByRules,
  getPatternSegments,
  getSlopeColorsForGrid,
  parsePattern,
  type Segment,
  type VerifyResponse,
  verifyPatternPoints,
  verifyPatternString,
} from "@/lib/lockRules";

interface LockGridProps {
  gridSize: number;
}

const rules = [
  "Draw one continuous pattern.",
  "Use each point at most once.",
  "A long jump requires every crossed point to be selected first.",
  "Cover every slope shown in the catalogue.",
];

const controlNotes = [
  ["Mode", "Switch between drag drawing and point-by-point clicking."],
  ["Run sample", "Animates a typed sequence, such as 1 5 2 9."],
];

export default function LockGrid({ gridSize }: LockGridProps) {
  const [selectedPoints, setSelectedPoints] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [animatedSegments, setAnimatedSegments] = useState<Segment[]>([]);
  const [currentSegments, setCurrentSegments] = useState<Segment[]>([]);
  const [interactionMode, setInteractionMode] = useState<"swipe" | "click">("swipe");
  const [testSequence, setTestSequence] = useState("");
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [highlightedSlope, setHighlightedSlope] = useState<string | null>(null);
  const [activeDialog, setActiveDialog] = useState<"rules" | "controls" | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const svgSize = gridSize === 3 ? 420 : gridSize === 5 ? 620 : 840;
  const margin = gridSize === 3 ? 52 : gridSize === 5 ? 64 : 78;
  const boardSize = svgSize - margin * 2;
  const cellSize = boardSize / (gridSize - 1);
  const slopeColors = useMemo(() => getSlopeColorsForGrid(gridSize), [gridSize]);
  const allSlopes = useMemo(() => calculateAllSlopes(gridSize), [gridSize]);
  const totalSlopes = allSlopes.length;

  const pointPositions = useMemo(() => {
    const positions: Record<number, { x: number; y: number }> = {};
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const pointId = row * gridSize + col + 1;
        positions[pointId] = {
          x: margin + col * cellSize,
          y: margin + row * cellSize,
        };
      }
    }
    return positions;
  }, [cellSize, gridSize, margin]);

  const updateCurrentSegments = useCallback((points: number[]) => {
    setCurrentSegments(getPatternSegments(points, gridSize));
  }, [gridSize]);

  const clearTransientState = () => {
    setVerifyResult(null);
    setShowAnimation(false);
    setAnimatedSegments([]);
    setNotice(null);
  };

  const getSvgCoords = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const pointer = "touches" in event ? event.touches[0] : event;

    return {
      x: (pointer.clientX - rect.left) * (svgSize / rect.width),
      y: (pointer.clientY - rect.top) * (svgSize / rect.height),
    };
  }, [svgSize]);

  const getPointAtPosition = useCallback((x: number, y: number) => {
    const hitRadius = gridSize === 3 ? 38 : gridSize === 5 ? 34 : 32;
    for (const [point, pos] of Object.entries(pointPositions)) {
      const distance = Math.hypot(x - pos.x, y - pos.y);
      if (distance < hitRadius) return Number(point);
    }
    return null;
  }, [gridSize, pointPositions]);

  const canConnectPoint = useCallback((lastPoint: number, nextPoint: number) => (
    canConnectByRules(lastPoint, nextPoint, selectedPoints, gridSize)
  ), [gridSize, selectedPoints]);

  const addPoint = useCallback((point: number) => {
    if (selectedPoints.length === 0) {
      const next = [point];
      setSelectedPoints(next);
      clearTransientState();
      updateCurrentSegments(next);
      return;
    }

    if (selectedPoints.includes(point)) return;

    const lastPoint = selectedPoints[selectedPoints.length - 1];
    const result = canConnectPoint(lastPoint, point);
    if (!result.canConnect) {
      setNotice(result.reason || "That connection is not allowed.");
      window.setTimeout(() => setNotice(null), 2200);
      return;
    }

    const next = [...selectedPoints, point];
    setSelectedPoints(next);
    clearTransientState();
    updateCurrentSegments(next);
  }, [canConnectPoint, selectedPoints, updateCurrentSegments]);

  const handlePointClick = useCallback((point: number) => {
    if (interactionMode !== "click" || isPlayingDemo) return;
    addPoint(point);
  }, [addPoint, interactionMode, isPlayingDemo]);

  const handleStart = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (interactionMode !== "swipe" || isPlayingDemo) return;
    const coords = getSvgCoords(event);
    if (!coords) return;
    const point = getPointAtPosition(coords.x, coords.y);
    if (!point || selectedPoints.includes(point)) return;

    addPoint(point);
    setIsDrawing(true);
    setCurrentPos(coords);
  }, [addPoint, getPointAtPosition, getSvgCoords, interactionMode, isPlayingDemo, selectedPoints]);

  const handleMove = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || interactionMode !== "swipe") return;
    const coords = getSvgCoords(event);
    if (!coords) return;
    setCurrentPos(coords);

    const point = getPointAtPosition(coords.x, coords.y);
    if (point && !selectedPoints.includes(point)) addPoint(point);
  }, [addPoint, getPointAtPosition, getSvgCoords, interactionMode, isDrawing, selectedPoints]);

  const handleEnd = useCallback(() => {
    setIsDrawing(false);
    setCurrentPos(null);
  }, []);

  const animateSuccessfulSegments = (segments: Segment[], delay = 120) => {
    setShowAnimation(true);
    setAnimatedSegments([]);
    segments.forEach((segment, index) => {
      window.setTimeout(() => {
        setAnimatedSegments((prev) => [...prev, segment]);
      }, index * delay);
    });
  };

  const verifyPattern = () => {
    setIsVerifying(true);
    const result = verifyPatternPoints(selectedPoints, gridSize);
    setVerifyResult(result);
    if (result.success && result.segments) animateSuccessfulSegments(result.segments);
    window.setTimeout(() => setIsVerifying(false), 160);
  };

  const reset = () => {
    setSelectedPoints([]);
    setIsDrawing(false);
    setCurrentPos(null);
    setVerifyResult(null);
    setShowAnimation(false);
    setAnimatedSegments([]);
    setCurrentSegments([]);
    setNotice(null);
    setIsPlayingDemo(false);
    setHighlightedSlope(null);
  };

  const verifyPatternDirect = (pattern: string) => {
    setIsVerifying(true);
    const result = verifyPatternString(pattern, gridSize);
    setVerifyResult(result);
    if (result.success && result.segments) animateSuccessfulSegments(result.segments, 90);
    window.setTimeout(() => setIsVerifying(false), 160);
  };

  const playTestSequence = async () => {
    const sequence = parsePattern(testSequence, gridSize);
    if (!sequence || sequence.length < 2) {
      setNotice("Enter at least two valid point numbers.");
      return;
    }

    setIsPlayingDemo(true);
    setSelectedPoints([]);
    setVerifyResult(null);
    setShowAnimation(false);
    setAnimatedSegments([]);
    setCurrentSegments([]);
    setNotice(null);

    for (let index = 0; index < sequence.length; index++) {
      await new Promise((resolve) => window.setTimeout(resolve, 220));
      const point = sequence[index];
      const currentPoints = sequence.slice(0, index + 1);

      if (point < 1 || point > gridSize * gridSize) {
        setNotice(`Point ${point} is outside this grid.`);
        setSelectedPoints(sequence.slice(0, index));
        updateCurrentSegments(sequence.slice(0, index));
        setIsPlayingDemo(false);
        return;
      }

      if (currentPoints.slice(0, -1).includes(point)) {
        setNotice(`Point ${point} has already been used.`);
        setSelectedPoints(currentPoints.slice(0, -1));
        updateCurrentSegments(currentPoints.slice(0, -1));
        setIsPlayingDemo(false);
        return;
      }

      if (index > 0) {
        const result = canConnectByRules(sequence[index - 1], point, sequence.slice(0, index), gridSize);
        if (!result.canConnect) {
          setNotice(`Cannot connect ${sequence[index - 1]} to ${point}: ${result.reason || "invalid move"}.`);
          setSelectedPoints(sequence.slice(0, index));
          updateCurrentSegments(sequence.slice(0, index));
          setIsPlayingDemo(false);
          return;
        }
      }

      setSelectedPoints(currentPoints);
      updateCurrentSegments(currentPoints);
    }

    setIsPlayingDemo(false);
    window.setTimeout(() => verifyPatternDirect(gridSize === 3 ? sequence.join("") : sequence.join(",")), 160);
  };

  const activeSegments = showAnimation ? animatedSegments : currentSegments;

  const slopeToSegments = useMemo(() => {
    const map: Record<string, number[]> = {};
    activeSegments.forEach((segment, index) => {
      map[segment.slope] = [...(map[segment.slope] || []), index];
    });
    return map;
  }, [activeSegments]);

  const usedSlopes = useMemo(() => new Set(activeSegments.map((segment) => segment.slope)), [activeSegments]);
  const progress = totalSlopes === 0 ? 0 : Math.round((usedSlopes.size / totalSlopes) * 100);

  const slopeItems = allSlopes.map((slope) => ({
    slope,
    color: slopeColors[slope] || "#787774",
    used: usedSlopes.has(slope),
    hasSegments: Boolean(slopeToSegments[slope]),
  }));

  const renderGridLines = () => {
    const lines = [];
    for (let i = 0; i < gridSize; i++) {
      const pos = margin + i * cellSize;
      lines.push(
        <line key={`h-${i}`} x1={margin} y1={pos} x2={margin + boardSize} y2={pos} stroke="rgba(47,52,55,0.08)" strokeWidth="1" />,
        <line key={`v-${i}`} x1={pos} y1={margin} x2={pos} y2={margin + boardSize} stroke="rgba(47,52,55,0.08)" strokeWidth="1" />,
      );
    }
    return lines;
  };

  const renderSegments = () => {
    const segments = showAnimation ? animatedSegments : currentSegments;
    const lines = segments.map((segment, index) => {
      const from = pointPositions[segment.from];
      const to = pointPositions[segment.to];
      const isHighlighted = highlightedSlope === segment.slope;
      const hasHighlight = highlightedSlope !== null;
      const stroke = hasHighlight && !isHighlighted ? "#D8D6D0" : segment.color;

      return (
        <motion.line
          key={`${segment.from}-${segment.to}-${index}`}
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          stroke={stroke}
          strokeWidth={isHighlighted ? 8 : gridSize === 3 ? 5 : 4}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: hasHighlight && !isHighlighted ? 0.25 : 0.92 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        />
      );
    });

    if (isDrawing && currentPos && selectedPoints.length > 0) {
      const last = pointPositions[selectedPoints[selectedPoints.length - 1]];
      lines.push(
        <line
          key="current"
          x1={last.x}
          y1={last.y}
          x2={currentPos.x}
          y2={currentPos.y}
          stroke="#787774"
          strokeDasharray="7 5"
          strokeLinecap="round"
          strokeWidth="2"
          opacity="0.5"
        />,
      );
    }

    return lines;
  };

  const pointRadius = gridSize === 3 ? 15 : gridSize === 5 ? 14 : 14;
  const selectedPointRadius = gridSize === 3 ? 18 : gridSize === 5 ? 17 : 17;
  const pointFontSize = gridSize === 3 ? 13 : gridSize === 5 ? 12 : 12;
  const pageMaxClass = gridSize === 7 ? "max-w-[96rem]" : "max-w-7xl";
  const sectionGridClass = gridSize === 7
    ? "xl:grid-cols-[minmax(0,1fr)_280px]"
    : "lg:grid-cols-[minmax(0,1fr)_300px]";
  const boardMaxClass = gridSize === 3 ? "max-w-[560px]" : gridSize === 5 ? "max-w-[760px]" : "max-w-[920px]";

  return (
    <div className={`mx-auto w-full ${pageMaxClass} px-4 pb-16 pt-8 sm:px-6 lg:px-8`}>
      <header className="mx-auto max-w-4xl text-center">
        <p className="tag mx-auto inline-flex bg-[#FBF3DB] text-[#956400]">Game board</p>
        <h1 className="editorial-serif mt-4 text-4xl text-[#2F3437] sm:text-5xl">
          The Most Complicated Lock Pattern Game
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-[#787774] sm:text-base">
          Build one continuous pattern that covers all {totalSlopes} slopes on a {gridSize}x{gridSize} grid.
        </p>
      </header>

      <section className={`mt-10 grid items-start gap-5 ${sectionGridClass}`}>
        <motion.main
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="minimal-card overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-[#EAEAEA] bg-white px-5 py-3">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[9999px] bg-[#EAEAEA]" />
              <span className="h-2.5 w-2.5 rounded-[9999px] bg-[#EAEAEA]" />
              <span className="h-2.5 w-2.5 rounded-[9999px] bg-[#EAEAEA]" />
            </div>
            <p className="mono text-xs text-[#787774]">
              {selectedPoints.length > 0 ? selectedPoints.join(" -> ") : "No points selected"}
            </p>
          </div>

          <div className="p-4 sm:p-6">
            <div className={`mx-auto mb-3 flex w-full ${boardMaxClass} flex-col gap-3 rounded-lg border border-[#EAEAEA] bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between`}>
              <button
                type="button"
                onClick={() => setActiveDialog("rules")}
                className="flex min-h-9 items-center justify-center gap-2 rounded-md border border-[#EAEAEA] bg-white px-3 text-sm font-medium text-[#2F3437] transition hover:bg-[#F7F6F3] active:scale-[0.98] sm:justify-start"
              >
                Show Rules
                <span className="tag bg-[#EDF3EC] text-[#346538]">{gridSize}x{gridSize}</span>
              </button>

              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setActiveDialog("controls")}
                  className="text-xs font-semibold uppercase tracking-[0.08em] text-[#2F3437] underline-offset-4 transition hover:text-[#5F7F5B] hover:underline"
                >
                  Mode
                </button>
                <div className="grid grid-cols-2 gap-1 rounded-md bg-[#F7F6F3] p-1">
                  {[
                    ["swipe", "Swipe"],
                    ["click", "Click"],
                  ].map(([mode, label]) => {
                    const active = interactionMode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setInteractionMode(mode as "swipe" | "click")}
                        disabled={isPlayingDemo}
                        className={`flex min-h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition active:scale-[0.98] disabled:opacity-40 ${
                          active
                            ? "bg-white text-[#2F3437]"
                            : "text-[#787774] hover:bg-white/70 hover:text-[#2F3437]"
                        }`}
                        aria-pressed={active}
                        title={`Switch to ${label.toLowerCase()} mode.`}
                      >
                        <span
                          className={`h-4 w-4 rounded-[9999px] border ${
                            active ? "border-[#5F7F5B] bg-[#5F7F5B]" : "border-[#D8D6D0] bg-white"
                          }`}
                          aria-hidden="true"
                        />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={`mx-auto w-full ${boardMaxClass} rounded-lg border border-[#EAEAEA] bg-[#FBFBFA] p-3 sm:p-5`}>
              <svg
                ref={svgRef}
                viewBox={`0 0 ${svgSize} ${svgSize}`}
                className="h-auto w-full touch-none select-none"
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
              >
                <rect width={svgSize} height={svgSize} fill="transparent" rx="8" />
                {renderGridLines()}
                {renderSegments()}

                {Object.entries(pointPositions).map(([point, pos]) => {
                  const pointNumber = Number(point);
                  const isSelected = selectedPoints.includes(pointNumber);
                  const canConnect = interactionMode === "click"
                    && selectedPoints.length > 0
                    && !isSelected
                    && !isPlayingDemo
                    && canConnectPoint(selectedPoints[selectedPoints.length - 1], pointNumber).canConnect;

                  return (
                    <g
                      key={point}
                      onClick={() => handlePointClick(pointNumber)}
                      style={{ cursor: interactionMode === "click" && !isPlayingDemo ? "pointer" : "default" }}
                    >
                      {canConnect && (
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r={selectedPointRadius + 10}
                          fill="none"
                          stroke="#956400"
                          strokeDasharray="4 5"
                          strokeWidth="1.5"
                          opacity="0.55"
                        />
                      )}
                      <motion.circle
                        cx={pos.x}
                        cy={pos.y}
                        r={isSelected ? selectedPointRadius : pointRadius}
                        fill={isSelected ? "#2F3437" : "#FFFFFF"}
                        stroke={isSelected ? "#2F3437" : "#D8D6D0"}
                        strokeWidth="2"
                        animate={{ scale: isSelected ? 1.06 : 1 }}
                        transition={{ duration: 0.16 }}
                      />
                      <text
                        x={pos.x}
                        y={pos.y + (gridSize === 3 ? 4 : 3)}
                        textAnchor="middle"
                        fill={isSelected ? "#FFFFFF" : "#787774"}
                        fontSize={pointFontSize}
                        fontWeight="700"
                        pointerEvents="none"
                      >
                        {point}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className={`mx-auto mt-5 grid w-full ${boardMaxClass} grid-cols-2 gap-2`}>
                <button
                  onClick={verifyPattern}
                  disabled={selectedPoints.length < 2 || isVerifying || isPlayingDemo}
                  className="rounded-md bg-[#111111] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#333333] active:scale-[0.98] disabled:opacity-40"
                  title="Check whether your current pattern uses every slope."
                >
                  {isVerifying ? "Checking" : "Check pattern"}
                </button>
                <button
                  onClick={reset}
                  className="rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-sm font-medium text-[#2F3437] transition hover:bg-[#F7F6F3] active:scale-[0.98]"
                  title="Clear all selected points and start again."
                >
                  Reset
                </button>
            </div>

            <div className={`mx-auto mt-3 grid w-full ${boardMaxClass} gap-3 md:grid-cols-[1fr_auto] md:items-start`}>
              <label className="soft-panel block p-3">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#2F3437]">Run a sample path</span>
                <input
                  type="text"
                  value={testSequence}
                  onChange={(event) => setTestSequence(event.target.value)}
                  placeholder="Example: 1 5 2 9"
                  disabled={isPlayingDemo}
                  className="mt-2 w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-sm text-[#2F3437] outline-none transition focus:border-[#787774]"
                />
                <span className="mt-2 block text-xs text-[#787774]">
                  Type numbers separated by spaces or commas, then run the animation.
                </span>
              </label>
              <button
                onClick={playTestSequence}
                disabled={isPlayingDemo || !testSequence.trim()}
                className="rounded-md border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-medium text-[#2F3437] transition hover:bg-[#F7F6F3] active:scale-[0.98] disabled:opacity-40 md:mt-9"
                title="Animate and verify the typed path."
              >
                {isPlayingDemo ? "Running" : "Run sample"}
              </button>
            </div>

            <AnimatePresence>
              {(notice || verifyResult) && (
                <motion.div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-[#2F3437]/20 px-4 py-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => {
                    setVerifyResult(null);
                    setNotice(null);
                  }}
                >
                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    className="minimal-card w-full max-w-md p-6"
                    initial={{ opacity: 0, y: 14, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-start justify-between gap-4 border-b border-[#EAEAEA] pb-4">
                      <div>
                        <h2 className={`text-sm font-semibold uppercase tracking-[0.08em] ${verifyResult?.success ? "text-[#346538]" : "text-[#2F3437]"}`}>
                          {verifyResult?.success ? "Complete pattern" : notice ? "Notice" : "Pattern report"}
                        </h2>
                        <p className="mt-1 text-sm text-[#787774]">
                          {verifyResult?.success ? "Verification succeeded." : "Verification details."}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setVerifyResult(null);
                          setNotice(null);
                        }}
                        className="rounded-md border border-[#EAEAEA] bg-white px-2 py-1 text-xs font-medium text-[#787774] transition hover:bg-[#F7F6F3] hover:text-[#2F3437]"
                      >
                        Close
                      </button>
                    </div>

                    <div className="mt-5 space-y-4 text-sm text-[#787774]">
                      <div className={`rounded-md border p-3 ${verifyResult?.success ? "border-[#EDF3EC] bg-[#EDF3EC] text-[#346538]" : "border-[#EAEAEA] bg-[#FBFBFA] text-[#787774]"}`}>
                        <p>{notice || verifyResult?.message}</p>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.main>

        <motion.aside
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.16 }}
          className="minimal-card p-6"
        >
          <div className="flex items-end justify-between border-b border-[#EAEAEA] pb-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[#2F3437]">Slope catalogue</h2>
              <p className="mt-1 text-xs text-[#787774]">Select a used slope to highlight its segments.</p>
            </div>
            <div className="text-right">
              <div className="mono text-xl font-semibold text-[#2F3437]">{usedSlopes.size}/{totalSlopes}</div>
              <div className="text-xs text-[#787774]">{progress}%</div>
            </div>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-md bg-[#F7F6F3]">
            <motion.div
              className="h-full bg-[#2F3437]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.28 }}
            />
          </div>

          <div className="mt-5 grid max-h-80 grid-cols-4 gap-1.5 overflow-y-auto sm:grid-cols-6 lg:grid-cols-4">
            {slopeItems.map(({ slope, color, used, hasSegments }) => (
              <button
                key={slope}
                onClick={() => hasSegments && setHighlightedSlope(highlightedSlope === slope ? null : slope)}
                className={`mono rounded-md border px-1.5 py-1 text-center text-[11px] transition active:scale-[0.98] ${
                  highlightedSlope === slope
                    ? "border-[#2F3437] bg-[#F7F6F3] text-[#2F3437]"
                    : used
                      ? "border-[#EAEAEA] bg-white text-[#2F3437]"
                      : "border-[#EAEAEA] bg-[#FBFBFA] text-[#A7A29A]"
                }`}
                style={{ borderLeftColor: used ? color : "#EAEAEA", borderLeftWidth: used ? 3 : 1 }}
                disabled={!hasSegments}
                title={hasSegments ? `Highlight slope ${slope}` : `Slope ${slope} is not used yet`}
              >
                {slope}
              </button>
            ))}
          </div>

          <div className="mt-5 border-t border-[#EAEAEA] pt-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[#2F3437]">Current path</h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {activeSegments.length === 0 ? (
                <p className="text-sm text-[#787774]">No segments yet.</p>
              ) : (
                activeSegments.slice(-10).map((segment, index) => (
                  <span
                    key={`${segment.from}-${segment.to}-${index}`}
                    className="mono rounded-md border border-[#EAEAEA] bg-[#F9F9F8] px-2 py-1 text-xs text-[#2F3437]"
                    style={{ borderLeftColor: segment.color, borderLeftWidth: 3 }}
                  >
                    {segment.slope}
                  </span>
                ))
              )}
              {activeSegments.length > 10 && (
                <span className="mono rounded-md border border-[#EAEAEA] bg-[#F9F9F8] px-2 py-1 text-xs text-[#787774]">
                  +{activeSegments.length - 10}
                </span>
              )}
            </div>
          </div>
        </motion.aside>
      </section>

      <AnimatePresence>
        {activeDialog && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#2F3437]/20 px-4 py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveDialog(null)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${activeDialog}-dialog-title`}
              className="minimal-card w-full max-w-md p-6"
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#EAEAEA] pb-4">
                <div>
                  <h2 id={`${activeDialog}-dialog-title`} className="text-sm font-semibold uppercase tracking-[0.08em] text-[#2F3437]">
                    {activeDialog === "rules" ? "Rules" : "Controls"}
                  </h2>
                  <p className="mt-1 text-sm text-[#787774]">
                    {activeDialog === "rules"
                      ? `For the ${gridSize}x${gridSize} grid.`
                      : "Quick reference for the game controls."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDialog(null)}
                  className="rounded-md border border-[#EAEAEA] bg-white px-2 py-1 text-xs font-medium text-[#787774] transition hover:bg-[#F7F6F3] hover:text-[#2F3437]"
                >
                  Close
                </button>
              </div>

              {activeDialog === "rules" ? (
                <ol className="mt-5 space-y-4 text-sm text-[#787774]">
                  {rules.map((rule, index) => (
                    <li key={rule} className="grid grid-cols-[24px_1fr] gap-3">
                      <span className="mono flex h-6 w-6 items-center justify-center rounded-md border border-[#EAEAEA] bg-[#F7F6F3] text-xs text-[#2F3437]">
                        {index + 1}
                      </span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <dl className="mt-5 space-y-4 text-sm">
                  {controlNotes.map(([term, description]) => (
                    <div key={term} className="rounded-md border border-[#EAEAEA] bg-[#FBFBFA] p-3">
                      <dt className="font-medium text-[#2F3437]">{term}</dt>
                      <dd className="mt-1 text-[#787774]">{description}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
