import {
  hexToRgb,
  rgbToHex,
  rgbToLab,
  type Lab,
  type RGB,
} from "./color";

export type ReferencePoint = { ph: number; hex: string };
export type ReferenceProfile = {
  id: string;
  name: string;
  synthetic: boolean;
  points: ReferencePoint[];
};
export type PhResult = {
  estimate: number | null;
  range: [number, number] | null;
  nearest: ReferencePoint;
  deltaE: number;
  interpolated: boolean;
  warnings: string[];
  status: "matched" | "interpolated" | "ambiguous" | "unsupported";
};
export type ComparisonRow = { estimate: number; reference: number };

export const DEMO_PROFILE: ReferenceProfile = {
  id: "pocketsense-synthetic-v1",
  name: "Synthetic demonstration",
  synthetic: true,
  points: [
    { ph: 2, hex: "#D85159" },
    { ph: 4, hex: "#EB9752" },
    { ph: 6, hex: "#E1C758" },
    { ph: 7, hex: "#95B975" },
    { ph: 8, hex: "#52A79A" },
    { ph: 10, hex: "#4E83AF" },
    { ph: 12, hex: "#75639F" },
  ],
};

export function validateProfile(value: unknown): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== "object")
    return ["A profile must be a JSON object."];
  const p = value as Partial<ReferenceProfile>;
  if (typeof p.id !== "string" || !p.id.trim() || p.id.length > 120)
    errors.push("A profile needs an ID of 1–120 characters.");
  if (typeof p.name !== "string" || !p.name.trim() || p.name.length > 120)
    errors.push("A profile needs a name of 1–120 characters.");
  if (typeof p.synthetic !== "boolean")
    errors.push("A profile must declare whether it is synthetic.");
  if (!Array.isArray(p.points) || p.points.length < 2 || p.points.length > 100)
    return [...errors, "Provide 2–100 reference points."];
  const seen = new Set<number>();
  Array.from(p.points).forEach((point, i) => {
    if (!point || typeof point !== "object") {
      errors.push(`Reference ${i + 1} is invalid.`);
      return;
    }
    if (
      typeof point.ph !== "number" ||
      !Number.isFinite(point.ph) ||
      point.ph < 0 ||
      point.ph > 14
    )
      errors.push(`Reference ${i + 1}: pH must be a number between 0 and 14.`);
    else if (seen.has(point.ph))
      errors.push(`pH ${point.ph} appears more than once.`);
    seen.add(point.ph);
    if (typeof point.hex !== "string" || !hexToRgb(point.hex))
      errors.push(`Reference ${i + 1}: enter a valid HEX color.`);
  });
  return errors;
}

export function parseProfile(json: string): ReferenceProfile {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error("This file is not valid JSON.");
  }
  const errors = validateProfile(value);
  if (errors.length) throw new Error(errors.join(" "));
  const profile = value as ReferenceProfile;
  return {
    id: profile.id.trim(),
    name: profile.name.trim(),
    synthetic: profile.synthetic,
    points: profile.points
      .map((p) => ({ ph: p.ph, hex: rgbToHex(hexToRgb(p.hex)!) }))
      .sort((a, b) => a.ph - b.ph),
  };
}

/** Uniform Catmull-Rom in D65 Lab; repeat end controls at profile boundaries. */
export function catmullRomLab(p0: Lab, p1: Lab, p2: Lab, p3: Lab, t: number): Lab {
  const interpolate = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * t +
      (2 * a - 5 * b + 4 * c - d) * t * t +
      (-a + 3 * b - 3 * c + d) * t * t * t);
  return {
    l: interpolate(p0.l, p1.l, p2.l, p3.l),
    a: interpolate(p0.a, p1.a, p2.a, p3.a),
    b: interpolate(p0.b, p1.b, p2.b, p3.b),
  };
}

const distance2 = (a: Lab, b: Lab) =>
  (a.l - b.l) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2;

/** Search the Lab spline at 0.01 pH spacing, including every reference knot. */
export function estimatePh(rgb: RGB, profile: ReferenceProfile): PhResult {
  const errors = validateProfile(profile);
  if (errors.length) throw new Error(errors.join(" "));
  const sample = rgbToLab(rgb);
  const points = [...profile.points].sort((a, b) => a.ph - b.ph)
    .map(point => ({ ...point, lab: rgbToLab(hexToRgb(point.hex)!) }));
  let nearest = points[0];
  let nearestDistance = Infinity;
  for (const point of points) {
    const distance = distance2(sample, point.lab);
    if (distance < nearestDistance) {
      nearest = point;
      nearestDistance = distance;
    }
  }
  let bestDistance = Infinity;
  let estimate = points[0].ph;
  let range: [number, number] = [points[0].ph, points[1].ph];
  for (let i = 0; i < points.length - 1; i++) {
    const left = points[i], right = points[i + 1];
    const consider = (ph: number) => {
      const lab = catmullRomLab(
        points[Math.max(0, i - 1)].lab, left.lab, right.lab,
        points[Math.min(points.length - 1, i + 2)].lab,
        (ph - left.ph) / (right.ph - left.ph),
      );
      const distance = distance2(sample, lab);
      if (distance < bestDistance) {
        bestDistance = distance;
        estimate = ph;
        range = [left.ph, right.ph];
      }
    };
    consider(left.ph);
    for (let tick = Math.floor(left.ph * 100) + 1; tick < right.ph * 100; tick++)
      consider(tick / 100);
    consider(right.ph);
  }
  const interpolated = !points.some(point => Math.abs(point.ph - estimate) < 1e-9);
  const warnings = [
    "Catmull-Rom Lab nearest-point estimate at 0.01 pH spacing. Decimal places do not imply validated pH precision.",
  ];
  if (profile.synthetic)
    warnings.unshift("Synthetic demonstration only. These colors are not a validated pH strip calibration.");
  if (estimate === points[0].ph || estimate === points.at(-1)!.ph)
    warnings.push("The closest match is a range endpoint. No extrapolation beyond the reference range is performed.");
  if (Math.sqrt(bestDistance) > 15)
    warnings.push("The sample is far from the reference curve. Check that the selected reference profile is compatible.");
  if (points.some((point, i) => points.some((other, j) => j > i && distance2(point.lab, other.lab) < 1e-12)))
    warnings.push("Repeated reference colors cannot uniquely distinguish pH; equal-distance ties use the first point in ascending pH order.");
  return {
    estimate: Number(estimate.toFixed(2)), range,
    nearest: { ph: nearest.ph, hex: nearest.hex },
    deltaE: Math.sqrt(nearestDistance), interpolated, warnings,
    status: interpolated ? "interpolated" : "matched",
  };
}

export function comparisonMetrics(rows: ComparisonRow[]): {
  mae: number;
  rmse: number;
} {
  if (!rows.length) return { mae: 0, rmse: 0 };
  if (
    rows.some(
      (r) =>
        !Number.isFinite(r.estimate) ||
        !Number.isFinite(r.reference) ||
        r.reference < 0 ||
        r.reference > 14 ||
        r.estimate < 0 ||
        r.estimate > 14,
    )
  )
    throw new Error(
      "Comparison readings must be finite pH values between 0 and 14.",
    );
  const errors = rows.map((r) => r.estimate - r.reference);
  return {
    mae: errors.reduce((sum, e) => sum + Math.abs(e), 0) / rows.length,
    rmse: Math.sqrt(errors.reduce((sum, e) => sum + e * e, 0) / rows.length),
  };
}
