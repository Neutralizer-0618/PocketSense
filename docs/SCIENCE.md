# Scientific methods and boundaries

PocketSense compares photographed colors. It does not measure spectral reflectance, ambient illuminance, or hydrogen ion activity directly. Camera processing, illumination, glare, strip chemistry, reaction time, storage, sample matrix and chart printing can all affect the result. Use a profile for the same strip product and conditions; photograph the sample and chart together where possible. Do not use the synthetic demonstration for real samples.

## Color pipeline

Browser Canvas decodes the image into sRGB pixels. The processing engine removes the sRGB transfer function, transforms linear sRGB to XYZ and computes CIELAB relative to D65 with a 2° observer. Displayed Lab is **D65**, unlike CSS `lab()` (D50). RGB/HEX describe image data, not a calibrated physical object color. References: [W3C color conversion specification](https://www.w3.org/TR/css-color-4/#color-conversion-code) and [sRGB interpretation](https://www.w3.org/Graphics/Color/srgb).

Regions use every opaque pixel (alpha ≥250) within the selected rectangle. Mean RGB is an arithmetic average of encoded sRGB; the median is computed independently for each channel and is the default robust pH input. A channel median need not be a pixel present in the image. Transparent pixels are excluded, and empty selections are rejected.

Warnings use documented engineering thresholds: fewer than 25 pixels; encoded luma below 25 or above 235; more than 5% of pixels with a channel ≤2 or ≥253; or luma standard deviation above 25. Luma uses 0.2126R + 0.7152G + 0.0722B. These are image-quality heuristics, not estimates of illuminance or measurement uncertainty. Dark or highly saturated objects can legitimately trigger them.

The palette uses deterministic k-means in D65 Lab with farthest-point seeding, at most 24 iterations, and a stratified sample of up to 128 ×128 pixels. Output RGB values are cluster averages. The population is the sampled pixel fraction, not an exact whole-image area measurement. Uniform images return fewer distinct colors than requested.

## pH inference

The sample's channel-median RGB and all reference RGB colors are converted to D65 CIELAB. References are sorted by pH. Uniform Catmull-Rom interpolation joins adjacent reference colors in Lab, repeating the first and last controls at the profile boundaries. Within each interval, the spline parameter is `(pH - left.pH) / (right.pH - left.pH)`, so non-unit pH gaps are sampled at the same 0.01 pH spacing.

All hundredth-pH grid points within the profile range and every original reference knot are searched using squared Euclidean Lab distance. The closest candidate is returned, rounded and displayed to two decimal places. Exact equal-distance ties keep the first candidate encountered in ascending pH order. There is no extrapolation; outlying colors can return an endpoint. The displayed bracket is the reference interval containing the winning candidate, not a confidence interval.

The displayed color difference is Euclidean Delta E ab to the closest original reference, which can differ from the distance to the winning spline point. A distance greater than 15 Lab units to the curve produces a warning but does not suppress the estimate. Repeated reference colors also generate a warning. Other ambiguity, including curve crossings, is not automatically resolved. These are implementation conventions, not validated uncertainty bounds. The separately available CIEDE2000 utility and its published test pairs are no longer the pH matching metric.

The model assumes sufficiently accurate image colors and a compatible reference chart. Catmull-Rom can overshoot between controls; neither the curve nor the 0.01 search grid establishes actual analytical accuracy. Decimal pH values indicate numerical interpolation, not validated precision. Supported reference values are pH 0-14; at least two distinct values are required. Chart colors can be sampled in a separate image workspace and associated with manually entered pH labels. Profiles are saved locally and can be exported; there is no automatic OCR of chart labels. Synthetic profiles remain demonstrations without experimental validation.

## Meter comparisons

Signed error is estimate minus meter reading; absolute error is its magnitude. MAE is mean absolute error; RMSE is the square root of mean squared error. They summarize only the rows supplied, not general performance. Independent replicated measurements and a documented reference method are needed for validation. Synthetic demonstrations must be distinguished from real measurements.

## Verification scope

Unit tests check conversions, hue boundary behavior, pixel offsets, whole-region statistics, coordinate mapping, deterministic palette extraction, invalid calibration rejection, exact matching, Catmull-Rom interpolation, hundredth-pH sampling, repeated-color ties, endpoint bounds, error metrics and export formats. Passing numerical tests verifies implementation against the stated model; it does not validate pH measurement accuracy. This is an exploratory tool, not a clinical diagnostic device.
