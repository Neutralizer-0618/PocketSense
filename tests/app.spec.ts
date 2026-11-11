import { expect, test, type Page } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

const quadrants = fileURLToPath(
  new URL("./fixtures/quadrants.png", import.meta.url),
);
const neutral = fileURLToPath(
  new URL("./fixtures/neutral.png", import.meta.url),
);

async function upload(page: Page, file = quadrants) {
  await page.getByLabel("Upload image", { exact: true }).setInputFiles(file);
  await expect(page.locator(".iw-canvas")).toBeVisible();
}

async function selection(
  page: Page,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  // Shrink first so changing the origin cannot be clamped by the previous size.
  await page.getByLabel("Selection width", { exact: true }).fill("1");
  await page.getByLabel("Selection height", { exact: true }).fill("1");
  await page.getByLabel("Selection x", { exact: true }).fill(String(x));
  await page.getByLabel("Selection y", { exact: true }).fill(String(y));
  await page.getByLabel("Selection width", { exact: true }).fill(String(width));
  await page
    .getByLabel("Selection height", { exact: true })
    .fill(String(height));
}

test("uploaded image sampling uses the selected pixels and supports keyboard movement", async ({
  page,
}) => {
  await page.goto("./#color");
  await upload(page);
  await page.getByRole("button", { name: "Pixel", exact: true }).click();
  const canvas = page.locator(".iw-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Image canvas has no rendered bounds");
  await canvas.click({ position: { x: box.width / 4, y: box.height / 4 } });
  await expect(page.getByTestId("color-hex")).toHaveText("#FF0000");
  await expect(page.getByLabel("Selection width", { exact: true })).toHaveValue(
    "1",
  );
  const before = Number(
    await page.getByLabel("Selection x", { exact: true }).inputValue(),
  );
  const beforeY = Number(
    await page.getByLabel("Selection y", { exact: true }).inputValue(),
  );
  await canvas.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("Selection x", { exact: true })).toHaveValue(
    String(before + 1),
  );
  await page.keyboard.press("Shift+ArrowDown");
  await expect(page.getByLabel("Selection y", { exact: true })).toHaveValue(
    String(beforeY + 10),
  );
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(canvas).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Choose a photo" }),
  ).toBeVisible();
});

test("region statistics come from the correct rectangle at original image resolution", async ({
  page,
}) => {
  await page.goto("./#color");
  await upload(page);
  await selection(page, 0, 0, 120, 80);
  await expect(page.getByTestId("region-mean")).toContainText("128");
  await expect(page.getByTestId("region-mean")).toContainText("64");
  await expect(page.getByTestId("region-median")).toContainText("128");
  await selection(page, 60, 0, 60, 40);
  await expect(page.getByTestId("color-hex")).toHaveText("#00FF00");
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Reset zoom", exact: true }),
  ).toHaveText("150%");
  await expect(page.getByTestId("color-hex")).toHaveText("#00FF00");
  await page.getByRole("button", { name: "Reset zoom", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Reset zoom", exact: true }),
  ).toHaveText("100%");
});

test("synthetic pH example matches its labeled reference profile", async ({
  page,
}) => {
  await page.goto("./#ph");
  await page.getByRole("button", { name: /Load synthetic pH demo/ }).click();
  await expect(page.getByTestId("ph-estimate")).toHaveText(/7(?:\.0+)?/);
  await expect(
    page.getByText(/not.*experimental validation/i).first(),
  ).toBeVisible();
});

test("production app reopens offline and analyzes newly uploaded image pixels", async ({
  page,
  context,
}) => {
  await page.goto("./#color");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  await context.setOffline(true);
  // A new page establishes that the app shell is available without the old page's memory.
  const offlinePage = await context.newPage();
  await offlinePage.goto("./#color");
  await upload(offlinePage, neutral);
  await expect(offlinePage.getByTestId("color-hex")).toHaveText("#3C78B4");
  await offlinePage.goto("./#ph");
  await offlinePage
    .getByRole("button", { name: /Load synthetic pH demo/ })
    .click();
  await expect(offlinePage.getByTestId("ph-estimate")).toHaveText(/7(?:\.0+)?/);
  await context.setOffline(false);
});

for (const [width, height] of [
  [360, 740],
  [390, 844],
  [768, 1024],
  [1440, 1000],
]) {
  test(`responsive workspaces fit ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    for (const route of ["", "#color", "#ph", "#about"]) {
      await page.goto(`./${route}`);
      if (route === "#color" || route === "#ph") {
        await page
          .getByRole("button", { name: /Load synthetic.*demo/ })
          .click();
        await expect(page.locator(".iw-canvas")).toBeVisible();
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
      ).toBe(true);
    }
  });
}

test("reduced-motion preference is honored and the canvas remains keyboard accessible", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./#color");
  await upload(page, neutral);
  const canvas = page.locator(".iw-canvas");
  await canvas.focus();
  await expect(canvas).toBeFocused();
  expect(
    await page.evaluate(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
  ).toBe(true);
  const durations = await page.evaluate(() =>
    Array.from(document.querySelectorAll("main, button, .iw-workspace"))
      .map((element) => {
        const style = getComputedStyle(element);
        return [
          ...style.animationDuration.split(","),
          ...style.transitionDuration.split(","),
        ].map((value) => parseFloat(value));
      })
      .flat(),
  );
  expect(Math.max(...durations)).toBeLessThanOrEqual(0.01);
});

test("custom profile saves locally, survives reload, exports, and imports", async ({
  page,
}) => {
  await page.goto("./#ph");
  await page.getByRole("button", { name: /Load synthetic pH demo/ }).click();
  await page
    .getByRole("button", { name: "Create profile", exact: true })
    .click();
  await page
    .getByLabel("Profile name", { exact: true })
    .fill("Known chart from test");
  for (const [ph, hex] of [
    ["4", "#E38D6C"],
    ["7", "#95B975"],
    ["10", "#698FAE"],
  ]) {
    await page.getByLabel("pH value", { exact: true }).fill(ph);
    await page.getByLabel("Reference HEX", { exact: true }).fill(hex);
    if (ph === "7") {
      await page
        .getByRole("button", { name: "Use sampled color", exact: true })
        .click();
      await expect(
        page.getByLabel("Reference HEX", { exact: true }),
      ).toHaveValue("#95B975");
    }
    await page
      .getByRole("button", { name: "Add reference", exact: true })
      .click();
  }
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(
    page.getByRole("option", {
      name: "Known chart from test",
      exact: true,
      selected: true,
    }),
  ).toBeAttached();
  await expect(page.getByTestId("ph-estimate")).toHaveText("7.00");
  await page.reload();
  await page
    .getByLabel("Choose your reference", { exact: true })
    .selectOption({ label: "Known chart from test" });
  const exported = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = await exported;
  const path = await download.path();
  if (!path)
    throw new Error("Profile export did not create a downloadable file");
  const exportedProfile = JSON.parse(await readFile(path, "utf8")) as {
    synthetic: boolean;
    name: string;
  };
  expect(exportedProfile.name).toBe("Known chart from test");
  expect(exportedProfile.synthetic).toBe(true);
  // Clear only this test browser's storage to prove import works independently.
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(
    page.getByLabel("Choose your reference", { exact: true }).locator("option"),
  ).toHaveCount(1);
  await page
    .getByLabel("Import reference profile", { exact: true })
    .setInputFiles(path);
  await expect(
    page.getByRole("option", {
      name: "Known chart from test",
      exact: true,
      selected: true,
    }),
  ).toBeAttached();
  await page.reload();
  await expect(
    page.getByLabel("Choose your reference", { exact: true }).locator("option"),
  ).toHaveCount(2);
});

test("palette exports contain actual clustered colors", async ({ page }) => {
  await page.goto("./#color");
  await upload(page);
  await page
    .getByRole("button", { name: "Generate palette", exact: true })
    .click();
  await expect(page.locator(".palette-item")).toHaveCount(4);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  if (!stream) throw new Error("Palette export has no file stream");
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const exported = JSON.parse(Buffer.concat(chunks).toString()) as {
    colors: { hex: string }[];
  };
  expect(exported.colors.map((color) => color.hex).sort()).toEqual([
    "#0000FF",
    "#00FF00",
    "#FF0000",
    "#FFFF00",
  ]);
  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV", exact: true }).click();
  expect((await csvPromise).suggestedFilename()).toBe(
    "pocketsense-palette.csv",
  );
});

test("meter comparison records real input differences and excludes demos from aggregate accuracy", async ({
  page,
}) => {
  await page.goto("./#ph");
  await page.getByRole("button", { name: /Load synthetic pH demo/ }).click();
  await expect(page.getByTestId("ph-estimate")).toHaveText("7.00");
  await page.getByLabel("Laboratory reference pH", { exact: true }).fill("7.2");
  await page
    .getByRole("button", { name: "Add comparison", exact: true })
    .click();
  const row = page.locator(".record-table tbody tr");
  await expect(row).toHaveText(/Demo7\.007\.20-0\.20/);
  await expect(
    page.getByText(/Demo pairs are excluded from MAE\/RMSE/),
  ).toBeVisible();
  await expect(page.getByText(/MAE ·/)).toHaveCount(0);
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export comparison CSV", exact: true })
    .click();
  expect((await downloaded).suggestedFilename()).toBe(
    "pocketsense-comparisons.csv",
  );
  await page
    .getByRole("button", { name: "Clear comparisons", exact: true })
    .click();
  await expect(row).toHaveCount(0);
});

test.describe("touchscreen workflow", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  test("touch sampling and navigation work at a phone viewport", async ({
    page,
  }) => {
    await page.goto("./#color");
    await upload(page);
    await page.getByRole("button", { name: "Pixel", exact: true }).tap();
    const canvas = page.locator(".iw-canvas");
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Image canvas has no bounds on touch device");
    await canvas.tap({ position: { x: box.width / 4, y: box.height / 4 } });
    await expect(page.getByTestId("color-hex")).toHaveText("#FF0000");
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "pH Sense", exact: true })
      .tap();
    await page.getByRole("button", { name: /Load synthetic pH demo/ }).tap();
    await expect(page.getByTestId("ph-estimate")).toHaveText("7.00");
  });
});

test("changing a sample clears its paired meter value and real-measurement confirmation", async ({
  page,
}) => {
  await page.goto("./#ph");
  await upload(page, neutral);
  // This fixture simulates a user-supplied profile; it is not experimental validation.
  await page
    .getByLabel("Import reference profile", { exact: true })
    .setInputFiles({
      name: "paired-test-profile.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          id: "paired-test-profile",
          name: "Paired workflow fixture",
          synthetic: false,
          points: [
            { ph: 4, hex: "#EB9752" },
            { ph: 7, hex: "#3C78B4" },
          ],
        }),
      ),
    });
  await expect(page.getByTestId("ph-estimate")).toHaveText("7.00");
  await page.getByLabel("Laboratory reference pH", { exact: true }).fill("7.1");
  const confirmation = page.getByRole("checkbox", {
    name: /This is a real strip and paired meter measurement/,
  });
  await confirmation.check();
  await expect(
    page.getByRole("button", { name: "Add comparison", exact: true }),
  ).toBeEnabled();
  const x = Number(
    await page.getByLabel("Selection x", { exact: true }).inputValue(),
  );
  await page.getByLabel("Selection x", { exact: true }).fill(String(x + 1));
  await expect(
    page.getByLabel("Laboratory reference pH", { exact: true }),
  ).toHaveValue("");
  await expect(confirmation).not.toBeChecked();
  await expect(
    page.getByRole("button", { name: "Add comparison", exact: true }),
  ).toBeDisabled();
});


test("reference chart upload samples independent colors, saves associations and reads two decimal pH", async ({ page }) => {
  await page.goto("./#ph");
  await upload(page, neutral);
  await expect(page.getByTestId("ph-estimate")).toHaveText(/\d+\.\d{2}/);
  await page.getByRole("button", { name: "Create profile", exact: true }).click();
  const editor = page.locator(".profile-editor");
  const chart = page.getByRole("region", { name: "Reference image sampling workspace", exact: true });
  for (const width of [360, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  }
  await page.getByLabel("Profile name", { exact: true }).fill("Uploaded chart");
  await page.getByLabel("Upload reference image", { exact: true }).setInputFiles(quadrants);
  await expect(chart.locator(".iw-canvas")).toBeVisible();
  await chart.getByRole("button", { name: "Pixel", exact: true }).click();
  const canvas = chart.locator(".iw-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Reference canvas missing");
  for (const [x, ph, hex] of [[0.25, "6", "#FF0000"], [0.75, "8", "#00FF00"]] as const) {
    await canvas.click({ position: { x: box.width * x, y: box.height * 0.25 } });
    await expect(page.getByLabel("Reference HEX", { exact: true })).toHaveValue(hex);
    await page.getByLabel("pH value", { exact: true }).fill(ph);
    await page.getByRole("button", { name: "Add reference", exact: true }).click();
  }
  await expect(editor.getByTestId("reference-rgb")).toContainText("0, 255, 0");
  // The measurement image and its sampled pixels remain independent of the chart.
  await expect(page.getByRole("region", { name: "Image sampling workspace", exact: true }).locator(".iw-image-caption")).toContainText("neutral.png");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await page.reload();
  await page.getByLabel("Choose your reference", { exact: true }).selectOption({ label: "Uploaded chart" });
  await upload(page, quadrants);
  await selection(page, 0, 0, 20, 20);
  await expect(page.getByTestId("ph-estimate")).toHaveText("6.00");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("pocketsense.profiles.v1") || "[]"));
  expect(stored[0].points).toEqual([{ ph: 6, hex: "#FF0000" }, { ph: 8, hex: "#00FF00" }]);
  expect(stored[0].synthetic).toBe(false);
});
