import { describe, expect, it } from "vitest";
import { paletteCsv, profileJson, toCsv } from "./export";
import { DEMO_PROFILE, parseProfile } from "./ph";

describe("portable data exports", () => {
  it("round-trips profile metadata, values and synthetic status", () => {
    expect(parseProfile(profileJson(DEMO_PROFILE))).toEqual(DEMO_PROFILE);
  });
  it("exports real palette channels and sample fractions", () => {
    expect(
      paletteCsv([
        { hex: "#1180FF", rgb: { r: 17, g: 128, b: 255 }, population: 0.5 },
      ]),
    ).toBe("hex,red,green,blue,sampled_fraction\r\n#1180FF,17,128,255,0.5\r\n");
  });
  it("quotes commas, quotes and line breaks, preserves numeric errors and prevents formula execution", () => {
    expect(toCsv([{ name: 'a,"b"\nc', error: -0.5, note: "=1+1" }])).toBe(
      'name,error,note\r\n"a,""b""\nc",-0.5,\'=1+1\r\n',
    );
    expect(toCsv([])).toBe("");
  });
});
