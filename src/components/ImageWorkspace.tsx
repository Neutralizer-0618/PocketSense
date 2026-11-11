import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { sampleRegion, screenToImage } from "../lib/sampling";
import type { Rect, Sample } from "../lib/sampling";
import "./image-workspace.css";

export interface LoadedImage {
  data: ImageData;
  width: number;
  height: number;
  name: string;
  src: string;
  synthetic: boolean;
  originalWidth: number;
  originalHeight: number;
}

interface Props {
  kind: "color" | "ph";
  reference?: boolean;
  onImage: (image: LoadedImage | null) => void;
  onSelection: (sample: Sample | null, rect: Rect | null) => void;
}

type Mode = "pixel" | "region" | "pan";
type Drag = {
  x: number;
  y: number;
  rect: Rect | null;
  action: "draw" | "move" | "pan";
  scrollX: number;
  scrollY: number;
  clientX: number;
  clientY: number;
};

function Icon({
  name,
}: {
  name: "upload" | "camera" | "point" | "region" | "pan" | "image" | "close";
}) {
  const paths = {
    upload: (
      <>
        <path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5" />
      </>
    ),
    camera: (
      <>
        <path d="M4 7h4l2-3h4l2 3h4v13H4Z" />
        <circle cx="12" cy="13" r="4" />
      </>
    ),
    point: (
      <>
        <circle cx="12" cy="12" r="6" />
        <path d="M12 2v5m0 10v5M2 12h5m10 0h5" />
      </>
    ),
    region: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="1" strokeDasharray="3 3" />
        <path d="M8 12h8m-4-4v8" />
      </>
    ),
    pan: (
      <>
        <path d="M12 3v18M3 12h18M8 7l4-4 4 4M8 17l4 4 4-4M7 8l-4 4 4 4m10-8 4 4-4 4" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8" cy="8" r="2" />
        <path d="m3 17 5-5 4 4 4-6 5 7" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
  };
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function fitRect(rect: Rect, image: LoadedImage): Rect {
  const width = Math.max(1, Math.min(image.width, Math.round(rect.width)));
  const height = Math.max(1, Math.min(image.height, Math.round(rect.height)));
  return {
    width,
    height,
    x: Math.max(0, Math.min(image.width - width, Math.round(rect.x))),
    y: Math.max(0, Math.min(image.height - height, Math.round(rect.y))),
  };
}

/** Locally generated pixels for a reproducible demonstration, never experimental data. */
function demoImage(kind: Props["kind"]) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#e8ede8";
  ctx.fillRect(0, 0, 1200, 800);
  if (kind === "ph") {
    const bg = ctx.createLinearGradient(0, 0, 1200, 800);
    bg.addColorStop(0, "#e7eae2");
    bg.addColorStop(1, "#d4ded7");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1200, 800);
    ctx.save();
    ctx.translate(600, 390);
    ctx.rotate(-0.1);
    ctx.shadowColor = "#243c3625";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = "#fffef5";
    ctx.fillRect(-69, -280, 138, 570);
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "#95B975";
    ctx.fillRect(-57, 15, 114, 150);
    ctx.fillStyle = "#b4b8ad";
    ctx.font = "16px sans-serif";
    ctx.fillText("DEMO", -26, -225);
    ctx.restore();
    ctx.fillStyle = "#203f38";
    ctx.font = "500 22px sans-serif";
    ctx.fillText("REFERENCE COLORS", 100, 160);
    const colors = [
      "#D85159",
      "#EB9752",
      "#E1C758",
      "#95B975",
      "#52A79A",
      "#4E83AF",
      "#75639F",
    ];
    const levels = [2, 4, 6, 7, 8, 10, 12];
    colors.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(100, 195 + i * 60, 118, 40);
      ctx.fillStyle = "#36534a";
      ctx.font = "20px sans-serif";
      ctx.fillText(`pH ${levels[i]}`, 238, 223 + i * 60);
    });
    ctx.fillStyle = "#45675a";
    ctx.font = "500 34px sans-serif";
    ctx.fillText("Color, in context.", 780, 330);
    ctx.font = "20px sans-serif";
    ctx.fillText("Sample the green area.", 780, 370);
    ctx.fillText("Compare with a reference.", 780, 402);
  } else {
    const wall = ctx.createLinearGradient(0, 0, 0, 800);
    wall.addColorStop(0, "#eaf0e8");
    wall.addColorStop(1, "#c9d5c5");
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, 1200, 800);
    ctx.fillStyle = "#d5c7ad";
    ctx.fillRect(0, 560, 1200, 240);
    ctx.save();
    ctx.scale(1, 0.26);
    ctx.shadowColor = "#49625265";
    ctx.shadowBlur = 70;
    ctx.fillStyle = "#6d7c5c3f";
    ctx.beginPath();
    ctx.ellipse(610, 2200, 390, 80, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#f4efe1";
    ctx.fillRect(130, 530, 395, 270);
    ctx.fillStyle = "#faf7eb";
    ctx.beginPath();
    ctx.moveTo(130, 530);
    ctx.lineTo(242, 478);
    ctx.lineTo(630, 478);
    ctx.lineTo(525, 530);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ded8c9";
    ctx.beginPath();
    ctx.moveTo(525, 530);
    ctx.lineTo(630, 478);
    ctx.lineTo(630, 800);
    ctx.lineTo(525, 800);
    ctx.closePath();
    ctx.fill();
    const sphere = ctx.createRadialGradient(305, 292, 10, 391, 370, 175);
    sphere.addColorStop(0, "#f6bd86");
    sphere.addColorStop(0.55, "#e68d5b");
    sphere.addColorStop(1, "#b94e34");
    ctx.fillStyle = sphere;
    ctx.beginPath();
    ctx.arc(380, 360, 175, 0, Math.PI * 2);
    ctx.fill();
    const cylinder = ctx.createLinearGradient(690, 0, 965, 0);
    cylinder.addColorStop(0, "#1b6761");
    cylinder.addColorStop(0.55, "#2f8c7e");
    cylinder.addColorStop(1, "#14544f");
    ctx.fillStyle = cylinder;
    ctx.fillRect(690, 335, 275, 290);
    ctx.beginPath();
    ctx.ellipse(827.5, 625, 137.5, 45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#66ad97";
    ctx.beginPath();
    ctx.ellipse(827.5, 335, 137.5, 45, 0, 0, Math.PI * 2);
    ctx.fill();
    const small = ctx.createRadialGradient(635, 634, 5, 670, 670, 78);
    small.addColorStop(0, "#e4cf78");
    small.addColorStop(1, "#ad8b32");
    ctx.fillStyle = small;
    ctx.beginPath();
    ctx.arc(670, 670, 78, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#466357";
  ctx.font = "500 15px sans-serif";
  ctx.fillText("POCKETSENSE  /  SYNTHETIC DEMONSTRATION", 36, 42);
  return canvas;
}

export function ImageWorkspace({ kind, reference = false, onImage, onSelection }: Props) {
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [selection, setSelection] = useState<Rect | null>(null);
  const [mode, setMode] = useState<Mode>("region");
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const currentUrl = useRef("");
  const loadToken = useRef(0);
  const drag = useRef<Drag | null>(null);
  const selectionRef = useRef<Rect | null>(null);

  useEffect(
    () => () => {
      loadToken.current++;
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    },
    [],
  );
  useEffect(() => {
    if (loaded && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = loaded.width;
      canvas.height = loaded.height;
      canvas.getContext("2d")!.putImageData(loaded.data, 0, 0);
    }
  }, [loaded]);

  function select(rect: Rect, image = loaded, notify = true) {
    if (!image) return;
    const next = fitRect(rect, image);
    selectionRef.current = next;
    setSelection(next);
    if (notify) onSelection(sampleRegion(image.data, next), next);
  }

  function install(
    canvas: HTMLCanvasElement,
    name: string,
    src: string,
    initial?: Rect,
    provenance?: {
      synthetic: boolean;
      originalWidth: number;
      originalHeight: number;
    },
  ) {
    if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    currentUrl.current = src;
    drag.current = null;
    const image = {
      data: canvas
        .getContext("2d")!
        .getImageData(0, 0, canvas.width, canvas.height),
      width: canvas.width,
      height: canvas.height,
      name,
      src,
      synthetic: provenance?.synthetic ?? false,
      originalWidth: provenance?.originalWidth ?? canvas.width,
      originalHeight: provenance?.originalHeight ?? canvas.height,
    };
    setLoaded(image);
    setZoom(1);
    setMode("region");
    setError("");
    onImage(image);
    select(
      initial ?? {
        x: Math.floor(image.width * 0.4),
        y: Math.floor(image.height * 0.4),
        width: Math.max(1, Math.round(image.width * 0.2)),
        height: Math.max(1, Math.round(image.height * 0.2)),
      },
      image,
    );
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
      scrollRef.current.scrollTop = 0;
    }
  }

  async function loadFile(file?: File) {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) &&
      !(file.type === "" && /\.(jpe?g|png|webp)$/i.test(file.name))
    ) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 40 * 1024 * 1024) {
      setError(
        "This image is larger than 40 MB. Please choose a smaller image.",
      );
      return;
    }
    const token = ++loadToken.current;
    setBusy(true);
    setError("");
    setNotice("");
    const src = URL.createObjectURL(file);
    let bitmap: ImageBitmap | null = null;
    try {
      let image: CanvasImageSource;
      let width: number;
      let height: number;
      try {
        bitmap = await createImageBitmap(file, {
          imageOrientation: "from-image",
        });
        image = bitmap;
        width = bitmap.width;
        height = bitmap.height;
      } catch {
        const element = new Image();
        element.src = src;
        await element.decode();
        image = element;
        width = element.naturalWidth;
        height = element.naturalHeight;
      }
      if (token !== loadToken.current) {
        URL.revokeObjectURL(src);
        return;
      }
      if (!width || !height) throw new Error("Empty image");
      const scale = Math.min(
        1,
        5000 / Math.max(width, height),
        Math.sqrt(16000000 / (width * height)),
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      install(canvas, file.name, src, undefined, {
        synthetic: false,
        originalWidth: width,
        originalHeight: height,
      });
      setNotice(
        scale < 1
          ? `Resized from ${width} × ${height} to ${canvas.width} × ${canvas.height} for browser memory. Coordinates and color values refer to the resized image. Transparent pixels are composited on white.`
          : "Original image resolution. Transparent pixels are composited on white.",
      );
    } catch {
      URL.revokeObjectURL(src);
      if (token === loadToken.current)
        setError(
          "This image could not be decoded. Try another JPG, PNG, or WebP file.",
        );
    } finally {
      bitmap?.close();
      if (token === loadToken.current) setBusy(false);
    }
  }

  async function loadDemo() {
    const token = ++loadToken.current;
    const canvas = demoImage(kind);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob || token !== loadToken.current) return;
    install(
      canvas,
      kind === "ph"
        ? "Synthetic pH strip · demonstration"
        : "Color study · synthetic demonstration",
      URL.createObjectURL(blob),
      kind === "ph"
        ? { x: 590, y: 430, width: 55, height: 75 }
        : { x: 750, y: 420, width: 100, height: 100 },
      {
        synthetic: true,
        originalWidth: canvas.width,
        originalHeight: canvas.height,
      },
    );
    setNotice(
      "Synthetic demonstration pixels, generated on your device. This is not a real photograph or experimental validation.",
    );
    setBusy(false);
  }

  function clear() {
    loadToken.current++;
    drag.current = null;
    if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    currentUrl.current = "";
    selectionRef.current = null;
    setLoaded(null);
    setSelection(null);
    setNotice("");
    setError("");
    setBusy(false);
    setZoom(1);
    onImage(null);
    onSelection(null, null);
  }

  function coords(event: PointerEvent<HTMLCanvasElement>) {
    return screenToImage(
      event.clientX,
      event.clientY,
      event.currentTarget.getBoundingClientRect(),
      loaded!.width,
      loaded!.height,
    );
  }

  function pointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (!loaded || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    // Focus must not scroll the canvas between the pointer event and coordinate mapping.
    const point = coords(event);
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    const inside =
      selection &&
      point.x >= selection.x &&
      point.x < selection.x + selection.width &&
      point.y >= selection.y &&
      point.y < selection.y + selection.height;
    drag.current = {
      ...point,
      rect: selection,
      action:
        mode === "pan" ? "pan" : mode === "region" && inside ? "move" : "draw",
      scrollX: scrollRef.current?.scrollLeft ?? 0,
      scrollY: scrollRef.current?.scrollTop ?? 0,
      clientX: event.clientX,
      clientY: event.clientY,
    };
    if (mode === "pixel") select({ ...point, width: 1, height: 1 });
    else if (mode === "region" && !inside)
      select({ ...point, width: 1, height: 1 });
  }

  function pointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!loaded || !drag.current || !event.isPrimary) return;
    const start = drag.current;
    if (start.action === "pan" && scrollRef.current) {
      scrollRef.current.scrollLeft =
        start.scrollX - (event.clientX - start.clientX);
      scrollRef.current.scrollTop =
        start.scrollY - (event.clientY - start.clientY);
      return;
    }
    const point = coords(event);
    if (mode === "pixel") select({ ...point, width: 1, height: 1 });
    else if (start.action === "move" && start.rect)
      select(
        {
          ...start.rect,
          x: start.rect.x + point.x - start.x,
          y: start.rect.y + point.y - start.y,
        },
        loaded,
        false,
      );
    else
      select(
        {
          x: Math.min(start.x, point.x),
          y: Math.min(start.y, point.y),
          width: Math.abs(point.x - start.x) + 1,
          height: Math.abs(point.y - start.y) + 1,
        },
        loaded,
        false,
      );
  }

  function finishDrag() {
    if (!drag.current) return;
    const needsSample = drag.current.action !== "pan";
    drag.current = null;
    if (needsSample && selectionRef.current && loaded)
      select(selectionRef.current);
  }

  function keyboard(event: KeyboardEvent<HTMLCanvasElement>) {
    if (!selection || !loaded) return;
    const directions: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const delta = directions[event.key];
    if (!delta) return;
    event.preventDefault();
    const step = event.shiftKey ? 10 : 1;
    select({
      ...selection,
      x: selection.x + delta[0] * step,
      y: selection.y + delta[1] * step,
    });
  }

  const selectionStyle: CSSProperties | undefined =
    loaded && selection
      ? {
          left: `${(selection.x / loaded.width) * 100}%`,
          top: `${(selection.y / loaded.height) * 100}%`,
          width: `${(selection.width / loaded.width) * 100}%`,
          height: `${(selection.height / loaded.height) * 100}%`,
        }
      : undefined;

  return (
    <section className="iw-workspace" aria-label={reference ? "Reference image sampling workspace" : "Image sampling workspace"}>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="iw-file"
        aria-label={reference ? "Upload reference image" : "Upload image"}
        onChange={(event) => {
          void loadFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="iw-file"
        aria-label="Capture image"
        onChange={(event) => {
          void loadFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <div className="iw-heading">
        <div>
          <span className="iw-eyebrow">{reference ? "REFERENCE CHART" : "01 / YOUR IMAGE"}</span>
          <h2>{reference ? "Sample your reference chart." : loaded ? "A closer look." : "Start with a photograph."}</h2>
        </div>
        <span className="iw-local">
          <span /> On-device
        </span>
      </div>
      <div
        className={`iw-dropzone ${dragOver ? "iw-drag-over" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(event) => {
          if (
            !(event.relatedTarget instanceof Node) ||
            !event.currentTarget.contains(event.relatedTarget)
          )
            setDragOver(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          void loadFile(event.dataTransfer.files[0]);
        }}
      >
        {loaded ? (
          <>
            <div className="iw-toolbar" aria-label="Selection tools">
              <div className="iw-tool-group">
                {(["pixel", "region", "pan"] as const).map((tool) => (
                  <button
                    key={tool}
                    className={mode === tool ? "iw-tool iw-active" : "iw-tool"}
                    aria-pressed={mode === tool}
                    onClick={() => {
                      setMode(tool);
                      if (tool === "pixel" && selection)
                        select({ ...selection, width: 1, height: 1 });
                    }}
                    title={
                      tool === "pixel"
                        ? "Sample a single pixel"
                        : tool === "region"
                          ? "Draw or move a rectangular selection"
                          : "Drag to pan the zoomed image"
                    }
                  >
                    <Icon name={tool === "pixel" ? "point" : tool} />
                    <span>
                      {tool === "pixel"
                        ? "Pixel"
                        : tool === "region"
                          ? "Region"
                          : "Pan"}
                    </span>
                  </button>
                ))}
              </div>
              <div className="iw-zoom">
                <button
                  aria-label="Zoom out"
                  disabled={zoom <= 1}
                  onClick={() => setZoom((value) => Math.max(1, value - 0.5))}
                >
                  −
                </button>
                <button
                  aria-label="Reset zoom"
                  title="Reset zoom"
                  onClick={() => setZoom(1)}
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  aria-label="Zoom in"
                  disabled={zoom >= 4}
                  onClick={() => setZoom((value) => Math.min(4, value + 0.5))}
                >
                  +
                </button>
              </div>
            </div>
            <div ref={scrollRef} className={`iw-viewport iw-mode-${mode}`}>
              <div
                className="iw-image-wrap"
                style={{ width: `${zoom * 100}%` }}
              >
                <canvas
                  ref={canvasRef}
                  className="iw-canvas"
                  tabIndex={0}
                  aria-label="Image selection canvas. Use arrow keys to move the selection; hold Shift for ten pixels. Use the fields below to resize it."
                  onPointerDown={pointerDown}
                  onPointerMove={pointerMove}
                  onPointerUp={finishDrag}
                  onPointerCancel={finishDrag}
                  onLostPointerCapture={finishDrag}
                  onKeyDown={keyboard}
                />
                {selection && (
                  <div
                    className={`iw-selection ${selection.width === 1 && selection.height === 1 ? "iw-pixel-selection" : ""}`}
                    style={selectionStyle}
                  >
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                )}
              </div>
            </div>
            <div className="iw-image-caption">
              <span title={loaded.name}>{loaded.name}</span>
              <span>
                {loaded.width.toLocaleString()} ×{" "}
                {loaded.height.toLocaleString()} px
              </span>
            </div>
          </>
        ) : (
          <div className="iw-empty">
            <div className="iw-upload-symbol">
              <Icon name="image" />
            </div>
            <h3>Your next discovery starts here.</h3>
            <p>
              Drop a photo, choose a file, or use your camera.
              <br />
              Every pixel stays on your device.
            </p>
            <div className="iw-input-actions">
              <button
                className="iw-primary"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
              >
                <Icon name="upload" />
                {busy ? "Opening image…" : "Choose a photo"}
              </button>
              <button
                className="iw-secondary"
                onClick={() => cameraRef.current?.click()}
                disabled={busy}
              >
                <Icon name="camera" />
                Use camera
              </button>
            </div>
            <span className="iw-format">JPG, PNG, WEBP · UP TO 40 MB</span>
          </div>
        )}
      </div>
      {error && (
        <div className="iw-error" role="alert">
          {error}
        </div>
      )}
      {loaded && selection && (
        <>
          <div className="iw-selection-row">
            <p>
              {mode === "pan"
                ? "Drag to pan. Use + to zoom into details."
                : mode === "pixel"
                  ? "Tap anywhere to read a single pixel."
                  : "Drag to select. Drag inside the box to move it."}
            </p>
            <span>
              {(selection.width * selection.height).toLocaleString()} pixels
            </span>
          </div>
          <fieldset className="iw-coordinates">
            <legend>Selection in image pixels</legend>
            {(["x", "y", "width", "height"] as const).map((field) => (
              <label key={field}>
                <span>
                  {field === "width"
                    ? "Width"
                    : field === "height"
                      ? "Height"
                      : field.toUpperCase()}
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  aria-label={`Selection ${field}`}
                  value={selection[field]}
                  min={field === "x" || field === "y" ? 0 : 1}
                  max={
                    field === "x"
                      ? loaded.width - selection.width
                      : field === "y"
                        ? loaded.height - selection.height
                        : field === "width"
                          ? loaded.width
                          : loaded.height
                  }
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isFinite(value)) {
                      select({ ...selection, [field]: value });
                      if (
                        (field === "width" || field === "height") &&
                        value > 1
                      )
                        setMode("region");
                    }
                  }}
                />
              </label>
            ))}
          </fieldset>
          <div className="iw-loaded-actions">
            <button
              className="iw-text-button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              <Icon name="upload" />
              {busy ? "Opening…" : "Replace image"}
            </button>
            <button
              className="iw-text-button"
              onClick={() => cameraRef.current?.click()}
              disabled={busy}
            >
              <Icon name="camera" />
              Camera
            </button>
            <button className="iw-text-button iw-remove" onClick={clear}>
              <Icon name="close" />
              Remove
            </button>
          </div>
          {notice && <p className="iw-notice">{notice}</p>}
        </>
      )}
      <div className="iw-demo-row">
        <span>
          {loaded ? "Try a different starting point." : "Just exploring?"}
        </span>
        <button
          onClick={() => {
            void loadDemo();
          }}
          disabled={busy}
        >
          Load synthetic {kind === "ph" ? "pH" : "color"} demo{" "}
          <span aria-hidden="true">↗</span>
        </button>
      </div>
    </section>
  );
}
