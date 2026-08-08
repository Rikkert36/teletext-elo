/**
 * Generates the silhouette mask for one player, or for the whole avatar directory.
 *
 * Called by the API as a child process right after an avatar upload (see
 * SilhouetteService), and runnable by hand for the initial backfill or to repair a
 * failed run. Same code path either way, so there is nothing that only ever runs once.
 *
 *   node make-silhouettes.mjs --avatars <dir> --out <dir> --id <playerId>
 *   node make-silhouettes.mjs --avatars <dir> --out <dir> --all [--force]
 *
 * A mask is skipped when it is newer than its avatar, so --all is cheap to repeat.
 *
 * How it works: u2netp is a salient-object network. It has no notion of faces — it
 * predicts which pixels belong to the dominant subject, which is exactly the thing a
 * luminance threshold could not know. Two passes: the first locates the subject in the
 * full photo, the second runs again on a 5:7 frame fitted around it, so a full-body
 * photo gets framed like a portrait instead of yielding a tiny figure.
 *
 * Output is a PNG whose alpha channel carries the mask and whose RGB is flat white, so
 * the front end can use it directly as a CSS mask over a block of ink.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ort from "onnxruntime-node";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODEL = path.join(HERE, "u2netp.onnx");

const N = 320;                        // u2net input size
const CARD_W = 512, CARD_H = 716;     // 5:7, the aspect the mask is stored at
const RATIO = 5 / 7;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

/** Below this the pixel does not count towards the subject's bounding box. */
const FRAME_CUTOFF = 0.25;
/** Breathing room around the subject, as a share of its longest side. */
const FRAME_MARGIN = 0.10;
/**
 * Only re-frame when the fitted frame is meaningfully tighter than the default crop.
 * Head-and-shoulders photos are the rule, and they should be left alone.
 */
const FRAME_GAIN = 0.85;
/**
 * Binarisation cutoff for the connected-component cleanup. Measured, not guessed: at
 * 0.50 a soft mask like Mark's shatters into 19 pieces and "keep the largest" throws
 * half the subject away, while at 0.25 it stays a single piece.
 */
const SOLID = 64;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) { args[key] = next; i++; }
    else args[key] = true;
  }
  return args;
}

/**
 * Decode on the magic bytes rather than the extension or the content type.
 *
 * Avatars are stored with no extension at all, and the API reports image/jpeg for every
 * one of them while most are in fact PNG. Trusting either would fail on the majority of
 * the pool with "SOI not found".
 */
function decode(buffer) {
  if (buffer[0] === 0x89 && buffer[1] === 0x50) {
    const png = PNG.sync.read(buffer);
    return { data: png.data, width: png.width, height: png.height };
  }
  return jpeg.decode(buffer, { useTArray: true, maxMemoryUsageInMB: 2048 });
}

/** Bilinear resample of an RGBA buffer. */
function resample(src, sw, sh, dw, dh) {
  const out = Buffer.alloc(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    const sy = Math.min(sh - 1, (y + 0.5) * sh / dh - 0.5);
    const y0 = Math.max(0, Math.floor(sy)), y1 = Math.min(sh - 1, y0 + 1), fy = sy - y0;
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(sw - 1, (x + 0.5) * sw / dw - 0.5);
      const x0 = Math.max(0, Math.floor(sx)), x1 = Math.min(sw - 1, x0 + 1), fx = sx - x0;
      const o = (y * dw + x) * 4;
      for (let c = 0; c < 4; c++) {
        const a = src[(y0 * sw + x0) * 4 + c] * (1 - fx) + src[(y0 * sw + x1) * 4 + c] * fx;
        const b = src[(y1 * sw + x0) * 4 + c] * (1 - fx) + src[(y1 * sw + x1) * 4 + c] * fx;
        out[o + c] = Math.round(a * (1 - fy) + b * fy);
      }
    }
  }
  return out;
}

/**
 * Crop a rectangle and resample it in a single step.
 *
 * One step matters. Going via the card size first and only then down to 320 resamples
 * twice with a filter that undersamples beyond a factor of two, and on a dark
 * low-contrast photo that visibly changes what the model sees.
 */
function crop(src, sw, sh, rect, dw, dh) {
  const patch = Buffer.alloc(rect.w * rect.h * 4);
  for (let y = 0; y < rect.h; y++) {
    const sy = Math.min(sh - 1, Math.max(0, rect.y + y));
    const sx = Math.min(sw - rect.w, Math.max(0, rect.x));
    src.copy(patch, y * rect.w * 4, (sy * sw + sx) * 4, (sy * sw + sx + rect.w) * 4);
  }
  return resample(patch, rect.w, rect.h, dw, dh);
}

/** The card's own crop: cover in 5:7, object-position center 22%. */
function defaultFrame(sw, sh) {
  const aspect = sw / sh;
  let w, h, x, y;
  if (aspect > RATIO) { h = sh; w = sh * RATIO; y = 0; x = (sw - w) * 0.5; }
  else { w = sw; h = sw / RATIO; x = 0; y = (sh - h) * 0.22; }
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

/** Run the model once over a given frame; returns the raw mask at N×N, 0..1. */
async function infer(session, src, sw, sh, frame) {
  const small = crop(src, sw, sh, frame, N, N);

  // Divide by the brightest pixel rather than by 255, as rembg does: it lifts a dark
  // photo before normalisation.
  let max = 0;
  for (let i = 0; i < N * N; i++) {
    for (let c = 0; c < 3; c++) if (small[i * 4 + c] > max) max = small[i * 4 + c];
  }
  if (!max) max = 255;

  const input = new Float32Array(3 * N * N);
  for (let i = 0; i < N * N; i++) {
    for (let c = 0; c < 3; c++) input[c * N * N + i] = (small[i * 4 + c] / max - MEAN[c]) / STD[c];
  }

  const result = await session.run({ [session.inputNames[0]]: new ort.Tensor("float32", input, [1, 3, N, N]) });
  const raw = result[session.outputNames[0]].data;

  let lo = Infinity, hi = -Infinity;
  for (const v of raw) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const span = hi - lo || 1;

  const mask = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) mask[i] = (raw[i] - lo) / span;
  return mask;
}

/**
 * A 5:7 frame around the subject, in coordinates of the source frame.
 *
 * Vertically the slack is split one third above and two thirds below: the head belongs
 * high on a card, and the bottom runs into the name plate's fade anyway.
 */
function frameAroundSubject(mask, source) {
  let x0 = N, y0 = N, x1 = -1, y1 = -1;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (mask[y * N + x] < FRAME_CUTOFF) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return null;

  const sx = source.w / N, sy = source.h / N;
  let bx = source.x + x0 * sx, by = source.y + y0 * sy;
  let bw = (x1 - x0 + 1) * sx, bh = (y1 - y0 + 1) * sy;

  const margin = Math.max(bw, bh) * FRAME_MARGIN;
  bx -= margin; by -= margin; bw += margin * 2; bh += margin * 2;

  if (bw / bh > RATIO) {
    const nh = bw / RATIO;
    by -= (nh - bh) / 3;
    bh = nh;
  } else {
    const nw = bh * RATIO;
    bx -= (nw - bw) / 2;
    bw = nw;
  }
  return { x: Math.round(bx), y: Math.round(by), w: Math.round(bw), h: Math.round(bh) };
}

/** Push a frame inside the image, shrinking it if it does not fit. */
function clampFrame(frame, sw, sh) {
  let { x, y, w, h } = frame;
  if (w > sw) { const f = sw / w; w = sw; h = Math.round(h * f); }
  if (h > sh) { const f = sh / h; h = sh; w = Math.round(w * f); }
  x = Math.min(sw - w, Math.max(0, x));
  y = Math.min(sh - h, Math.max(0, y));
  return { x, y, w, h };
}

/** Connected components of the binarised mask, largest first. */
function components(mask, w, h) {
  const solid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) solid[i] = mask[i] > SOLID ? 1 : 0;

  const label = new Int32Array(w * h);
  const stack = new Int32Array(w * h);
  const found = [];
  let current = 0;

  for (let i = 0; i < w * h; i++) {
    if (!solid[i] || label[i]) continue;
    current++;
    let top = 0, count = 0;
    stack[top++] = i;
    label[i] = current;
    while (top) {
      const p = stack[--top];
      count++;
      const px = p % w, py = (p / w) | 0;
      if (px > 0 && solid[p - 1] && !label[p - 1]) { label[p - 1] = current; stack[top++] = p - 1; }
      if (px < w - 1 && solid[p + 1] && !label[p + 1]) { label[p + 1] = current; stack[top++] = p + 1; }
      if (py > 0 && solid[p - w] && !label[p - w]) { label[p - w] = current; stack[top++] = p - w; }
      if (py < h - 1 && solid[p + w] && !label[p + w]) { label[p + w] = current; stack[top++] = p + w; }
    }
    found.push({ id: current, count });
  }

  found.sort((a, b) => b.count - a.count);
  const area = found.reduce((sum, c) => sum + c.count, 0);
  return {
    label,
    main: found[0]?.id ?? 0,
    count: found.length,
    area: area / (w * h),
    dominance: area ? found[0].count / area : 0
  };
}

/**
 * Keep only the largest component.
 *
 * u2netp routinely leaves specks behind — a bright patch above a head, a shoulder of
 * someone standing just in frame. One person is one piece. This is also what removes the
 * bystander next to Daan Verkade, with no face detector involved.
 *
 * The soft edge of the mask lies outside the binarised shape, so the kept region is
 * grown a few pixels first; otherwise the antialiasing gets cut off and the outline
 * comes back jagged.
 */
function keepLargest(mask, w, h, cc) {
  if (!cc.main) return;
  const keep = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) if (cc.label[i] === cc.main) keep[i] = 1;

  for (let round = 0; round < 3; round++) {
    const previous = keep.slice();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (previous[i]) continue;
        if ((x > 0 && previous[i - 1]) || (x < w - 1 && previous[i + 1]) ||
            (y > 0 && previous[i - w]) || (y < h - 1 && previous[i + w])) keep[i] = 1;
      }
    }
  }

  for (let i = 0; i < w * h; i++) if (!keep[i]) mask[i] = 0;
}

async function generate(session, avatarFile, outFile) {
  const source = decode(fs.readFileSync(avatarFile));
  const src = Buffer.from(source.data);
  const whole = { x: 0, y: 0, w: source.width, h: source.height };

  // Pass one: the full photo, to find where the subject is.
  const located = await infer(session, src, source.width, source.height, whole);

  const standard = defaultFrame(source.width, source.height);
  const fitted = frameAroundSubject(located, whole);

  let frame = standard, reframed = false;
  if (fitted) {
    const clamped = clampFrame(fitted, source.width, source.height);
    if (clamped.w * clamped.h < FRAME_GAIN * standard.w * standard.h) {
      frame = clamped;
      reframed = true;
    }
  }

  // Pass two: the chosen frame, where the subject now fills the input.
  const mask = await infer(session, src, source.width, source.height, frame);

  const smallRgba = Buffer.alloc(N * N * 4);
  for (let i = 0; i < N * N; i++) {
    const v = Math.round(mask[i] * 255);
    smallRgba[i * 4] = smallRgba[i * 4 + 1] = smallRgba[i * 4 + 2] = v;
    smallRgba[i * 4 + 3] = 255;
  }
  const scaled = resample(smallRgba, N, N, CARD_W, CARD_H);
  const grey = new Uint8Array(CARD_W * CARD_H);
  for (let i = 0; i < CARD_W * CARD_H; i++) grey[i] = scaled[i * 4];

  keepLargest(grey, CARD_W, CARD_H, components(grey, CARD_W, CARD_H));
  const final = components(grey, CARD_W, CARD_H);

  const png = new PNG({ width: CARD_W, height: CARD_H });
  for (let i = 0; i < CARD_W * CARD_H; i++) {
    png.data[i * 4] = png.data[i * 4 + 1] = png.data[i * 4 + 2] = 255;
    png.data[i * 4 + 3] = grey[i];
  }
  fs.writeFileSync(outFile, PNG.sync.write(png));

  return { reframed, area: final.area, dominance: final.dominance };
}

/** A mask is stale when it is missing or older than the avatar it came from. */
function isStale(avatarFile, outFile) {
  if (!fs.existsSync(outFile)) return true;
  return fs.statSync(avatarFile).mtimeMs > fs.statSync(outFile).mtimeMs;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const avatarDir = args.avatars;
  const outDir = args.out;

  if (!avatarDir || !outDir) {
    console.error("usage: make-silhouettes.mjs --avatars <dir> --out <dir> (--id <playerId> | --all) [--force]");
    process.exit(2);
  }
  if (!fs.existsSync(MODEL)) {
    console.error(`model not found at ${MODEL}\n` +
      "fetch it once with:\n" +
      "  curl -L -o u2netp.onnx https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx");
    process.exit(3);
  }

  fs.mkdirSync(outDir, { recursive: true });

  // Avatars are stored as the bare player id with no extension, so anything that is a
  // file and is not the fallback image is a candidate.
  const ids = args.id
    ? [String(args.id)]
    : fs.readdirSync(avatarDir).filter((name) => {
        if (name === "empty-avatar.jpg") return false;
        return fs.statSync(path.join(avatarDir, name)).isFile() && !name.includes(".");
      });

  if (!args.id && !args.all) {
    console.error("pass --id <playerId> for one player, or --all for the whole directory");
    process.exit(2);
  }

  const session = await ort.InferenceSession.create(MODEL);
  let written = 0, skipped = 0, failed = 0;

  for (const id of ids) {
    const avatarFile = path.join(avatarDir, id);
    const outFile = path.join(outDir, id + ".png");

    if (!fs.existsSync(avatarFile)) {
      console.error(`no avatar for ${id}`);
      failed++;
      continue;
    }
    if (!args.force && !isStale(avatarFile, outFile)) {
      skipped++;
      continue;
    }

    try {
      const stats = await generate(session, avatarFile, outFile);
      written++;
      console.log(`${id} area=${stats.area.toFixed(2)} dominance=${stats.dominance.toFixed(2)}` +
        (stats.reframed ? " reframed" : ""));
    } catch (error) {
      failed++;
      console.error(`${id} failed: ${error.message}`);
    }
  }

  console.log(`written ${written}, skipped ${skipped}, failed ${failed}`);
  // A failure here must not fail an avatar upload, but a manual run should still tell
  // the truth about its exit code.
  process.exit(failed && !written ? 1 : 0);
}

await main();
