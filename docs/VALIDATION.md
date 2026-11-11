# Browser validation

Production build verified on 2026-11-11 using Playwright with Chromium 158 on macOS ARM64. The final acceptance run passed **14 of 14 tests** in 17.3 seconds. Tests and deterministic image fixtures are committed in `tests/`. This run used the final dependency lock and production cache `pocketsense-b36b751e52025875`.

The same final source and dependency set also passed TypeScript checking, ESLint, all **64 unit tests**, and the production build. `npm audit` reported **0 vulnerabilities** at verification time.

| Area                 | Verified behavior                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pixel sampling       | Upload a known PNG, click its upper-left quadrant, obtain exact `#FF0000`, and move the selection with arrow keys.                                     |
| Region sampling      | Compute mean/median from the original image rectangle; changing the selection to the green quadrant produces `#00FF00`; zoom preserves sampled values. |
| pH matching          | The labeled synthetic strip region matches its synthetic pH 7 reference.                                                                               |
| Custom profiles      | Create a profile, sample a reference from the image, save locally, reload, export, import, and reload again.                                           |
| Synthetic provenance | A profile containing a reference sampled from a synthetic demo exports with `synthetic: true`.                                                         |
| Palette export       | Exported JSON contains the four actual colors of a four-color fixture, and CSV downloads successfully.                                                 |
| Meter comparison     | A pH 7 estimate paired with entered 7.2 produces signed error −0.20; demo pairs remain excluded from MAE/RMSE.                                         |
| Pair integrity       | Changing the selected image region clears its paired meter value and real-measurement confirmation.                                                    |
| Offline operation    | Wait for production caching, disable network access, open a new page, upload a different local PNG, recover its exact `#3C78B4`, then run the pH demo. |
| Responsive layout    | Home, Color Sense, pH Sense, and About have no horizontal overflow at 360, 390, 768, and 1440 CSS pixels.                                              |
| Touch                | With Chromium touch/mobile emulation, tap to sample a pixel and navigate to pH Sense.                                                                  |
| Accessibility        | Keyboard selection remains usable and reduced-motion CSS disables long animations/transitions.                                                         |

The browser suite exposed a real coordinate-mapping defect: focusing a partially visible canvas scrolled it before the click was mapped. The implementation now reads click coordinates before focusing and uses `preventScroll`; the exact-pixel regression test passes.

## Scope and limits

These results verify application behavior against known inputs. They do not establish pH measurement accuracy, validate a strip chemistry, or substitute for experiments with calibrated samples. Synthetic demo tests are not experimental validation.

Phone/tablet tests emulate viewport and touch behavior in Chromium. Physical camera capture, actual iOS/Safari and Android devices, browser-specific installation prompts, screen readers, and every image/metadata format were not tested by this suite. Offline availability depends on the browser retaining the cache. GitHub Pages deployment is a separate integration step and must be checked at the deployed URL after enabling and running its workflow.

Run the same suite from a fresh production build:

```sh
npm ci
npm run build
npx playwright install chromium
npm run test:e2e
```
