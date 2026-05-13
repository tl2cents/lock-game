"use client";

import React, { useState, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [testSequence, setTestSequence] = useState<string>("");
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [highlightedSlope, setHighlightedSlope] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Dynamic SVG size based on grid
  const SVG_SIZE = gridSize === 3 ? 400 : gridSize === 5 ? 500 : 600;
  const MARGIN = 50;
  const GRID_SIZE = SVG_SIZE - 2 * MARGIN;
  const CELL_SIZE = GRID_SIZE / (gridSize - 1);
  const slopeColors = useMemo(() => getSlopeColorsForGrid(gridSize), [gridSize]);
  const allSlopes = useMemo(() => calculateAllSlopes(gridSize), [gridSize]);
  const totalSlopes = allSlopes.length;

  const POINT_POSITIONS = useMemo(() => {
    const positions: Record<number, { x: number; y: number }> = {};
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const pointId = i * gridSize + j + 1;
        positions[pointId] = {
          x: MARGIN + j * CELL_SIZE,
          y: MARGIN + i * CELL_SIZE,
        };
      }
    }
    return positions;
  }, [CELL_SIZE, gridSize]);

  const updateCurrentSegments = useCallback((points: number[]) => {
    setCurrentSegments(getPatternSegments(points, gridSize));
  }, [gridSize]);

  const getSVGCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!svgRef.current) return null;
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    
    let clientX: number, clientY: number;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: (clientX - rect.left) * (SVG_SIZE / rect.width),
      y: (clientY - rect.top) * (SVG_SIZE / rect.height),
    };
  }, [SVG_SIZE]);

  const getPointAtPosition = useCallback((x: number, y: number): number | null => {
    const hitRadius = gridSize === 3 ? 35 : gridSize === 5 ? 25 : 20;
    for (const [point, pos] of Object.entries(POINT_POSITIONS)) {
      const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
      if (distance < hitRadius) {
        return parseInt(point);
      }
    }
    return null;
  }, [POINT_POSITIONS, gridSize]);

  // Check if a point can be connected based on game rules
  // Must check ALL intermediate points on the straight line path
  const canConnectPoint = useCallback((lastPoint: number, nextPoint: number): { canConnect: boolean; reason?: string } => {
    return canConnectByRules(lastPoint, nextPoint, selectedPoints, gridSize);
  }, [selectedPoints, gridSize]);

  const handlePointClick = useCallback((point: number) => {
    if (interactionMode !== "click" || isPlayingDemo) return;

    if (selectedPoints.length === 0) {
      // First point
      const newPoints = [point];
      setSelectedPoints(newPoints);
      setVerifyResult(null);
      setShowAnimation(false);
      setAnimatedSegments([]);
      updateCurrentSegments(newPoints);
    } else {
      const lastPoint = selectedPoints[selectedPoints.length - 1];
      if (lastPoint === point) return;

      const { canConnect, reason } = canConnectPoint(lastPoint, point);
      if (canConnect) {
        const newPoints = [...selectedPoints, point];
        setSelectedPoints(newPoints);
        updateCurrentSegments(newPoints);
      } else if (reason) {
        // Show error briefly
        setDemoError(reason);
        setTimeout(() => setDemoError(null), 2000);
      }
    }
  }, [interactionMode, selectedPoints, canConnectPoint, updateCurrentSegments, isPlayingDemo]);

  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (interactionMode !== "swipe" || isPlayingDemo) return;

    const coords = getSVGCoords(e);
    if (!coords) return;
    
    const point = getPointAtPosition(coords.x, coords.y);
    if (point && !selectedPoints.includes(point)) {
      const newPoints = [point];
      setSelectedPoints(newPoints);
      setIsDrawing(true);
      setCurrentPos(coords);
      setVerifyResult(null);
      setShowAnimation(false);
      setAnimatedSegments([]);
      updateCurrentSegments(newPoints);
    }
  }, [interactionMode, getSVGCoords, getPointAtPosition, selectedPoints, updateCurrentSegments, isPlayingDemo]);

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || interactionMode !== "swipe") return;
    
    const coords = getSVGCoords(e);
    if (!coords) return;
    
    setCurrentPos(coords);
    
    const point = getPointAtPosition(coords.x, coords.y);
    if (point && !selectedPoints.includes(point)) {
      const lastPoint = selectedPoints[selectedPoints.length - 1];
      const { canConnect } = canConnectPoint(lastPoint, point);
      
      if (canConnect) {
        const newPoints = [...selectedPoints, point];
        setSelectedPoints(newPoints);
        updateCurrentSegments(newPoints);
      }
    }
  }, [isDrawing, interactionMode, getSVGCoords, getPointAtPosition, selectedPoints, canConnectPoint, updateCurrentSegments]);

  const handleEnd = useCallback(() => {
    setIsDrawing(false);
    setCurrentPos(null);
  }, []);

  const animateSuccessfulSegments = (segments: Segment[], delay = 160) => {
    setShowAnimation(true);
    setAnimatedSegments([]);
    segments.forEach((segment, index) => {
      setTimeout(() => {
        setAnimatedSegments((prev) => [...prev, segment]);
      }, index * delay);
    });
  };

  const verifyPattern = () => {
    if (selectedPoints.length < 2) {
      setVerifyResult({
        success: false,
        message: "Please connect at least 2 points",
        segments: null,
        is_valid_pattern: false,
        slopes_info: null,
      });
      return;
    }

    setIsVerifying(true);
    const result = verifyPatternPoints(selectedPoints, gridSize);
    setVerifyResult(result);

    if (result.success && result.segments) {
      animateSuccessfulSegments(result.segments, 180);
    }

    window.setTimeout(() => {
      setIsVerifying(false);
    }, 120);
  };

  const reset = () => {
    setSelectedPoints([]);
    setVerifyResult(null);
    setShowAnimation(false);
    setAnimatedSegments([]);
    setCurrentSegments([]);
    setDemoError(null);
    setIsPlayingDemo(false);
  };

  const playTestSequence = async () => {
    if (!testSequence.trim()) return;

    setIsPlayingDemo(true);
    setSelectedPoints([]);
    setVerifyResult(null);
    setShowAnimation(false);
    setAnimatedSegments([]);
    setCurrentSegments([]);
    setDemoError(null);

    const sequence = parsePattern(testSequence, gridSize);
    
    if (!sequence || sequence.length < 2) {
      setDemoError("Need at least 2 points");
      setIsPlayingDemo(false);
      return;
    }

    const totalPoints = gridSize * gridSize;
    for (const n of sequence) {
      if (n < 1 || n > totalPoints) {
        setDemoError(`Point ${n} is out of range (1-${totalPoints})`);
        setIsPlayingDemo(false);
        return;
      }
    }

    // Animate sequence with smooth transitions
    for (let i = 0; i < sequence.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const point = sequence[i];
      const currentPoints = sequence.slice(0, i + 1);

      // Check for duplicates
      if (currentPoints.slice(0, -1).includes(point)) {
        setDemoError(`Point ${point} already used`);
        setSelectedPoints(currentPoints.slice(0, -1));
        updateCurrentSegments(currentPoints.slice(0, -1));
        setIsPlayingDemo(false);
        return;
      }

      // Check connection rules - check all intermediate points
      if (i > 0) {
        const lastPoint = sequence[i - 1];
        const tempSelected = sequence.slice(0, i);
        const result = canConnectByRules(lastPoint, point, tempSelected, gridSize);

        if (!result.canConnect) {
          setDemoError(`Cannot connect ${lastPoint} to ${point}: ${result.reason || "invalid move"}`);
          setSelectedPoints(tempSelected);
          updateCurrentSegments(tempSelected);
          setIsPlayingDemo(false);
          return;
        }
      }

      setSelectedPoints([...currentPoints]);
      updateCurrentSegments(currentPoints);
    }

    setIsPlayingDemo(false);
    // Auto verify after demo with shorter delay for smoother experience
    setTimeout(() => {
      const pattern = gridSize === 3 ? sequence.join("") : sequence.join(",");
      verifyPatternDirect(pattern);
    }, 200);
  };

  const verifyPatternDirect = (pattern: string) => {
    setIsVerifying(true);
    const result = verifyPatternString(pattern, gridSize);
    setVerifyResult(result);
    if (result.success && result.segments) {
      animateSuccessfulSegments(result.segments, 140);
    }
    window.setTimeout(() => {
      setIsVerifying(false);
    }, 120);
  };

  // Determine which segments to use for calculations (animation vs current)
  const activeSegments = showAnimation ? animatedSegments : currentSegments;

  // Cache: slope -> segment indices mapping (for highlight feature)
  const slopeToSegments = React.useMemo(() => {
    const map: Record<string, number[]> = {};
    activeSegments.forEach((seg, index) => {
      if (!map[seg.slope]) {
        map[seg.slope] = [];
      }
      map[seg.slope].push(index);
    });
    return map;
  }, [activeSegments]);

  // Cache: set of used slopes (for status display)
  const usedSlopes = React.useMemo(() => {
    const used = new Set<string>();
    activeSegments.forEach(seg => used.add(seg.slope));
    return used;
  }, [activeSegments]);

  const renderLines = () => {
    // When animation is complete, use animatedSegments instead of currentSegments
    // but still apply highlight logic
    if (showAnimation) {
      return animatedSegments.map((segment, index) => {
        const from = POINT_POSITIONS[segment.from];
        const to = POINT_POSITIONS[segment.to];
        const isHighlighted = highlightedSlope === segment.slope;
        const hasHighlight = highlightedSlope !== null;
        
        // Determine visual properties based on highlight state
        const strokeWidth = isHighlighted 
          ? (gridSize === 3 ? "10" : gridSize === 5 ? "7" : "6")  // Highlighted: much thicker
          : hasHighlight 
            ? (gridSize === 3 ? "3" : gridSize === 5 ? "2" : "1.5")  // Dimmed: thinner
            : (gridSize === 3 ? "6" : gridSize === 5 ? "4" : "3");   // Normal for animation
        
        const opacity = isHighlighted ? 1 : hasHighlight ? 0.15 : 1;
        const filter = isHighlighted 
          ? `drop-shadow(0 0 12px ${segment.color}) drop-shadow(0 0 20px ${segment.color})`
          : hasHighlight 
            ? "none"
            : "drop-shadow(0 2px 4px rgba(0,0,0,0.2))";
        
        const strokeColor = hasHighlight && !isHighlighted ? "#cccccc" : segment.color;
        
        return (
          <motion.line
            key={`anim-${index}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{ filter }}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ 
              pathLength: 1, 
              opacity,
              strokeWidth: parseFloat(strokeWidth as string)
            }}
            transition={{ 
              duration: 0.25, 
              ease: "easeOut",
              opacity: { duration: 0.15 },
              strokeWidth: { duration: 0.2 }
            }}
          />
        );
      });
    }

    const lines = [];
    for (let i = 0; i < currentSegments.length; i++) {
      const segment = currentSegments[i];
      const from = POINT_POSITIONS[segment.from];
      const to = POINT_POSITIONS[segment.to];
      const isHighlighted = highlightedSlope === segment.slope;
      const hasHighlight = highlightedSlope !== null;
      
      // Determine visual properties based on highlight state
      const strokeWidth = isHighlighted 
        ? (gridSize === 3 ? "10" : gridSize === 5 ? "7" : "6")  // Highlighted: much thicker
        : hasHighlight 
          ? (gridSize === 3 ? "3" : gridSize === 5 ? "2" : "1.5")  // Dimmed: thinner
          : (gridSize === 3 ? "5" : gridSize === 5 ? "3" : "2");   // Normal
      
      const opacity = isHighlighted ? 1 : hasHighlight ? 0.15 : 1;
      const filter = isHighlighted 
        ? `drop-shadow(0 0 12px ${segment.color}) drop-shadow(0 0 20px ${segment.color})`  // Double glow
        : hasHighlight 
          ? "none"  // No shadow when dimmed
          : "drop-shadow(0 2px 4px rgba(0,0,0,0.2))";
      
      // Non-highlighted lines use a grayed-out version of their color
      const strokeColor = hasHighlight && !isHighlighted ? "#cccccc" : segment.color;
      
      lines.push(
        <motion.line
          key={`line-${i}`}
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={{ filter }}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ 
            pathLength: 1, 
            opacity,
            strokeWidth: parseFloat(strokeWidth as string)
          }}
          transition={{ 
            duration: 0.25, 
            ease: "easeOut",
            opacity: { duration: 0.15 },
            strokeWidth: { duration: 0.2 }
          }}
        />
      );
    }

    if (isDrawing && currentPos && selectedPoints.length > 0) {
      const lastPoint = POINT_POSITIONS[selectedPoints[selectedPoints.length - 1]];
      lines.push(
        <motion.line
          key="current"
          x1={lastPoint.x}
          y1={lastPoint.y}
          x2={currentPos.x}
          y2={currentPos.y}
          stroke="rgba(0, 113, 227, 0.5)"
          strokeWidth={gridSize === 3 ? "3" : "2"}
          strokeLinecap="round"
          strokeDasharray="8,4"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: 0.15 }}
        />
      );
    }

    return lines;
  };

  const renderGridLines = () => {
    const lines = [];
    for (let i = 0; i < gridSize; i++) {
      const pos = MARGIN + i * CELL_SIZE;
      lines.push(
        <line
          key={`h-${i}`}
          x1={MARGIN}
          y1={pos}
          x2={MARGIN + GRID_SIZE}
          y2={pos}
          stroke="rgba(0,0,0,0.05)"
          strokeWidth="1"
        />
      );
      lines.push(
        <line
          key={`v-${i}`}
          x1={pos}
          y1={MARGIN}
          x2={pos}
          y2={MARGIN + GRID_SIZE}
          stroke="rgba(0,0,0,0.05)"
          strokeWidth="1"
        />
      );
    }
    return lines;
  };

  const pointRadius = gridSize === 3 ? 14 : gridSize === 5 ? 10 : 8;
  const selectedPointRadius = gridSize === 3 ? 18 : gridSize === 5 ? 13 : 10;

  // Get all slopes for the sidebar
  const getAllSlopesDisplay = () => {
    return allSlopes.map(slope => ({
      slope,
      color: slopeColors[slope],
      used: usedSlopes.has(slope),
      hasSegments: slopeToSegments[slope] !== undefined
    }));
  };

  return (
    <div className="min-h-screen px-3 py-4 pb-16 sm:px-4 lg:px-6">
      {/* Header with title and mode toggle */}
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 lg:mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
              The Most Complicated Lock Pattern Game
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Use all {totalSlopes} unique slopes to unlock
            </p>
          </motion.div>

          {/* Mode toggle - Apple style segmented control */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">Mode</span>
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setInteractionMode("swipe")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  interactionMode === "swipe"
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                Swipe
              </button>
              <button
                onClick={() => setInteractionMode("click")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  interactionMode === "click"
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                Click
              </button>
            </div>
          </motion.div>
        </div>

        {/* Main content: Grid (center) + Sidebar (right) */}
        <div className="flex flex-col lg:flex-row items-start justify-center gap-5 lg:gap-6">
          {/* Left spacer for centering on large screens */}
          <div className="hidden lg:block lg:w-64 shrink-0" />

          {/* Center: Grid */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex w-full flex-col items-center lg:w-auto"
          >
            <div className={`glass-card p-5 shadow-xl relative ${
              verifyResult?.success ? "ring-2 ring-green-400 ring-opacity-50" : ""
            } w-full`}
              style={{ maxWidth: `${SVG_SIZE + 40}px` }}
            >
              {verifyResult?.success && (
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-400/10 to-emerald-500/10 animate-pulse" />
              )}

              <svg
                ref={svgRef}
                viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
                className="touch-none cursor-pointer relative z-10 h-auto w-full"
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
              >
                <rect width={SVG_SIZE} height={SVG_SIZE} fill="transparent" rx="16" />
                {renderGridLines()}
                {renderLines()}

          {/* Render points (circles only) */}
          {Object.entries(POINT_POSITIONS).map(([point, pos]) => {
            const isSelected = selectedPoints.includes(parseInt(point));
            
            // Check if this point can be connected in click mode
            const canConnect = interactionMode === "click" && 
              selectedPoints.length > 0 && 
              !isSelected && 
              !isPlayingDemo &&
              canConnectPoint(selectedPoints[selectedPoints.length - 1], parseInt(point)).canConnect;
            
            return (
              <g 
                key={point}
                onClick={() => handlePointClick(parseInt(point))}
                style={{ cursor: interactionMode === "click" && !isPlayingDemo ? "pointer" : "default" }}
              >
                {/* Connectable indicator with pulse animation */}
                {canConnect && (
                  <motion.circle
                    cx={pos.x}
                    cy={pos.y}
                    r={selectedPointRadius + 15}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ 
                      scale: [1, 1.05, 1],
                      opacity: [0.8, 1, 0.8]
                    }}
                    transition={{ 
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                )}
                
                {isSelected && (
                  <motion.circle
                    cx={pos.x}
                    cy={pos.y}
                    r={selectedPointRadius + 10}
                    fill="rgba(245, 158, 11, 0.15)"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 400, 
                      damping: 25,
                      duration: 0.2
                    }}
                  />
                )}
                <motion.circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isSelected ? selectedPointRadius : pointRadius}
                  fill={isSelected ? "#f59e0b" : "rgba(174, 174, 178, 0.4)"}
                  stroke={isSelected ? "#f59e0b" : "rgba(174, 174, 178, 0.6)"}
                  strokeWidth="2"
                  animate={{ scale: isSelected ? 1.1 : 1 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 600, 
                    damping: 30,
                    duration: 0.2
                  }}
                  style={{ filter: isSelected ? "drop-shadow(0 4px 8px rgba(245,158,11,0.4))" : "none" }}
                />
              </g>
            );
          })}

          {/* Render text labels on top layer - always show point numbers */}
          {Object.entries(POINT_POSITIONS).map(([point, pos]) => {
            const isSelected = selectedPoints.includes(parseInt(point));
            const fontSize = gridSize === 3 ? "12" : gridSize === 5 ? "9" : "7";
            
            return (
              <g key={`label-${point}`} pointerEvents="none">
                {/* Point number - always visible, changes color when selected */}
                {isSelected ? (
                  <motion.text
                    x={pos.x}
                    y={pos.y + (gridSize === 3 ? 4 : 3)}
                    textAnchor="middle"
                    fill="white"
                    fontSize={fontSize}
                    fontWeight="700"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {point}
                  </motion.text>
                ) : (
                  <text
                    x={pos.x}
                    y={pos.y + (gridSize === 3 ? 4 : 3)}
                    textAnchor="middle"
                    fill="rgba(100, 100, 100, 0.4)"
                    fontSize={fontSize}
                    fontWeight="600"
                  >
                    {point}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

              {/* Pattern display */}
              <div className="mt-3 text-center">
                <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                  {selectedPoints.length > 0 
                    ? (gridSize === 3 ? selectedPoints.join(" → ") : `${selectedPoints.length} points selected`)
                    : interactionMode === "swipe" ? "Drag to draw" : "Click to connect"}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={verifyPattern}
                disabled={selectedPoints.length < 2 || isVerifying || isPlayingDemo}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 
                         text-white font-medium shadow-lg shadow-orange-500/25
                         hover:shadow-orange-500/40 hover:scale-105
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                         transition-all duration-200"
              >
                {isVerifying ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Checking...
                  </span>
                ) : "Verify Pattern"}
              </button>
              <button
                onClick={reset}
                className="px-5 py-2.5 rounded-full bg-gray-100 dark:bg-gray-800 
                         text-gray-700 dark:text-gray-300 font-medium
                         hover:bg-gray-200 dark:hover:bg-gray-700
                         transition-all duration-200"
              >
                Reset
              </button>
            </div>

            {/* Test sequence input */}
            <div className="mt-5 w-full max-w-sm">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testSequence}
                  onChange={(e) => setTestSequence(e.target.value)}
                  placeholder="Test: 1,5,2,9 or 1 5 2 9"
                  disabled={isPlayingDemo}
                  className="flex-1 px-4 py-2 rounded-full text-sm
                           border border-gray-200 dark:border-gray-700
                           bg-gray-50 dark:bg-gray-800/50
                           text-gray-900 dark:text-white
                           placeholder:text-gray-400
                           focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500
                           disabled:opacity-50"
                />
                <button
                  onClick={playTestSequence}
                  disabled={isPlayingDemo || !testSequence.trim()}
                  className="px-4 py-2 rounded-full bg-purple-500 hover:bg-purple-600 
                           text-white text-sm font-medium
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-200"
                >
                  {isPlayingDemo ? "..." : "Run"}
                </button>
              </div>
            </div>

            {/* Demo error message */}
            <AnimatePresence>
              {demoError && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-3 px-4 py-2 bg-red-50 dark:bg-red-900/20 
                           border border-red-200 dark:border-red-800 
                           rounded-full text-xs text-red-600 dark:text-red-400"
                >
                  {demoError}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Verify result */}
            <AnimatePresence>
              {verifyResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`mt-4 px-5 py-3 rounded-2xl text-center ${
                    verifyResult.success
                      ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                      : "bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <p className={`text-sm font-medium ${
                    verifyResult.success
                      ? "text-green-700 dark:text-green-300"
                      : "text-gray-600 dark:text-gray-400"
                  }`}>
                    {verifyResult.message}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Right sidebar: Slopes status */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`w-full shrink-0 ${gridSize === 3 ? 'lg:w-48' : gridSize === 5 ? 'lg:w-64' : 'lg:w-80'}`}
          >
            <div className={`glass-card sticky top-4 ${gridSize === 3 ? 'p-3' : gridSize === 5 ? 'p-4' : 'p-5'}`}>
              {/* Progress header */}
              <div className={`flex items-center justify-between ${gridSize === 3 ? 'mb-3' : 'mb-4'}`}>
                <span className={`font-medium text-gray-700 dark:text-gray-300 ${gridSize === 3 ? 'text-xs' : 'text-sm'}`}>
                  Slopes
                </span>
                <div className="flex items-center gap-1">
                  <span className={`font-bold ${
                    usedSlopes.size === totalSlopes ? 'text-green-500' : 'text-amber-500'
                  } ${gridSize === 3 ? 'text-base' : 'text-lg'}`}>
                    {usedSlopes.size}
                  </span>
                  <span className={`text-gray-400 ${gridSize === 3 ? 'text-xs' : 'text-sm'}`}>/ {totalSlopes}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className={`bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden ${gridSize === 3 ? 'h-1.5 mb-3' : 'h-2 mb-4'}`}>
                <motion.div 
                  className={`h-full rounded-full ${
                    usedSlopes.size === totalSlopes 
                      ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                      : 'bg-gradient-to-r from-amber-400 to-orange-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(usedSlopes.size / totalSlopes) * 100}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>

              {/* Slopes grid */}
              <div className={`overflow-y-auto ${gridSize === 3 ? 'max-h-40' : gridSize === 5 ? 'max-h-60' : 'max-h-80'}`}>
                <div className={`grid gap-1.5 ${gridSize === 3 ? 'grid-cols-4' : gridSize === 5 ? 'grid-cols-5' : 'grid-cols-6'}`}>
                  {getAllSlopesDisplay().map(({ slope, color, used, hasSegments }) => (
                    <div
                      key={slope}
                      onClick={() => {
                        if (hasSegments) {
                          setHighlightedSlope(highlightedSlope === slope ? null : slope);
                        }
                      }}
                      className={`relative rounded text-center font-medium transition-all
                        ${gridSize === 3 ? 'px-1.5 py-1 text-xs' : gridSize === 5 ? 'px-1 py-0.5 text-[10px]' : 'px-0.5 py-0.5 text-[9px]'}
                        ${hasSegments ? 'cursor-pointer hover:scale-105' : ''}
                        ${highlightedSlope === slope ? 'ring-2 ring-offset-1 scale-105' : ''}
                        ${used ? '' : 'opacity-30'}
                      `}
                      style={{ 
                        backgroundColor: used ? `${color}40` : `${color}10`,
                        color: used ? color : `${color}80`,
                        // @ts-expect-error ringColor is a CSS variable
                        '--tw-ring-color': highlightedSlope === slope ? color : 'transparent',
                        fontWeight: used ? 600 : 400
                      }}
                    >
                      {slope}
                    </div>
                  ))}
                </div>
              </div>

              {/* Highlighted slope info */}
              {highlightedSlope && slopeToSegments[highlightedSlope] && (
                <div className={`border-t border-gray-100 dark:border-gray-800 ${gridSize === 3 ? 'mt-2 pt-2' : 'mt-3 pt-3'}`}>
                  <div className={`flex items-center justify-between ${gridSize === 3 ? 'text-[10px]' : 'text-xs'}`}>
                    <span className="text-gray-500">
                      Slope <span style={{ color: slopeColors[highlightedSlope] }} className="font-bold">{highlightedSlope}</span>
                    </span>
                    <span className="text-gray-400">
                      {slopeToSegments[highlightedSlope].length} seg{slopeToSegments[highlightedSlope].length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <button
                    onClick={() => setHighlightedSlope(null)}
                    className={`mt-1.5 w-full rounded bg-gray-100 dark:bg-gray-800 
                             text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors
                             ${gridSize === 3 ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'}`}
                  >
                    Clear
                  </button>
                </div>
              )}

              {/* Current segments - show when drawing */}
              {currentSegments.length > 0 && !showAnimation && (
                <div className={`border-t border-gray-100 dark:border-gray-800 ${gridSize === 3 ? 'mt-2 pt-2' : 'mt-3 pt-3'}`}>
                  <p className={`text-gray-500 ${gridSize === 3 ? 'text-[10px] mb-1' : 'text-xs mb-2'}`}>Current path:</p>
                  <div className="flex flex-wrap gap-1">
                    {currentSegments.slice(gridSize === 3 ? -6 : -8).map((segment, index) => (
                      <span
                        key={index}
                        className={`rounded font-medium ${gridSize === 3 ? 'px-1 py-0.5 text-[10px]' : 'px-1.5 py-0.5 text-xs'}`}
                        style={{ 
                          backgroundColor: `${segment.color}20`,
                          color: segment.color
                        }}
                      >
                        {segment.slope}
                      </span>
                    ))}
                    {currentSegments.length > (gridSize === 3 ? 6 : 8) && (
                      <span className={`text-gray-400 ${gridSize === 3 ? 'text-[10px]' : 'text-xs'}`}>+{currentSegments.length - (gridSize === 3 ? 6 : 8)}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
