# PocketSense: three-minute demonstration

## Prepare

Serve the production build with `npm run build` and `npm run preview`, or use the deployed Pages URL. Let the offline cache finish before the demonstration. Keep two local JPG/PNG/WebP photos ready: a compatible pH strip/reference image and an unrelated photograph for Color Sense. If real calibrated materials are unavailable, use the built-in synthetic demo and say that it is synthetic throughout.

Make a compatible reference profile in advance if using a real strip. Enter the actual known reference values and sample their colors from the same photo, where possible. Use uniform illumination, avoid reflections, and observe the strip manufacturer's timing. A synthetic profile must not be used to draw conclusions about a real strip.

## 0:00–0:25 — The problem

“Reading a pH strip by eye is convenient, but neighboring colors can be difficult to distinguish. PocketSense makes the image comparison visible and repeatable. It uses the camera you already have, while showing the limits of the evidence.”

Open the home page and point out Color Sense and pH Sense.

## 0:25–1:15 — A reference-guided result

Open pH Sense. Upload the strip photo, or load the clearly labeled synthetic demonstration. Select the colored strip region and choose the corresponding reference profile. Show the sampled color, nearest reference, perceptual color difference, estimated pH, and reference range.

“The result is based on this specific reference profile. The displayed range reflects the available reference spacing; it is not a statistical confidence interval. Extra decimal places from interpolation do not establish experimental precision.”

If a quality warning appears, show it and explain the needed improvement rather than hiding it. Unsupported or ambiguous results are an intentional guard against overstating what the image supports.

## 1:15–1:45 — A measured comparison

If you have a real meter reading for the same real sample, enter that value and add the comparison. Show signed error, absolute error, and the table/plot. With multiple real measurements, show MAE and RMSE.

If demonstrating with synthetic material, explicitly call any entered value an **illustrative input**, not a laboratory result or validation dataset. Do not describe the aggregate errors as experimentally validated accuracy.

## 1:45–2:25 — Color beyond pH

Open Color Sense and upload an unrelated local photograph. Tap a pixel, select a region, and show how its actual RGB/HEX and region statistics change. Generate a palette, copy a swatch, and export JSON or CSV.

“These are colors of the photographed pixels. They can help with a slide palette, figure design, or visual exploration; they do not directly measure physical reflectance.”

## 2:25–3:00 — Privacy you can demonstrate

Disconnect the network after the production app has cached. Reopen PocketSense, upload a **different local photo**, and sample it. Open pH Sense and run a reference comparison. Explain that processing and exports happen locally and that custom profiles remain in this browser.

“Offline availability depends on the browser retaining its cache. The app sends no photos to an image-processing server.”

## Before going on stage

- Verify upload, camera chooser, region adjustment, palette copy/export, custom profile save/import/export, and meter comparison on the browser you will present.
- Check both a narrow phone-sized view and the actual projector/desktop view.
- Test offline reopening with a new photo rather than simply keeping an already-loaded image on screen.
- Keep one exported profile backup and a local production build in case connectivity is unavailable.
- Keep synthetic and real measurements clearly separated in your explanation.
