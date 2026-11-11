import { describe, expect, it } from "vitest";
import { hexToRgb } from "./color";
import {
  catmullRomLab,
  comparisonMetrics,
  DEMO_PROFILE,
  estimatePh,
  parseProfile,
  validateProfile,
  type ReferenceProfile,
} from "./ph";

const gray: ReferenceProfile = {
  id: "gray",
  name: "Synthetic linear fixture",
  synthetic: true,
  points: [
    { ph: 6, hex: "#707070" },
    { ph: 8, hex: "#A0A0A0" },
  ],
};

describe("pH reference profiles", () => {
  it("rejects absent, malformed, duplicated and out-of-range references", () => {
    expect(validateProfile(null).length).toBeGreaterThan(0);
    expect(validateProfile({ ...gray, points: [] }).length).toBeGreaterThan(0);
    expect(validateProfile({ ...gray, points: new Array(2) }).length).toBe(2);
    expect(
      validateProfile({
        ...gray,
        points: [
          { ph: 6, hex: "#707070" },
          { ph: 6, hex: "#A0A0A0" },
        ],
      }).join(" "),
    ).toContain("more than once");
    expect(
      validateProfile({
        ...gray,
        points: [
          { ph: -1, hex: "bad!" },
          { ph: NaN, hex: "#222222" },
        ],
      }).length,
    ).toBe(3);
    expect(() => parseProfile("not json")).toThrow("valid JSON");
    expect(() => parseProfile('{"name":"x"}')).toThrow();
  });
  it("imports valid data, canonicalizes colors and sorts known pH values", () => {
    const parsed = parseProfile(
      JSON.stringify({
        ...gray,
        points: [
          { ph: 8, hex: "#abc" },
          { ph: 6, hex: "#fff" },
        ],
      }),
    );
    expect(parsed.points).toEqual([
      { ph: 6, hex: "#FFFFFF" },
      { ph: 8, hex: "#AABBCC" },
    ]);
  });
});

describe("reference-based pH estimation", () => {
  it.each(DEMO_PROFILE.points)(
    "matches exact synthetic reference pH $ph",
    (point) => {
      const result = estimatePh(hexToRgb(point.hex)!, DEMO_PROFILE);
      expect(result.estimate).toBe(point.ph);
      expect(result.deltaE).toBeCloseTo(0, 10);
      expect(result.interpolated).toBe(false);
      expect(result.warnings.join(" ")).toContain("Synthetic");
    },
  );
  it("searches a smooth Lab segment and returns a hundredth-pH value", () => {
    const result = estimatePh({ r: 136, g: 136, b: 136 }, gray);
    expect(result.status).toBe("interpolated");
    expect(result.estimate).toBeGreaterThan(6.9);
    expect(result.estimate).toBeLessThan(7.1);
    expect(result.range).toEqual([6, 8]);
    expect(result.warnings.join(" ")).toContain("Decimal places");
  });
  it("uses Catmull-Rom controls, with exact knots and a curved midpoint", () => {
    const p0 = { l: 0, a: 0, b: 0 };
    const p1 = { l: 10, a: 20, b: 30 };
    const p2 = { l: 30, a: 40, b: 50 };
    const p3 = { l: 80, a: 100, b: 120 };
    expect(catmullRomLab(p0, p1, p2, p3, 0)).toEqual(p1);
    expect(catmullRomLab(p0, p1, p2, p3, 1)).toEqual(p2);
    expect(catmullRomLab(p0, p1, p2, p3, 0.5)).toEqual({ l: 17.5, a: 27.5, b: 37.5 });
  });
  it("sorts references and searches across non-unit pH intervals", () => {
    const profile = { ...gray, points: [
      { ph: 12, hex: "#A0A0A0" }, { ph: 2, hex: "#707070" },
    ] };
    const result = estimatePh({ r: 136, g: 136, b: 136 }, profile);
    expect(result.interpolated).toBe(true);
    expect(result.estimate).toBeGreaterThan(6.8);
    expect(result.estimate).toBeLessThan(7.2);
    expect(result.estimate! * 100).toBeCloseTo(Math.round(result.estimate! * 100), 8);
    expect(result.range).toEqual([2, 12]);
    expect(estimatePh({ r: 136, g: 136, b: 136 }, {
      ...profile, points: [...profile.points].reverse(),
    })).toEqual(result);
  });
  it("clamps to the reference endpoints without extrapolating", () => {
    expect(estimatePh({ r: 0, g: 0, b: 0 }, gray).estimate).toBe(6);
    expect(estimatePh({ r: 255, g: 255, b: 255 }, gray).estimate).toBe(8);
    expect(estimatePh({ r: 112, g: 112, b: 112 }, gray).warnings.join(" "))
      .toContain("range endpoint");
    expect(() => estimatePh({ r: 112, g: 112, b: 112 }, { ...gray, points: [] })).toThrow();
  });
  it("resolves identical-color ties deterministically and reports ambiguity", () => {
    const result = estimatePh({ r: 112, g: 112, b: 112 }, { ...gray, points: [
      { ph: 6, hex: "#707070" }, { ph: 8, hex: "#707070" },
    ] });
    expect(result.estimate).toBe(6);
    expect(result.warnings.join(" ")).toContain("cannot uniquely distinguish");
  });
  it("includes fractional reference endpoints even off the hundredth grid", () => {
    const result = estimatePh({ r: 160, g: 160, b: 160 }, { ...gray, points: [
      { ph: 6.003, hex: "#707070" }, { ph: 6.017, hex: "#A0A0A0" },
    ] });
    expect(result.estimate).toBe(6.02);
    expect(result.interpolated).toBe(false);
  });
  it("computes descriptive errors from actual supplied comparisons", () => {
    expect(
      comparisonMetrics([
        { estimate: 7, reference: 6 },
        { estimate: 7, reference: 9 },
      ]),
    ).toEqual({ mae: 1.5, rmse: Math.sqrt(2.5) });
    expect(comparisonMetrics([])).toEqual({ mae: 0, rmse: 0 });
    expect(() =>
      comparisonMetrics([{ estimate: 7, reference: NaN }]),
    ).toThrow();
  });
});
