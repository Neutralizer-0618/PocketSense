import { describe, expect, it } from "vitest";
import {
  deltaE2000,
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
  rgbToLab,
  srgbToLinear,
} from "./color";

describe("sRGB color conversions", () => {
  it("parses shorthand and full HEX and rejects malformed input", () => {
    expect(hexToRgb("#aB3")).toEqual({ r: 170, g: 187, b: 51 });
    expect(hexToRgb("ff0080")).toEqual({ r: 255, g: 0, b: 128 });
    for (const bad of ["blue", "#GG3333", "#12345", "#12345678", ""])
      expect(hexToRgb(bad)).toBeNull();
    expect(rgbToHex({ r: 17, g: 127.6, b: 255 })).toBe("#1180FF");
    expect(() => rgbToHex({ r: NaN, g: 0, b: 0 })).toThrow();
  });
  it("uses the correct piecewise inverse sRGB transfer function", () => {
    expect(srgbToLinear(0)).toBe(0);
    expect(srgbToLinear(255)).toBe(1);
    expect(srgbToLinear(10)).toBeCloseTo(10 / 255 / 12.92, 10);
    expect(srgbToLinear(128)).toBeCloseTo(0.2158605, 6);
  });
  it("converts primary colors and white to D65 Lab", () => {
    const white = rgbToLab({ r: 255, g: 255, b: 255 });
    expect(white.l).toBeCloseTo(100, 4);
    expect(white.a).toBeCloseTo(0, 3);
    expect(white.b).toBeCloseTo(0, 3);
    expect(rgbToLab({ r: 0, g: 0, b: 0 })).toEqual({ l: 0, a: 0, b: 0 });
    const red = rgbToLab({ r: 255, g: 0, b: 0 });
    expect(red.l).toBeCloseTo(53.2408, 3);
    expect(red.a).toBeCloseTo(80.0925, 3);
    expect(red.b).toBeCloseTo(67.2032, 3);
    expect(() => rgbToLab({ r: -1, g: 0, b: 0 })).toThrow();
  });
  it("returns hue in degrees and saturation/value/lightness in percent", () => {
    expect(rgbToHsl({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 100, l: 50 });
    expect(rgbToHsv({ r: 0, g: 255, b: 0 })).toEqual({
      h: 120,
      s: 100,
      v: 100,
    });
    expect(rgbToHsl({ r: 128, g: 128, b: 128 }).s).toBe(0);
    expect(rgbToHsv({ r: 0, g: 0, b: 0 })).toEqual({ h: 0, s: 0, v: 0 });
  });
});

// Sharma, Wu & Dalal, all 34 supplementary test pairs, including hue-wrap edge cases.
// https://hajim.rochester.edu/ece/sites/gsharma/ciede2000/dataNprograms/ciede2000testdata.txt
const published = [
  [50, 2.6772, -79.7751, 50, 0, -82.7485, 2.0425],
  [50, 3.1571, -77.2803, 50, 0, -82.7485, 2.8615],
  [50, 2.8361, -74.02, 50, 0, -82.7485, 3.4412],
  [50, -1.3802, -84.2814, 50, 0, -82.7485, 1],
  [50, -1.1848, -84.8006, 50, 0, -82.7485, 1],
  [50, -0.9009, -85.5211, 50, 0, -82.7485, 1],
  [50, 0, 0, 50, -1, 2, 2.3669],
  [50, -1, 2, 50, 0, 0, 2.3669],
  [50, 2.49, -0.001, 50, -2.49, 0.0009, 7.1792],
  [50, 2.49, -0.001, 50, -2.49, 0.001, 7.1792],
  [50, 2.49, -0.001, 50, -2.49, 0.0011, 7.2195],
  [50, 2.49, -0.001, 50, -2.49, 0.0012, 7.2195],
  [50, -0.001, 2.49, 50, 0.0009, -2.49, 4.8045],
  [50, -0.001, 2.49, 50, 0.001, -2.49, 4.8045],
  [50, -0.001, 2.49, 50, 0.0011, -2.49, 4.7461],
  [50, 2.5, 0, 50, 0, -2.5, 4.3065],
  [50, 2.5, 0, 73, 25, -18, 27.1492],
  [50, 2.5, 0, 61, -5, 29, 22.8977],
  [50, 2.5, 0, 56, -27, -3, 31.903],
  [50, 2.5, 0, 58, 24, 15, 19.4535],
  [50, 2.5, 0, 50, 3.1736, 0.5854, 1],
  [50, 2.5, 0, 50, 3.2972, 0, 1],
  [50, 2.5, 0, 50, 1.8634, 0.5757, 1],
  [50, 2.5, 0, 50, 3.2592, 0.335, 1],
  [60.2574, -34.0099, 36.2677, 60.4626, -34.1751, 39.4387, 1.2644],
  [63.0109, -31.0961, -5.8663, 62.8187, -29.7946, -4.0864, 1.263],
  [61.2901, 3.7196, -5.3901, 61.4292, 2.248, -4.962, 1.8731],
  [35.0831, -44.1164, 3.7933, 35.0232, -40.0716, 1.5901, 1.8645],
  [22.7233, 20.0904, -46.694, 23.0331, 14.973, -42.5619, 2.0373],
  [36.4612, 47.858, 18.3852, 36.2715, 50.5065, 21.2231, 1.4146],
  [90.8027, -2.0831, 1.441, 91.1528, -1.6435, 0.0447, 1.4441],
  [90.9257, -0.5406, -0.9208, 88.6381, -0.8985, -0.7239, 1.5381],
  [6.7747, -0.2908, -2.4247, 5.8714, -0.0985, -2.2286, 0.6377],
  [2.0776, 0.0795, -1.135, 0.9033, -0.0636, -0.5514, 0.9082],
];

describe("CIEDE2000", () => {
  it.each(published)(
    "matches published Lab pair (%s, %s, %s) → (%s, %s, %s)",
    (l1, a1, b1, l2, a2, b2, expected) => {
      const first = { l: l1, a: a1, b: b1 },
        second = { l: l2, a: a2, b: b2 };
      expect(deltaE2000(first, second)).toBeCloseTo(expected, 4);
      expect(deltaE2000(second, first)).toBeCloseTo(expected, 4);
    },
  );
  it("has identity, rejects nonfinite Lab, and handles the lightness term", () => {
    expect(deltaE2000({ l: 42, a: 13, b: -4 }, { l: 42, a: 13, b: -4 })).toBe(
      0,
    );
    expect(deltaE2000({ l: 0, a: 0, b: 0 }, { l: 100, a: 0, b: 0 })).toBe(100);
    expect(() =>
      deltaE2000({ l: NaN, a: 0, b: 0 }, { l: 0, a: 0, b: 0 }),
    ).toThrow();
  });
});
