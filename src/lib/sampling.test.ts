import { describe, expect, it } from "vitest";
import {
  generatePalette,
  samplePixel,
  sampleRegion,
  screenToImage,
  type PixelImage,
} from "./sampling";

const image: PixelImage = {
  width: 2,
  height: 2,
  data: new Uint8ClampedArray([
    255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 40, 80, 120, 255,
  ]),
};

describe("image sampling and coordinate mapping", () => {
  it("samples actual pixel offsets and clamps edges", () => {
    expect(samplePixel(image, 1, 0)).toEqual({ r: 0, g: 255, b: 0 });
    expect(samplePixel(image, 0, 1)).toEqual({ r: 0, g: 0, b: 255 });
    expect(samplePixel(image, 10, 10)).toEqual({ r: 40, g: 80, b: 120 });
    expect(() => samplePixel(image, NaN, 0)).toThrow();
  });
  it("computes exact mean and even-count median from the selected pixels", () => {
    const sample = sampleRegion(image, { x: 1, y: 0, width: 1, height: 2 });
    expect(sample.pixelCount).toBe(2);
    expect(sample.mean).toEqual({ r: 20, g: 167.5, b: 60 });
    expect(sample.median).toEqual(sample.mean);
    const all = sampleRegion(image, { x: 0, y: 0, width: 2, height: 2 });
    expect(all.mean).toEqual({ r: 73.75, g: 83.75, b: 93.75 });
    expect(all.median).toEqual({ r: 20, g: 40, b: 60 });
  });
  it("handles reversed selections, bounds, empty and transparent images", () => {
    expect(
      sampleRegion(image, { x: 2, y: 2, width: -2, height: -2 }).pixelCount,
    ).toBe(4);
    expect(
      sampleRegion(image, { x: -5, y: -5, width: 6, height: 6 }).mean,
    ).toEqual({ r: 255, g: 0, b: 0 });
    expect(() =>
      sampleRegion(image, { x: 4, y: 4, width: 2, height: 2 }),
    ).toThrow();
    expect(() =>
      sampleRegion(image, { x: 0, y: 0, width: 0, height: 2 }),
    ).toThrow();
    const transparent = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([255, 0, 0, 0]),
    };
    expect(() => samplePixel(transparent, 0, 0)).toThrow();
    expect(() =>
      sampleRegion(transparent, { x: 0, y: 0, width: 1, height: 1 }),
    ).toThrow();
    expect(() => samplePixel({ ...image, width: 100 }, 0, 0)).toThrow();
  });
  it("maps CSS bounds, including zoom or pan offsets, to original coordinates", () => {
    const bounds = { left: -100, top: 50, width: 800, height: 600 };
    expect(screenToImage(300, 350, bounds, 4000, 3000)).toEqual({
      x: 2000,
      y: 1500,
    });
    expect(screenToImage(700, 650, bounds, 4000, 3000)).toEqual({
      x: 3999,
      y: 2999,
    });
    expect(screenToImage(-200, 0, bounds, 4000, 3000)).toEqual({ x: 0, y: 0 });
    expect(() =>
      screenToImage(0, 0, { ...bounds, width: 0 }, 4000, 3000),
    ).toThrow();
  });
  it("reports clipping, small selection and variation rather than fabricated confidence", () => {
    const sample = sampleRegion(image, { x: 0, y: 0, width: 2, height: 2 });
    expect(sample.clippedFraction).toBe(0.75);
    expect(sample.warnings.some((w) => w.includes("Small"))).toBe(true);
    expect(sample.warnings.some((w) => w.includes("Clipped"))).toBe(true);
    expect(sample.luminanceStd).toBeGreaterThan(25);
  });
});

describe("real palette clustering", () => {
  it("recovers discrete source colors and normalized populations deterministically", () => {
    const palette = generatePalette(image, 6);
    expect(new Set(palette.map((p) => p.hex))).toEqual(
      new Set(["#FF0000", "#00FF00", "#0000FF", "#285078"]),
    );
    expect(palette.reduce((sum, p) => sum + p.population, 0)).toBeCloseTo(1);
    expect(generatePalette(image, 6)).toEqual(palette);
  });
  it("does not invent six colors from a one-color image", () => {
    const uniform = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([52, 87, 103, 255]),
    };
    expect(generatePalette(uniform, 6)).toEqual([
      { hex: "#345767", rgb: { r: 52, g: 87, b: 103 }, population: 1 },
    ]);
    expect(() => generatePalette(image, 9)).toThrow();
  });
});
