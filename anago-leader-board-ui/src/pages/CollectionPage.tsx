import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { unstable_batchedUpdates } from 'react-dom';
import Album, { AlbumSection, OwnedCounts, albumSlotOrder } from '../components/Album';
import AlbumChoice from '../components/AlbumChoice';
import CardViewer from '../components/CardViewer';
import GameShell from '../components/GameShell';
import Hourglass from '../components/Hourglass';
import PackOpener, { REACH_MS } from '../components/PackOpener';
import LedgerCorner from '../components/LedgerCorner';
import LockedAlbum from '../components/LockedAlbum';
import PackFace from '../components/PackFace';
import PackTile from '../components/PackTile';
import PutAway, { Placing } from '../components/PutAway';
import SigningLedger from '../components/SigningLedger';
import { CollectionState, GrantOptions, httpCardsClient } from '../clients/cardsClient';
import {
  MIN_GAMES,
  Pack,
  RevealedCard,
  SelectablePlayer,
  isIconPack,
  splitName,
} from '../mock/cardMock';
import { CoverId } from '../utils/albumLeather';
import { ms, prefersReducedMotion } from '../utils/animationSpeed';
import { packClass, packFoil } from '../utils/packFoil';
import { PackGrab } from '../utils/packGrab';
import { playSlot } from '../utils/sounds';
import { CURRENT_PLAYER_KEY as PLAYER_KEY } from '../utils/currentPlayer';
import '../styles/game.css';

const FAST_KEY = 'tafelvoetbal.cards.fastOpen';

/* ------------------------------------------------------------------ *
 * Putting a pack away, beat by beat
 *
 * The cards go in **one at a time, lowest rated first**, and the book turns to each
 * one's page as its turn comes — so the sequence climbs towards the best card in the
 * pack and ends with the book lying open on it.
 *
 * Every number below is a base duration doubled by `ms()`, and none of them is in a
 * hurry: this is the end of a ceremony, not a transaction being confirmed. **The turn
 * itself is not timed here** — the album reports when the book has arrived, because how
 * long a move takes is a property of the distance and a guess either flies a card at a
 * page still in the air or pays for a turn that never happened.
 * ------------------------------------------------------------------ */

/**
 * The book being put back in front of you, once the table is clear.
 *
 * **It is not on screen before this.** The album is mounted for the whole of the filing —
 * `PutAway` measures the book to know where to stand the cards — but it is invisible until
 * the cards are out of the middle, because a book arriving underneath cards that are still
 * moving is two things happening in one place. This is the fade, and it matches the
 * `opacity` transition on `.album-layout--placing .album`.
 */
const PLACE_ARRIVE_MS = 420;
/**
 * The card that has just landed, left alone in its slot before the book moves again.
 *
 * The point of the whole sequence is that you see where each card went, so the page must
 * not start turning out from under one the moment it arrives.
 */
const PLACE_SETTLE_MS = 420;
/**
 * After the last card, before the shelf comes back up.
 *
 * The shelf brightening is the invitation to open the next packet, and it should not
 * arrive on the same frame as the last card. This is the beat where the book is simply
 * a book with a new card in it.
 */
const PLACE_REST_MS = 520;
/**
 * How long the book is given to report that it has arrived, before the sequence gives up
 * waiting and flies the card anyway.
 *
 * A safety net and nothing else: `onTurned` fires on every path the album has, including
 * the ones with nothing to turn. But the flag that keeps the shelf out of play is lowered
 * at the *end* of this sequence, so a report that never came would strand the page with a
 * dimmed table and no way back — the same class of bug as an opener that never reaches
 * `onFinished`. Generous, because it must never fire on a turn that is merely long: the
 * longest honest move is the whole book at `RIFFLE_MS` a leaf.
 */
const PLACE_TURN_CAP_MS = 4000;

/* ------------------------------------------------------------------ *
 * Reaching for a packet
 *
 * One gesture in three places, and it used to be a cut in all three: the packet left the
 * pile, a bigger one appeared in the middle, and the book it replaced blinked out — three
 * simultaneous changes with nothing connecting them, on the one click that is supposed to
 * feel like picking something up.
 *
 * So the packet is **flown** from its place in the margin to the stage, growing as it comes
 * (`REACH_MS`, and the flight itself is the opener's — it owns the far end); the pile
 * **closes up** behind it; and the book **fades** rather than vanishing. All three run over
 * the same short window, because they are one movement seen from three sides.
 *
 * None of it happens under `prefers-reduced-motion`, which lands on the finished state
 * everywhere on this page rather than playing it stilled.
 * ------------------------------------------------------------------ */

/**
 * The pile closing up behind a packet that has been taken off it.
 *
 * `REACH_MS`, deliberately: the shelf shifting and the packet arriving are the same event
 * and must not be tuned apart. It is a FLIP over the tiles that are left — the shelf is a
 * wrapping row two packets wide, so taking one out pulls every packet after it up a place.
 */
const SHELF_SHIFT_MS = REACH_MS;

/**
 * The curve everything in this gesture moves on — the packet, the pile, the clone going
 * home. It is the row of cards' own easing, because this is the same kind of motion: a
 * thing being carried, which sets off decisively and is put down gently.
 */
const CARRY = 'cubic-bezier(0.32, 0.72, 0.28, 1)';

/* ------------------------------------------------------------------ *
 * The packets being brought over
 *
 * The one thing the binding ceremony did not cover. Your name is written into the cover,
 * the book is set down and opens itself — and the pile beside it simply *was there*, on the
 * frame the ceremony ended, because the shelf is suppressed for the length of the choice
 * and unsuppressed after it. Every other arrival on this page is flown; this was the last
 * cut left in the sequence, and it landed on the one screen that is nothing but ceremony.
 *
 * So the packets are **slid in from your own side of the table** — up from below the bottom
 * edge, straightening out of a steeper lean as they come to rest. The reader is sitting at
 * the near edge, so below the fold is where a thing handed to you comes from, and it is the
 * gesture the shelf's own vocabulary already implies: the return flight is a packet being
 * put back on the pile, and this is the pile being put there in the first place.
 *
 * **They arrive as one pile, not as a deal.** A per-packet stagger big enough to read as
 * dealing is fine for the two or three packets a new colleague has and is a machine gun at
 * twenty — and the number is not something this page controls, since packs are derived from
 * games played. The stagger is capped in *total* instead (`DEAL_SPREAD_MAX`), so a deep pile
 * simply arrives more nearly together. That is also why there is one `playSlot` rather than
 * one per packet: the sound is the pile touching down, which is a fact about the gesture and
 * not about how many games you have played.
 *
 * Clones in viewport space, exactly as the return flight uses, and for the identical reason
 * — `.pack-shelf` is `overflow-y: auto`, so a tile animated from off-screen would be behind
 * the pile's own edge for the whole journey. See `returning`.
 * ------------------------------------------------------------------ */

/**
 * How long one packet is in the air.
 *
 * Longer than `REACH_MS`, and not tuned to feel different: this crosses most of the viewport
 * where reaching for a packet crosses a margin, and the same speed over four times the
 * distance is a packet fired out of a cannon.
 */
const DEAL_MS = 380;
/** Between one packet and the next, before the total cap below takes over. */
const DEAL_STEP = 34;
/**
 * The whole pile is on the table within this of the first one moving.
 *
 * What keeps the arrival a gesture rather than a queue. Above about six packets the step
 * shrinks to fit, which is the right way round: the pile gets denser, not longer.
 */
const DEAL_SPREAD_MAX = 150;
/**
 * The book is set down before anything is put beside it.
 *
 * Under `JUST_BOUND_OPEN_MS` (420, in Album), so the packets are already on their way while
 * the cover turns itself back — two halves of the same moment rather than a queue of
 * ceremonies. Waiting for the book to finish opening put a dead beat in the middle of the
 * one sequence on this page that has none.
 */
const DEAL_WAIT = 200;
/** Extra lean on the way in, straightened out as the packet comes to rest. */
const DEAL_LEAN = 7;

/**
 * The test panel. Everything on it is real now: the pack buttons hand the signed-in
 * player a present through `POST api/collections/gifts`, which is a row like the
 * collection and the icons latch, so nothing here fakes state the server does not
 * have. Plus `snel openen`, which was always client-side.
 *
 * Development only, and **compiled out** rather than hidden. `process.env.NODE_ENV` is
 * inlined by webpack at build time, so `production` turns the branch below into dead code
 * and it leaves the bundle entirely — markup, handlers' call sites and Dutch strings. A
 * runtime flag would have shipped a panel that gifts packs and deletes albums to everybody
 * with devtools open.
 *
 * It is belt to the API's braces rather than the protection itself: `collections/gifts` is
 * `[AdminOnly]`, and `DELETE collections/{playerId}` and the icons `force` path both 404
 * outside Development. Those are what actually stop the calls; this stops the buttons from
 * being there to press.
 *
 * `NODE_ENV` is `test` under jest, so the panel is absent there too — nothing asserts on it.
 */
const SHOW_DEBUG = process.env.NODE_ENV === 'development';

/** The seam. Everything behind it is a real call now. */
const client = httpCardsClient;

const forget = (key: string): void => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* private browsing — there was nothing stored to forget */
  }
};

const read = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private browsing — the choice just will not persist */
  }
};

const CollectionPage: React.FC = () => {
  const [players, setPlayers] = useState<SelectablePlayer[]>([]);
  const [player, setPlayer] = useState<SelectablePlayer | null>(null);
  const [collection, setCollection] = useState<CollectionState | null>(null);
  const [openingPack, setOpeningPack] = useState<Pack | null>(null);
  /**
   * The book is changing places with a packet, and which way round.
   *
   *   leaving    a packet has been picked up in front of it: the book fades out
   *   returning  a sealed packet has been put back down: the book fades in
   *
   * `leaving` also keeps `Album` **mounted** for the length of the flight — the opener
   * replaces the book rather than dimming it (see the render), so without that there is
   * nothing left to fade and the swap is the cut it always was. It goes down again the
   * moment the packet lands, and the book is then gone for the whole reveal, which is the
   * thing the design doc is firm about: a second lit object inside the ceremony's vignette
   * is not wanted. `returning` needs no such thing — by then the album is what the middle
   * of the table holds — so it is a class and nothing more.
   *
   * `leaving` is only ever raised when there was a book on screen to begin with — reaching
   * for a second packet from a finished row has nothing to fade, and mounting a whole album
   * to hold it at zero opacity for 440ms would be a real cost for no frames.
   */
  const [bookPass, setBookPass] = useState<'leaving' | 'returning' | null>(null);
  /**
   * The packet being put back on the pile, drawn in flight.
   *
   * **A clone rather than the packet itself**, and the reason is the shelf: it is a scroll
   * container (`overflow-y: auto`, capped at the book's height), so it clips, and a tile
   * flown in from the middle of the table would be invisible until it crossed the pile's
   * own edge. The way *in* has no such problem — the stage clips nothing — which is why
   * only this direction needs a clone. It is mounted out at the shell, next to `PutAway`'s
   * hand of cards, and for the same reasons.
   *
   * The tile it is flying to is on the shelf from the first frame, holding its place in the
   * pile and hidden until this lands on it.
   */
  const [returning, setReturning] = useState<{ pack: Pack; from: PackGrab } | null>(null);
  /** The clone, so the flight can be written onto it once its landing place is known. */
  const flightRef = useRef<HTMLDivElement | null>(null);
  /**
   * The pile being slid onto the shelf after the binding, drawn in flight.
   *
   * Clones for the same reason `returning` is one — the shelf clips — and the tiles they are
   * flying to are on the shelf from the first frame, holding the pile's shape and hidden
   * until their own packet lands on them.
   *
   * The whole pile at once rather than one packet: a shelf that arrives with one packet
   * flying and the rest already lying there is a pile that was always on the table plus one
   * late delivery, which is not what just happened.
   */
  const [dealing, setDealing] = useState<Pack[] | null>(null);
  /** The clones, by pack id, so each can be given its own landing place. */
  const dealRefs = useRef(new Map<string, HTMLDivElement>());
  /**
   * The same deal, as a one-shot for the layout effect — the state lives for the whole
   * arrival and re-renders freely, and the flights may only be written on the commit that
   * first put the tiles on the shelf. Consumed like `shelfFrom` and `pendingFlight`.
   */
  const pendingDeal = useRef(false);
  /**
   * The pile still owes the reader an arrival.
   *
   * **Raised by the ceremony and read by a layout effect, never acted on in `onDone`
   * itself** — and the first version of this got it wrong, so the reason is worth keeping.
   * `AlbumChoice` schedules `onDone` from a timer set on the *click* (see `choose`), so the
   * callback closes over the render that was current when you picked a binding — which
   * pre-dates `createAlbum` answering, and so has the pre-album collection's shelf in it.
   * Reading `shelfPacks` there gets a list that is empty or stale, the deal never covers the
   * packets that actually arrive, and they go on simply appearing.
   *
   * A ref rather than state because nothing renders from it: it is a note that a delivery is
   * owed, consumed by the first commit that has a shelf to deliver onto.
   */
  const undelivered = useRef(false);
  /**
   * The same flight, as a one-shot for the layout effect: the state above lives for the
   * whole 440ms and re-renders freely, and the measurement may only be taken on the commit
   * that put the tile back. Consumed like `shelfFrom`, and `pendingFlip` in the opener.
   */
  const pendingFlight = useRef<{ id: string; from: PackGrab } | null>(null);
  /**
   * Where the packet now opening was picked up from, handed to the opener that mounts in
   * the same commit. Null on every path that is not a click on the pile.
   *
   * A ref rather than state because nothing renders *from* it: it is read once, by the
   * opener's mount effect, and a second render with the same value has to change nothing.
   * Set immediately before the `setOpeningPack` that mounts its reader, so the value the
   * opener sees is always its own packet's.
   */
  const reach = useRef<PackGrab | null>(null);
  /**
   * The tiles on the shelf, by pack id, so the pile can be measured before one leaves it.
   *
   * Owned here rather than in `PackTile` because the FLIP is about the packets that are
   * *left*: a tile cannot see its neighbours, and the one that moves them is the one that
   * is being unmounted.
   */
  const tileRefs = useRef(new Map<string, HTMLButtonElement>());
  /** Where those tiles were lying, read in the click handler and consumed by the layout
      effect that runs after the pile has closed up. Empty except across that one commit. */
  const shelfFrom = useRef(new Map<string, DOMRect>());
  /**
   * True from the tear until the last card has settled — *not* for as long as the opener
   * is mounted. A sealed packet lying on the stage is a decision you have not taken yet,
   * so the pile beside it stays live and you can still change your mind.
   *
   * It is raised by the opener's `onStart` and lowered by its `onFinished`, so **every
   * path that unmounts the opener has to lower it too**: an opener that is taken off
   * screen never reaches `onFinished`, and the flag would then sit true for the rest of
   * the session with the shelf dimmed and inert behind it. `closeOpener` is the one way
   * out, and `choosePlayer` and `openPack` clear it for the same reason.
   *
   * **It ends where the reveal ends, and that is the point.** The row of cards then waits
   * for the reader, with the shelf live over it — another packet, or file these. Filing
   * raises the same guard again through `placing`; see `handsFull`.
   */
  const [revealing, setRevealing] = useState(false);
  /**
   * Cards lying on the table from packets opened **before** the one on the stage.
   *
   * The row survives one packet: it is the record of what you have opened in this
   * sitting, and the reader files the lot when they have stopped. This holds the earlier
   * packets only — the opener renders these ahead of its own cards — so nothing is ever
   * counted twice.
   */
  const [table, setTable] = useState<RevealedCard[]>([]);
  /**
   * What the packet on the stage turned over, kept for the moment the reader reaches for
   * the next one — at which point it joins `table`.
   *
   * A ref rather than state: nothing renders from it (the opener draws its own cards from
   * its own state), and moving it into `table` while that opener is still mounted would
   * draw every card twice.
   */
  const openerCards = useRef<RevealedCard[]>([]);
  /**
   * How far the table is scrolled across, which belongs to the sitting and not to the packet.
   *
   * The opener is keyed on the packet, so reaching for the next one throws its row away and
   * builds another — and the new one starts at its left edge, even though it is drawing the
   * same cards in the same order. Here rather than in the opener for exactly that reason:
   * this outlives the remount. The opener zeroes it itself when it mounts onto an empty
   * table, so nothing here has to remember to clear it at the end of a sitting.
   */
  const tableScroll = useRef(0);
  /**
   * The new cards from the packet just closed, being put into the book one at a time.
   *
   * There is no exit button on this page and nothing to click at the end of a reveal.
   *
   * `all` is every card on the table, because clearing it is one gesture over all of them —
   * the doubles go off the bottom and the keepers move aside together. `order` is the
   * keepers' positions in that row, lowest rated first, and `index` is whose turn it is.
   *
   * The phase is which beat is running:
   *
   *   clearing   doubles off the table, keepers aside — and no book on it yet
   *   arriving   the book fading in, now that the middle is empty
   *   turning    the book going to this card's page, however many leaves that takes
   *   flying     `PutAway` carrying this card into its slot
   *   settling   the card that just landed, left alone in its slot
   *   resting    the finished book, before the shelf comes back up
   *
   * `clearing` and `flying` are `PutAway`'s and `turning` is the album's; all three report
   * when they are over. The page times `arriving`, `settling` and `resting`.
   */
  const [placing, setPlacing] = useState<{
    all: Placing[];
    order: number[];
    index: number;
    phase: 'clearing' | 'arriving' | 'turning' | 'flying' | 'settling' | 'resting';
  } | null>(null);
  /**
   * Slots the book must go on drawing as empty, because their card has not arrived yet.
   *
   * All of them from the start, released one at a time as they land — so a page turned
   * *through* on the way to a later card does not show a card that is still on the table.
   */
  const [held, setHeld] = useState<string[]>([]);
  /**
   * **Your hands are full** — from the tear until the cards are in the book.
   *
   * Two spans rather than one flag, because there is a real pause between them: a reveal,
   * and then the filing the reader asks for. In between, the row waits and the shelf is
   * *live* — that is what makes "another packet" the peer of "file these" rather than the
   * only thing on offer being a control with a dimmed table around it.
   *
   * Derived rather than stored, so it cannot disagree with either half.
   */
  const handsFull = revealing || placing !== null;
  /** Index into `slotOrder` of the card being looked at, or null for none. */
  const [viewing, setViewing] = useState<number | null>(null);
  const [fastMode, setFastMode] = useState(() => read(FAST_KEY) === 'true');
  /**
   * Whatever went wrong, in Dutch. Branched on before anything else.
   *
   * Without it a failed read leaves `collection` null forever, and the state machine reads
   * null as "no album yet" — so an unreachable API would invite you to choose a leather
   * and then fail the write too. An error has to be its own state, not the absence of one.
   */
  const [error, setError] = useState<string | null>(null);
  /**
   * True from the moment a leather is picked until the ceremony reports itself finished.
   *
   * This is what keeps `AlbumChoice` mounted across the write: the response arrives with
   * `album` set, and branching on that alone would swap the component out mid-stamp on a
   * fast server. The sequence decides when it is over, not the network.
   */
  const [creating, setCreating] = useState(false);
  /**
   * True while the remembered name is still being turned back into a player.
   *
   * The pick is stored as an id, and an id alone is not a player — the games gate and the
   * cover both need the record — so it cannot be restored until the player list lands.
   * That one round trip is long enough to see, and without this flag it renders as the
   * ledger: a returning visitor was shown the front door for a moment and then had it
   * replaced by their own album, which also made the collection request that follows look
   * like it was fired with no name set.
   *
   * Seeded from localStorage synchronously, so it is only ever true when there is in fact
   * something to restore. Nobody with no remembered name waits for anything.
   */
  const [restoring, setRestoring] = useState(() => read(PLAYER_KEY) !== null);
  /**
   * The album was bound a moment ago, in this session.
   *
   * It is what makes the book open itself on the voorwoord. Session state rather than
   * something derived from `album.createdAt`, because the question is not "is this album
   * new" but "did you just watch this book being made" — somebody returning tomorrow to a
   * book they never opened is a different case, and one whose book should stay shut until
   * they open it, which the album gets right on its own off its saved position.
   */
  const [justBound, setJustBound] = useState(false);
  /**
   * True from the press of the seal until the album says the re-binding is over.
   *
   * The same shape as `creating`, and for the same reason: the response arrives with the
   * latch set, and branching on that alone would re-bind the cover in one frame on a fast
   * server. The sequence decides when it is over, not the network.
   */
  const [rebinding, setRebinding] = useState(false);
  /**
   * The collection as the claim left it, held until the reveal is over.
   *
   * Opening a pack answers with the cards *and* the new collection, so nothing is refetched
   * — but it must not be applied straight away: the book is behind the opener and would
   * quietly gain its new cards while you are still watching them come out of the packet,
   * and the reveal's whole job is to be the moment you learn what you got.
   *
   * A ref rather than state, so parking it here cannot re-render anything mid-reveal.
   *
   * It carries the id it belongs to. Signing out and back in as somebody else while a claim
   * is in flight would otherwise leave one person's collection parked and apply it under the
   * next person's name — the same class of bug `choosePlayer` clears `collection` for.
   */
  const pendingCollection = useRef<{ playerId: string; state: CollectionState } | null>(null);
  /**
   * The set-completion packet, held from the click until the re-binding is over.
   *
   * A ref rather than state for the same reason `pendingCollection` is one: it is a note to
   * the callback that ends the ceremony, and re-rendering on it would do nothing but risk
   * restarting the ceremony that is reading it.
   */
  const pendingIconPack = useRef<Pack | null>(null);
  /**
   * The collection as the icons claim left it, held until the re-binding is over.
   *
   * Exactly `pendingCollection`'s job for the other ceremony, and parked for the same reason:
   * the unlock is what changes the book's binding, so applying it when it lands would change
   * the book *during* the ceremony whose whole subject is that change. It carries the id it
   * belongs to for the reason that one does.
   *
   * The request still goes out on the first click, and that is not the part that was wrong:
   * the ceremony is what hides the round trip, and it is what lets a refusal be known by the
   * time `handleRebound` runs rather than after the light has gone.
   */
  const pendingIconState = useRef<{ playerId: string; state: CollectionState } | null>(null);
  /**
   * The re-binding is being played from the test panel, with no packet and no write.
   *
   * A ref rather than state because only `handleRebound` reads it, and it has to be readable
   * from the callback the ceremony ends on without that callback's identity changing — the
   * same reason `pendingIconPack` is one.
   */
  const rebindDemo = useRef(false);
  /**
   * Whether the pack opener takes over when the ceremony ends.
   *
   * State rather than a ref, unlike its two neighbours, because `Album` reads it *during*
   * the ceremony to decide whether to play the closing fade — a ref would not re-render it
   * in time. False only for the test panel's replay, which has nothing to hand over to.
   */
  const [rebindHandsOver, setRebindHandsOver] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void client
      .getSelectablePlayers()
      .then((list) => {
        if (cancelled) return;
        setPlayers(list);

        const remembered = read(PLAYER_KEY);
        const found = list.find((p) => p.id === remembered);
        if (found) setPlayer(found);
      })
      .catch((reason) => {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.warn('[kaarten] GET /api/players mislukt', reason);
        setError('De spelerslijst is niet op te halen. Draait de API?');
      })
      .finally(() => {
        if (!cancelled) setRestoring(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async (playerId: string) => {
    try {
      setCollection(await client.getCollection(playerId));
      setError(null);
    } catch (reason) {
      /*
       * Loud, for the same reason the pool fetch is: a card page that quietly degrades to
       * something plausible is indistinguishable from a working one.
       *
       * A 404 gets its own message, because it has two very different causes that the
       * status code alone cannot separate — the player genuinely not existing, or the
       * *route* not existing because the API is an older build than this page. The second
       * is overwhelmingly the likelier one during development, and it cost a round of
       * confusion the first time: the endpoint returns 404 only for an unknown player by
       * design, so a 404 for a player you just picked off the list looks impossible.
       */
      const missing = reason instanceof Error && reason.message.startsWith('404');

      // eslint-disable-next-line no-console
      console.warn('[kaarten] GET /api/collections mislukt', reason);

      setError(
        missing
          ? 'Deze speler bestaat niet — of de API is een oudere build zonder ' +
              '/api/collections. Herstart de API en probeer het opnieuw.'
          : 'Je collectie is niet op te halen. Draait de API, en is de migratie uitgevoerd?',
      );
    }
  }, []);

  useEffect(() => {
    if (player) void refresh(player.id);
  }, [player, refresh]);

  const choosePlayer = (next: SelectablePlayer) => {
    setPlayer(next);
    write(PLAYER_KEY, next.id);
    setOpeningPack(null);
    setRevealing(false);
    /* Somebody else's cards, mid-flight over somebody else's book. */
    stopPlacing();
    // Somebody else's, now. The guard in `applyPendingCollection` would catch it anyway;
    // dropping it here means it never has to.
    pendingCollection.current = null;
    setViewing(null);
    setCreating(false);
    // Somebody else's book, which you did not watch being bound.
    setJustBound(false);
    /*
     * Cleared, not left to be replaced.
     *
     * Two things go wrong otherwise, and both are visible. The stale collection's `album`
     * belongs to the *previous* player, so switching to someone who has not started yet
     * shows their predecessor's book with the new owner's name on the cover for a tick;
     * and on the way back, a null collection is indistinguishable from "no album", so a
     * returning visitor with a remembered name flashes the cover-choice table before their
     * own album. The loading branch below is what covers the gap.
     */
    setCollection(null);
  };

  /**
   * A leather was picked. Fires at the *start* of the ceremony, so the write happens while
   * the book travels and the name goes on rather than after it.
   *
   * The response is applied straight away — it is the whole page, so no refetch is needed
   * and a second one would be another full leaderboard replay — but `creating` keeps the
   * ceremony on screen until it says it is done.
   */
  const chooseCover = (cover: CoverId) => {
    if (!player) return;
    setCreating(true);

    void client
      .createAlbum(player.id, cover)
      .then(setCollection)
      .catch((reason) => {
        // eslint-disable-next-line no-console
        console.warn('[kaarten] POST /api/collections/create mislukt', reason);
        setError('Je album is niet aan te maken. Probeer het nog eens.');
        setCreating(false);
      });
  };

  /**
   * Picking a packet off the shelf. Reachable from the album *and* from the results
   * of the packet before it, which is the whole point of keeping the shelf up.
   *
   * `revealing` is reset here rather than relying on the opener remounting: the new
   * opener starts sealed and its `onStart` has not fired yet, so without this the
   * pile would stay inert until the second packet was torn.
   *
   * `grab` is where the packet was lying when it was clicked, and everything the flight
   * needs is decided here rather than in the render: the three halves of the gesture — the
   * packet, the pile and the book — all start on this event and have to agree about
   * whether they are running at all.
   */
  const openPack = (next: Pack, grab: PackGrab | null = null) => {
    /* The shelf is behind the viewer's scrim and so unreachable while one is open,
       but the opener would be layered under a viewer left mounted over it. */
    setViewing(null);
    setRevealing(false);

    /*
     * Land on the finished state, never play it stilled — the same rule the reveal and the
     * filing follow. The packet is simply on the stage, the pile is simply shorter, and the
     * book is simply gone.
     */
    const still = prefersReducedMotion();
    reach.current = still ? null : grab;

    /*
     * The pile as it is *now*, before the packet leaves it. Measured here because this is
     * the last moment it exists: the tile unmounts in the commit this handler schedules,
     * and the packets after it move up to fill the hole. Its own tile is deliberately not
     * recorded — it is not shifting, it is leaving.
     */
    shelfFrom.current = new Map();
    if (!still) {
      tileRefs.current.forEach((el, id) => {
        if (id !== next.id) shelfFrom.current.set(id, el.getBoundingClientRect());
      });
    }
    /*
     * The packet just finished joins the table, and this is the one place that happens:
     * reaching for the next packet is what makes the previous one's cards "already on the
     * table" rather than "the ones the opener about to unmount is drawing". See
     * `openerCards`.
     *
     * Read before `stopPlacing`, which empties the table — the one path where the row is
     * carried forward rather than being over. Both land in one commit; this is an event
     * handler.
     */
    const carried = [...table, ...openerCards.current];
    stopPlacing();
    setTable(carried);
    /*
     * The binding is behind you the moment you reach for a packet, and this has to be lowered
     * *here* rather than left to expire with the session: the opener unmounts the album, so a
     * book still marked just-bound would open itself on the voorwoord again on the way back,
     * throwing away the page you were on.
     */
    setJustBound(false);

    /*
     * The set-completion packet has a ceremony in front of it.
     *
     * **The album has to be able to hold an icoon before one can come out of a packet**, and
     * that ordering is not a preference — the draw reads the icons latch, so a packet claimed
     * before the unlock would roll an ordinary card. So this fires the unlock, plays the
     * re-binding while it is in flight, and hands the packet to the opener when the book is
     * back. `handleRebound` is the join.
     *
     * Skipped when the book is already bound, which is the test panel's path: the latch was
     * forced by hand, the cover is already half-bound, and re-binding a book that is already
     * in its icon binding is a ceremony with nothing to show.
     */
    if (isIconPack(next) && !collection?.album?.iconsUnlocked) {
      pendingIconPack.current = next;
      setRebindHandsOver(true);
      claimIcons();
      /*
       * No flight and no fade: the book is not being replaced, it is being *shut and
       * re-bound* in front of you, and the packet is handed over at the end of that. It
       * would have to lie in the margin for the length of a six-beat ceremony and then set
       * off from a shelf the reader stopped looking at long ago. The pile still closes up,
       * because the packet still left it.
       */
      reach.current = null;
      return;
    }

    /*
     * The book fades out from under the packet arriving over it. Only when there is one:
     * reaching for a second packet mid-sitting has the opener on screen already, and this
     * is what keeps the album from being mounted for 440ms to fade something nobody could
     * see. See `bookPass`.
     */
    if (!still && !openingPack) setBookPass('leaving');
    setOpeningPack(next);
  };

  /**
   * Registers a tile, so the pile can be measured before one is taken off it.
   *
   * Fresh on every render like `setSlotRef` in the opener, which is what makes it
   * impossible to hold a node that has been unmounted: React hands the callback a null
   * for the old element before it hands the new one an element.
   */
  const setTileRef = (id: string, el: HTMLButtonElement | null): void => {
    if (el) tileRefs.current.set(id, el);
    else tileRefs.current.delete(id);
  };

  /** The same, for the clones sliding in. Same construction, same reason. */
  const setDealRef = (id: string, el: HTMLDivElement | null): void => {
    if (el) dealRefs.current.set(id, el);
    else dealRefs.current.delete(id);
  };

  /*
   * The pile opening and closing: a FLIP over whatever is on the shelf.
   *
   * The shelf is a wrapping row two packets wide, so a packet taken out of the middle of
   * it pulls every one after it up a place — and one put back pushes them down again. Until
   * now they simply appeared in their new positions on the next frame, which reads as the
   * pile rearranging itself rather than as one packet having left it or rejoined it.
   *
   * `translate` rather than `transform`, and that is not a preference: a packet lies at an
   * angle (`transform: rotate(var(--tilt))`) and grows under the pointer, both from the
   * stylesheet, and an inline `transform` would flatten a packet for the whole shift and
   * kill the hover on any tile the pointer happened to be over. The individual property
   * composes underneath both and leaves them alone.
   *
   * The packet coming back does not shift, it *arrives*, and its tile is not what the
   * reader watches arrive — the clone is (see `returning`). What happens here is that the
   * clone is given its landing place, which cannot be known until the tile holding it
   * exists.
   *
   * No dependency list. It has to run after the commit that added or removed the tile, and
   * the measurements it consumes are the only thing that says there was one — every other
   * render finds nothing pending and stops on the first line.
   */
  useLayoutEffect(() => {
    const flight = pendingFlight.current;
    const deal = pendingDeal.current;
    if (shelfFrom.current.size === 0 && !flight && !deal) return;

    pendingFlight.current = null;
    pendingDeal.current = false;
    const was = shelfFrom.current;
    shelfFrom.current = new Map();

    const duration = ms(SHELF_SHIFT_MS);
    /* The step shrinks so the pile is always down within `DEAL_SPREAD_MAX` of the first
       packet moving. One clone means no spread at all, hence the guard on the divisor. */
    const step =
      dealRefs.current.size > 1
        ? Math.min(DEAL_STEP, DEAL_SPREAD_MAX / (dealRefs.current.size - 1))
        : 0;
    let dealt = 0;

    tileRefs.current.forEach((el, id) => {
      const to = el.getBoundingClientRect();

      /*
       * A packet being brought over: its clone is below the fold and this tile is where it
       * is going, hidden underneath until it gets there.
       *
       * The clone is drawn *at* the tile rather than flown between two measured boxes, which
       * is what makes this simpler than the return flight: it lands at the tile's own size,
       * so there is no scale to solve and the only thing in motion is how far below the
       * table edge it starts. `offsetWidth`/`offsetHeight` for the box and the bounding rect
       * for the place, for the reason `PackGrab` documents — a leaning packet's bounding box
       * is the box around the lean, so only its centre is a fact about the packet.
       */
      const clone = deal ? dealRefs.current.get(id) : undefined;
      if (clone) {
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        /* Its own tilt, read off the tile: `PackTile` derives it from the pack id and writes
           it inline, so this is the angle the packet actually lies at. */
        const tilt = el.style.getPropertyValue('--tilt') || '0deg';
        /* Scaled once, at the end, rather than per step: `ms` rounds, and a fractional step
           rounded nineteen times drifts past the cap the step was solved to fit. */
        const delay = ms(DEAL_WAIT + dealt * step);
        dealt += 1;

        clone.style.setProperty('--pack-w', `${w}px`);
        clone.style.left = `${Math.round(to.left + to.width / 2 - w / 2)}px`;
        clone.style.top = `${Math.round(to.top + to.height / 2 - h / 2)}px`;

        /* Off the bottom of the viewport by its own height, so it is genuinely out of the
           frame at every window size rather than at the one this was written on. */
        clone.style.setProperty('transition', 'none');
        clone.style.setProperty(
          'translate',
          `0px ${Math.round(window.innerHeight - to.top + h)}px`,
        );
        clone.style.setProperty('rotate', `${parseFloat(tilt) + DEAL_LEAN}deg`);
        // Committed where it starts before it is told to move, or the flight collapses
        // into its landing frame — the same reflow the return flight needs.
        void clone.offsetWidth;
        clone.style.setProperty(
          'transition',
          `translate ${ms(DEAL_MS)}ms ${CARRY} ${delay}ms, rotate ${ms(
            DEAL_MS,
          )}ms ${CARRY} ${delay}ms`,
        );
        clone.style.setProperty('translate', '0px 0px');
        clone.style.setProperty('rotate', tilt);
        return;
      }

      /*
       * The packet being put back: the clone is standing on the stage and this tile is its
       * destination, hidden underneath until it gets there. Centre to centre, because the
       * clone both shrinks and takes on the tile's lean on the way — and a tile's box is
       * the box *around* its lean, so only its centre is a place.
       */
      if (flight && id === flight.id) {
        const clone = flightRef.current;
        if (!clone) return;

        const dx = to.left + to.width / 2 - flight.from.cx;
        const dy = to.top + to.height / 2 - flight.from.cy;

        // Committed as it stands before it is told to move, or there is nothing to
        // transition from and the whole flight collapses into its landing frame.
        void clone.offsetWidth;
        clone.style.setProperty(
          'transition',
          `translate ${duration}ms ${CARRY}, rotate ${duration}ms ${CARRY}, scale ${duration}ms ${CARRY}`,
        );
        clone.style.setProperty('translate', `${dx}px ${dy}px`);
        /* The tile's own lean, read off the tile: `PackTile` derives it from the pack id
           and writes it inline, so this is the packet's angle rather than a guess at it. */
        clone.style.setProperty('rotate', el.style.getPropertyValue('--tilt') || '0deg');
        clone.style.setProperty('scale', String(el.offsetWidth / flight.from.w));
        return;
      }

      const from = was.get(id);
      if (!from) return;

      const dx = from.left - to.left;
      const dy = from.top - to.top;
      /* Most of the pile does not move: only the packets after the one that left or came
         back. */
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

      el.style.setProperty('transition', 'none');
      el.style.setProperty('translate', `${dx}px ${dy}px`);
      // Force the inverted position to be committed before releasing it.
      void el.offsetWidth;
      el.style.setProperty('transition', `translate ${duration}ms ${CARRY}`);
      el.style.setProperty('translate', '0px 0px');

      window.setTimeout(() => {
        /* Back to the stylesheet, so `.pack`'s own hover transition is the packet's
           again the moment it has settled. */
        el.style.removeProperty('translate');
        el.style.removeProperty('transition');
      }, duration + 20);
    });
  });

  /**
   * The end of a pass, either way round: the book is gone, or the packet is home.
   *
   * The fades themselves are CSS — see `.album-layout--reaching` and `--returning` — and
   * this is only what ends the state they hang off. Dropping `returning` is what takes the
   * clone away and uncovers the real tile underneath it, which is why one timer serves
   * both: they are the same 440ms, and the packet must not be visible twice on any frame.
   *
   * An effect rather than a timer in the handler so the cleanup cancels it: a page that
   * unmounted mid-flight would otherwise set state on a component that is not there.
   */
  useEffect(() => {
    if (!bookPass) return undefined;

    const timer = window.setTimeout(
      () => {
        unstable_batchedUpdates(() => {
          setBookPass(null);
          setReturning(null);
        });
      },
      /*
       * A frame of slack, because this is a *hand-over* and not a cleanup: the clone goes
       * and the tile underneath it appears on the same commit, so firing a frame early
       * would show the gap between them. Late shows nothing at all — the clone is already
       * sitting exactly on the tile it is being swapped for.
       */
      ms(REACH_MS) + 30,
    );

    return () => window.clearTimeout(timer);
  }, [bookPass]);

  /**
   * The end of the pile arriving: the clones go and the tiles underneath them come out.
   *
   * Same hand-over as the return flight above, and the same frame of slack for the same
   * reason — the clone is by then sitting exactly where the tile is, so being late shows
   * nothing and being early shows a gap.
   *
   * **One `playSlot`, on the frame the first packet touches down.** Per packet is what a
   * deal would want and this is not a deal — see the `DEAL_MS` block. It is also the sound
   * the rest of the page uses for a thing coming to rest on the table, so the packets and
   * the cards going into the book agree about what landing sounds like.
   */
  useEffect(() => {
    if (!dealing) return undefined;

    const spread = Math.min(DEAL_SPREAD_MAX, DEAL_STEP * (dealing.length - 1));
    const land = window.setTimeout(playSlot, ms(DEAL_WAIT + DEAL_MS));
    const done = window.setTimeout(
      () => setDealing(null),
      ms(DEAL_WAIT + DEAL_MS + spread) + 30,
    );

    return () => {
      window.clearTimeout(land);
      window.clearTimeout(done);
    };
  }, [dealing]);

  /**
   * Applies whatever collection came back with the last claim, if it has not been yet.
   *
   * The claim answers with the cards *and* the collection they landed in, so there is no
   * refetch — but that state then has to be applied on **every** path that ends a reveal,
   * not just the one where the animation runs to the end. Leaving mid-reveal never fires
   * `onFinished`, and before this the page would have gone on showing a packet the server
   * had already consumed, 404ing when you clicked it.
   *
   * Idempotent, because two of those paths can run for the same reveal, and it drops a state
   * belonging to anybody but the player now signed in.
   *
   * `useCallback` because `PackOpener`'s `finish` closes over `onFinished` and lists it as a
   * dependency — an identity that changed every render would rebuild the callback the
   * reveal's timers are hung off, mid-reveal.
   */
  const applyPendingCollection = useCallback((forPlayerId?: string) => {
    const pending = pendingCollection.current;
    pendingCollection.current = null;

    if (!pending) return;
    if (forPlayerId !== undefined && pending.playerId !== forPlayerId) return;

    setCollection(pending.state);
  }, []);

  /**
   * Putting the opener away with nothing to place: a sealed packet put back down, a pack
   * of nothing but doubles, or a reader who has asked for less motion.
   *
   * Clears `handsFull` as well as the packet — see the flag's note. This used to be a
   * bare `setOpeningPack(null)`, which meant that leaving mid-reveal unmounted the one
   * component that would ever have lowered the flag, and the shelf stayed dimmed and
   * unclickable until the page was reloaded.
   *
   * `from` is where the packet is standing, and it is **the way in run backwards**: the
   * packet goes home to its place on the pile, the pile opens to take it, and the book
   * comes back up underneath. Only the sealed-packet caller has one — a reduced-motion
   * filing has no packet on the table and nothing to fly.
   *
   * **One commit, and here it is load-bearing.** The packet is put down by clicking the
   * table, which is a React handler and batches — but the same gesture is on Escape, and
   * that listener is a plain `window.addEventListener` inside the opener. `index.tsx`
   * mounts with legacy `ReactDOM.render`, which does not batch native listeners: unbatched,
   * `setReturning` commits on its own, the layout effect below runs while the packet is
   * *still* on the stage and finds no tile to fly to, and consumes the flight. The clone
   * would then hang in the middle of the table until its timer took it away.
   */
  const closeOpener = (from: PackGrab | null = null) => {
    applyPendingCollection(player?.id);

    /*
     * Everything the return needs, decided here for the same reason the way in decides it
     * in `openPack`: the three halves of the gesture start on this one event.
     *
     * The pile is measured *before* the packet rejoins it, and the tile it is rejoining is
     * deliberately not in that measurement — it has no old position, it is arriving. The
     * flight is a clone rather than that tile, because the shelf clips; see `returning`.
     */
    shelfFrom.current = new Map();
    pendingFlight.current = null;

    unstable_batchedUpdates(() => {
      if (from && openingPack && !prefersReducedMotion()) {
        tileRefs.current.forEach((el, id) =>
          shelfFrom.current.set(id, el.getBoundingClientRect()),
        );
        pendingFlight.current = { id: openingPack.id, from };
        setReturning({ pack: openingPack, from });
        setBookPass('returning');
      }

      setOpeningPack(null);
      setRevealing(false);
      /*
       * And the table goes with it. Both callers mean "the row is over": a sealed packet put
       * back has nothing on the table behind it (with cards there, a click on the table files
       * them instead — see `tableClick` in PackOpener), and the reduced-motion path has just
       * had its cards put in the book without a row being drawn at all. Leaving it set would
       * put filed cards back on the table the next time a packet was opened.
       */
      stopPlacing();
    });
  };

  const toggleFast = () => {
    const next = !fastMode;
    setFastMode(next);
    write(FAST_KEY, String(next));
  };


  /*
   * Both counts per subject, because a slot is filled by a card of its own kind — the
   * album picks the one matching the slot it is drawing and brackets the other. See
   * `OwnedCardCount`, and `MintTally` on the server for the rule itself.
   */
  const counts = useMemo(() => {
    const map = new Map<string, OwnedCounts>();
    collection?.owned.forEach((owned) =>
      map.set(owned.playerId, { asPlayer: owned.asPlayer, asIcon: owned.asIcon }),
    );
    return map;
  }, [collection]);

  /*
   * One book, one sequence. Icons are not a separate view behind a tab, and no
   * longer a block of pages bolted onto the end either — they are **shuffled in
   * among the actives by rating**, so an icoon turns up on the spread its rating
   * earns it rather than in an icons annexe.
   *
   * That is what makes the unlock feel like the book growing rather than gaining
   * an appendix: every spread you already knew gets denser, and the rarest card in
   * the album is now an icoon sitting at the very end past the best active player.
   * Before the unlock they are absent entirely.
   *
   * Consequence worth knowing: an empty slot no longer tells you whether it is an
   * active or an icoon, because silhouettes are deliberately identical and not
   * marked as icoons. That used to be readable from which pages you were on.
   *
   * This is also what makes a card turn into an icoon under you. Slots come from
   * the live pool, so somebody going out of service moves their card from `pool`
   * to `icons` — you keep it either way, but while the icons are locked it has no
   * slot to sit in and quietly leaves the book until you claim them.
   */
  const sections: AlbumSection[] = useMemo(() => {
    if (!collection) return [];

    const unlocked = collection.album?.iconsUnlocked ? collection.icons : [];

    /*
     * Ascending by rating, so the book builds toward its best page: you open on
     * the commons and the last spread is the players you are least likely to
     * hold. Sorted explicitly rather than reversed, because the source order is
     * the leaderboard's and should not be relied on here.
     *
     * An icoon sorts on the same field as everyone else — `visibleRating` carries
     * their all-time high rather than a current rating, which is exactly the
     * number their card is rated on, so no special case is needed here.
     */
    const players = [...collection.pool, ...unlocked].sort(
      (a, b) => a.visibleRating - b.visibleRating,
    );

    return [{ title: 'Spelers', players, counts }];
  }, [collection, counts]);

  const ownerName = player ? splitName(player.name).display : undefined;

  /*
   * Every slot the book prints, in printed order, for the card viewer to walk.
   *
   * Built by the same function the album renders from, and fed the same owner —
   * which affects the page list (the cover) and so must match, or the two disagree
   * about which page a card is on.
   */
  const slotOrder = useMemo(() => albumSlotOrder(sections, ownerName), [sections, ownerName]);

  /*
   * The album can shrink under the viewer — a different player is picked, or a
   * reveal refreshes the collection — so an index can outlive the slot it pointed
   * at, and it does so *during* the render that shrank the list, before any effect
   * gets a chance to tidy up. Hence the lookup rather than the index everywhere
   * below, with the effect only resetting the state afterwards. Closing is the right
   * answer rather than clamping: clamping silently shows a different card.
   */
  const viewingSlot = viewing === null ? undefined : slotOrder[viewing];

  useEffect(() => {
    setViewing((current) =>
      current === null || current < slotOrder.length ? current : null,
    );
  }, [slotOrder.length]);

  /**
   * The games gate, derived from the **picked player** rather than from the response.
   *
   * `collection.eligible` says the same thing authoritatively, and the create endpoint
   * enforces it — but it is undefined for the whole fetch window, so branching on it would
   * flash the gate notice on every pick and again after every reveal. The picker already
   * carries the game count, so the check costs nothing here and is stable.
   */
  const eligible = !player || player.numberOfGames >= MIN_GAMES;

  /**
   * The server's gate, for the locked album's copy, so the number quoted cannot drift from
   * the rule that is actually enforced. The ledger no longer quotes it at all — the gate is
   * not that page's business any more.
   */
  const minGames = collection?.minGames ?? MIN_GAMES;

  /**
   * Whether there is an album to draw at all. Distinct from `collection === null`, which
   * means the read has not landed — see `choosePlayer`.
   */
  const hasAlbum = collection?.album != null;
  const showChoice = collection !== null && (creating || collection.album == null);

  /*
   * There is no "the icons are claimable" flag on this page, and deliberately none.
   *
   * Completing the set puts a **packet** on the shelf, and that packet being there is the
   * whole of the offer — it arrives through `collection.packs` like every other one, and it
   * is recognised by `isIconPack`. A second boolean saying the same thing would be a second
   * thing to keep in step with the server's derivation, and the two would eventually
   * disagree about whether the affordance should be on screen.
   */

  /**
   * The claim, and the only place it happens.
   *
   * It answers with the cards *and* the collection they landed in, and this splits the two:
   * the cards go to the opener, which is what its `onOpen` contract is, and the collection
   * is parked until the reveal is over. That is why the claim gaining a second half needed
   * no change to `PackOpener` at all.
   */
  const handleOpen = useCallback(
    async (pack: Pack): Promise<RevealedCard[]> => {
      if (!player) return [];

      const { cards, state } = await client.revealPack(player.id, pack.id);
      pendingCollection.current = { playerId: player.id, state };
      return cards;
    },
    [player],
  );

  /**
   * The reveal is over. Apply what the claim already told us, rather than asking again.
   *
   * This used to be `refresh(player.id)` — a second `GET /api/collections`, and so a second
   * full leaderboard replay for one pack. It also left a window where the reveal had ended
   * but the shelf and the book were still the pre-claim ones.
   */
  const handleFinished = useCallback((cards: RevealedCard[]) => {
    setRevealing(false);
    applyPendingCollection(player?.id);
    /*
     * And the packet's cards are now on the table. Parked rather than appended: this
     * opener is still mounted and still drawing them, so they only join `table` when the
     * reader reaches for the next packet. See `openerCards`.
     */
    openerCards.current = cards;
  }, [applyPendingCollection, player]);

  /**
   * The filing is over, or has been interrupted. Nothing is in the air and the table is
   * clear.
   *
   * `held` must go with it or a slot whose card never arrived stays drawn as a hole for the
   * rest of the session, and the table has to be emptied — those cards are in the book now,
   * and a row that outlived its own filing would be flown into the album a second time.
   */
  const stopPlacing = useCallback(() => {
    setPlacing(null);
    setHeld([]);
    setTable([]);
    openerCards.current = [];
  }, []);

  /**
   * **The reader has stopped opening.** The table gets cleared and what is kept goes in
   * the book; the opener passes every card on the row and the box it is lying in, and
   * everything after that is the book's.
   *
   * **Lowest rated first, working up.** The sequence climbs to the best card in the pack
   * and the book is left lying open on it, which is the only ordering that ends on the
   * thing worth ending on — the reveal already spends its ceremony that way. The sort is
   * stable, so cards of equal rating stay in the order they came out of the packet.
   *
   * A pack of nothing but doubles still runs this: there is a table to clear even when
   * there is nothing to place, and the sequence simply goes from `clearing` to `resting`.
   * The only path that skips straight out is an empty hand-over, which is what reduced
   * motion and `snel openen` send.
   *
   * `applyPendingCollection` is a formality by now: `handleFinished` applied it when the
   * last card settled. It stays because the guarantee this path depends on is "the cards
   * are in the collection before they are flown into it" — the flight needs a filled slot
   * to land in and `held` is what hides it — and the call states that rather than assuming
   * the order two callbacks fire in.
   *
   * One commit, via `unstable_batchedUpdates`: this arrives from a timeout inside the
   * opener, and `index.tsx` mounts with legacy `ReactDOM.render`, which does not batch
   * those. Unbatched, the opener would unmount a frame before the book was open on the
   * right page, and the cards would be moving over a table with nothing on it.
   */
  const putAway = (revealed: { card: RevealedCard; from: DOMRect }[]) => {
    /* Where each one is printed. A card with no slot in this book cannot be flown into
       it — that is an icoon whose latch is shut, and it simply has nowhere to go. */
    const all: Placing[] = revealed.flatMap(({ card, from }) => {
      const slot = slotOrder.find((s) => s.card.player.id === card.player.id);
      return slot ? [{ card, from, page: slot.page }] : [];
    });

    /* Nothing came over at all: reduced motion or `snel openen`. Exactly what the old
       exit button did. */
    if (all.length === 0) {
      closeOpener();
      return;
    }

    /*
     * The keepers, as **positions in the row** rather than as cards.
     *
     * Positions because the row can hold the same player twice over two packets — new in
     * the first, a double in the second — so a player id does not identify a card on the
     * table. It still identifies a *slot*, which is all the flight and `held` need.
     */
    const order = all
      .map((_, index) => index)
      .filter((index) => all[index].card.isNew)
      .sort((a, b) => all[a].card.overall - all[b].card.overall);

    unstable_batchedUpdates(() => {
      applyPendingCollection(player?.id);
      setHeld(order.map((index) => all[index].card.player.id));
      setPlacing({ all, order, index: 0, phase: 'clearing' });
      setOpeningPack(null);
      /*
       * The row is being taken apart, so the table is empty from here — `PutAway` holds
       * the cards from now on, and the opener that was drawing them is unmounted in this
       * same commit. Leaving it set would put the row back on screen the moment the next
       * packet was opened, with cards that are already in the book.
       */
      setTable([]);
      openerCards.current = [];
    });
  };

  /**
   * The beats the page times, which are the two where nothing else is happening.
   *
   * One effect per beat rather than a chain of timers, so its cleanup cancels whatever is
   * pending the moment the sequence is interrupted. `clearing` and `flying` are `PutAway`'s
   * and `turning` is the album's — all three report, and the only thing kept for `turning`
   * here is a cap in case the report never comes.
   */
  useEffect(() => {
    if (!placing || placing.phase === 'clearing' || placing.phase === 'flying') {
      return undefined;
    }

    if (placing.phase === 'resting') {
      const timer = window.setTimeout(stopPlacing, ms(PLACE_REST_MS));
      return () => window.clearTimeout(timer);
    }

    /*
     * The book fading in on an empty table. Nothing else moves for the length of it: the
     * cards have just been stood aside and the first one should not set off while the thing
     * it is going into is still arriving.
     */
    if (placing.phase === 'arriving') {
      const timer = window.setTimeout(
        () =>
          setPlacing((current) =>
            current
              ? { ...current, phase: current.order.length === 0 ? 'resting' : 'turning' }
              : current,
          ),
        ms(PLACE_ARRIVE_MS),
      );
      return () => window.clearTimeout(timer);
    }

    /* The card that just landed, left alone before the book moves again. */
    if (placing.phase === 'settling') {
      const timer = window.setTimeout(
        () =>
          setPlacing((current) =>
            current
              ? { ...current, index: current.index + 1, phase: 'turning' }
              : current,
          ),
        ms(PLACE_SETTLE_MS),
      );
      return () => window.clearTimeout(timer);
    }

    /*
     * Waiting on the book, with a net under it. `bookArrived` is what normally moves this
     * on; see `PLACE_TURN_CAP_MS` for why a missed report must not be able to strand the
     * page with its table dimmed.
     */
    const timer = window.setTimeout(() => {
      // eslint-disable-next-line no-console
      console.warn('[kaarten] het album meldde de bladzijde niet — toch maar plaatsen');
      setPlacing((current) =>
        current && current.phase === 'turning' ? { ...current, phase: 'flying' } : current,
      );
    }, ms(PLACE_TURN_CAP_MS));
    return () => window.clearTimeout(timer);
  }, [placing, stopPlacing]);

  /**
   * The book is open on this card's page and standing still, so the card can go in.
   *
   * Guarded on the id as well as the phase: the album reports the page it was asked for,
   * and a report for a card the sequence has already moved past — a stale turn finishing
   * after an interruption — must not launch the next one early.
   */
  const bookArrived = (playerId: string) => {
    setPlacing((current) => {
      if (!current || current.phase !== 'turning') return current;
      const placing = current.all[current.order[current.index]];
      if (placing.card.player.id !== playerId) return current;
      return { ...current, phase: 'flying' };
    });
  };

  /**
   * That card is in the book: let its slot fill, and give it a beat before the next.
   *
   * Called from inside `PutAway`'s own batched commit, so the slot filling, the clone
   * unmounting and the next beat starting are one render. The index advances in the
   * `settling` beat rather than here, so the card that has just arrived is still the
   * current one for as long as it is being looked at.
   */
  const cardPlaced = () => {
    const arrived = placing && placing.all[placing.order[placing.index]];
    setHeld((current) => current.filter((id) => id !== arrived?.card.player.id));
    setPlacing((current) => {
      if (!current) return current;
      return current.index + 1 >= current.order.length
        ? { ...current, phase: 'resting' }
        : { ...current, phase: 'settling' };
    });
  };

  /**
   * The claim was refused, and the wrapper is already torn.
   *
   * This only became reachable when the opener stopped awaiting the roll before playing
   * the tear. Before that a refusal left the packet sealed and the page stranded behind
   * an exit button that hides itself for the length of a reveal — wrong, but invisibly
   * so. Now the tear has visibly happened, so the failure has to be visible too.
   *
   * Back to the album and a refetch, rather than `setError`, which replaces the whole
   * page with a notice you can only leave by reloading. The refetch is the substance of
   * it: **every** refusal this endpoint issues means the shelf is out of date — 409 for
   * a packet already opened in another tab, 404 for one that expired at midnight or for
   * a game that has since been deleted — so asking again both explains the packet
   * disappearing and is the fix.
   */
  const handleFailed = useCallback(
    (reason: unknown) => {
      // eslint-disable-next-line no-console
      console.warn('[kaarten] POST /api/collections/packs/claim mislukt', reason);
      pendingCollection.current = null;
      setOpeningPack(null);
      setRevealing(false);
      /* The table goes with the opener: it is drawn by it, and the refetch below is about
         to replace everything this row was a record of. */
      stopPlacing();
      if (player) void refresh(player.id);
    },
    [player, refresh, stopPlacing],
  );

  /**
   * The pile, less the packet currently on the stage — that one is in your hands, not
   * lying on the table. It leaves the shelf on the click rather than on the refresh
   * at the end of the reveal, so the pile shrinks at the moment you pick one up.
   */
  const shelfPacks = useMemo(
    () => collection?.packs.filter((p) => p.id !== openingPack?.id) ?? [],
    [collection, openingPack],
  );

  /** Which tiles are holding a place for a packet still in the air. See `dealing`. */
  const dealingIds = useMemo(() => new Set(dealing?.map((p) => p.id) ?? []), [dealing]);

  /**
   * Starting the delivery, on the first commit that has a shelf to deliver onto.
   *
   * The trigger has to be here rather than in `onDone`, because that callback cannot see the
   * pile — see `undelivered`. What it *can* see is the ceremony ending, and this watches for
   * the consequence: the choice gone, and packets on the table.
   *
   * **A layout effect, and it must stay one.** Raising `dealing` mounts the clones, and only
   * the commit after that can measure a tile and fly them; React flushes a layout effect's
   * update synchronously before painting, so both commits land in one frame and the tiles
   * are never seen unheld. From an ordinary effect the pile would paint once, in place, and
   * only then be hidden and flown — the snap this exists to remove, with a flicker on top.
   *
   * **Below `shelfPacks` and after the flight effect**, and both positions are load-bearing:
   * it reads the first, and effects run in declaration order, so the re-render this schedules
   * reaches the flight effect with `pendingDeal` already up.
   *
   * Once per binding. If the pile is empty at the handover — a colleague who crossed the gate
   * with nothing banked — the note stays up and the first packets to arrive are flown
   * instead, which is the same promise kept later rather than a delivery missed.
   */
  useLayoutEffect(() => {
    if (!undelivered.current || showChoice || shelfPacks.length === 0) return;

    undelivered.current = false;
    pendingDeal.current = true;
    setDealing(shelfPacks);
  }, [showChoice, shelfPacks]);

  /**
   * Hand the signed-in player a pack, as a present.
   *
   * The panel always addresses the packet to whoever is signed in. The endpoint takes a
   * list of players or nobody at all (meaning everybody), but a button that quietly gave
   * the whole office a packet is not a thing to have one click away from a button that
   * gives you one — so the other two shapes are reachable from the API and not from here.
   *
   * **Then a refetch, and that one is deliberate too.** Giving answers with the gift ids
   * rather than a collection, because a present to everybody has no single collection to
   * answer with. So this pays the leaderboard replay that the claim route works so hard to
   * avoid — which is the right trade for something clicked by hand rather than a thousand
   * times a year, and the reason the shelf takes a beat to show the packet.
   *
   * The console rather than `setError` on failure, which would replace the whole page with
   * a notice and need a reload to get out of — far too much for a scaffolding button.
   */
  const grant = (options: GrantOptions) => {
    if (!player) return;

    void client
      .giftPack({ ...options, playerIds: [player.id] })
      .then(() => refresh(player.id))
      .catch((reason) => {
        // eslint-disable-next-line no-console
        console.warn('[kaarten] POST /api/collections/gifts mislukt', reason);
      });
  };

  /**
   * The set-completion packet was picked up: unlock the icons and start the re-binding.
   *
   * The write goes out **at the start** of the ceremony, the same contract `AlbumChoice`
   * has with `onChoose`, so it is in flight while the book shuts. It is two calls rather
   * than one because the draw reads the icons latch, and the packet must not be claimed
   * before the unlock has landed — which the reader's own click on the sealed packet leaves
   * an unbounded pause for, so the ordering has slack and the early send is buying latency
   * rather than safety.
   *
   * **The answer is parked, not applied**, exactly as the pack reveal parks its own. It
   * carries the unlock, the unlock is what re-binds the book, and applying it here put the
   * finished book on screen in the first moments of the ceremony that exists to reveal it —
   * the reader watched an already-bound book shut, charge and bloom to nothing. `Album`
   * drives the binding off the beats, so the swap lands under the white-out whether this
   * took 40ms or four seconds.
   *
   * Nothing between here and `handleRebound` needs it: the packet is handed over by id and
   * the opener claims it against the API, which answers with its own fresh state.
   */
  const claimIcons = () => {
    if (!player) return;
    const forPlayerId = player.id;

    setRebinding(true);

    void client
      .claimIcons(forPlayerId)
      .then((state) => {
        /*
         * The ceremony is longer than this request by a wide margin, but not by construction
         * — unlike the pack reveal, which waits on its own claim. So if the book has already
         * been handed back there is nothing left to hold the answer for, and it applies
         * itself rather than being parked for a handover that has been and gone. The packet
         * `handleRebound` takes is the signal: it is set before this call and cleared there.
         */
        if (pendingIconPack.current === null) {
          setCollection(state);
          return;
        }

        pendingIconState.current = { playerId: forPlayerId, state };
      })
      .catch((reason) => {
        /*
         * Deliberately **not** aborting the ceremony. It has already started, and a book
         * that stops halfway through being re-bound is a worse artefact than one that
         * finishes and then reports a problem — `handleRebound` finds no unlock and puts
         * things back.
         */
        // eslint-disable-next-line no-console
        console.warn('[kaarten] PUT /api/collections/icons mislukt', reason);
        pendingIconPack.current = null;
      });
  };

  /**
   * The re-binding is over, so hand the packet to the opener.
   *
   * This is the join between the two ceremonies: the book has closed and been re-bound, and
   * the card that goes in it comes out of the packet next. `PackOpener` needs no knowledge
   * of any of it — it is handed a pack like any other.
   *
   * If there is no packet waiting the unlock failed, and the recovery is a refetch rather
   * than a retry: the only refusal this endpoint issues is a 409 saying the set is not in
   * fact complete, which means this page's view of it was stale. Asking again both explains
   * the packet disappearing and is the fix. Same reasoning as `handleFailed`.
   */
  const handleRebound = useCallback(() => {
    const packet = pendingIconPack.current;
    const unlocked = pendingIconState.current;
    const demo = rebindDemo.current;
    pendingIconPack.current = null;
    pendingIconState.current = null;
    rebindDemo.current = false;
    setRebinding(false);

    /*
     * The unlock lands here, which is what makes the book's own binding the ceremony's to
     * announce. The album grows by roughly half in the same commit and that is free: the
     * book is shut, and on the path that has a packet it is about to be replaced by the
     * opener anyway.
     */
    if (unlocked && unlocked.playerId === player?.id) setCollection(unlocked.state);

    /* Played from the test panel: nothing was claimed and nothing is owed. The book keeps its
       icon binding until the next read, which is the point of watching it. */
    if (demo) return;

    if (packet) {
      setOpeningPack(packet);
      return;
    }

    if (player) {
      setError('Het ontgrendelen van de iconen is niet gelukt. Probeer het zo nog eens.');
      void refresh(player.id);
    }
  }, [player, refresh]);

  /**
   * Play the re-binding on its own, from the test panel.
   *
   * **No server call and no packet**, which is the whole point: the ceremony is six beats
   * long and happens once in a collection's life, so tuning it against the real thing would
   * mean rebuilding a completed set for every look at it.
   *
   * It leaves the book bound until the next read of the collection, because nothing was
   * written — reload and it is leather again.
   */
  const playRebindDemo = () => {
    if (!player || !hasAlbum) return;
    rebindDemo.current = true;
    setRebindHandsOver(false);
    setRebinding(true);
  };

  /**
   * The icons latch, forced by hand. Development only, and a real row rather than a
   * client-side flag — the alternative is completing a 37-card set to see one icoon.
   *
   * Deliberately **not** `claimIcons`, and deliberately not the ceremony either. This is
   * the bypass: it skips the completeness check the real claim enforces, and it sets the
   * book's binding without the moment that earns it. Pressing the seal is the feature.
   */
  const forceIcons = () => {
    if (!player) return;

    void client
      .forceIcons(player.id, !collection?.album?.iconsUnlocked)
      .then(setCollection)
      .catch((reason) => {
        // eslint-disable-next-line no-console
        console.warn('[kaarten] PUT /api/collections/icons mislukt', reason);
        setError(
          'De iconen omzetten lukt niet. Dit werkt alleen als de API in Development draait.',
        );
      });
  };

  /**
   * Back to the front door: forget who this browser is.
   *
   * The stored id is the *only* thing that makes this browser "you", so removing it is the
   * whole of signing out. Nothing on the server is touched — the album survives, which is
   * the point: this is for checking that a returning visitor lands on their own book
   * without a flash of the ledger, which needs the album to still be there.
   */
  const forgetPlayer = () => {
    forget(PLAYER_KEY);
    setPlayer(null);
    setCollection(null);
    setOpeningPack(null);
    setRevealing(false);
    pendingCollection.current = null;
    setViewing(null);
    setCreating(false);
    setRestoring(false);
    setJustBound(false);
    setError(null);
    stopPlacing();
  };

  /**
   * Back to the start of the story: no album, no cards, no packs.
   *
   * Server-side, because the album is a row — `mockDebug` writing to module state would
   * leave the real one in place and the two silently disagreeing, which is exactly the class
   * of bug the test panel is supposed to help find. Lands on the cover choice.
   */
  const emptyCollection = () => {
    if (!player) return;
    setCreating(false);
    // The ceremony is about to run again, and it sets this itself when it finishes.
    setJustBound(false);
    setViewing(null);
    setOpeningPack(null);
    setRevealing(false);
    // The collection this describes is about to stop existing.
    pendingCollection.current = null;
    // And so is the book the cards were being flown into.
    stopPlacing();

    void client
      .emptyCollection(player.id)
      .then(setCollection)
      .catch((reason) => {
        // eslint-disable-next-line no-console
        console.warn('[kaarten] DELETE /api/collections mislukt', reason);
        setError(
          'Leegmaken lukt niet. Dit werkt alleen als de API in Development draait.',
        );
      });
  };

  /* ---------------------------------------------------------------- */

  /*
   * **There is no header.** It held a type-ahead and a mute button, and both are gone.
   *
   * The picker was the last undisguised control on the table, and it was also the thing that
   * made reading a colleague's collection a matter of typing a different name into a box
   * that was already open. The design has always accepted that as *possible* — there is no
   * authentication and never will be — while not wanting to invite it, and an open text
   * field pointed at everybody's albums is an invitation. Signing out and back in through
   * the register is the same number of clicks and reads as a deliberate act.
   *
   * `snel openen` moved to the test panel, where it belongs: it skips the reveal, which is
   * the part of this feature people are here for, so it is a development convenience rather
   * than a setting.
   *
   * The mute button went for a different reason — see GameShell.
   */

  /*
   * **There is no footer.** It carried "n/m actieve spelers", a completion meter, a card
   * count and a line about the iconen — four readouts of state the album itself already
   * shows, pinned under the table where nothing else lives. The book is the readout: an
   * empty slot is a missing player, and the seal beside it says when the set is done.
   */

  /*
   * Seven states, and **the order is the design**. Four of the orderings are bugs:
   *
   *   error       first, or a failed read looks like "no album" and invites a cover pick
   *               whose write then fails too.
   *   restoring   before the ledger, or a returning visitor is shown the front door for a
   *               round trip and then has it swapped for their own album.
   *   no player   the ledger. The front door.
   *   loading     the hourglass — and, for the first 420ms of it, nothing. Without this
   *               branch a returning visitor flashes the cover-choice table before their
   *               own album, because a null collection and a null `album` are
   *               indistinguishable.
   *   under gate  the locked album, and before the album check — or an under-gate player
   *               spends the whole binding ceremony and lands on the padlock with it used
   *               up. (The server refuses the write as well; this is what stops them being
   *               offered it.)
   *   no album    the opening sequence, held on screen by `creating` rather than by the
   *               response.
   *   otherwise   the book.
   */
  // No title or subtitle: the book's own cover says whose album it is.
  return (
    <GameShell>
      {error ? (
        <div className="game-notice">{error}</div>
      ) : restoring ? (
        /* A name is remembered but not yet resolved — see `restoring`. Not the ledger:
           this is the only reason the front door is ever withheld. */
        <Hourglass caption="Even kijken wie je bent…" />
      ) : !player ? (
        <SigningLedger players={players} onChoose={choosePlayer} />
      ) : collection === null ? (
        /*
          The read is in flight.

          This used to be blank, on the grounds that a spinner flashing for 80ms against a
          local API is noise — which is right about the spinner and wrong about the blank.
          The hourglass keeps both halves: it is an object on the table rather than a
          widget, and **it does not appear for the first 420ms**, so the fast case still
          renders nothing at all. See the header of hourglass.css.

          Same element type in the same child position as the `restoring` branch above,
          deliberately: React reconciles the two into one DOM node, so a returning
          visitor's two round trips are one unbroken wait rather than two hourglasses
          each starting their delay again. Only the caption changes.
        */
        <Hourglass caption="Je collectie wordt opgehaald…" />
      ) : !eligible ? (
        /*
          The gate, and it is a screen rather than a line of type now. The ledger used to
          refuse an under-gate name at the signature — struck through, with how far off
          they are beside it — which put the gate on the page that only asks who you are
          and left the newest colleagues with nothing to click. They sign in like everybody
          else and land here, at their own shut album with their own number on it.
        */
        <LockedAlbum
          name={splitName(player.name).display}
          games={player.numberOfGames}
          minGames={minGames}
          /* The way back out. Without it a mistyped name is remembered in this browser
             and pins the page to somebody else's gate. */
          onSignOut={forgetPlayer}
        />
      ) : (
        /*
          One layout for **every** signed-in state — the cover choice, the book and the
          opener all take the middle of it in turn.

          The choice used to sit outside this container, and folding it in is what gives the
          register a single home: it is a thing lying on the table, so it has to be on the
          table for as long as you are at it, including before there is a book. The margins
          are out of flow and `--shelf-room` is worked out from the viewport rather than
          measured off whatever is currently in the middle, so nothing in either margin can
          move what is between them.

          The book being replaced rather than dimmed is deliberate: this is the one
          screen where it genuinely is not the subject, and leaving it under the
          reveal would put a second lit object inside the vignette.
        */
        <div
          className={[
            'album-layout',
            openingPack ? 'album-layout--opening' : '',
            /* A packet is on its way in from the margin and the book is on its way out from
               under it — or the same thing backwards, a packet going home to the pile and
               the book coming back up. Both last `REACH_MS`; see game.css. */
            bookPass === 'leaving' ? 'album-layout--reaching' : '',
            bookPass === 'returning' ? 'album-layout--returning' : '',
            /* Cards are in the air: the book is out of play for as long as they are
               going into it, and it fades in rather than cutting. See putaway.css. */
            placing ? 'album-layout--placing' : '',
            /* And it is not on the table at all until the cards are out of the middle. */
            placing?.phase === 'clearing' ? 'album-layout--clearing' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {/*
            No plate, no "Jouw pakjes" label, and nothing at all when there are none.
            The packets are objects lying next to the book — a titled panel around them
            is the one piece of furniture on this page that admits to being a UI, and
            it was also what the top row clipped against on hover.

            An empty column is worse than no column, so the aside goes away entirely
            when there is nothing to put in it. That used to move the book — it is
            out of flow now, and the book is centred on the stage whether the aside
            is there or not. See `.album-layout` in game.css.
          */}
          {shelfPacks.length > 0 && !showChoice ? (
            <aside className={`album-side${handsFull ? ' album-side--set-aside' : ''}`}>
              <div className="pack-shelf">
                {shelfPacks.map((pack) => (
                  <PackTile
                    key={pack.id}
                    pack={pack}
                    onOpen={openPack}
                    /* So the pile can be measured before one of them leaves it. */
                    elementRef={setTileRef}
                    /*
                      This one is still in the air: it is holding its place in the pile —
                      which is what makes the packets either side of it move now rather
                      than when it lands — while the clone flying home is what the reader
                      actually watches. See `returning`.

                      Both arrivals use it, and that is why it is a test rather than a flag
                      on the pack: one packet coming back to a pile that is already there,
                      and the whole pile being brought over after the binding. See `dealing`.
                    */
                    held={returning?.pack.id === pack.id || dealingIds.has(pack.id)}
                  />
                ))}
              </div>
            </aside>
          ) : null}

          {/*
            The register, in the opposite margin: how you leave, lying next to what you came
            for. Stood down while a reveal is running and while a book is being stamped —
            you cannot sign yourself out with a card in the air, and a way to abandon a book
            halfway through having your name blocked into it is not a thing to offer.

            **The seal lies in this margin too, under the register.** The left margin is
            where the packets are, and it is a busy column — a pile that grows and shrinks
            all day. The seal turns up once in a collection's life, and putting it opposite
            gives it a clear piece of table of its own instead of a slot at the bottom of a
            stack of things that look nothing like it.

            It shares the register's stand-down rather than carrying its own copy, and it is
            hidden for the length of the re-binding: by then it has been used, and the
            response that clears `iconsClaimable` is parked until the book is shut.
          */}
          <aside
            className={`album-register${
              handsFull || creating ? ' album-register--set-aside' : ''
            }`}
          >
            <LedgerCorner name={ownerName ?? player.name} onSignOut={forgetPlayer} />
          </aside>

          {/*
            The test panel, at the foot of the same margin as the register.

            **It used to be a full-width plate under the table**, and it is here for the
            album's sake rather than its own: the book is sized off viewport *height*
            first, so a row below it comes straight out of the spread. That row was the
            last horizontal band left down there, and moving it into a margin that was
            already reserved bought the page 7vh of book — see the `--page-w` note in
            album.css.

            It is inside the layout, so it is gone on the four states that are not the
            album: the error notice, the ledger, the hourglass and the padlock. Nothing is
            lost — every button on it needs a player *and* an album, so on all four of
            them the whole panel was disabled anyway.

            `--debug` is what exempts it from the table's rule that nothing on it gets a
            panel — see game.css. It is scaffolding, and it has to stay readable rather
            than in character, which makes it the one thing in either margin that is not
            an object lying on the wood.
          */}
          {SHOW_DEBUG ? (
            <aside className="album-panel">
              <div className="game-plate game-plate--debug">
                <span className="game-plate__label">Testpaneel</span>
                <div className="game-row">
                  {/*
                    An ordinary packet of n cards, drawn on the real odds. It is a
                    *present* — a `PackGift` row — because that is the only way a pack
                    comes into existence that nobody played a game for, and it then lands
                    on the shelf and is opened by the ordinary claim. So these buttons
                    exercise the real draw and the real claim rather than a debug path
                    beside them, which is the whole reason there is no separate
                    `packs/debug` route.

                    An album is required, not just a player: the shelf is suppressed until
                    there is a book to file cards into, so a packet given before that
                    would be written and then be invisible.
                  */}
                  {[1, 3, 5].map((size) => (
                    <button
                      key={size}
                      type="button"
                      className="game-button game-button--small"
                      onClick={() => grant({ size, reason: 'testpakje' })}
                      disabled={!player || !hasAlbum}
                      title="Geeft jezelf een pakje — het komt op de plank te liggen"
                    >
                      pakje ({size} {size === 1 ? 'kaart' : 'kaarten'})
                    </button>
                  ))}
                  {/*
                    One card each, so a single ceremony level can be watched in isolation.

                    Guaranteed by a **floor on the overall** rather than by a tier or a
                    level. A tier cannot separate 75-79 from 80-84 — both are Goud — and
                    the four numbers below are the ceremony's own steps, so the floor is
                    the form both of those reduce to. It is also what the wrapper prints,
                    which means the print is the number the draw was actually made
                    against.

                    90+ is a band, not a player. It used to be a guaranteed player pinned
                    to the top of the active pool — which was Petar and stayed Petar even
                    after he was no longer 90+, and could never reach an icoon at all. As
                    a floor it draws from whoever actually clears 90 right now, which with
                    the icons on includes them — Roel Loonen at 91 is currently the only
                    card above Petar in the game.

                    Two things worth knowing about what a floor does and does not buy. The
                    weighting still applies *inside* the band, so 75+ hands out far more
                    75s than 90s. And if nobody clears it, an ordinary weighted draw
                    happens rather than a failure — an empty packet would be worse than a
                    broken promise.
                  */}
                  {[75, 80, 85, 90].map((floor) => (
                    <button
                      key={floor}
                      type="button"
                      className="game-button game-button--small"
                      onClick={() =>
                        grant({ minimumOverall: floor, reason: `test — ${floor}+` })
                      }
                      disabled={!player || !hasAlbum}
                      title={`Geeft jezelf een pakje met een kaart van ${floor} of hoger`}
                    >
                      1 kaart ({floor}+)
                    </button>
                  ))}
                  {/*
                    The bypass, not the feature. Pressing the seal beside the book is how
                    the icons are earned; this forces the latch without the set and
                    without the ceremony, because earning it legitimately is a three-month
                    proposition and there would otherwise be no way to look at an icoon in
                    a book at all.
                  */}
                  <button
                    type="button"
                    className="game-button game-button--small"
                    onClick={forceIcons}
                    disabled={!player || !hasAlbum}
                    title="Zet de iconen-latch om, zonder de hele actieve set te verzamelen"
                  >
                    iconen {collection?.album?.iconsUnlocked ? 'uit' : 'aan'}
                  </button>
                  {/*
                    The ceremony on its own, with no write behind it. It is six beats long
                    and happens once in a collection's life, so without this every look at
                    it costs a rebuilt set.
                  */}
                  <button
                    type="button"
                    className="game-button game-button--small"
                    onClick={playRebindDemo}
                    disabled={!player || !hasAlbum || rebinding}
                    title="Speelt alleen de bind-animatie af — er wordt niets opgeslagen"
                  >
                    bind-animatie
                  </button>
                  {/*
                    The two buttons that put the page back to a state you cannot otherwise
                    reach twice. They undo different things on purpose, and the pairing is
                    the useful part:

                      leegmaken  destroys the album on the server  -> the cover choice
                      resetten   forgets who this browser is       -> the ledger

                    So `leegmaken` is how the opening ceremony gets watched again, and
                    `resetten` is how the *returning visitor* path gets tested — that one
                    needs the album to still exist, which is exactly why it does not touch
                    it.
                  */}
                  <button
                    type="button"
                    className="game-button game-button--small"
                    onClick={emptyCollection}
                    disabled={!player}
                    title="Album weg, kaarten weg — terug naar het kiezen van een kaft"
                  >
                    leegmaken
                  </button>
                  {/*
                    No "resetten" any more. Signing out is the register lying on the table
                    beside the book, which is a real part of the page rather than
                    scaffolding — and a second way to do it, on a panel that is going to
                    be deleted, would be one more thing to remember to remove.

                    No "kansen" either: it drew a few thousand packs in the browser to
                    check the observed frequencies against the odds table, and the browser
                    cannot draw a pack any more. That check is
                    `InclusionProbabilitiesSumToThePackSize` in UnitTests/PackTests.cs,
                    where it runs on every build rather than when somebody remembers to
                    press a button.
                  */}
                  {/*
                    Here rather than in the header, because it skips the reveal — which is
                    the part of this feature everybody is actually here for. That makes it
                    a development convenience, not a setting somebody should be nudged
                    toward.
                  */}
                  <label className="game-check">
                    <input type="checkbox" checked={fastMode} onChange={toggleFast} />
                    snel openen
                  </label>
                  {/*
                    There were two shadow sliders here — `schaduw` for the drop the book
                    throws and `bladschaduw` for the light on its leaves. They did their
                    job and went with the decision, at 1.6 and 2.5, folded into the numbers
                    in album.css: see `--book-drop` on `:root` and "How a leaf is lit".

                    The lifecycle is the one utils/animationSpeed.ts argues for, and both
                    halves of it matter. They wrote to `:root` for the session only, never
                    to localStorage — a value stored while tuning outlives the UI that
                    could correct it. And once the number was settled it moved into the
                    stylesheet rather than sitting behind a knob parked at 1, so there is
                    one place a shadow is described and it is the place that draws it.
                  */}
                  {/*
                    There was a head-band switch here, with three candidates on it. It
                    did its job — the leather won — and it went with the decision; the
                    reasoning is recorded in album.css above `.album__band`, and the
                    two rejected treatments are still standing in
                    docs/album-band-colours.html if anyone wants to see them again.
                  */}
                  {/*
                    The hand switch that lived here is gone the same way the head-band one
                    did: Florilane Cardillac won, so `--cover-hand` is a static value in
                    album.css rather than something JS pokes onto `:root`.

                    **That was not only tidiness — the switch was itself the bug.**
                    `WrittenType` reads the variable during render to measure with, and on
                    mount the variable was not set yet, so the first measurement ran
                    against the fallback face. The effect that set it then re-selected the
                    same default, `setHand` bailed out because the value had not changed,
                    and React never re-rendered — leaving the mask aligned to one font and
                    the letters drawn in another. A constant cannot arrive late.
                  */}
                </div>
              </div>
            </aside>
          ) : null}

          {/*
            **Three slots rather than one ternary**, and the positions are load-bearing.

            The book is still mounted for the length of the flight that replaces it — see
            `bookPass` — so for those 440ms the opener and the album are on the page at
            once, which a chain of `? :` cannot express. It also has to be the *same* album:
            React reconciles children by position, so the album has to sit at a fixed index
            whether or not there is an opener in front of it. Moving it would remount it,
            and a remounted album re-reads its saved page — the book would flick to
            somewhere else in itself on the way out, which is a good deal worse than the cut
            this replaces.

            Out of flow and behind the opener while it fades; see `.album-layout--reaching`.
          */}
          <div className="album-main">
            {showChoice ? (
              <AlbumChoice
                stampName={ownerName}
                onChoose={chooseCover}
                /*
                  One commit, via `unstable_batchedUpdates`. The ceremony reports itself
                  finished from a timeout, and `index.tsx` mounts with legacy
                  `ReactDOM.render`, which does not batch those — so unbatched, lowering
                  `creating` mounts the album a render *before* `justBound` is true, and it
                  reads its saved position instead of starting shut. That is the bookmark of
                  the album this one replaced, so the handover cut to page nine of the
                  previous book and only then turned to the voorwoord. The album reads
                  `justBound` at mount by design — see its `flipped` initialiser — so the
                  flag has to be up on the first render, not the second.
                */
                onDone={() => {
                  unstable_batchedUpdates(() => {
                    setCreating(false);
                    setJustBound(true);
                    /*
                      And the packets are owed an arrival. Only a note here — **what** is on
                      the shelf cannot be read from this callback, which closes over the
                      render you clicked on rather than the one the album exists in. See
                      `undelivered`, and the layout effect that consumes it.
                    */
                    undelivered.current = !prefersReducedMotion();
                  });
                }}
              />
            ) : null}

            {!showChoice && openingPack ? (
              <>
                <PackOpener
                  key={openingPack.id}
                  pack={openingPack}
                  /*
                    Where it was picked up from, so the packet is flown onto the stage
                    rather than cut to it. Null on every way in that is not a click on the
                    pile, and the opener simply starts on the stage then — see `reach`.
                  */
                  from={reach.current}
                  onOpen={() => handleOpen(openingPack)}
                  onStart={() => setRevealing(true)}
                  onFinished={handleFinished}
                  onFailed={handleFailed}
                  /*
                    What is already lying on the table. The opener draws these ahead of its
                    own cards, so a second packet extends the row rather than replacing it —
                    and the reveal's FLIP lands into a row that already has cards in it.
                  */
                  table={table}
                  onPutAway={putAway}
                  onPutBack={closeOpener}
                  tableScroll={tableScroll}
                  fastMode={fastMode}
                />
                {/*
                  **No exit row under the opener any more.** It was the last real button on
                  the table, and everything it did now belongs to objects: a sealed packet
                  is put down by clicking the wood beside it, and a row of cards is filed by
                  clicking the cards. See `putAway`.

                  What it was carrying is not lost. It had to be hidden for the length of a
                  reveal, because the shelf beside it was inert and a live exit next to an
                  inert pile contradicts it; its replacement cannot be offered early either,
                  because it *is* the cards, and until they have landed there is nothing
                  there to pick up.
                */}
              </>
            ) : null}

            {!showChoice && (!openingPack || bookPass === 'leaving') ? (
              <Album
                /*
                  Keyed on the owner, so switching player is a different book rather than
                  the same book showing something else. The album reads its saved reading
                  position once, at mount, from a per-owner key — without the remount it
                  would keep the previous person's page and then save it under the new
                  person's name.
                */
                key={player.id}
                sections={sections}
                owner={ownerName}
                ownerId={player.id}
                cover={collection.album?.cover}
                /*
                  Half-bound once the icons are in, and read on every render like `cover` —
                  so a book re-bound in a previous session simply draws that way, with no
                  ceremony and nothing persisted on this side.
                */
                icons={collection.album?.iconsUnlocked}
                rebinding={rebinding}
                handsOver={rebindHandsOver}
                onRebound={handleRebound}
                /*
                  The last beat of the opening sequence: the book opens itself on the
                  voorwoord. Which page that is, and how long it lies shut first, is the
                  album's to decide — this only says the reader watched it being bound.
                */
                justBound={justBound}
                onCardOpen={(id) => {
                  const found = slotOrder.findIndex((s) => s.card.player.id === id);
                  if (found >= 0) setViewing(found);
                }}
                /* Keeps the book on the spread of whatever the viewer is showing. */
                focusPlayerId={viewingSlot?.card.player.id ?? null}
                /*
                  A pack is being put away. The book comes back **already open** on the
                  page the first card goes on — read at mount, which is what makes it free:
                  the album is unmounted for the whole of the opener, so there is no page to
                  turn for the first one. After that `turnToPlayerId` turns it, audibly,
                  card by card.

                  `holdSlots` is every card that has not landed yet, so a page turned
                  through on the way to a later card does not show one that is still on the
                  table.
                */
                /* Optional all the way down: a table of nothing but doubles has a row to
                   clear and no card to open the book on. */
                openAtPlayerId={
                  placing && placing.order.length > 0
                    ? placing.all[placing.order[0]].card.player.id
                    : undefined
                }
                /*
                  Named only from the beat the book should start turning. Null through
                  `clearing` — the cards are still moving out of the middle and the book has
                  only just arrived — and null again through `settling`, which is what makes
                  the *next* card's id a change the album acts on rather than the same prop
                  it has already seen.
                */
                turnToPlayerId={
                  placing && (placing.phase === 'turning' || placing.phase === 'flying')
                    ? placing.all[placing.order[placing.index]].card.player.id
                    : null
                }
                onTurned={bookArrived}
                holdSlots={placing ? held : undefined}
              />
            ) : null}
          </div>
        </div>
      )}

      {/*
        The packet going home, out here for the same reason `PutAway`'s cards are: the
        shelf it is flying to is a scroll container and clips, so a tile flown in from the
        middle of the table would spend most of the journey behind the pile's own edge.

        A `.pack` like any other, sized in pixels off the packet it is a picture of, so it
        is the same object at the same size on the frame the opener's own packet leaves the
        screen. `--pack-w` is the *measured* width rather than the clamp `.opener` resolves,
        which is what makes that identity hold at any viewport without this having to know
        how the stage sizes itself. Everything derived from it — the seals, the teeth, the
        type — comes from the shared rule in packopen.css.

        It stands square and lands leaning, shrunk to a card's width; the tile underneath it
        is uncovered as it lands. See `returning`, and the layout effect that flies it.
      */}
      {returning ? (
        <div
          className={`${packClass(returning.pack)} pack-flight`}
          ref={flightRef}
          style={
            {
              ...packFoil(returning.pack),
              '--pack-w': `${returning.from.w}px`,
              left: `${Math.round(returning.from.cx - returning.from.w / 2)}px`,
              top: `${Math.round(returning.from.cy - returning.from.h / 2)}px`,
            } as React.CSSProperties
          }
          aria-hidden="true"
        >
          <PackFace pack={returning.pack} />
        </div>
      ) : null}

      {/*
        The pile being slid over after the binding, out here for the identical reason and
        rendered as the identical object — `.pack pack-flight`, a real packet in viewport
        space rather than a picture of the idea of one.

        **No `left`, `top` or `--pack-w` here**, which is the one difference from the flight
        above: that one is drawn off a `PackGrab` measured in the click handler, and these
        have no origin to be measured — they are arriving from off the table. All three are
        written by the layout effect from the tile each one lands on, before the first paint,
        so a clone is never seen anywhere but on its way to its own place in the pile.
      */}
      {dealing?.map((pack) => (
        <div
          key={pack.id}
          className={`${packClass(pack)} pack-flight`}
          ref={(el) => setDealRef(pack.id, el)}
          style={packFoil(pack) as React.CSSProperties}
          aria-hidden="true"
        >
          <PackFace pack={pack} />
        </div>
      ))}

      {/*
        The viewer mounts here, as the last child of the shell — the same place
        `.opener__bloom` proves works. `.game-stage` is `overflow: hidden` and
        `position: relative` but carries no transform, filter or perspective, so a
        fixed child escapes the clip.

        **Never inside `.album`**, which sets `perspective: 2600px`: that both makes
        it a containing block for fixed descendants and drops whatever is in it into
        the turning leaves' depth sort.
      */}
      {viewing !== null && viewingSlot ? (
        <CardViewer
          slots={slotOrder}
          index={viewing}
          onIndex={setViewing}
          onClose={() => setViewing(null)}
        />
      ) : null}

      {/*
        The cards standing beside the book and going into it, mounted out here for exactly
        the reasons the viewer above is: `.album` carries `perspective`, so anything inside
        it is a containing block away from being fixed and one depth sort away from ending
        up between the leaves.

        Mounted for the whole sequence, because it is holding the cards — they never leave
        the screen between the packet and the album. Keyed on the first card, so a second
        filing in the same sitting gets a fresh hand rather than one whose cards have
        already been dealt into the book.

        It is handed **every** card on the table: clearing it is one gesture over the whole
        row, with the doubles going off the bottom and the keepers moving aside together.
        `flying` is a position in that row rather than a player id, because a row spanning
        two packets can hold the same player twice — new in the first, a double in the
        second.
      */}
      {placing && player ? (
        <PutAway
          key={placing.all[0].card.player.id}
          cards={placing.all}
          flying={placing.phase === 'flying' ? placing.order[placing.index] : null}
          onCleared={() =>
            setPlacing((current) =>
              current && current.phase === 'clearing'
                ? /* The middle of the table is empty, so the book can be put back on it.
                     Whether there is anything to place is the *arriving* beat's business —
                     a row of nothing but doubles still gets its book back. */
                  { ...current, phase: 'arriving' }
                : current,
            )
          }
          onLanded={cardPlaced}
        />
      ) : null}
    </GameShell>
  );
};

export default CollectionPage;
