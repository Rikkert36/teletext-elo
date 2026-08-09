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

The model runs over the whole photo first. When the subject sits in a corner of it there
is a second pass on a 5:7 frame fitted around it, where the subject gets far more of the
320×320 input and the mask comes out sharper. Two of the 71 avatars in the pool are like
that; for the rest the whole photo is the best view there is and the first reading stands.

Skipping the second pass is not just a saving. It used to run either way, falling back to
the card's own 5:7 crop when there was nothing to fit — and on a landscape photo that crop
is a narrow column out of the middle, which is *less* of the photo than the first pass
already saw. The model reads it as a different scene: given Luuk's avatar whole it returns
all three heads and both bodies, and given the column it returns the middle head alone,
because the outer two are now cut off at the frame edge and stop being part of the salient
object. The better mask was then discarded in favour of the worse one.

Every frame is read twice, mirrored the second time. The network is not left-right
symmetric: on a low-contrast photo it will hold one side of a subject and let the other
fade into the background, and which side that is flips with the image. Mark's avatar is
the case in point — read one way his right arm and the chair he leans on fade out below
the threshold, read mirrored they are solid.

The two readings are combined by taking the higher of them wherever the lower one also
sees something, and deferring to the lower one where it does not. A plain maximum is what
recovers Mark's arm, but it also lets one confident reading carry a piece of background in
with no vote to overrule it: on Luc Geurts' avatar the plain reading takes a wedge of the
mural behind him and the mirrored one does not, and the wedge lands on the card as a
triangle beside his face. What separates the two cases is not the winning reading — both
are around 0.8 — but the losing one, 0.38 for Mark's arm against 0.07 for the wedge.

The result is then projected back into the card's own crop. That step is not optional: the
front end stretches the mask over the whole portrait box while the photo under it is
`object-fit: cover` at `object-position: center 22%`, and nothing carries a frame across.
A mask stored in the frame it was inferred from lands on the card blown up to fill it
while the photo stays where it was — which is exactly what the three full-body avatars in
the pool did before this existed.

Afterwards only the largest connected component survives, which drops stray specks and
any second person standing at the edge of frame. It finds something to drop on 1 of the 71
avatars; it used to do far more, and both of the steps above have since taken over part of
its job — a subject whose far side faded out left that side behind as a component of its
own, and the bystander beside Daan Verkade is now dropped a step earlier, because the two
readings disagreed about him.

## Known limits

The model finds *a* subject, always. It cannot tell you whether that subject is a person,
so an avatar that is a drawing or an object yields a perfectly good silhouette of the
wrong kind of thing. That is a judgement call for a human looking at the output, not
something the statistics can gate — the `area` and `dominance` numbers printed per player
only tell you whether the mask is well-formed.

A full-body photo yields a small figure, because that is how large it is on the card too.
The second pass makes the outline sharper; it cannot make the subject bigger, since the
mask has to line up with a photo the front end crops its own way.

A subject the card's crop cuts through is masked as far as the crop goes and no further,
so a wide group photo becomes whichever part of the group is in the middle. The mask is
right; it is the framing that leaves the rest outside the card.
