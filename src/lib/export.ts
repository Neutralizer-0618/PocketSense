import type { ReferenceProfile } from "./ph";
import { validateProfile } from "./ph";
import type { PaletteColor } from "./sampling";

type CsvValue = string | number | boolean | null | undefined;
export type CsvRow = Record<string, CsvValue>;

function csvCell(value: CsvValue): string {
  let str = value == null ? "" : String(value);
  // A text value must not become a formula when a CSV is opened in a spreadsheet.
  if (typeof value === "string" && /^[\s]*[=+\-@\t\r]/.test(str))
    str = "'" + str;
  return /[",\r\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
}

export function toCsv(rows: CsvRow[]): string {
  if (!rows.length) return "";
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return (
    [
      headers.map(csvCell).join(","),
      ...rows.map((row) => headers.map((key) => csvCell(row[key])).join(",")),
    ].join("\r\n") + "\r\n"
  );
}

export function paletteCsv(palette: PaletteColor[]): string {
  return toCsv(
    palette.map((p) => ({
      hex: p.hex,
      red: p.rgb.r,
      green: p.rgb.g,
      blue: p.rgb.b,
      sampled_fraction: p.population,
    })),
  );
}

export function profileJson(profile: ReferenceProfile): string {
  const errors = validateProfile(profile);
  if (errors.length) throw new Error(errors.join(" "));
  return JSON.stringify(profile, null, 2);
}

export function measurementCsv(rows: CsvRow[]): string {
  return toCsv(rows);
}
