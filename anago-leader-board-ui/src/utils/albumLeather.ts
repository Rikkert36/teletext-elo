import { CSSProperties } from 'react';

/**
 * What leather an album is bound in.
 *
 * **One product line in ten dyes.** The brass edge, the gold foil and the rule are
 * identical on all of them, and only the stain moves — the same reasoning as the packet
 * hues in [packFoil.ts](./packFoil.ts): ten books lying side by side have to read as ten
 * of the same thing in different colours, not as ten unrelated objects. So the board edge
 * stays brass rather than being tinted per stain, even though that would be more
 * "designed"; a green book with a green edge stops being an album from this series.
 *
 * **Every `mid` has to land between roughly 11% and 16% lightness, and that is a hard
 * constraint rather than a house style.** `--band` in album.css mixes `--leather-mid`
 * toward cream and reverses cream type out of the result, so one mix has to serve every
 * stain: too light and the head band cannot hold the reversed type, too dark and it goes
 * near-black. Cognac at 23% is the one stain outside the band and is grandfathered — it
 * is the reason the mix is off `mid` and not off `hi` in the first place. A new stain
 * that wants a lighter body than cognac's is not a new stain, it is a second `--band`.
 *
 * Three more colours were designed and rejected, and are worth not re-deriving:
 * **perkament** (undyed calf) breaks the band rule above at the light end *and* would
 * make the icon binding's spine vanish into its own ivory boards; **okergeel** is
 * `--foil` (#e6c98a) with the lights out, so the blocking would disappear into the
 * cover; **chocolade** is real but sits between tabak and cognac, which are already here.
 *
 * Applied by spreading the result onto an element as `style`, the same way `packFoil`
 * is. Read from a prop on every render rather than frozen at mount, so a cover that
 * changes re-stains in place — see the note on transitions below.
 */

export type CoverId =
  | 'tobacco'
  | 'tan'
  | 'oxblood'
  | 'claret'
  | 'aubergine'
  | 'olive'
  | 'forest'
  | 'petrol'
  | 'navy'
  | 'charcoal';

interface Stain {
  id: CoverId;
  /** Dutch, because it is UI copy. */
  label: string;
  /** Top-left of the cover, where the light falls. */
  hi: string;
  /** The body of the leather. */
  mid: string;
  /** The far corner, in shadow. */
  lo: string;
}

/**
 * **This order is the shelf.** `AlbumChoice` lays the books out as five across and two
 * down in exactly this sequence, so the first five are the top row and the last five the
 * bottom one: warm above, cool below. The top row runs brown → red-brown → wine → violet,
 * which is what keeps `ossenbloed` and `bordeaux` legible as two decisions rather than as
 * one colour printed twice — they are the closest neighbours on the table and the ramp is
 * doing the work. A book moved in this list moves on the table.
 *
 * `tobacco` is first because `COVERS[0]` is the fallback for an unknown id and
 * `AlbumCovers.Default` on the server is the same stain — see `albumLeather` below.
 *
 * **`oxblood` used to be this brown, and the id was moved rather than the colour.** The
 * first stain was labelled "bordeaux", is `#5a4526 / #35270f / #4a3820`, and is hue 34–38°
 * at ~40% saturation — a tobacco brown, about 50° around the wheel from any real oxblood
 * and at a third of its saturation. Nothing surfaced that until a genuine bordeaux was
 * added and two entries claimed the name. So the brown is now `tobacco` / *tabak*, the id
 * `oxblood` was freed and given to an actual oxblood, and
 * `20260815_RenameOxbloodCoverToTobacco` repoints every album already bound in it. The
 * migration is what makes this safe: without it, freeing the id would have restained
 * every existing book from brown to dark red on the next page load.
 *
 * **`crimson` / karmozijn was here for exactly one session and is gone.** `oxblood` took
 * its slot: a scarlet and a dark blood red are the same decision, and of the two the one
 * that is a real binding leather is oxblood. It never shipped, so there is nothing in any
 * database bound in it and no migration for it.
 */
export const COVERS: readonly Stain[] = [
  { id: 'tobacco', label: 'tabak', hi: '#5a4526', mid: '#35270f', lo: '#4a3820' },
  { id: 'tan', label: 'cognac', hi: '#8a6134', mid: '#5b3c1b', lo: '#754f27' },
  { id: 'oxblood', label: 'ossenbloed', hi: '#6b2a22', mid: '#3c110b', lo: '#551f16' },
  { id: 'claret', label: 'bordeaux', hi: '#5c2136', mid: '#300f1c', lo: '#4a1a2b' },
  { id: 'aubergine', label: 'aubergine', hi: '#4a3350', mid: '#271a2c', lo: '#3c2942' },
  { id: 'olive', label: 'olijf', hi: '#565229', mid: '#2b2911', lo: '#46421f' },
  { id: 'forest', label: 'bosgroen', hi: '#2f4a2c', mid: '#182c17', lo: '#274023' },
  { id: 'petrol', label: 'petrol', hi: '#2a4a4c', mid: '#10282a', lo: '#21403f' },
  { id: 'navy', label: 'marineblauw', hi: '#223049', mid: '#101828', lo: '#1b2740' },
  { id: 'charcoal', label: 'antraciet', hi: '#3a3a3c', mid: '#1c1c1e', lo: '#2e2e30' },
];

const BY_ID = new Map<string, Stain>(COVERS.map((stain) => [stain.id, stain]));

/** A hex colour lightened toward white by `1 - keep`. Only `--detail` uses it. */
const lighten = (hex: string, keep: number): string => {
  const n = parseInt(hex.slice(1), 16);

  return (
    '#' +
    [(n >> 16) & 255, (n >> 8) & 255, n & 255]
      .map((channel) => Math.round(channel * keep + 255 * (1 - keep)).toString(16).padStart(2, '0'))
      .join('')
  );
};

export const coverLabel = (cover: string | null | undefined): string =>
  (cover ? BY_ID.get(cover)?.label : undefined) ?? COVERS[0].label;

/**
 * The custom properties the book paints its outside with — the cover face, the binding
 * behind it and the board edge of the shut leaf, which all have to agree or the book
 * comes apart at the spine.
 *
 * Falls back to tabak for an unknown id rather than trusting the value: this comes
 * off the wire, and returning nothing would leave every token unset and the cover
 * transparent. Same reason `packFoil` has a fallback hue.
 *
 * The gold is deliberately *not* derived from the stain. `--foil` is the printing, and
 * a book's blocking does not change colour with its leather.
 *
 * A `background` built out of custom properties cannot be transitioned — which is exactly
 * why `.album__binding` is its own element rather than a background on `.album__book`.
 * Changing the cover therefore cuts rather than fades. The icon re-bind works around it
 * with a second cover element that is revealed by a transitioned `clip-path` instead; see
 * `.album__cover-icons` in album.css.
 */
export const albumLeather = (cover: string | null | undefined): CSSProperties => {
  const stain = (cover ? BY_ID.get(cover) : undefined) ?? COVERS[0];

  return {
    '--leather-hi': stain.hi,
    '--leather-mid': stain.mid,
    '--leather-lo': stain.lo,
    /*
     * The tone the blind ornament on the front board is struck in — the four rods and
     * their figures, see `CoverOrnament.tsx`. Barely used at full strength: the drawing
     * runs it at a fifth (`--ornament-tint` in album.css) and what you see is mostly the
     * white and black of the relief. But it is what keeps the impression *in* the stain
     * rather than on top of it.
     *
     * **Derived, and not a table of ten.** A per-stain palette was proposed alongside the
     * drawing, and every one of its ten values turned out to be `hi` mixed with 18% white
     * — exactly, on all thirty channels. So it is one sum rather than ten decisions, and a
     * stain that gets retuned takes its ornament with it instead of drifting away from a
     * frozen copy of itself.
     *
     * `hi` rather than `mid` is the right end to derive from and not a coin toss: `hi` is
     * the corner the lamp falls on, and a raised form catches that same light.
     *
     * **Computed here rather than as `color-mix()` in CSS**, which is where it started.
     * A `var()` that resolves to a function the browser does not know is invalid at
     * computed-value time, and an invalid `color` does not fall back to the declaration
     * before it — it inherits. The inherited colour on this cover is `--foil`, so on any
     * browser without `color-mix` the ornament would have come out in gold leaf.
     */
    '--detail': lighten(stain.hi, 0.82),
    /*
     * Brass, on every stain.
     *
     * **It is no longer drawn round a shut book.** A single edge colour under ten dyes
     * ranges from 1.10:1 to 2.44:1 against the leather it borders, so as an outline it was
     * a gold hairline on marineblauw and invisible on cognac — see
     * `.album--closed .album__leaf--cover` in album.css for the full reasoning and for why
     * tinting it per stain was the wrong fix. What still uses it is brass where two things
     * meet rather than brass round the outside: the open book's case (`.album__binding`),
     * the join between leather and boards on the icon binding, and the small books on the
     * choosing table, where at 90px the hairline is the object's edge and not decoration.
     */
    '--board-edge': '#6b5325',
    '--foil': '#e6c98a',
    '--foil-rule': '#a9853c',
    /*
     * The gilt the owner's name is **written** in, and its own token rather than `--foil`.
     *
     * It carries the same hex today, and sharing the *value* is right — one shop, one pot
     * of ink, and the name should belong to the same metal as the rule under it. Sharing
     * the *token* is not: `--foil` means hot foil blocking, which still has a job on this
     * cover (the rule) and on the icon binding (the spine), and the name is no longer
     * struck. The two will need tuning apart almost immediately, because a monoline
     * hairline and a 2px rule at one identical colour do not read as the same weight.
     *
     * This is exactly why `--foil-rule` already exists — the rule is a shade down from
     * the blocking on every book, and one shared value flattened the two together. Same
     * trap, one object further along.
     *
     * **Identical on all ten stains**, like every other mark on the cover. Gold measures
     * between roughly 6.2:1 (cognac, the lightest) and 9.6:1 (petrol) against the leather
     * it sits on, so there is no stain where it fails and no case for a second ink. Where
     * a stain runs soft — cognac's highlight corner, which drops to about 3.5:1 — the fix
     * is stroke weight, not colour. A per-stain ink would make the shelf ten different
     * products instead of one line in ten dyes; see the note at the top of this file.
     */
    '--ink': '#e6c98a',
    /* The emboss under the blocked title. Dark and warm, so it reads as pressed into
       the leather rather than as a drop shadow floating over it.

       **Only the kicker uses this now.** The name above it is written rather than
       pressed, and ink displaces nothing — see `.album__cover-title` in album.css for
       why the emboss came off it entirely rather than being softened. */
    '--foil-emboss': '#241a05',
    /*
     * The boards of the icon binding — a half-bound book, so these are the paper-covered
     * boards and the stain above stays on as its spine and corners.
     *
     * Warm rather than white. A true white next to brass reads as paper stock, and the
     * object has to stay a book; ivory keeps it bound in something. Identical on every
     * stain for the same reason `--board-edge` is: ten upgraded books have to read as ten
     * of the same thing, and a green book with green-tinted boards leaves the series.
     *
     * Emitted unconditionally rather than behind a flag. There is no second code path to
     * fall out of step, and an unused custom property costs nothing — the half-binding is
     * composed in CSS out of tokens that are always here.
     */
    /*
     * The tone the ornament is struck in **on the boards**, and it is the mirror of
     * `--detail` above rather than a second guess at it.
     *
     * On leather a raised form catches the lamp, so the strike goes toward *white* — that
     * is why `--detail` is `hi` with 18% white in it. On the boards the lamp has nothing
     * left to add (white on ivory is 11.1 L* of headroom against black's 88.9), so a raised
     * form there is read by the shadow it throws and the tone goes the other way: the
     * board's own colour, a fixed fraction toward black.
     *
     * **0.575 is solved, not chosen.** It is the fraction at which `edge-mid` on ivory
     * moves the ground by the same 2.55 L* it moves the leather. One sum rather than a
     * table, exactly like `lighten(stain.hi, 0.82)`, and identical on all ten stains
     * because `--board-hi` is.
     */
    '--board-detail': '#8c8982',
    '--board-hi': '#f4efe2',
    '--board-mid': '#e6dfcd',
    '--board-lo': '#d8cfb8',
    /*
     * The ink the boards are lettered in — and it is ink, not foil.
     *
     * `--foil` is `#e6c98a`, picked to glow on near-black leather, and on an ivory board it
     * has almost no contrast at all: it is what made "Verzamelalbum van" nearly invisible
     * on the first re-bound cover. The answer is not a brighter gold but the right medium.
     * A half-bound book's boards are paper, paper takes printed ink, and the hot foil stays
     * where it belongs — on the leather spine, which still reads `--foil`.
     *
     * Deep bronze rather than black, so it still belongs to the same warm family as the
     * brass; and identical on every stain, for the same reason `--board-edge` is.
     */
    '--board-ink': '#6a5124',
    '--board-rule': '#a98b4c',
  } as CSSProperties;
};
