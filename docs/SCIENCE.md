# Scientific methods and boundaries

PocketSense compares photographed colors. It does not measure spectral reflectance, ambient illuminance, or hydrogen ion activity directly. Camera processing, illumination, glare, strip chemistry, reaction time, storage, sample matrix and chart printing can all affect the result. Use a profile for the same strip product and conditions; photograph the sample and chart together where possible. Do not use the synthetic demonstration for real samples.

## Color pipeline

Browser Canvas decodes the image into sRGB pixels. The processing engine removes the sRGB transfer function, transforms linear sRGB to XYZ and computes CIELAB relative to D65 with a 2° observer. Displayed Lab is **D65**, unlike CSS `lab()` (D50). RGB/HEX describe image data, not a calibrated physical object color. References: [W3C color conversion specification](https://www.w3.org/TR/css-color-4/#color-conversion-code) and [sRGB interpretation](https://www.w3.org/Graphics/Color/srgb).

Regions use every opaque pixel (alpha ≥250) within the selected rectangle. Mean RGB is an arithmetic average of encoded sRGB; the median is computed independently for each channel and is the default robust pH input. A channel median need not be a pixel present in the image. Transparent pixels are excluded, and empty selections are rejected.

Warnings use documented engineering thresholds: fewer than 25 pixels; encoded luma below 25 or above 235; more than 5% of pixels with a channel ≤2 or ≥253; or luma standard deviation above 25. Luma uses 0.2126R + 0.7152G + 0.0722B. These are image-quality heuristics, not estimates of illuminance or measurement uncertainty. Dark or highly saturated objects can legitimately trigger them.

The palette uses deterministic k-means in D65 Lab with farthest-point seeding, at most 24 iterations, and a stratified sample of up to 128 ×128 pixels. Output RGB values are cluster averages. The population is the sampled pixel fraction, not an exact whole-image area measurement. Uniform images return fewer distinct colors than requested.

## pH inference

Reference matching uses CIEDE2000 with unit parametric factors. The implementation is checked against all 34 published supplementary pairs in both directions, including difficult hue-angle boundary cases. Source: [Sharma, Wu and Dalal (2005), implementation notes and test data](https://hajim.rochester.edu/ece/sites/gsharma/ciede2000/).

The nearest reference is selected by ΔE00. A mismatch above 15 suppresses the numerical result. Competing references with a distance margin below 2 suppress the result if they are nonadjacent, their reference colors differ by less than 2, or more than two references compete. The ambiguity bracket includes every competing reference. These thresholds are conservative product heuristics, not experimentally validated cutoffs.

Interpolation is a local numerical approximation, never a universal RGB-to-pH relationship. The two closest references must be adjacent in pH, separated by no more than 2 pH units and 3–30 ΔE00. The sample must be within 12 ΔE00 of its nearest reference. Its projection onto the straight Lab segment must be between 2% and 98% of the segment, have an orthogonal residual no greater than 25% of the segment length, and be within 3 ΔE00 of that projection. Only then is pH linearly interpolated by the segment position. Real indicator responses may remain nonlinear despite satisfying these checks. Validate a calibration independently before making analytical claims.

No extrapolation is allowed. For endpoint matches, a sample projected beyond the endpoint by a mismatch above 2 ΔE00 is rejected. An exact endpoint match still cannot exclude an out-of-range physical sample with a saturated indicator color.

For interpolated results, the displayed range is the two neighboring reference values. For nearest-reference results it spans the nearest point's immediate neighbors, clipped at profile endpoints. **This is a reference-resolution bracket, not a confidence interval or a guaranteed containment interval.** No experimental accuracy, confidence level or uncertainty distribution is asserted. Decimal pH values indicate computation, not validated precision.

Supported manual reference values are pH 0–14. The synthetic profile is original demonstration data with no experimental validation. Repeated colors can be stored to expose ambiguity but cannot distinguish those pH values.

## Meter comparisons

Signed error is estimate minus meter reading; absolute error is its magnitude. MAE is mean absolute error; RMSE is the square root of mean squared error. They summarize only the rows supplied, not general performance. Independent replicated measurements and a documented reference method are needed for validation. Synthetic demonstrations must be distinguished from real measurements.

## Verification scope

Unit tests check conversions, hue boundary behavior, pixel offsets, whole-region statistics, coordinate mapping, deterministic palette extraction, invalid calibration rejection, exact matching, guarded interpolation, ambiguity, extrapolation refusal, error metrics and export formats. Passing numerical tests verifies implementation against the stated model; it does not validate pH measurement accuracy. This is an exploratory tool, not a clinical diagnostic device.
