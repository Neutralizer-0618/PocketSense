import {
  deltaE2000,
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

function projection(sample: Lab, start: Lab, end: Lab) {
  const d = { l: end.l - start.l, a: end.a - start.a, b: end.b - start.b };
  const length2 = d.l ** 2 + d.a ** 2 + d.b ** 2;
  const t = length2
    ? ((sample.l - start.l) * d.l +
        (sample.a - start.a) * d.a +
        (sample.b - start.b) * d.b) /
      length2
    : 0;
  const projected = {
    l: start.l + t * d.l,
    a: start.a + t * d.a,
    b: start.b + t * d.b,
  };
  const residual = Math.hypot(
    sample.l - projected.l,
    sample.a - projected.a,
    sample.b - projected.b,
  );
  return {
    t,
    projected,
    residualRatio: length2 ? residual / Math.sqrt(length2) : Infinity,
  };
}

/** Reference-guided exploratory estimate. All thresholds are transparent heuristics, not validation. */
export function estimatePh(rgb: RGB, profile: ReferenceProfile): PhResult {
  const errors = validateProfile(profile);
  if (errors.length) throw new Error(errors.join(" "));
  const sample = rgbToLab(rgb);
  const points = [...profile.points]
    .sort((a, b) => a.ph - b.ph)
    .map((point) => ({ ...point, lab: rgbToLab(hexToRgb(point.hex)!) }));
  const matches = points
    .map((point, index) => ({
      point,
      index,
      deltaE: deltaE2000(sample, point.lab),
    }))
    .sort((a, b) => a.deltaE - b.deltaE);
  const best = matches[0],
    runnerUp = matches[1];
  const warnings = [
    "No analytical accuracy has been established for this profile. The range shows reference resolution, not a confidence interval.",
  ];
  if (profile.synthetic)
    warnings.unshift(
      "Synthetic demonstration only. These colors are not a validated pH strip calibration.",
    );
  const result: PhResult = {
    estimate: best.point.ph,
    range: [
      points[Math.max(0, best.index - 1)].ph,
      points[Math.min(points.length - 1, best.index + 1)].ph,
    ],
    nearest: { ph: best.point.ph, hex: best.point.hex },
    deltaE: best.deltaE,
    interpolated: false,
    warnings,
    status: "matched",
  };
  // A visually unrelated sample must not produce a confident-looking numeric estimate.
  if (best.deltaE > 15) {
    return {
      ...result,
      estimate: null,
      range: null,
      status: "unsupported",
      warnings: [
        ...warnings,
        "Poor color match (ΔE00 > 15). Check the strip/profile compatibility, lighting and selected region.",
      ],
    };
  }
  // Repeated colors or similarly close non-neighboring references cannot distinguish pH.
  const competing = matches.filter((m) => m.deltaE - best.deltaE < 2);
  const conflicting = competing.some(
    (m) =>
      m.index !== best.index &&
      (Math.abs(m.index - best.index) > 1 ||
        deltaE2000(m.point.lab, best.point.lab) < 2),
  );
  if (conflicting || competing.length > 2) {
    const possibleValues = competing.map((m) => m.point.ph);
    return {
      ...result,
      estimate: null,
      range: [Math.min(...possibleValues), Math.max(...possibleValues)],
      status: "ambiguous",
      warnings: [
        ...warnings,
        "Ambiguous reference colors: this sample cannot distinguish the competing pH values.",
      ],
    };
  }
  if (best.deltaE < 0.001) {
    if (best.index === 0 || best.index === points.length - 1)
      warnings.push(
        "The closest match is a range endpoint. Values beyond the calibrated range cannot be determined.",
      );
    return result;
  }
  const lower = Math.min(best.index, runnerUp.index),
    upper = Math.max(best.index, runnerUp.index);
  const left = points[lower],
    right = points[upper];
  const segment = projection(sample, left.lab, right.lab);
  const separation = deltaE2000(left.lab, right.lab);
  if (
    upper - lower === 1 &&
    right.ph - left.ph <= 2 &&
    separation >= 3 &&
    separation <= 30 &&
    best.deltaE <= 12 &&
    segment.t > 0.02 &&
    segment.t < 0.98 &&
    segment.residualRatio <= 0.25 &&
    deltaE2000(sample, segment.projected) <= 3
  ) {
    return {
      ...result,
      estimate: left.ph + segment.t * (right.ph - left.ph),
      range: [left.ph, right.ph],
      interpolated: true,
      status: "interpolated",
      warnings: [
        ...warnings,
        "Local Lab interpolation is a numerical approximation. Decimal places do not imply validated pH precision.",
      ],
    };
  }
  if (best.index === 0 || best.index === points.length - 1) {
    const endpointStart =
      best.index === 0 ? points[0] : points[points.length - 2];
    const endpointEnd =
      best.index === 0 ? points[1] : points[points.length - 1];
    const endpointProjection = projection(
      sample,
      endpointStart.lab,
      endpointEnd.lab,
    );
    if (
      best.deltaE > 2 &&
      ((best.index === 0 && endpointProjection.t < 0) ||
        (best.index === points.length - 1 && endpointProjection.t > 1))
    ) {
      return {
        ...result,
        estimate: null,
        range: null,
        status: "unsupported",
        warnings: [
          ...warnings,
          "Color extends beyond the endpoint reference. No extrapolation is supported.",
        ],
      };
    }
    warnings.push(
      "The closest match is a range endpoint. Values beyond the calibrated range cannot be determined.",
    );
  }
  warnings.push(
    "Nearest reference reported; conditions for local interpolation were not met.",
  );
  if (best.deltaE > 6)
    warnings.push(
      "Noticeable reference mismatch: repeat the photograph and check lighting and strip compatibility.",
    );
  return result;
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
