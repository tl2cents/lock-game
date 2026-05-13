export interface Segment {
  from: number;
  to: number;
  slope: string;
  color: string;
  type_name?: string;
  type_description?: string;
}

export interface SlopeTypeInfo {
  slope: string;
  name: string;
}

export interface SlopesInfo {
  used: SlopeTypeInfo[];
  missing: SlopeTypeInfo[];
  count: number;
  total: number;
}

export interface VerifyResponse {
  success: boolean;
  message: string;
  segments: Segment[] | null;
  is_valid_pattern: boolean;
  slopes_info: SlopesInfo | null;
}

export const GRID_CONFIGS = {
  3: {
    name: "3x3",
    size: 3,
    totalPoints: 9,
    difficulty: "Starter",
  },
  5: {
    name: "5x5",
    size: 5,
    totalPoints: 25,
    difficulty: "Strategic",
  },
  7: {
    name: "7x7",
    size: 7,
    totalPoints: 49,
    difficulty: "Extreme",
  },
} as const;

export type GridSize = keyof typeof GRID_CONFIGS;

const DISTINCT_COLORS_3X3: Record<string, string> = {
  "0": "#E53935",
  "∞": "#1E88E5",
  "1": "#43A047",
  "-1": "#FB8C00",
  "2": "#8E24AA",
  "-2": "#00ACC1",
  "1/2": "#FFB300",
  "-1/2": "#EC407A",
};

const ORDERED_3X3_SLOPES = ["0", "∞", "1", "-1", "2", "-2", "1/2", "-1/2"];

export function isGridSize(size: number): size is GridSize {
  return size === 3 || size === 5 || size === 7;
}

export function getPointCoords(gridSize: number): Record<number, [number, number]> {
  const coords: Record<number, [number, number]> = {};
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      coords[row * gridSize + col + 1] = [col, row];
    }
  }
  return coords;
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a === 0 ? 1 : a;
}

export function calculateSlope(p1: number, p2: number, gridSize: number): string {
  const coords = getPointCoords(gridSize);
  const [x1, y1] = coords[p1];
  const [x2, y2] = coords[p2];
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0) return "∞";

  const divisor = gcd(dy, dx);
  let numerator = dy / divisor;
  let denominator = dx / divisor;

  if (denominator < 0) {
    numerator = -numerator;
    denominator = -denominator;
  }

  return denominator === 1 ? String(numerator) : `${numerator}/${denominator}`;
}

function slopeSortValue(slope: string): number {
  if (slope === "∞") return Number.POSITIVE_INFINITY;
  if (slope.includes("/")) {
    const [num, den] = slope.split("/").map(Number);
    return num / den;
  }
  return Number(slope);
}

export function calculateAllSlopes(gridSize: number): string[] {
  if (gridSize === 3) return [...ORDERED_3X3_SLOPES];

  const slopes = new Set<string>();
  const totalPoints = gridSize * gridSize;

  for (let p1 = 1; p1 <= totalPoints; p1++) {
    for (let p2 = p1 + 1; p2 <= totalPoints; p2++) {
      slopes.add(calculateSlope(p1, p2, gridSize));
    }
  }

  return Array.from(slopes).sort((a, b) => slopeSortValue(a) - slopeSortValue(b));
}

function colorHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }

  const hue = hash % 360;
  return `hsl(${hue} 72% 48%)`;
}

export function getSlopeColorsForGrid(gridSize: number): Record<string, string> {
  if (gridSize === 3) return { ...DISTINCT_COLORS_3X3 };

  return Object.fromEntries(calculateAllSlopes(gridSize).map((slope) => [slope, colorHash(slope)]));
}

export function canConnectPoint(
  lastPoint: number,
  nextPoint: number,
  selectedPoints: number[],
  gridSize: number,
): { canConnect: boolean; reason?: string } {
  if (selectedPoints.includes(nextPoint)) {
    return { canConnect: false, reason: "Point already selected" };
  }

  const coords = getPointCoords(gridSize);
  const [x1, y1] = coords[lastPoint];
  const [x2, y2] = coords[nextPoint];
  const dx = x2 - x1;
  const dy = y2 - y1;
  const divisor = gcd(dx, dy);
  const stepX = dx / divisor;
  const stepY = dy / divisor;

  for (let i = 1; i < divisor; i++) {
    const midX = x1 + stepX * i;
    const midY = y1 + stepY * i;
    const midPoint = midY * gridSize + midX + 1;

    if (!selectedPoints.includes(midPoint)) {
      return { canConnect: false, reason: `Must select point ${midPoint} first` };
    }
  }

  return { canConnect: true };
}

export function parsePattern(pattern: string, gridSize: number): number[] | null {
  const value = pattern.trim();
  if (!value) return null;

  if (value.includes(",") || value.includes(" ")) {
    const points = value
      .split(/[,\s]+/)
      .filter(Boolean)
      .map((part) => Number(part));
    return points.every(Number.isInteger) ? points : null;
  }

  if (gridSize === 3 && /^\d+$/.test(value)) {
    return value.split("").map(Number);
  }

  const single = Number(value);
  return Number.isInteger(single) ? [single] : null;
}

export function getPatternSegments(points: number[], gridSize: number): Segment[] {
  const slopeColors = getSlopeColorsForGrid(gridSize);

  return points.slice(0, -1).map((from, index) => {
    const to = points[index + 1];
    const slope = calculateSlope(from, to, gridSize);
    return {
      from,
      to,
      slope,
      color: slopeColors[slope] || "#64748b",
      type_name: `Slope ${slope}`,
      type_description: `Line with slope ${slope}`,
    };
  });
}

export function getUsedSlopesInfo(points: number[], gridSize: number): SlopesInfo {
  const used = new Set<string>();
  const usedTypes: SlopeTypeInfo[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const slope = calculateSlope(points[i], points[i + 1], gridSize);
    if (!used.has(slope)) {
      used.add(slope);
      usedTypes.push({ slope, name: `Slope ${slope}` });
    }
  }

  const allSlopes = calculateAllSlopes(gridSize);
  const missing = allSlopes
    .filter((slope) => !used.has(slope))
    .map((slope) => ({ slope, name: `Slope ${slope}` }));

  return {
    used: usedTypes,
    missing,
    count: used.size,
    total: allSlopes.length,
  };
}

export function verifyPatternPoints(points: number[], gridSize: number): VerifyResponse {
  if (!isGridSize(gridSize)) {
    return {
      success: false,
      message: "Invalid grid size. Choose 3x3, 5x5, or 7x7.",
      segments: null,
      is_valid_pattern: false,
      slopes_info: null,
    };
  }

  if (points.length < 2) {
    return {
      success: false,
      message: "Pattern requires at least 2 points.",
      segments: null,
      is_valid_pattern: false,
      slopes_info: null,
    };
  }

  const totalPoints = gridSize * gridSize;
  for (const point of points) {
    if (point < 1 || point > totalPoints) {
      return {
        success: false,
        message: `Point ${point} is out of range for a ${gridSize}x${gridSize} grid (1-${totalPoints}).`,
        segments: null,
        is_valid_pattern: false,
        slopes_info: null,
      };
    }
  }

  if (new Set(points).size !== points.length) {
    return {
      success: false,
      message: "A pattern cannot reuse a point.",
      segments: null,
      is_valid_pattern: false,
      slopes_info: null,
    };
  }

  for (let i = 0; i < points.length - 1; i++) {
    const result = canConnectPoint(points[i], points[i + 1], points.slice(0, i + 1), gridSize);
    if (!result.canConnect) {
      return {
        success: false,
        message: `Cannot connect ${points[i]} to ${points[i + 1]}: ${result.reason || "invalid move"}.`,
        segments: null,
        is_valid_pattern: false,
        slopes_info: null,
      };
    }
  }

  const slopesInfo = getUsedSlopesInfo(points, gridSize);
  const segments = getPatternSegments(points, gridSize);

  if (slopesInfo.count === slopesInfo.total) {
    return {
      success: true,
      message: `Solved. The pattern uses all ${slopesInfo.total} unique slopes.`,
      segments,
      is_valid_pattern: true,
      slopes_info: slopesInfo,
    };
  }

  const missingCount = slopesInfo.total - slopesInfo.count;
  const missingPreview = slopesInfo.missing.slice(0, 6).map((item) => item.slope).join(", ");

  return {
    success: false,
    message: `Used ${slopesInfo.count}/${slopesInfo.total} slopes. Missing ${missingCount}: ${missingPreview}${slopesInfo.missing.length > 6 ? "..." : ""}`,
    segments,
    is_valid_pattern: false,
    slopes_info: slopesInfo,
  };
}

export function verifyPatternString(pattern: string, gridSize: number): VerifyResponse {
  const points = parsePattern(pattern, gridSize);
  if (!points) {
    return {
      success: false,
      message: "Invalid pattern format.",
      segments: null,
      is_valid_pattern: false,
      slopes_info: null,
    };
  }
  return verifyPatternPoints(points, gridSize);
}
