# PocketSense

**Your camera. Your color sensor. Your data.**

PocketSense is a browser-local color analysis app with two workspaces: **Color Sense**, for numerical image sampling and representative palettes, and **pH Sense**, for comparing a photographed strip region with a compatible reference color profile. It is designed for an exploratory university demonstration, with transparent scientific limits.

**[中文：从 GitHub 在另一台机器上完整安装和部署](docs/DEPLOYMENT.zh-CN.md)**

## Run locally

Use Node.js 22.12 or newer and npm.

Clone the latest application from `main`:

```sh
git clone https://github.com/Neutralizer-0618/PocketSense.git
cd PocketSense
```

If the repository requires authentication, use a GitHub account with access. Node version managers supporting `.nvmrc` can use the included Node 22 configuration.

```sh
npm ci
npm run dev
```

On Windows, after `npm ci`, you can also double-click `start-pocketsense.cmd` to start the app and open the browser. Keep its terminal window open while using the app; close it to stop the server.

Open the local `/PocketSense/` URL printed by Vite. To test the actual production build and offline behavior:

```sh
npm run build
npm run preview
```

The repository contains every source file, bundled asset, dependency lockfile, test fixture, and build/deployment configuration required by these commands. `npm ci` reconstructs platform-specific dependencies in `node_modules/`, and `npm run build` produces `dist/`. Neither generated folder needs to be copied from another computer. No app-specific credentials, backend, or environment file is required. The initial dependency installation needs registry access.

The offline worker is enabled in production only. A service worker requires HTTPS or a browser-trusted localhost origin; opening `dist/index.html` directly is insufficient.

## Features

- Upload, drag and drop, or capture JPG, PNG, and WebP images. Processing stays in the browser.
- Sample a pixel or rectangular region; inspect RGB, HEX, HSL, HSV, and D65 CIE Lab values, with region mean and median statistics.
- Adjust selections and zoom the image. Extract representative colors through a clustering algorithm and export palettes as JSON or CSV.
- Estimate pH using RGB-to-D65-Lab conversion, a Catmull-Rom reference curve, and Euclidean nearest-point search at 0.01 pH spacing. Readings display two decimal places.
- Upload a reference chart in its own sampling workspace, read each patch's RGB, manually associate it with its known pH, and save the profile. Create, reuse, import, and export custom pH profiles. A separate synthetic profile supports a clearly labeled demonstration.
- Compare estimates with user-entered laboratory meter values; inspect signed/absolute error, MAE, and RMSE, and export the comparison table.
- Responsive interface, keyboard controls, reduced-motion support, and an installable offline PWA where the browser supports installation.

## Read pH with your own reference chart

1. Open **pH Sense** and choose **Create profile** in the reference panel.
2. Upload a JPG, PNG, or WebP chart in the separate **REFERENCE CHART** workspace. This does not replace the test-strip image.
3. Click a pixel or select a color-patch region. Its sampled color automatically fills **Reference HEX** and **Reference RGB** (regions use channel medians).
4. Enter the patch's known **pH value**, then choose **Add reference**. Repeat for at least two distinct pH values; labels are entered manually, with no OCR.
5. Enter a **Profile name** and choose **Save profile**. The profile is selected immediately and stored in this browser, including after a reload. Use **Export** / **Import** for backups or transfer to another browser.
6. Upload the test-strip photo in the main image workspace and select its colored area. The app compares its RGB with the selected profile and displays an estimate such as **7.23**.

Reference points are sorted by pH and converted to D65 CIELAB. Each neighboring pair is joined by a Catmull-Rom segment, with repeated endpoint controls at the ends. The app samples the curve on the 0.01 pH grid, also includes all original reference points, and chooses the point closest to the measured Lab color by Euclidean distance. It searches only within the profile's pH range; it does not extrapolate. The color difference shown beside the closest original reference is **Delta E ab**, not CIEDE2000. No additional scientific computing library is required.

## Scientific interpretation

A photograph measures the camera's rendered pixel color, not an object's absolute reflectance. Lighting, exposure, white balance, camera processing, strip chemistry, timing, and reference preparation all affect results. Prefer compatible strip references photographed under the same conditions, ideally in the same image. A profile is a collection of reference colors, not evidence that a particular strip or protocol has been validated.

There is no universal RGB-to-pH formula. PocketSense estimates the nearest position on a Lab reference curve, assuming compatible reference colors and sufficiently accurate image colors. A numerical result is returned even for a poor match, with a warning for large curve distances. Repeated colors and curve crossings can make pH non-unique; equal-distance ties favor the first point in ascending pH order. The displayed reference range is a calibration-resolution guide, **not a confidence interval**. A decimal output reflects numerical interpolation, **not demonstrated analytical precision**. Ambiguous and unsupported colors must be resolved by improving the image or profile, not by trusting more decimal places.

Synthetic images and calibration colors are labeled demonstrations. They are not experimental measurements or proof of accuracy. Optional meter comparisons only summarize values that the user enters; the app cannot authenticate their provenance. This is not a clinical diagnostic device or a substitute for a validated measurement protocol.

See [Scientific methods and tests](docs/SCIENCE.md) for formulas, reference sources, the interpolation method, and limitations, and [Three-minute demo](docs/DEMO.md) for a presentation script.

## Privacy and offline operation

Photos are decoded and analyzed locally. They are not uploaded by the app or persistently stored by default. Removing an image or leaving the app releases its in-memory working data. Custom reference profiles are stored in this browser's local storage. Meter-comparison records stay in memory for the current session; export them before leaving or reloading. Exported files are saved only when you request an export. There are no accounts, trackers, remote databases, runtime CDN assets, or external image-processing services.

The service worker caches the bundled application files after a successful first online load. The generated cache is versioned from build contents. Uploaded photos are never put in the application cache. Browser storage can be cleared or evicted by the browser, and private-browsing modes may restrict persistence. Keep exported copies of profiles you need to preserve.

To verify offline operation manually:

1. Serve a production build, open `/PocketSense/`, and wait until the app reports that it is available offline.
2. Close and reopen the app once online so that its service worker controls it.
3. Disconnect the network or use the browser's offline mode, then reopen the same URL.
4. Upload a **new local image**, select a region, inspect Color Sense, and perform a pH comparison with a saved or synthetic profile.
5. Export a result. Restore connectivity when finished.

New releases install in the background. Close all open PocketSense tabs and reopen the app to activate a waiting update; the app does not force a reload during analysis. The service-worker lifecycle follows the [browser's install and activation model](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).

## Validation

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Unit tests cover color transforms, published CIEDE2000 reference pairs, image-coordinate mapping, pixel/region statistics, Catmull-Rom controls, hundredth-pH sampling, endpoint bounds, reference sorting, repeated-color ties, invalid calibration profiles, and exports. Browser tests exercise the production app, image sampling, independent reference-chart uploads, color-to-pH associations, profile persistence, offline reopening, and responsive layouts. A browser automation result is not equivalent to validation on every physical phone or camera. See the [recorded browser validation and its limits](docs/VALIDATION.md).

## GitHub Pages

The repository is configured for:

https://Neutralizer-0618.github.io/PocketSense/

The Vite base, manifest, worker scope, and generated precache URLs all use `/PocketSense/`. Navigation remains within the static application, so it does not require a backend router.

Repository owner setup:

1. Ensure the version you want to deploy is on `main`.
2. Open **Settings → Pages → Build and deployment → Source**, and choose **GitHub Actions**.
3. Confirm that Actions is enabled for the repository. If a `github-pages` environment requires approval or restricts branches, allow the `main` deployment.
4. The **Deploy GitHub Pages** workflow runs on pushes to `main`. It can also be started manually from the Actions tab.
5. Open the deployed URL after the workflow succeeds. Test its production offline behavior as described above.

The workflow builds and checks the app, uploads `dist/` as a Pages artifact, and deploys with the official Pages actions. GitHub documents this setup in [Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). Hosting availability for a private repository depends on the account and repository settings.

Pull requests and non-`main` pushes run the separate **Verify PocketSense** workflow. The application itself does not require secrets. No force-push or direct overwrite of `main` is needed.

## Project structure

```text
src/components/       Image interaction and application components
src/lib/              Scientific algorithms and unit tests
public/               Manifest and locally bundled icons
scripts/build-sw.mjs  Content-versioned offline precache generator
tests/                Browser acceptance tests
docs/                 Scientific methods and demo notes
.github/workflows/    Verification and Pages deployment
```
