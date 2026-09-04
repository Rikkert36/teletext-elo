# Silhouette generator

Turns a player's avatar into the two things the card layer draws from it:

- a **silhouette mask**, used by the card for a player you do not own yet;
- **resized copies** of the photo, which is what every card, avatar and viewer actually
  paints.

Runs offline, never in the API process. Both come off one decode of the avatar, which is
why they share a run rather than living in two tools: the largest photo in the pool is 25
megapixels and reading one twice costs more than everything else here put together.

## Why resized copies at all

An avatar is an original camera upload. The pool averages 1.6 MB, the largest single file
is 17 MB and the largest is 5000×5000 — to be painted on a card 145 px wide. The album
mounts every page of the book at once, and all the leaves sit on the same screen rect, so
`loading="lazy"` defers nothing: opening the book pulled ~90 MB and decoded a quarter of a
gigapixel. Measured in Firefox on the machine that struggles, 175 MB of a 250 MB tab was
player photos.

At 512 that is ~4 MB and ~15 megapixels, with nothing lost on screen — see **What it
produces** for why 512 and 1024 are the two sizes.

## Why a separate process

Generating a mask needs a segmentation model (ONNX Runtime) plus an image decoder, both
native. Under in-process IIS hosting those would stay loaded in `w3wp`, which locks their
dlls during a deploy and keeps a model session in memory permanently for something that
runs a handful of times a year. A short-lived child process has neither problem.

The resized copies are here for the same reason and not only for the shared decode.
Resizing them in the API would put a native image decoder back into `w3wp` — the exact
thing this file argues against — for the sake of an operation that runs when a photo is
uploaded and never again.

The price is that a copy is **not guaranteed to exist**. The avatar endpoint falls back to
the original whenever there is none, which is correct in every case and merely slower in
one, so a failed or not-yet-run generation degrades to the behaviour that predates it.

The API starts this script after an avatar upload — see `SilhouetteService`. It is
fire-and-forget: if generation fails the upload still succeeds and the card falls back to
its flat plate.

## Setup

None. `AnagoLeaderboard.csproj` runs `npm ci` here when `node_modules` is missing or the
lockfile has moved, so building the API is enough. The model, `u2netp.onnx` (4.6 MB,
Apache-2.0), is committed next to the script — it is a fixed asset, not a resolvable
dependency, and `npm run model` only exists to fetch it again if it is ever lost. Missing,
the script exits with code 3 and prints the download command.

`node_modules` is ~260 MB of onnxruntime binaries and stays out of the repository, the same
way the front end's does.

## Deploying

Nothing to do by hand and nothing to configure. `dotnet publish` copies this whole
directory to `silhouette/` beside the application, and `SilhouetteService` looks for it
there — falling back to the repository copy when the API runs from a build rather than a
publish. Both layouts are found without a path in `appsettings.json`, which is why there is
no `Silhouette` section in it.

There is no on/off switch either. There was one, and it defaulted to off, which meant an
avatar upload quietly changed nothing on a machine where nobody had thought to turn it on —
the failure it was meant to protect against is already handled by the generation being
fire-and-forget.

**Node must be installed** on the server, on the `PATH` of the account the API runs as.
That is the one requirement this cannot carry with it; a missing `node` is logged as a
failed generation.

### Backfilling the resized copies

A deploy does **not** produce them. Uploads from then on will, but every photo already on
the server needs one run — once, by hand, on the machine that holds the data. From the
published `silhouette/` directory beside the application, with the base path out of
`appsettings.json` (`FileSystem:BasePath`, `T:\tafelvoetbal-server\data\` in production):

```
node make-silhouettes.mjs --variants-only ^
  --avatars  T:\tafelvoetbal-server\data\avatars ^
  --variant  512:T:\tafelvoetbal-server\data\avatars-512 ^
  --variant 1024:T:\tafelvoetbal-server\data\avatars-1024 ^
  --all
```

Safe to run while the API is up, and safe to repeat: it only writes files that are missing
or older than their avatar, and until one appears the endpoint serves the original. Expect
a couple of minutes for a pool of this size, most of it spent decoding.

Two of the 110 avatars in production fail — one is a WebP, which `jpeg-js` and `pngjs`
between them cannot read, and one is a truncated PNG. Neither is in the card pool, both
are a few hundred kB, and both keep being served as themselves. A failure count of 2 is
therefore the expected outcome, not a reason to re-run.

The same command with a new width added to `AvatarStorage.VariantWidths` is how a new size
arrives; nothing generates one on request.

## Usage

```
node make-silhouettes.mjs --avatars <dir> --out <dir> --id <playerId>
node make-silhouettes.mjs --avatars <dir> --out <dir> --all [--force]
node make-silhouettes.mjs ... --variant 512:<dir> --variant 1024:<dir>
node make-silhouettes.mjs ... --variants-only
```

`--all` is also the initial backfill — there is no separate one-off path. Every output is
skipped when it is newer than its avatar, so re-running is cheap and adding a width does
not re-run the model over the whole pool; `--force` overrides that.

`--variant <width>:<dir>` asks for one resized copy, repeated per size. The widths are
not this script's to choose: `AvatarStorage` decides both what sizes exist and where every
file belonging to a player lives, and passes them in.

`--variants-only` skips the masks, and with them the model — which is the mode a backfill
of a new width wants, and the only mode that needs neither `--out` nor `u2netp.onnx`.

Exit codes: `0` ok, `1` everything failed, `2` bad arguments, `3` model missing.

## What it produces

**The mask:** `<out>/<playerId>.png` — 512×716 (5:7), RGB flat white, **mask in the alpha
channel**. The front end uses it directly as a CSS mask over a block of ink, so no colour
decision is baked in here. About 30 kB each.

**The copies:** `<variant dir>/<playerId>`, named exactly like the avatar and with no
extension, for the same reason the avatar has none. JPEG at quality 85 — ~35 kB at 512 and
~105 kB at 1024 — except where the source carries transparency, where they stay PNG:
three avatars in the pool are cut-outs, and a card with a cut-out photo shows its own
metal through the hole. The avatar endpoint reports `image/jpeg` for everything either
way, which has always been a lie (most of the pool is PNG) and has never mattered,
because browsers sniff the body.

Two widths, and they are the drawn size at 2× rather than the card's width. The photo is
`object-fit: cover` over the whole 5:7 card and the sources are square, so it is scaled to
the card's *height*:

| Surface | Card | Photo drawn at | Asks for |
| --- | --- | --- | --- |
| Album slot | 145 × 203 | 203 | 512 |
| Player page avatar | — | 160 | 512 |
| Leaderboard avatar | — | 40 | 512 |
| Pack opener hero | 240 × 336 | 336 | 512 |
| Card viewer | 380 × 532 | 532 | 1024 |

Everything but the viewer shares one width deliberately, even where it needs far less: a
browser caches on the whole url, so a face fetched at two widths is a face downloaded
twice, and these are the same people on every page.

The **width is the target for the shorter side**, and it is never an enlargement. A photo
already at or under it gets no copy at all and the endpoint serves the original, which is
both smaller and sharper than a copy would be.

Reduction uses an area average, not the bilinear `resample` the mask pipeline uses:
bilinear reads four neighbours however far it is reducing, and these reductions are up to
tenfold, where that turns a face into aliasing.

**EXIF orientation is baked in.** Three avatars are stored on their side with an
orientation tag, which a browser applies when it draws the original and `jpeg-js` ignores
— so a copy re-encoded without it would be sideways *on the card*. That is the one way
this could have been visible.

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
