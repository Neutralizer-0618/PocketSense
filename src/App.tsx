import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  ChevronRight,
  Copy,
  FlaskConical,
  Focus,
  Github,
  Info,
  Layers3,
  LockKeyhole,
  Palette,
  Plus,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";
import { ImageWorkspace, type LoadedImage } from "./components/ImageWorkspace";
import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
  rgbToLab,
  type RGB,
} from "./lib/color";
import { generatePalette, type Rect, type Sample } from "./lib/sampling";
import {
  comparisonMetrics,
  DEMO_PROFILE,
  estimatePh,
  parseProfile,
  validateProfile,
  type ReferenceProfile,
} from "./lib/ph";
import { toCsv } from "./lib/export";

type Route = "home" | "ph" | "color" | "about";
type Measurement = {
  id: string;
  time: string;
  estimate: number;
  reference: number;
  error: number;
  absoluteError: number;
  synthetic: boolean;
  profile: string;
  hex: string;
};
const PROFILE_KEY = "pocketsense.profiles.v1";
const routes: Route[] = ["home", "ph", "color", "about"];
const routeFromHash = (): Route => {
  const value = location.hash.slice(1) as Route;
  return routes.includes(value) ? value : "home";
};
function readProfiles(): ReferenceProfile[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(PROFILE_KEY) || "[]");
    return Array.isArray(data)
      ? data
          .flatMap((p) => {
            try {
              return [parseProfile(JSON.stringify(p))];
            } catch {
              return [];
            }
          })
          .filter((p) => p.id !== DEMO_PROFILE.id)
      : [];
  } catch {
    return [];
  }
}
function download(name: string, content: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const formatRgb = (rgb: RGB) =>
  `${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}`;
const num = (value: number) => value.toFixed(1);

function Brand({ small = false }: { small?: boolean }) {
  return (
    <a
      className={`brand ${small ? "small" : ""}`}
      href="#home"
      aria-label="PocketSense home"
    >
      <span className="brand-mark">
        <Focus size={22} strokeWidth={2.2} />
      </span>
      <span>
        Pocket<span className="brand-sense">Sense</span>
        <span className="brand-dot">.</span>
      </span>
    </a>
  );
}

function Home() {
  return (
    <>
      <section className="hero section-enter">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="live-dot" /> A LITTLE CAMERA. A WORLD OF DISCOVERY.
          </div>
          <h1>
            See color.
            <br />
            Discover <span>more.</span>
          </h1>
          <p className="hero-description">
            Turn your camera into a color sensor.
            <br className="desktop-break" /> Explore palettes, make sense of pH,
            and bring
            <br className="desktop-break" /> a little science to the everyday.
          </p>
          <div className="hero-actions">
            <a className="button primary large" href="#ph">
              Start sensing <ArrowRight size={18} />
            </a>
            <a className="button text-button" href="#color">
              Explore Color Sense <ChevronRight size={16} />
            </a>
          </div>
          <div className="hero-assurance">
            <span>
              <LockKeyhole size={14} /> Private by design
            </span>
            <span>
              <WifiOff size={14} /> Ready for offline
            </span>
            <span>No extra hardware</span>
          </div>
        </div>
        <div
          className="hero-instrument"
          aria-label="Illustration of a color sensor and synthetic pH reading"
        >
          <div className="instrument-grid" />
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="color-wheel">
            <div className="wheel-center">
              <span className="crosshair" />
              <span className="lens-dot" />
              <span className="wheel-caption">A NEW WAY TO SEE</span>
            </div>
          </div>
          <div className="floating-swatch">
            <span className="swatch-square" />
            <span>
              <small>COLOR DETECTED</small>
              <strong>#70B3A4</strong>
              <em>112 · 179 · 164</em>
            </span>
            <span className="tiny-check">
              <Check size={13} />
            </span>
          </div>
          <div className="floating-ph">
            <div>
              <span className="mini-dot" /> pH SENSE{" "}
              <span className="demo-tag">DEMO</span>
            </div>
            <strong>
              7<span>.0</span>
              <small>pH</small>
            </strong>
            <div className="ph-mini-scale">
              {[
                "#e38d6c",
                "#e8b85a",
                "#d8cd6c",
                "#95b975",
                "#64a8a0",
                "#698fae",
                "#987db1",
              ].map((c) => (
                <i key={c} style={{ background: c }} />
              ))}
            </div>
            <p>Synthetic reference match</p>
          </div>
          <div className="instrument-label">
            <span>CAMERA → COLOR → DISCOVERY</span>
            <span>01 / 02</span>
          </div>
        </div>
      </section>
      <section className="tools-section section-enter delay-1">
        <div className="section-heading">
          <div>
            <span className="eyebrow">YOUR POCKET LAB</span>
            <h2>Two ways to get curious.</h2>
          </div>
          <p>One camera. A fresh perspective.</p>
        </div>
        <div className="tool-grid">
          <a className="tool-card ph-card" href="#ph">
            <div className="tool-card-copy">
              <span className="tool-icon">
                <FlaskConical size={22} />
              </span>
              <h3>
                pH Sense <ArrowRight size={23} />
              </h3>
              <p>
                From test strip to insight. Compare a sampled color with your
                own reference chart.
              </p>
              <span className="pill">REFERENCE-GUIDED ANALYSIS</span>
            </div>
            <div className="strip-illustration">
              <span className="paper-strip">
                <i />
              </span>
              <div className="strip-reference">
                {["#e49b68", "#ddc967", "#95b975", "#5eaaa1", "#7e91af"].map(
                  (c, i) => (
                    <span key={c}>
                      <i style={{ background: c }} />
                      <small>{i * 2 + 3}</small>
                    </span>
                  ),
                )}
              </div>
              <span className="selection-corner tl" />
              <span className="selection-corner br" />
            </div>
          </a>
          <a className="tool-card color-card" href="#color">
            <div className="tool-card-copy">
              <span className="tool-icon">
                <Palette size={22} />
              </span>
              <h3>
                Color Sense <ArrowRight size={23} />
              </h3>
              <p>
                Capture a color. Find a palette. Take inspiration from anything
                in your frame.
              </p>
              <span className="pill">PIXELS WITH POSSIBILITIES</span>
            </div>
            <div className="palette-illustration">
              {["#275d54", "#68a490", "#e4ddac", "#eaa482", "#b66350"].map(
                (c, i) => (
                  <span
                    key={c}
                    style={{
                      background: c,
                      transform: `rotate(${(i - 2) * 9}deg) translateY(${Math.abs(i - 2) * 4}px)`,
                    }}
                  >
                    <i>{c}</i>
                  </span>
                ),
              )}
            </div>
          </a>
        </div>
      </section>
      <section className="privacy-ribbon section-enter delay-2">
        <span className="privacy-icon">
          <ShieldCheck size={24} />
        </span>
        <div>
          <h3>Your photos stay with you.</h3>
          <p>
            All image processing happens in your browser. No uploads. No
            accounts. Just discovery.
          </p>
        </div>
        <a href="#about">
          Meet PocketSense <ArrowRight size={17} />
        </a>
      </section>
    </>
  );
}

function About() {
  return (
    <section className="about-page section-enter">
      <div className="eyebrow">BUILT FOR CURIOSITY. GROUNDED IN SCIENCE.</div>
      <h1>
        A little lab.
        <br />
        <span>A lot of possibility.</span>
      </h1>
      <p className="intro">
        PocketSense makes the colors in a photograph useful. Explore an image,
        build a palette, or compare a test strip against a compatible pH
        reference.
      </p>
      <div className="about-grid">
        <article className="panel">
          <ShieldCheck />
          <h2>Private by design</h2>
          <p>
            Photos are decoded and analyzed on your device. They are not sent to
            a server or saved persistently by this app. Custom reference
            profiles are saved in this browser. Measurement logs stay in memory
            until you leave or reload.
          </p>
          <p>
            Exported files are saved only when you choose. There are no
            accounts, analytics, runtime CDNs, or cloud image services.
          </p>
        </article>
        <article className="panel">
          <WifiOff />
          <h2>Take it offline</h2>
          <p>
            Open the production app online once and wait for “Offline ready” in
            the header. You can then reopen it and analyze new photos without a
            connection.
          </p>
          <p>
            Use your browser’s install or Add to Home Screen action where
            supported. Clearing site data removes cached files and saved
            profiles. Offline availability depends on browser storage retention.
          </p>
        </article>
      </div>
      <article className="panel science-note">
        <span className="eyebrow">WHAT THE NUMBERS MEAN</span>
        <h2>A measured pixel is a starting point.</h2>
        <p>
          Image RGB depends on lighting, camera processing, exposure, and white
          balance. It is not a direct measurement of an object’s physical
          reflectance.
        </p>
        <p>
          pH Sense compares median region color in D65 CIE Lab using CIEDE2000
          color difference. Use a reference profile for the same strip
          chemistry, with a similar camera and lighting. Sampling the chart and
          strip from the same photo can reduce some differences, but does not
          establish accuracy.
        </p>
        <p>
          Local interpolation is allowed only when neighboring references
          support it. The displayed bracket comes from the available reference
          values; it is not a statistical confidence interval. Decimal digits
          describe calculation, not validated precision. Ambiguous or distant
          colors can produce no estimate.
        </p>
        <p>
          The bundled profile and scenes are synthetic demonstrations, never
          experimental validation. PocketSense is an exploratory educational
          tool, not a clinical diagnostic device.
        </p>
        <a
          href="https://hajim.rochester.edu/ece/sites/gsharma/ciede2000/"
          target="_blank"
          rel="noreferrer"
        >
          CIEDE2000 implementation reference <ArrowRight size={15} />
        </a>
      </article>
    </section>
  );
}

function ColorResults({
  image,
  sample,
  notify,
}: {
  image: LoadedImage | null;
  sample: Sample | null;
  notify: (text: string) => void;
}) {
  const [stat, setStat] = useState<"median" | "mean">("median");
  const [count, setCount] = useState(6);
  const [generated, setGenerated] = useState(false);
  const colors = useMemo(
    () => (image && generated ? generatePalette(image.data, count) : []),
    [image, count, generated],
  );
  const rgb = sample?.[stat];
  const lab = rgb ? rgbToLab(rgb) : null;
  const hsv = rgb ? rgbToHsv(rgb) : null;
  const hsl = rgb ? rgbToHsl(rgb) : null;
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      notify(`Copied ${value}`);
    } catch {
      notify(
        "Clipboard unavailable. Select the displayed color value to copy.",
      );
    }
  }
  return (
    <div className="results-stack">
      <section className="panel result-panel">
        <div className="panel-heading">
          <h2>
            <Focus size={18} /> Color reading
          </h2>
          <span className="status-badge">
            {sample
              ? `${sample.pixelCount.toLocaleString()} px`
              : "AWAITING IMAGE"}
          </span>
        </div>
        {rgb && lab && hsv && hsl ? (
          <>
            <div className="color-reading">
              <div
                className="large-swatch"
                style={{ background: rgbToHex(rgb) }}
              />
              <div>
                <span className="eyebrow">
                  {sample?.pixelCount === 1
                    ? "PIXEL COLOR"
                    : `${stat.toUpperCase()} REGION COLOR`}
                </span>
                <h3 data-testid="color-hex">{rgbToHex(rgb)}</h3>
                <button
                  className="inline-button"
                  onClick={() => copy(rgbToHex(rgb))}
                >
                  <Copy size={13} /> Copy HEX
                </button>
              </div>
            </div>
            <div className="segmented">
              <button
                className={stat === "median" ? "active" : ""}
                onClick={() => setStat("median")}
              >
                Median
              </button>
              <button
                className={stat === "mean" ? "active" : ""}
                onClick={() => setStat("mean")}
              >
                Mean
              </button>
            </div>
            <dl className="color-values">
              <div>
                <dt>RGB</dt>
                <dd>{formatRgb(rgb)}</dd>
              </div>
              <div>
                <dt>HSL</dt>
                <dd>
                  {num(hsl.h)}° · {num(hsl.s)}% · {num(hsl.l)}%
                </dd>
              </div>
              <div>
                <dt>HSV</dt>
                <dd>
                  {num(hsv.h)}° · {num(hsv.s)}% · {num(hsv.v)}%
                </dd>
              </div>
              <div>
                <dt>
                  CIE Lab <small>D65</small>
                </dt>
                <dd>
                  {num(lab.l)} · {num(lab.a)} · {num(lab.b)}
                </dd>
              </div>
            </dl>
            <div className="stat-pair">
              <div>
                <small>Mean RGB</small>
                <strong data-testid="region-mean">
                  {formatRgb(sample!.mean)}
                </strong>
              </div>
              <div>
                <small>Median RGB</small>
                <strong data-testid="region-median">
                  {formatRgb(sample!.median)}
                </strong>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-result">
            <Focus size={36} />
            <h3>Find your first color.</h3>
            <p>
              Add an image and tap a pixel or select a region. Every value comes
              from your image.
            </p>
          </div>
        )}
        <p className="fine-print">
          <Info size={13} /> Photographed color depends on your camera and
          lighting.
        </p>
      </section>
      <section className="panel palette-panel">
        <div className="panel-heading">
          <h2>
            <Layers3 size={18} /> Your image, in color
          </h2>
          <span className="status-badge">PALETTE</span>
        </div>
        <p className="muted">
          Representative colors, clustered from your image.
        </p>
        <div className="palette-controls">
          <label>
            Colors{" "}
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            >
              {[5, 6, 7, 8].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <button
            className="button primary compact"
            disabled={!image}
            onClick={() => setGenerated(true)}
          >
            <Sparkles size={15} />{" "}
            {generated ? "Refresh palette" : "Generate palette"}
          </button>
        </div>
        {colors.length ? (
          <>
            <div className="palette-swatches">
              {colors.map((color, i) => (
                <button
                  className="palette-item"
                  key={`${color.hex}-${i}`}
                  onClick={() => copy(color.hex)}
                  title={`Copy ${color.hex}, RGB ${formatRgb(color.rgb)}`}
                >
                  <span style={{ background: color.hex }} />
                  <strong>{color.hex}</strong>
                  <small>{formatRgb(color.rgb)}</small>
                  <Copy size={12} />
                </button>
              ))}
            </div>
            <div className="export-actions">
              <button
                className="button subtle compact"
                onClick={() =>
                  download(
                    "pocketsense-palette.json",
                    JSON.stringify({ source: image?.name, colors }, null, 2),
                  )
                }
              >
                <ArrowDownToLine size={14} /> JSON
              </button>
              <button
                className="button subtle compact"
                onClick={() =>
                  download(
                    "pocketsense-palette.csv",
                    toCsv(
                      colors.map((c) => ({
                        hex: c.hex,
                        r: c.rgb.r,
                        g: c.rgb.g,
                        b: c.rgb.b,
                        population: c.population,
                      })),
                    ),
                    "text/csv",
                  )
                }
              >
                <ArrowDownToLine size={14} /> CSV
              </button>
            </div>
          </>
        ) : (
          <div className="palette-placeholder">
            {["#dce5df", "#dde5dc", "#e6e9d8", "#ede6da", "#e9ddd4", "#e1d8d4"]
              .slice(0, count)
              .map((c, i) => (
                <i key={i} style={{ background: c }} />
              ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ProfileEditor({
  sample,
  syntheticSource,
  onSave,
  onCancel,
}: {
  sample: Sample | null;
  syntheticSource: boolean;
  onSave: (p: ReferenceProfile) => void;
  onCancel: () => void;
}) {
  const [fromSynthetic, setFromSynthetic] = useState(false);
  const [pendingSynthetic, setPendingSynthetic] = useState(false);
  const [name, setName] = useState("");
  const [ph, setPh] = useState("7");
  const [hex, setHex] = useState("#95B975");
  const [points, setPoints] = useState<ReferenceProfile["points"]>([]);
  const [error, setError] = useState("");
  const referenceSynthetic = useRef(false);
  function add() {
    const value = Number(ph);
    if (
      ph.trim() === "" ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > 14 ||
      !hexToRgb(hex)
    ) {
      setError("Enter a pH from 0 to 14 and a valid six-digit HEX color.");
      return;
    }
    if (points.some((p) => p.ph === value)) {
      setError(
        "Each pH value must be unique. Remove the existing value to replace it.",
      );
      return;
    }
    setPoints(
      [...points, { ph: value, hex: rgbToHex(hexToRgb(hex)!) }].sort(
        (a, b) => a.ph - b.ph,
      ),
    );
    setFromSynthetic(fromSynthetic || pendingSynthetic);
    setError("");
  }
  function save() {
    const profile: ReferenceProfile = {
      id: crypto.randomUUID(),
      name: name.trim(),
      synthetic: fromSynthetic,
      points,
    };
    const errors = validateProfile(profile);
    if (errors.length) {
      setError(errors.join(" "));
      return;
    }
    onSave(profile);
  }
  return (
    <section className="profile-editor">
      <div className="panel-heading">
        <h3>Create reference profile</h3>
        <button
          className="icon-button"
          aria-label="Close profile editor"
          onClick={onCancel}
        >
          <X size={17} />
        </button>
      </div>
      <p className="muted">
        Upload your reference chart below. Click or select each color patch,
        enter its printed pH value, then add the reference. Save at least two
        references to reuse this chart. pH labels are entered manually.
      </p>
      <div className="reference-image-editor">
        <ImageWorkspace
          kind="ph"
          reference
          onImage={(next) => { referenceSynthetic.current = !!next?.synthetic; }}
          onSelection={(next) => {
            if (next) {
              setHex(rgbToHex(next.median));
              setPendingSynthetic(referenceSynthetic.current);
            }
          }}
        />
      </div>
      <label className="field">
        Profile name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. My strip chart · daylight"
          maxLength={80}
        />
      </label>
      <div className="reference-fields">
        <label className="field">
          pH value
          <input
            type="number"
            min="0"
            max="14"
            step="0.01"
            value={ph}
            onChange={(e) => setPh(e.target.value)}
          />
        </label>
        <label className="field">
          Reference HEX
          <input
            value={hex}
            onChange={(e) => {
              setHex(e.target.value);
              setPendingSynthetic(false);
            }}
            placeholder="#95B975"
            maxLength={7}
          />
        </label>
      </div>
      {hexToRgb(hex) && (
        <p className="muted" data-testid="reference-rgb">
          Reference RGB: {formatRgb(hexToRgb(hex)!)}
        </p>
      )}
      <div className="button-row">
        <button
          className="button subtle compact"
          disabled={!sample}
          onClick={() => {
            setHex(rgbToHex(sample!.median));
            setPendingSynthetic(syntheticSource);
          }}
        >
          <Focus size={14} /> Use sampled color
        </button>
        <button className="button secondary compact" onClick={add}>
          <Plus size={14} /> Add reference
        </button>
      </div>
      <div className="reference-list">
        {points.map((p) => (
          <div key={p.ph}>
            <i style={{ background: p.hex }} />
            <strong>pH {p.ph}</strong>
            <span>{p.hex}</span>
            <button
              className="icon-button"
              aria-label={`Remove pH ${p.ph} reference`}
              onClick={() => setPoints(points.filter((q) => q.ph !== p.ph))}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button primary full" onClick={save}>
        Save profile <Check size={15} />
      </button>
      <p className="fine-print">
        At least 2 distinct pH values. Custom profiles are unvalidated.
        Demo-sampled profiles remain marked synthetic.
      </p>
    </section>
  );
}

function PhResults({
  sample,
  image,
  rect,
  notify,
}: {
  sample: Sample | null;
  image: LoadedImage | null;
  rect: Rect | null;
  notify: (t: string) => void;
}) {
  const [saved, setSaved] = useState(readProfiles);
  const [selected, setSelected] = useState(DEMO_PROFILE.id);
  const [editing, setEditing] = useState(false);
  const [meter, setMeter] = useState("");
  const [records, setRecords] = useState<Measurement[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [importError, setImportError] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setConfirmed(false);
    setMeter("");
  }, [sample, image, selected]);
  const profiles = [DEMO_PROFILE, ...saved];
  const profile = profiles.find((p) => p.id === selected) || DEMO_PROFILE;
  const result = useMemo(
    () => (sample ? estimatePh(sample.median, profile) : null),
    [sample, profile],
  );
  const synthetic = profile.synthetic || !!image?.synthetic;
  const realRecords = records.filter((r) => !r.synthetic);
  const metrics = realRecords.length ? comparisonMetrics(realRecords) : null;
  function persist(p: ReferenceProfile) {
    const next = [...saved.filter((q) => q.id !== p.id), p];
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      setSaved(next);
      setSelected(p.id);
      setEditing(false);
      setConfirmed(false);
      setImportError("");
      notify("Reference profile saved in this browser.");
    } catch {
      notify(
        "Browser storage is unavailable or full. Export your profile to keep it.",
      );
      download("pocketsense-profile.json", JSON.stringify(p, null, 2));
    }
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 250000) throw new Error("Profile file is too large.");
      const p = parseProfile(await file.text());
      persist({ ...p, id: crypto.randomUUID() });
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : "Invalid profile file.",
      );
    }
  }
  const validMeter =
    meter.trim() !== "" &&
    Number.isFinite(Number(meter)) &&
    Number(meter) >= 0 &&
    Number(meter) <= 14;
  const canRecord =
    result?.estimate != null && validMeter && (synthetic || confirmed);
  function record() {
    if (!canRecord || result?.estimate == null) return;
    const estimate = result.estimate;
    const reference = Number(meter);
    setRecords([
      ...records,
      {
        id: crypto.randomUUID(),
        time: new Date().toISOString(),
        estimate,
        reference,
        error: estimate - reference,
        absoluteError: Math.abs(estimate - reference),
        synthetic,
        profile: profile.name,
        hex: rgbToHex(sample!.median),
      },
    ]);
    notify("Comparison added to this session.");
  }
  function exportResult() {
    if (!result || !sample) return;
    download(
      "pocketsense-ph-result.json",
      JSON.stringify(
        {
          version: 1,
          time: new Date().toISOString(),
          image: {
            name: image?.name,
            width: image?.width,
            height: image?.height,
            originalWidth: image?.originalWidth,
            originalHeight: image?.originalHeight,
            coordinateFrame:
              "Processed image pixels; transparent pixels composited onto white",
          },
          synthetic,
          region: rect,
          sample,
          profile,
          result,
          limitations:
            "Exploratory estimate. Reference bracket is not a confidence interval. Numerical interpolation is not validated precision.",
        },
        null,
        2,
      ),
    );
  }
  return (
    <div className="results-stack">
      <section className="panel">
        <div className="panel-heading">
          <h2>
            <FlaskConical size={18} /> Reference profile
          </h2>
          <span className="step-label">02</span>
        </div>
        <label className="field">
          Choose your reference
          <select
            aria-label="Choose your reference"
            value={profile.id}
            onChange={(e) => {
              setSelected(e.target.value);
              setConfirmed(false);
            }}
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="reference-strip">
          {profile.points.map((p) => (
            <div key={p.ph} title={`${p.hex} · pH ${p.ph}`}>
              <i style={{ background: p.hex }} />
              <span>{p.ph}</span>
            </div>
          ))}
        </div>
        <div
          className={`calibration-note ${profile.synthetic ? "demo-note" : ""}`}
        >
          <Info size={14} />
          <span>
            {profile.synthetic
              ? "Synthetic demonstration only. Select a compatible custom profile for real strips."
              : "Custom calibration · unvalidated. Match the strip chemistry and imaging conditions."}
          </span>
        </div>
        <div className="button-row">
          <button
            className="button subtle compact"
            onClick={() => setEditing(!editing)}
          >
            <Plus size={14} /> Create profile
          </button>
          <button
            className="button subtle compact"
            onClick={() => importRef.current?.click()}
          >
            Import
          </button>
          <button
            className="button subtle compact"
            onClick={() =>
              download(
                "pocketsense-profile.json",
                JSON.stringify(profile, null, 2),
              )
            }
          >
            Export
          </button>
        </div>
        <input
          ref={importRef}
          aria-label="Import reference profile"
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            void importFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {importError && (
          <p role="alert" className="form-error">
            {importError}
          </p>
        )}
        {editing && (
          <ProfileEditor
            sample={sample}
            syntheticSource={!!image?.synthetic}
            onSave={persist}
            onCancel={() => setEditing(false)}
          />
        )}
      </section>
      <section className="panel ph-result">
        <div className="panel-heading">
          <h2>pH reading</h2>
          <span className="status-badge">
            {synthetic ? "SYNTHETIC DEMO" : "EXPLORATORY"}
          </span>
        </div>
        {result ? (
          <>
            <div className="ph-number">
              <span className="eyebrow">
                {result.estimate === null
                  ? "NO SUPPORTED ESTIMATE"
                  : "ESTIMATED pH"}
              </span>
              <strong data-testid="ph-estimate">
                {result.estimate === null ? "—" : result.estimate.toFixed(2)}
              </strong>
              <p>
                {result.range
                  ? `Reference bracket ${num(result.range[0])} – ${num(result.range[1])}`
                  : "Outside the supported color match"}
              </p>
              <small>Reference resolution, not a confidence interval</small>
            </div>
            <div className="ph-scale">
              {profile.points.map((p) => (
                <span key={p.ph} style={{ background: p.hex }} />
              ))}
              {result.estimate !== null && (
                <i
                  style={{
                    left: `${Math.max(0, Math.min(100, ((result.estimate - profile.points[0].ph) / (profile.points.at(-1)!.ph - profile.points[0].ph)) * 100))}%`,
                  }}
                />
              )}
            </div>
            <div className="comparison-swatches">
              <div>
                <i style={{ background: rgbToHex(sample!.median) }} />
                <span>
                  Sample median<strong>{rgbToHex(sample!.median)}</strong>
                </span>
              </div>
              <div>
                <i style={{ background: result.nearest.hex }} />
                <span>
                  Closest reference<strong>pH {result.nearest.ph}</strong>
                </span>
              </div>
            </div>
            <dl className="color-values">
              <div>
                <dt>Color difference</dt>
                <dd>ΔEab {result.deltaE.toFixed(2)}</dd>
              </div>
              <div>
                <dt>Method</dt>
                <dd>
                  {result.interpolated
                    ? "Lab Catmull-Rom · 0.01 pH"
                    : result.estimate !== null
                      ? "Nearest reference"
                      : "Match rejected"}
                </dd>
              </div>
            </dl>
            <div className="quality-notes">
              <h4>Measurement quality</h4>
              {[
                ...new Set([...(sample?.warnings || []), ...result.warnings]),
              ].map((w) => (
                <p key={w}>
                  <Info size={13} />
                  {w}
                </p>
              ))}
              <p>
                <Info size={13} />{" "}
                {result.interpolated
                  ? "Decimal result is interpolation, not validated analytical precision."
                  : "Reference matching does not establish analytical accuracy."}
              </p>
            </div>
            <button className="button secondary full" onClick={exportResult}>
              <ArrowDownToLine size={15} /> Export measurement
            </button>
          </>
        ) : (
          <div className="empty-result">
            <FlaskConical size={36} />
            <h3>A little color. A useful clue.</h3>
            <p>
              Select the colored area of a test strip to compare it with your
              reference profile.
            </p>
          </div>
        )}
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>Compare with a pH meter</h2>
          <span className="status-badge">OPTIONAL</span>
        </div>
        <p className="muted">Record a paired reading from the same sample.</p>
        <label className="field">
          Laboratory reference pH
          <input
            type="number"
            min="0"
            max="14"
            step="0.01"
            value={meter}
            placeholder="e.g. 7.10"
            onChange={(e) => setMeter(e.target.value)}
          />
        </label>
        {!synthetic && (
          <label className="check-field">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />{" "}
            This is a real strip and paired meter measurement.
          </label>
        )}
        {meter !== "" && !validMeter && (
          <p className="form-error">Enter a finite pH from 0 to 14.</p>
        )}
        {validMeter && result?.estimate != null && (
          <div className="stat-pair">
            <div>
              <small>Signed error</small>
              <strong>{(result.estimate - Number(meter)).toFixed(2)}</strong>
            </div>
            <div>
              <small>Absolute error</small>
              <strong>
                {Math.abs(result.estimate - Number(meter)).toFixed(2)}
              </strong>
            </div>
          </div>
        )}
        <button
          className="button secondary full"
          disabled={!canRecord}
          onClick={record}
        >
          <Plus size={15} /> Add comparison
        </button>
        {records.length > 0 && (
          <div className="records">
            <div className="panel-heading">
              <h3>Session comparisons</h3>
              <button
                className="icon-button"
                aria-label="Clear comparisons"
                onClick={() => setRecords([])}
              >
                <Trash2 size={15} />
              </button>
            </div>
            {metrics && (
              <div className="stat-pair">
                <div>
                  <small>MAE · {realRecords.length} real pair(s)</small>
                  <strong>{metrics.mae.toFixed(2)}</strong>
                </div>
                <div>
                  <small>RMSE</small>
                  <strong>{metrics.rmse.toFixed(2)}</strong>
                </div>
              </div>
            )}
            <svg
              className="comparison-chart"
              viewBox="0 0 300 200"
              role="img"
              aria-label="Meter reference versus estimated pH; dashed line shows equality"
            >
              <line
                x1="35"
                y1="165"
                x2="275"
                y2="25"
                stroke="#a9bcb5"
                strokeDasharray="4 4"
              />
              <path d="M35 20V165H280" fill="none" stroke="#b8c8c1" />
              {[0, 7, 14].map((v) => (
                <g key={v}>
                  <text x={35 + (v / 14) * 240} y="181" textAnchor="middle">
                    {v}
                  </text>
                  <text x="25" y={169 - (v / 14) * 140} textAnchor="end">
                    {v}
                  </text>
                </g>
              ))}
              {records.map((r) => (
                <circle
                  key={r.id}
                  cx={35 + (r.reference / 14) * 240}
                  cy={165 - (r.estimate / 14) * 140}
                  r="4"
                  fill={r.synthetic ? "#be8b4a" : "#2b7562"}
                >
                  <title>
                    {r.synthetic ? "Synthetic" : "Real"}: reference{" "}
                    {r.reference}, estimate {r.estimate.toFixed(2)}
                  </title>
                </circle>
              ))}
              <text x="155" y="198" textAnchor="middle">
                Meter reference pH
              </text>
              <text
                x="8"
                y="95"
                transform="rotate(-90 8 95)"
                textAnchor="middle"
              >
                Estimated pH
              </text>
            </svg>
            <div className="record-table">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Estimate</th>
                    <th>Meter</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id}>
                      <td>{r.synthetic ? "Demo" : "Real"}</td>
                      <td>{r.estimate.toFixed(2)}</td>
                      <td>{r.reference.toFixed(2)}</td>
                      <td>{r.error.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="fine-print">
              Demo pairs are excluded from MAE/RMSE. These statistics describe
              your recorded pairs only, not validated accuracy.
            </p>
            <button
              className="button subtle full"
              onClick={() =>
                download(
                  "pocketsense-comparisons.csv",
                  toCsv(records),
                  "text/csv",
                )
              }
            >
              <ArrowDownToLine size={14} /> Export comparison CSV
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function Workspace({
  kind,
  notify,
}: {
  kind: "color" | "ph";
  notify: (t: string) => void;
}) {
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [sample, setSample] = useState<Sample | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  return (
    <section className="workspace-page section-enter">
      <div className="workspace-title">
        <div>
          <a href="#home" className="breadcrumb">
            Your pocket lab <ChevronRight size={13} />
          </a>
          <h1>
            {kind === "ph" ? "pH" : "Color"} Sense<span>.</span>
          </h1>
          <p>
            {kind === "ph"
              ? "A photograph. A reference. A little more understanding."
              : "Find the extraordinary in every shade."}
          </p>
        </div>
        <span className="local-pill">
          <LockKeyhole size={13} /> Processed on your device
        </span>
      </div>
      <div className="workspace-grid">
        <div className="workspace-image-column">
          <div className="panel-heading">
            <h2>
              <ScanLine size={18} />{" "}
              {kind === "ph" ? "Select your test strip" : "Start with an image"}
            </h2>
            <span className="step-label">01</span>
          </div>
          <ImageWorkspace
            kind={kind}
            onImage={setImage}
            onSelection={(next, selection) => {
              setSample(next);
              setRect(selection);
            }}
          />
          <div className="workflow-tip">
            <Info size={17} />
            <div>
              <strong>
                {kind === "ph"
                  ? "Better comparisons start with better photos."
                  : "Every pixel has a story."}
              </strong>
              <p>
                {kind === "ph"
                  ? "Use even lighting, avoid reflections, and include the compatible reference chart in the same photo. Select only the colored measurement area."
                  : "Tap a pixel for its exact RGB, or drag a region to explore mean and median color. Zoom in to make a precise selection."}
              </p>
            </div>
          </div>
          {sample?.warnings.length ? (
            <div className="quality-notes image-quality">
              <h4>Image quality notes</h4>
              {sample.warnings.map((w) => (
                <p key={w}>
                  <Info size={13} />
                  {w}
                </p>
              ))}
            </div>
          ) : null}
        </div>
        {kind === "color" ? (
          <ColorResults image={image} sample={sample} notify={notify} />
        ) : (
          <PhResults
            sample={sample}
            image={image}
            rect={rect}
            notify={notify}
          />
        )}
      </div>
    </section>
  );
}

export default function App() {
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [notice, setNotice] = useState("");
  const [offline, setOffline] = useState(false);
  const [connected, setConnected] = useState(navigator.onLine);
  const [offlineError, setOfflineError] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const change = () => {
      setRoute(routeFromHash());
      window.scrollTo({ top: 0, behavior: "instant" });
      mainRef.current?.focus();
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(id);
  }, [notice]);
  useEffect(() => {
    let active = true;
    const update = () => setConnected(navigator.onLine);
    const fail = () => setOfflineError(true);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    window.addEventListener("pocketsense:offline-error", fail);
    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      void navigator.serviceWorker.ready.then(() => {
        if (active) setOffline(true);
      });
    }
    return () => {
      active = false;
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("pocketsense:offline-error", fail);
    };
  }, []);
  return (
    <>
      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <nav aria-label="Main navigation">
            {(
              [
                { id: "home", text: "Overview" },
                { id: "ph", text: "pH Sense" },
                { id: "color", text: "Color Sense" },
                { id: "about", text: "About" },
              ] as const
            ).map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                aria-current={route === item.id ? "page" : undefined}
              >
                {item.text}
              </a>
            ))}
          </nav>
          <span
            className={`connection-status ${offline ? "is-ready" : ""}`}
            title={
              offline
                ? "Application files cached for offline use"
                : offlineError
                  ? "Offline cache failed. Reload online to retry."
                  : "Offline cache becomes available after loading the production app."
            }
          >
            <span />
            {!connected
              ? "Offline mode"
              : offline
                ? "Offline ready"
                : offlineError
                  ? "Cache unavailable"
                  : "Local & private"}
          </span>
        </div>
      </header>
      <main ref={mainRef} id="main-content" tabIndex={-1}>
        {route === "home" ? (
          <Home />
        ) : route === "about" ? (
          <About />
        ) : (
          <Workspace key={route} kind={route} notify={setNotice} />
        )}
      </main>
      <footer>
        <Brand small />
        <span>Your camera. Your color sensor. Your data.</span>
        <a
          href="https://github.com/Neutralizer-0618/PocketSense"
          target="_blank"
          rel="noreferrer"
        >
          <Github size={15} /> Made for the curious <ArrowRight size={14} />
        </a>
      </footer>
      {notice && (
        <div className="toast" role="status">
          <Check size={16} />
          {notice}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </>
  );
}
