import { rgbToHex, rgbToLab, type RGB, type Lab } from "./color";

export type PixelImage = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};
export type Rect = { x: number; y: number; width: number; height: number };
export type Sample = {
  mean: RGB;
  median: RGB;
  pixelCount: number;
  warnings: string[];
  luminanceStd: number;
  clippedFraction: number;
};
export type RegionSample = Sample;
export type PaletteColor = { hex: string; rgb: RGB; population: number };
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

function validateImage(image: PixelImage) {
  if (
    !Number.isInteger(image.width) ||
    !Number.isInteger(image.height) ||
    image.width <= 0 ||
    image.height <= 0 ||
    image.data.length < image.width * image.height * 4
  ) {
    throw new Error("The image has invalid dimensions or pixel data.");
  }
}

export function screenToImage(
  clientX: number,
  clientY: number,
  bounds: { left: number; top: number; width: number; height: number },
  imageWidth: number,
  imageHeight: number,
): { x: number; y: number } {
  if (
    ![
      clientX,
      clientY,
      bounds.left,
      bounds.top,
      bounds.width,
      bounds.height,
      imageWidth,
      imageHeight,
    ].every(Number.isFinite) ||
    bounds.width <= 0 ||
    bounds.height <= 0 ||
    imageWidth < 1 ||
    imageHeight < 1
  )
    throw new Error("Cannot map coordinates on an empty image.");
  return {
    x: clamp(
      Math.floor(((clientX - bounds.left) / bounds.width) * imageWidth),
      0,
      imageWidth - 1,
    ),
    y: clamp(
      Math.floor(((clientY - bounds.top) / bounds.height) * imageHeight),
      0,
      imageHeight - 1,
    ),
  };
}

export function samplePixel(image: PixelImage, x: number, y: number): RGB {
  validateImage(image);
  if (!Number.isFinite(x) || !Number.isFinite(y))
    throw new Error("Pixel coordinates must be finite.");
  const offset =
    (clamp(Math.floor(y), 0, image.height - 1) * image.width +
      clamp(Math.floor(x), 0, image.width - 1)) *
    4;
  if (image.data[offset + 3] < 250)
    throw new Error("Select an opaque part of the image.");
  return {
    r: image.data[offset],
    g: image.data[offset + 1],
    b: image.data[offset + 2],
  };
}

/** Statistics use every opaque pixel in the bounded region; channel medians resist outliers. */
export function sampleRegion(image: PixelImage, rect: Rect): Sample {
  validateImage(image);
  if (
    ![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) ||
    rect.width === 0 ||
    rect.height === 0
  )
    throw new Error("Select a non-empty rectangular region.");
  const x0 = clamp(
    Math.floor(Math.min(rect.x, rect.x + rect.width)),
    0,
    image.width,
  );
  const y0 = clamp(
    Math.floor(Math.min(rect.y, rect.y + rect.height)),
    0,
    image.height,
  );
  const x1 = clamp(
    Math.ceil(Math.max(rect.x, rect.x + rect.width)),
    0,
    image.width,
  );
  const y1 = clamp(
    Math.ceil(Math.max(rect.y, rect.y + rect.height)),
    0,
    image.height,
  );
  const hist = [
    new Uint32Array(256),
    new Uint32Array(256),
    new Uint32Array(256),
  ];
  const sums = [0, 0, 0];
  let pixelCount = 0,
    luminanceSum = 0,
    luminanceSumSq = 0,
    clipped = 0,
    ignored = 0;
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const i = (y * image.width + x) * 4;
      if (image.data[i + 3] < 250) {
        ignored++;
        continue;
      }
      const rgb = [image.data[i], image.data[i + 1], image.data[i + 2]];
      rgb.forEach((v, c) => {
        sums[c] += v;
        hist[c][v]++;
      });
      const luminance = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
      luminanceSum += luminance;
      luminanceSumSq += luminance * luminance;
      if (rgb.some((v) => v <= 2 || v >= 253)) clipped++;
      pixelCount++;
    }
  if (!pixelCount) throw new Error("No opaque pixels in this selection.");
  const medianAt = (histogram: Uint32Array, rank: number) => {
    let count = 0;
    for (let i = 0; i < 256; i++) {
      count += histogram[i];
      if (count > rank) return i;
    }
    return 255;
  };
  const medians = hist.map(
    (h) =>
      (medianAt(h, Math.floor((pixelCount - 1) / 2)) +
        medianAt(h, Math.floor(pixelCount / 2))) /
      2,
  );
  const luminanceMean = luminanceSum / pixelCount;
  const luminanceStd = Math.sqrt(
    Math.max(0, luminanceSumSq / pixelCount - luminanceMean ** 2),
  );
  const clippedFraction = clipped / pixelCount;
  const warnings: string[] = [];
  if (pixelCount < 25)
    warnings.push(
      "Small selection: use a uniform region of at least 25 pixels for pH analysis.",
    );
  if (luminanceMean < 25)
    warnings.push(
      "Dark region: shadows or underexposure may affect comparison.",
    );
  if (luminanceMean > 235)
    warnings.push("Very bright region: check for glare or overexposure.");
  if (clippedFraction > 0.05)
    warnings.push("Clipped channels detected: color information may be lost.");
  if (luminanceStd > 25)
    warnings.push(
      "Strong variation: select a smaller, evenly lit measurement region.",
    );
  if (ignored)
    warnings.push("Transparent pixels were excluded from the statistics.");
  return {
    mean: {
      r: sums[0] / pixelCount,
      g: sums[1] / pixelCount,
      b: sums[2] / pixelCount,
    },
    median: { r: medians[0], g: medians[1], b: medians[2] },
    pixelCount,
    warnings,
    luminanceStd,
    clippedFraction,
  };
}

function distanceSquared(a: Lab, b: Lab) {
  return (a.l - b.l) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2;
}

/** Deterministic Lab k-means over a stratified sample of at most 16,384 pixels. */
export function generatePalette(image: PixelImage, count = 6): PaletteColor[] {
  validateImage(image);
  if (!Number.isInteger(count) || count < 1 || count > 8)
    throw new Error("Choose between 1 and 8 palette colors.");
  const nx = Math.min(image.width, 128),
    ny = Math.min(image.height, 128);
  const pixels: { rgb: RGB; lab: Lab }[] = [];
  for (let y = 0; y < ny; y++)
    for (let x = 0; x < nx; x++) {
      const px = Math.floor(((x + 0.5) * image.width) / nx),
        py = Math.floor(((y + 0.5) * image.height) / ny);
      const i = (py * image.width + px) * 4;
      if (image.data[i + 3] < 250) continue;
      const rgb = {
        r: image.data[i],
        g: image.data[i + 1],
        b: image.data[i + 2],
      };
      pixels.push({ rgb, lab: rgbToLab(rgb) });
    }
  if (!pixels.length)
    throw new Error("No opaque image pixels are available for a palette.");
  const centers: Lab[] = [{ ...pixels[0].lab }];
  while (centers.length < count) {
    let farthest = 0,
      farthestDistance = -1;
    for (let i = 0; i < pixels.length; i++) {
      const d = Math.min(
        ...centers.map((c) => distanceSquared(c, pixels[i].lab)),
      );
      if (d > farthestDistance) {
        farthest = i;
        farthestDistance = d;
      }
    }
    if (farthestDistance < 0.01) break;
    centers.push({ ...pixels[farthest].lab });
  }
  const labels = new Uint8Array(pixels.length);
  for (let iteration = 0; iteration < 24; iteration++) {
    const sums = centers.map(() => ({ l: 0, a: 0, b: 0, count: 0 }));
    let changed = false;
    pixels.forEach((pixel, i) => {
      let nearest = 0,
        best = Infinity;
      centers.forEach((center, c) => {
        const d = distanceSquared(center, pixel.lab);
        if (d < best) {
          best = d;
          nearest = c;
        }
      });
      if (labels[i] !== nearest) changed = true;
      labels[i] = nearest;
      sums[nearest].l += pixel.lab.l;
      sums[nearest].a += pixel.lab.a;
      sums[nearest].b += pixel.lab.b;
      sums[nearest].count++;
    });
    sums.forEach((sum, c) => {
      if (sum.count)
        centers[c] = {
          l: sum.l / sum.count,
          a: sum.a / sum.count,
          b: sum.b / sum.count,
        };
    });
    if (iteration > 0 && !changed) break;
  }
  const sums = centers.map(() => ({ r: 0, g: 0, b: 0, count: 0 }));
  pixels.forEach(({ rgb }, i) => {
    const s = sums[labels[i]];
    s.r += rgb.r;
    s.g += rgb.g;
    s.b += rgb.b;
    s.count++;
  });
  const merged = new Map<string, PaletteColor>();
  sums
    .filter((s) => s.count)
    .forEach((s) => {
      const rgb = {
        r: Math.round(s.r / s.count),
        g: Math.round(s.g / s.count),
        b: Math.round(s.b / s.count),
      };
      const hex = rgbToHex(rgb),
        population = s.count / pixels.length;
      const previous = merged.get(hex);
      merged.set(hex, {
        hex,
        rgb,
        population: population + (previous?.population ?? 0),
      });
    });
  return [...merged.values()].sort((a, b) => b.population - a.population);
}
