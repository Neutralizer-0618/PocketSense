export type RGB = { r: number; g: number; b: number };
export type Lab = { l: number; a: number; b: number };

function channel(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > 255)
    throw new Error("RGB channels must be finite numbers from 0 to 255.");
  return value;
}

export function rgbToHex(rgb: RGB): string {
  return (
    "#" +
    [rgb.r, rgb.g, rgb.b]
      .map((v) => Math.round(channel(v)).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

export function hexToRgb(hex: string): RGB | null {
  if (typeof hex !== "string") return null;
  let value = hex.trim().replace(/^#/, "");
  if (/^[\da-f]{3}$/i.test(value))
    value = value
      .split("")
      .map((c) => c + c)
      .join("");
  if (!/^[\da-f]{6}$/i.test(value)) return null;
  const number = parseInt(value, 16);
  return { r: number >> 16, g: (number >> 8) & 255, b: number & 255 };
}

/** IEC sRGB inverse transfer; inputs are encoded, 8-bit channel values. */
export function srgbToLinear(value: number): number {
  const v = channel(value) / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/** CIELAB relative to D65 (2° observer), deliberately NOT CSS lab()'s D50. */
export function rgbToLab(rgb: RGB): Lab {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(srgbToLinear);
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t: number) =>
    t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116;
  return { l: 116 * f(y) - 16, a: 500 * (f(x) - f(y)), b: 200 * (f(y) - f(z)) };
}

function hueValues(rgb: RGB) {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((v) => channel(v) / 255);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    delta = max - min;
  let h = 0;
  if (delta) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, max, min, delta };
}

/** Hue in degrees, saturation and lightness in percent. */
export function rgbToHsl(rgb: RGB): { h: number; s: number; l: number } {
  const { h, max, min, delta } = hueValues(rgb),
    l = (max + min) / 2;
  return {
    h,
    s: delta ? (100 * delta) / (1 - Math.abs(2 * l - 1)) : 0,
    l: 100 * l,
  };
}

/** Hue in degrees, saturation and value in percent. */
export function rgbToHsv(rgb: RGB): { h: number; s: number; v: number } {
  const { h, max, delta } = hueValues(rgb);
  return { h, s: max ? (100 * delta) / max : 0, v: 100 * max };
}

/** CIEDE2000, unit parametric factors; Sharma, Wu & Dalal (2005). */
export function deltaE2000(first: Lab, second: Lab): number {
  if (
    ![first.l, first.a, first.b, second.l, second.a, second.b].every(
      Number.isFinite,
    )
  )
    throw new Error("Lab values must be finite.");
  const rad = Math.PI / 180;
  const c1 = Math.hypot(first.a, first.b),
    c2 = Math.hypot(second.a, second.b);
  const cMean7 = ((c1 + c2) / 2) ** 7;
  const G = 0.5 * (1 - Math.sqrt(cMean7 / (cMean7 + 25 ** 7)));
  const a1 = (1 + G) * first.a,
    a2 = (1 + G) * second.a;
  const cp1 = Math.hypot(a1, first.b),
    cp2 = Math.hypot(a2, second.b);
  const hue = (a: number, b: number) =>
    a === 0 && b === 0 ? 0 : (Math.atan2(b, a) / rad + 360) % 360;
  const h1 = hue(a1, first.b),
    h2 = hue(a2, second.b);
  const dl = second.l - first.l,
    dc = cp2 - cp1;
  let dh = h2 - h1;
  if (cp1 * cp2 === 0) dh = 0;
  else if (dh > 180) dh -= 360;
  else if (dh < -180) dh += 360;
  const dH = 2 * Math.sqrt(cp1 * cp2) * Math.sin((dh * rad) / 2);
  const lMean = (first.l + second.l) / 2,
    cMean = (cp1 + cp2) / 2;
  let hMean = h1 + h2;
  if (cp1 * cp2 !== 0) {
    if (Math.abs(h1 - h2) <= 180) hMean /= 2;
    else if (hMean < 360) hMean = (hMean + 360) / 2;
    else hMean = (hMean - 360) / 2;
  }
  const T =
    1 -
    0.17 * Math.cos((hMean - 30) * rad) +
    0.24 * Math.cos(2 * hMean * rad) +
    0.32 * Math.cos((3 * hMean + 6) * rad) -
    0.2 * Math.cos((4 * hMean - 63) * rad);
  const sl =
    1 + (0.015 * (lMean - 50) ** 2) / Math.sqrt(20 + (lMean - 50) ** 2);
  const sc = 1 + 0.045 * cMean,
    sh = 1 + 0.015 * cMean * T;
  const theta = 30 * Math.exp(-(((hMean - 275) / 25) ** 2));
  const rc = 2 * Math.sqrt(cMean ** 7 / (cMean ** 7 + 25 ** 7));
  const rt = -Math.sin(2 * theta * rad) * rc;
  return Math.sqrt(
    Math.max(
      0,
      (dl / sl) ** 2 +
        (dc / sc) ** 2 +
        (dH / sh) ** 2 +
        (((rt * dc) / sc) * dH) / sh,
    ),
  );
}
