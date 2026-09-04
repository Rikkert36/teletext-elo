/**
 * Generates the silhouette mask for one player, or for the whole avatar directory —
 * and the resized copies of the photo that the front end actually draws.
 *
 * Called by the API as a child process right after an avatar upload (see
 * SilhouetteService), and runnable by hand for the initial backfill or to repair a
 * failed run. Same code path either way, so there is nothing that only ever runs once.
 *
 *   node make-silhouettes.mjs --avatars <dir> --out <dir> --id <playerId>
 *   node make-silhouettes.mjs --avatars <dir> --out <dir> --all [--force]
 *   ... --variant 512:<dir> --variant 1024:<dir>     also write resized copies
 *   ... --variants-only                              skip the mask, and the model with it
 *
 * An output is skipped when it is newer than its avatar, so --all is cheap to repeat.
 *
 * **Why the resized copies are made here.** An avatar is an original camera upload —
 * the pool averages 1.6 MB and the largest are 5000×5000 — and the album mounts every
 * page of the book at once, so opening it downloaded ~90 MB and decoded a quarter of a
 * gigapixel to draw cards 145px wide. The photo has to be reduced *somewhere*, and this
 * process is where: it already decodes the avatar to read it for the mask, it already
 * runs on exactly the event that invalidates a copy, and it is already outside the API
 * process — which is the whole argument SilhouetteService makes for existing. Resizing
 * in the API would put a native image decoder in w3wp, locked during a deploy, for the
 * sake of something that runs a few times a year.
 *
 * A copy is therefore *not* guaranteed to be there: the endpoint falls back to the
 * original when one is missing, which is the pre-existing behaviour rather than a
 * failure. It also means new widths are backfilled by running this, not by deploying.
 *
 * How it works: u2netp is a salient-object network. It has no notion of faces — it
 * predicts which pixels belong to the dominant subject, which is exactly the thing a
 * luminance threshold could not know. It runs over the full photo first, and again on a
 * 5:7 frame fitted around the subject when there is one tight enough to be worth it, so
 * a full-body photo gives the model far more than a handful of pixels to work with. Each
 * frame is read twice, mirrored the second time, and the readings are combined by taking
 * the higher of the two wherever the lower one agrees there is anything there. The result
 * is then projected back into the card's own crop, which is the only frame the front end
 * can line a mask up with.
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
/**
 * Quality of a resized copy. High for a JPEG, because a card's photo is a face at a
 * couple of hundred pixels and the ringing shows: at 512px the difference between 85
 * and the usual 75 is ~15 kB on a file that started at 1.6 MB, which is no difference
 * at all next to what this is here to save.
 */
const JPEG_QUALITY = 85;
const RATIO = 5 / 7;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

/** Below this the pixel does not count towards the subject's bounding box. */
const FRAME_CUTOFF = 0.25;
/** Breathing room around the subject, as a share of its longest side. */
const FRAME_MARGIN = 0.10;
/**
 * Only re-run on a fitted frame when it is meaningfully tighter than the default crop.
 * Head-and-shoulders photos are the rule, and a second pass buys them nothing.
 *
 * Two of the 71 avatars in the pool clear this. That is the point: for the other 69 the
 * whole photo is the best view there is, and re-running on anything narrower can only
 * take context away — see `generate`.
 */
const FRAME_GAIN = 0.85;
/**
 * Binarisation cutoff for the connected-component cleanup. Measured, not guessed: it was
 * chosen when a soft mask like Mark's shattered into 19 pieces at 0.50 and "keep the
 * largest" threw half the subject away, while at 0.25 it stayed a single piece.
 *
 * Reading every frame both ways has since taken most of that softness out — over the pool
 * no mask now loses as much as 1% of itself at 0.50 either. Left at 0.25 anyway: nothing
 * argues for raising it, and a low cutoff is what keeps the antialiased edge outside the
 * binarised shape, which is the assumption `keepLargest` grows back from.
 */
const SOLID = 64;
/**
 * How much the weaker of the two readings has to see before the stronger one is taken at
 * face value — see `combine`.
 *
 * Swept over the pool. It only has to clear the noise the losing reading leaves behind,
 * and going higher buys nothing: 0.04 and 0.10 both remove Luc's wedge completely, while
 * 0.10 takes three times as much off Daan Verkade's shirt, whose two readings disagree
 * softly over a large area and come out moth-eaten rather than trimmed. Only three masks
 * in the pool move by more than 2% of the card at 0.04, and they are the three this was
 * looked at on.
 */
const AGREEMENT = 0.04;

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
 * The `--variant <width>:<dir>` pairs, which `parseArgs` cannot carry because it keeps
 * one value per flag and there is one of these per width.
 *
 * Split on the **first** colon: the directory is an absolute Windows path and brings a
 * drive letter's colon with it.
 *
 * The widths are not a list this script owns. AvatarStorage decides where every file
 * belonging to a player lives and what sizes exist, for the same reason it was written
 * in the first place, and passes both in.
 */
function parseVariants(argv) {
  const variants = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] !== "--variant") continue;
    const value = argv[i + 1];
    const split = value === undefined ? -1 : value.indexOf(":");
    if (split <= 0) {
      console.error(`--variant wants <width>:<dir>, got ${value ?? "nothing"}`);
      process.exit(2);
    }
    const width = Number(value.slice(0, split));
    if (!Number.isInteger(width) || width < 1) {
      console.error(`--variant width is not a whole number: ${value.slice(0, split)}`);
      process.exit(2);
    }
    variants.push({ width, dir: value.slice(split + 1) });
  }
  return variants;
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
    return {
      data: png.data, width: png.width, height: png.height,
      transparent: hasAlpha(png.data), orientation: 1
    };
  }
  // A JPEG cannot carry alpha, so the copies of one are always safe to encode as JPEG.
  return {
    ...jpeg.decode(buffer, { useTArray: true, maxMemoryUsageInMB: 2048 }),
    transparent: false,
    orientation: exifOrientation(buffer)
  };
}

/** Whether any pixel is less than fully opaque — see `writeVariants`. */
function hasAlpha(data) {
  for (let i = 3; i < data.length; i += 4) if (data[i] !== 255) return true;
  return false;
}

/**
 * The EXIF orientation of a JPEG, 1 when there is none.
 *
 * **Read here because a copy has to be rotated where the original was not.** A browser
 * applies this tag when it draws an `<img>`, and `jpeg-js` hands over the stored pixels
 * without it — so three avatars in the pool are stored on their side and displayed
 * upright. Re-encoding those without baking the rotation in produces a copy that is
 * sideways *on the card*, which is the one way this whole change could be visible.
 *
 * A hand-rolled reader rather than a dependency: it is one tag in the first IFD, and the
 * tool's other two packages are its decoders.
 */
function exifOrientation(buffer) {
  let i = 2;
  while (i < buffer.length - 3) {
    if (buffer[i] !== 0xff) { i++; continue; }
    const marker = buffer[i + 1];
    // Markers that carry no length: padding, restarts, and the two delimiters.
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    // The scan, past which there are no more headers worth walking.
    if (marker === 0xda) break;

    const length = buffer.readUInt16BE(i + 2);
    if (marker === 0xe1 && buffer.slice(i + 4, i + 8).toString("latin1") === "Exif") {
      const tiff = i + 10;
      const little = buffer.slice(tiff, tiff + 2).toString("latin1") === "II";
      const u16 = (at) => (little ? buffer.readUInt16LE(at) : buffer.readUInt16BE(at));
      const u32 = (at) => (little ? buffer.readUInt32LE(at) : buffer.readUInt32BE(at));

      const ifd = tiff + u32(tiff + 4);
      const entries = u16(ifd);
      for (let e = 0; e < entries; e++) {
        const entry = ifd + 2 + e * 12;
        if (u16(entry) === 0x0112) {
          const value = u16(entry + 8);
          return value >= 1 && value <= 8 ? value : 1;
        }
      }
      return 1;
    }
    i += 2 + length;
  }
  return 1;
}

/**
 * Bakes an EXIF orientation into the pixels, so the copy needs no tag of its own.
 *
 * All eight, not only the rotate-90 that the pool happens to contain: the mirrored four
 * are two lines each here and a silently mirrored face later.
 */
function applyOrientation(src, w, h, orientation) {
  if (orientation === 1) return { data: src, w, h };

  // 5 through 8 exchange the axes, so the copy is the other way up.
  const swaps = orientation >= 5;
  const ow = swaps ? h : w, oh = swaps ? w : h;
  const out = Buffer.alloc(ow * oh * 4);

  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      let sx, sy;
      switch (orientation) {
        case 2: sx = w - 1 - x; sy = y; break;              // mirrored
        case 3: sx = w - 1 - x; sy = h - 1 - y; break;      // 180°
        case 4: sx = x; sy = h - 1 - y; break;              // mirrored, 180°
        case 5: sx = y; sy = x; break;                      // mirrored, 90° anticlockwise
        case 6: sx = y; sy = h - 1 - x; break;              // 90° clockwise
        case 7: sx = w - 1 - y; sy = h - 1 - x; break;      // mirrored, 90° clockwise
        default: sx = w - 1 - y; sy = x; break;             // 8: 90° anticlockwise
      }
      src.copy(out, (y * ow + x) * 4, (sy * w + sx) * 4, (sy * w + sx) * 4 + 4);
    }
  }

  return { data: out, w: ow, h: oh };
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

/* ------------------------------------------------------------------ *
 * The resized copies
 * ------------------------------------------------------------------ */

/**
 * Which source pixels fall under each destination pixel, and how much of each.
 *
 * One axis at a time: a box filter is separable, so a reduction is two passes of this
 * rather than a rectangle read per output pixel, and the weights for a column are the
 * same for every row. Normalised, so a partial pixel at either end of the box does not
 * darken the edge.
 */
function boxWeights(srcLen, dstLen) {
  const scale = srcLen / dstLen;
  const rows = [];
  for (let d = 0; d < dstLen; d++) {
    const from = d * scale, to = (d + 1) * scale;
    const first = Math.floor(from), last = Math.min(srcLen - 1, Math.ceil(to) - 1);
    const entries = [];
    let total = 0;
    for (let s = first; s <= last; s++) {
      const weight = Math.min(to, s + 1) - Math.max(from, s);
      if (weight > 0) { entries.push([s, weight]); total += weight; }
    }
    rows.push(entries.map(([s, weight]) => [s, weight / total]));
  }
  return rows;
}

/**
 * Area-average reduction of an RGBA buffer.
 *
 * Deliberately not `resample`, which is bilinear. Bilinear reads four neighbours however
 * far it is reducing, so past a factor of two it is point-sampling — and these reductions
 * are up to tenfold, where that turns a face into aliasing and a jumper into moiré. This
 * averages every source pixel under the destination pixel instead, which is the filter a
 * photo being reduced that far actually needs.
 *
 * Reduction only. The callers never ask for an enlargement — see `variantSize`.
 */
function downscale(src, sw, sh, dw, dh) {
  const xw = boxWeights(sw, dw);
  const yw = boxWeights(sh, dh);

  // Horizontally first, into the destination width at the source height. Float, because
  // rounding between the two passes is a second quantisation for no reason.
  const mid = new Float32Array(dw * sh * 4);
  for (let y = 0; y < sh; y++) {
    const srcRow = y * sw * 4, midRow = y * dw * 4;
    for (let x = 0; x < dw; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (const [sx, weight] of xw[x]) {
        const o = srcRow + sx * 4;
        r += src[o] * weight; g += src[o + 1] * weight;
        b += src[o + 2] * weight; a += src[o + 3] * weight;
      }
      const o = midRow + x * 4;
      mid[o] = r; mid[o + 1] = g; mid[o + 2] = b; mid[o + 3] = a;
    }
  }

  const out = Buffer.alloc(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (const [sy, weight] of yw[y]) {
        const o = (sy * dw + x) * 4;
        r += mid[o] * weight; g += mid[o + 1] * weight;
        b += mid[o + 2] * weight; a += mid[o + 3] * weight;
      }
      const o = (y * dw + x) * 4;
      out[o] = Math.round(r); out[o + 1] = Math.round(g);
      out[o + 2] = Math.round(b); out[o + 3] = Math.round(a);
    }
  }
  return out;
}

/**
 * The size a copy is written at, or null when there is nothing to gain.
 *
 * **The width is the target for the *shorter* side.** Every card draws the photo with
 * `object-fit: cover`, so a square source is scaled to the card's *height* — 203px in
 * the album, 532px in the card viewer — and it is the short side that has to survive
 * that. Scaling the longest side instead leaves a portrait photo soft in the viewer,
 * which is the one surface where the photo is the thing being looked at.
 *
 * Never an enlargement: a source already at or under the target is left alone and the
 * endpoint serves the original, which is both smaller and sharper than a copy of it.
 */
function variantSize(sw, sh, width) {
  const shortest = Math.min(sw, sh);
  if (shortest <= width) return null;

  const scale = width / shortest;
  return { w: Math.max(1, Math.round(sw * scale)), h: Math.max(1, Math.round(sh * scale)) };
}

/**
 * Writes the resized copies of one avatar.
 *
 * JPEG, because these are photographs and the whole point is the byte count: a 512px
 * face is ~60 kB encoded against ~400 kB as a PNG. **Except where the source carries
 * transparency** — three avatars in the pool do — because a card with a cut-out photo
 * shows its own metal through the hole, and flattening that onto a colour would be a
 * visible change to a card rather than a faster one. Those keep alpha and stay PNG.
 *
 * The format is not in the filename and does not need to be: the avatar endpoint has
 * always reported image/jpeg for every avatar while most of the pool is in fact PNG, so
 * a browser sniffs these either way.
 */
function writeVariants(source, id, variants) {
  const written = [];

  for (const { width, dir } of variants) {
    const size = variantSize(source.width, source.height, width);
    if (size === null) continue;

    // Reduce first and rotate second: the rotation is a pixel-for-pixel copy either way,
    // and doing it on the small buffer is a tenth of a megapixel rather than twelve.
    const reduced = downscale(source.data, source.width, source.height, size.w, size.h);
    const shown = applyOrientation(reduced, size.w, size.h, source.orientation);

    let encoded;
    if (source.transparent) {
      const png = new PNG({ width: shown.w, height: shown.h });
      shown.data.copy(png.data);
      encoded = PNG.sync.write(png);
    } else {
      encoded = jpeg.encode({ data: shown.data, width: shown.w, height: shown.h }, JPEG_QUALITY).data;
    }

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, id), encoded);
    written.push(`${width}=${shown.w}x${shown.h}/${Math.round(encoded.length / 1024)}kB`);
  }

  return written;
}

/** The card's own crop: cover in 5:7, object-position center 22%. */
function defaultFrame(sw, sh) {
  const aspect = sw / sh;
  let w, h, x, y;
  if (aspect > RATIO) { h = sh; w = sh * RATIO; y = 0; x = (sw - w) * 0.5; }
  else { w = sw; h = sw / RATIO; x = 0; y = (sh - h) * 0.22; }
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

/** Run the model over one N×N view; returns the raw mask at N×N, 0..1. */
async function run(session, small) {
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

/** Run the model once over a given frame; returns the raw mask at N×N, 0..1. */
async function infer(session, src, sw, sh, frame) {
  return run(session, crop(src, sw, sh, frame, N, N));
}

/**
 * The same frame read mirrored, with the mask flipped back to match the photo.
 *
 * The network is not symmetric: on a low-contrast photo it will hold one side of a
 * subject confidently and let the other fade into the background, and which side that is
 * flips with the image. Mark's avatar is the case in point — read one way his right arm
 * and the chair he leans on drop below the threshold and the cleanup then removes them
 * outright, read mirrored they are solid.
 */
async function inferMirrored(session, src, sw, sh, frame) {
  const small = crop(src, sw, sh, frame, N, N);
  const flipped = Buffer.alloc(N * N * 4);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      small.copy(flipped, (y * N + (N - 1 - x)) * 4, (y * N + x) * 4, (y * N + x + 1) * 4);
    }
  }
  const mask = await run(session, flipped);
  const out = new Float32Array(N * N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) out[y * N + (N - 1 - x)] = mask[y * N + x];
  }
  return out;
}

/**
 * Combine the two readings of a frame: the higher of the two, but only where the lower
 * one also sees something.
 *
 * Taking the maximum outright is what recovers a subject the network let fade — but it
 * also means one confident reading can carry a piece of background in unopposed, and
 * there is no vote to overrule it. On Luc's avatar the plain reading takes a wedge of the
 * mural behind him at 0.78 and the mirrored one puts it at 0.07; the wedge lands on the
 * card as a triangle beside his face. The two cases look identical to a maximum and are
 * far apart on the weaker reading, which is the signal this gates on: Mark's arm, the
 * thing reading both ways exists to recover, sits at 0.38 there. Uncertain is not the
 * same as absent.
 */
function combine(a, b) {
  const out = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) {
    const lo = Math.min(a[i], b[i]), hi = Math.max(a[i], b[i]);
    out[i] = lo >= AGREEMENT ? hi : lo;
  }
  return out;
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

/**
 * Draw the N×N mask, which covers `frame`, into the card's own crop at card size.
 *
 * The mask has to be *stored* in the card's frame no matter which frame it was inferred
 * from. The front end stretches it over the whole portrait box (`mask-size: 100% 100%`)
 * while the photo underneath is `object-fit: cover` at `object-position: center 22%` —
 * that is `defaultFrame`, and nothing tells the front end otherwise. Handing it a mask
 * cut to a tighter frame therefore blows the subject up to fill the card while the photo
 * stays put, which is what happened to the three full-body avatars in the pool.
 *
 * Sampling clamps at the frame's edges rather than treating the outside as background.
 * A fitted frame carries FRAME_MARGIN of background around the subject, so what gets
 * replicated outward is background anyway — except where clampFrame ran the frame into
 * the edge of the photo, and there the card's crop stops at that edge too.
 *
 * The mask is quantised to 8 bits before interpolating rather than after, which is what
 * the resample this replaces did. Rounding once would be marginally better, but it would
 * also nudge every mask in the pool by a few levels along its soft edge, and the point of
 * this function is that a frame which already was the card's frame comes out unchanged.
 * Measured over the pool it does: same bytes but for the outermost row and column, where
 * the old resample interpolated with a negative weight and wrapped it through a Buffer.
 */
function project(mask, frame, card) {
  const levels = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) levels[i] = Math.round(mask[i] * 255);

  const out = new Uint8Array(CARD_W * CARD_H);
  for (let y = 0; y < CARD_H; y++) {
    // The card pixel's centre, in source pixels, and then in mask pixels.
    const sy = card.y + (y + 0.5) * card.h / CARD_H;
    const my = Math.max(0, Math.min(N - 1, (sy - frame.y) * N / frame.h - 0.5));
    const y0 = Math.floor(my), y1 = Math.min(N - 1, y0 + 1), fy = my - y0;
    for (let x = 0; x < CARD_W; x++) {
      const sx = card.x + (x + 0.5) * card.w / CARD_W;
      const mx = Math.max(0, Math.min(N - 1, (sx - frame.x) * N / frame.w - 0.5));
      const x0 = Math.floor(mx), x1 = Math.min(N - 1, x0 + 1), fx = mx - x0;
      const a = levels[y0 * N + x0] * (1 - fx) + levels[y0 * N + x1] * fx;
      const b = levels[y1 * N + x0] * (1 - fx) + levels[y1 * N + x1] * fx;
      out[y * CARD_W + x] = Math.round(a * (1 - fy) + b * fy);
    }
  }
  return out;
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
 * someone standing just in frame. One person is one piece, and no face detector is
 * involved in deciding which.
 *
 * It has something to remove on 1 of the 71 avatars in the pool, and used to be load
 * bearing for many more. Both other steps have eaten into its job: a reading that faded
 * out over half a subject left that half as its own component for this to delete, and
 * `combine` fills those in first. The bystander next to Daan Verkade, once the example
 * of what this is for, now goes there too — the two readings disagreed about him, which
 * is the same observation one step earlier.
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

async function generate(session, source, outFile) {
  const src = Buffer.from(source.data);
  const whole = { x: 0, y: 0, w: source.width, h: source.height };

  // The full photo, which both locates the subject and is the reading kept unless
  // something tighter turns out to be worth having.
  const located = await infer(session, src, source.width, source.height, whole);

  const standard = defaultFrame(source.width, source.height);
  const fitted = frameAroundSubject(located, whole);

  let frame = whole, reframed = false;
  if (fitted) {
    const clamped = clampFrame(fitted, source.width, source.height);
    if (clamped.w * clamped.h < FRAME_GAIN * standard.w * standard.h) {
      frame = clamped;
      reframed = true;
    }
  }

  /*
   * A second pass only when the frame actually tightens around the subject.
   *
   * It used to run unconditionally, and where it did not reframe it fell back to the
   * card's own 5:7 crop — which on a landscape photo is a narrow column cut out of the
   * middle. That is strictly less of the photo than pass one already saw, and the model
   * reads it as a different scene: on Luuk's avatar the whole-photo pass returns all
   * three heads and both bodies, and the cropped one returns the middle head alone,
   * because the two outer heads are now sliced off at the frame edge and stop being part
   * of the salient object. The better mask was then thrown away for the worse one, on 69
   * of the 71 avatars in the pool.
   */
  const read = reframed
    ? await infer(session, src, source.width, source.height, frame)
    : located;
  const mirrored = await inferMirrored(session, src, source.width, source.height, frame);
  const mask = combine(read, mirrored);

  // Back into the card's crop, which is the frame the front end draws the photo in.
  const grey = project(mask, frame, standard);

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

/** An output — a mask, or one resized copy — is stale when it is missing or older than
    the avatar it came from. */
function isStale(avatarFile, outFile) {
  if (!fs.existsSync(outFile)) return true;
  return fs.statSync(avatarFile).mtimeMs > fs.statSync(outFile).mtimeMs;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const variants = parseVariants(process.argv.slice(2));
  const avatarDir = args.avatars;
  const outDir = args.out;
  // Masks are the default job; --variants-only leaves them alone, which is also the one
  // mode that needs neither the model nor a session.
  const masks = !args["variants-only"];

  if (!avatarDir || (masks && !outDir)) {
    console.error("usage: make-silhouettes.mjs --avatars <dir> --out <dir> (--id <playerId> | --all) [--force]\n" +
      "       [--variant <width>:<dir> ...] [--variants-only]");
    process.exit(2);
  }
  if (!masks && variants.length === 0) {
    console.error("--variants-only with no --variant leaves nothing to do");
    process.exit(2);
  }
  if (masks && !fs.existsSync(MODEL)) {
    console.error(`model not found at ${MODEL}\n` +
      "fetch it once with:\n" +
      "  curl -L -o u2netp.onnx https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx");
    process.exit(3);
  }

  if (masks) fs.mkdirSync(outDir, { recursive: true });

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

  // Created on first use rather than up front: a run that only writes resized copies
  // has no reason to load a segmentation model, and on a backfill that is the difference
  // between minutes and seconds.
  let session = null;

  let written = 0, skipped = 0, failed = 0;

  for (const id of ids) {
    const avatarFile = path.join(avatarDir, id);
    const outFile = masks ? path.join(outDir, id + ".png") : null;

    if (!fs.existsSync(avatarFile)) {
      console.error(`no avatar for ${id}`);
      failed++;
      continue;
    }

    // Each output stands or falls on its own age, so a new width is backfilled without
    // re-running the model over the whole pool, and a replaced photo refreshes all of
    // them.
    const maskWanted = masks && (args.force || isStale(avatarFile, outFile));
    const variantsWanted = variants.filter(({ dir }) =>
      args.force || isStale(avatarFile, path.join(dir, id)));

    if (!maskWanted && variantsWanted.length === 0) {
      skipped++;
      continue;
    }

    try {
      // One decode for both jobs. These are the files this whole tool exists to avoid
      // reading twice: the largest in the pool is 25 megapixels.
      const source = decode(fs.readFileSync(avatarFile));

      const notes = [];
      if (maskWanted) {
        session ??= await ort.InferenceSession.create(MODEL);
        const stats = await generate(session, source, outFile);
        notes.push(`area=${stats.area.toFixed(2)} dominance=${stats.dominance.toFixed(2)}` +
          (stats.reframed ? " reframed" : ""));
      }
      if (variantsWanted.length > 0) {
        notes.push(...writeVariants(source, id, variantsWanted));
      }

      // An avatar already smaller than every width asked for produces nothing, and that
      // is the finished state rather than a failure: the endpoint serves the original,
      // which is smaller and sharper than a copy of it would be. It is decided here, on
      // the decoded size, rather than by reading a header a second time.
      if (notes.length === 0) {
        skipped++;
        continue;
      }

      written++;
      console.log(`${id} ${notes.join(" ")}`);
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
