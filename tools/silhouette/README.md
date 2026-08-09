# Silhouette generator

Turns a player's avatar into a silhouette mask, used by the card for a player you do not
own yet. Runs offline, never in the API process.

## Why a separate process

Generating a mask needs a segmentation model (ONNX Runtime) plus an image decoder, both
native. Under in-process IIS hosting those would stay loaded in `w3wp`, which locks their
dlls during a deploy and keeps a model session in memory permanently for something that
runs a handful of times a year. A short-lived child process has neither problem.

The API starts this script after an avatar upload — see `SilhouetteService` and the
`Silhouette` section in `appsettings.json`. It is fire-and-forget: if generation fails the
upload still succeeds and the card falls back to its flat plate.

## Setup

```
npm install
npm run model      # downloads u2netp.onnx, ~4.6 MB, Apache-2.0
```

The model is not committed. If it is missing the script exits with code 3 and prints the
download command.

## Deploying

The script resolves both the model and its modules **next to itself**, so deploy the whole
directory — `make-silhouettes.mjs`, `node_modules/` and `u2netp.onnx` — and point
`Silhouette:Arguments` in `appsettings.json` at that copy. Node must be installed on the
server. Set `Silhouette:Enabled` to `true` once it is in place; while it is `false` the
API simply never calls out, and cards fall back to the flat plate.

## Usage

```
node make-silhouettes.mjs --avatars <dir> --out <dir> --id <playerId>
node make-silhouettes.mjs --avatars <dir> --out <dir> --all [--force]
```

`--all` is also the initial backfill — there is no separate one-off path. A mask is
skipped when it is newer than its avatar, so re-running is cheap; `--force` overrides
that.

Exit codes: `0` ok, `1` everything failed, `2` bad arguments, `3` model missing.

## What it produces

`<out>/<playerId>.png` — 512×716 (5:7), RGB flat white, **mask in the alpha channel**.
The front end uses it directly as a CSS mask over a block of ink, so no colour decision
is baked in here. About 30 kB each.

## How it works

u2netp is a *salient object* network: it predicts which pixels belong to the dominant
subject. It has no notion of faces, which is why it will happily and correctly outline a
baguette if that is what the avatar is.

Two passes. The first locates the subject in the whole photo; the second re-runs on a 5:7
frame fitted around it, where the subject gets far more of the 320×320 input and the mask
comes out sharper. Photos that are already head-and-shoulders skip the second pass, which
is most of them.

The result is then projected back into the card's own crop. That step is not optional: the
front end stretches the mask over the whole portrait box while the photo under it is
`object-fit: cover` at `object-position: center 22%`, and nothing carries a frame across.
A mask stored in the frame it was inferred from lands on the card blown up to fill it
while the photo stays where it was — which is exactly what the three full-body avatars in
the pool did before this existed.

Afterwards only the largest connected component survives, which drops stray specks and
any second person standing at the edge of frame.

## Known limits

The model finds *a* subject, always. It cannot tell you whether that subject is a person,
so an avatar that is a drawing or an object yields a perfectly good silhouette of the
wrong kind of thing. That is a judgement call for a human looking at the output, not
something the statistics can gate — the `area` and `dominance` numbers printed per player
only tell you whether the mask is well-formed.

A full-body photo yields a small figure, because that is how large it is on the card too.
The second pass makes the outline sharper; it cannot make the subject bigger, since the
mask has to line up with a photo the front end crops its own way.
