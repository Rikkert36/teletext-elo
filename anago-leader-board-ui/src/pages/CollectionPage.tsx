import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Album, { AlbumSection, albumSlotOrder } from '../components/Album';
import AlbumChoice from '../components/AlbumChoice';
import CardViewer from '../components/CardViewer';
import GameShell from '../components/GameShell';
import Hourglass from '../components/Hourglass';
import PackOpener from '../components/PackOpener';
import LedgerCorner from '../components/LedgerCorner';
import LockedAlbum from '../components/LockedAlbum';
import PackTile from '../components/PackTile';
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
import { CURRENT_PLAYER_KEY as PLAYER_KEY } from '../utils/currentPlayer';
import '../styles/game.css';

const FAST_KEY = 'tafelvoetbal.cards.fastOpen';

/**
 * The test panel. Everything on it is real now: the pack buttons hand the signed-in
 * player a present through `POST api/collections/gifts`, which is a row like the
 * collection and the icons latch, so nothing here fakes state the server does not
 * have. Plus `snel openen`, which was always client-side.
 *
 * It still wants to go behind a debug flag rather than a constant.
 */
const SHOW_DEBUG = true;

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
   * True from the tear until the last card has settled — *not* for as long as the
   * opener is mounted. A sealed packet lying on the stage is a decision you have not
   * taken yet, so the pile beside it stays live and you can still change your mind.
   *
   * It is raised by the opener's `onStart` and lowered by its `onFinished`, so
   * **every path that unmounts the opener has to lower it too**: an opener that is
   * taken off screen never reaches `onFinished`, and the flag would then sit true
   * for the rest of the session with the shelf dimmed and inert behind it. That is
   * exactly what "terug naar het album" used to do. `closeOpener` is the one way
   * out, and `choosePlayer` and `openPack` clear it for the same reason.
   */
  const [revealing, setRevealing] = useState(false);
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
   * Only the book's invitation line uses it. Session state rather than something derived
   * from `album.createdAt`, because the question is not "is this album new" but "did you
   * just watch this book being made" — somebody returning tomorrow to a book they never
   * opened is a different case, and the album answers that one itself off its saved
   * position.
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
   */
  const openPack = (next: Pack) => {
    /* The shelf is behind the viewer's scrim and so unreachable while one is open,
       but the opener would be layered under a viewer left mounted over it. */
    setViewing(null);
    setRevealing(false);

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
      return;
    }

    setOpeningPack(next);
  };

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
   * Putting the opener away. The only way out of it.
   *
   * Clears `revealing` as well as the packet — see the flag's note. This used to be
   * a bare `setOpeningPack(null)`, which meant that leaving mid-reveal unmounted the
   * one component that would ever have lowered the flag, and the shelf stayed dimmed
   * and unclickable until the page was reloaded.
   *
   * The button that calls it is hidden for the length of the reveal anyway, so this
   * is now the guard rather than the fix — but the flag's lifetime should be a
   * property of the page, not of a callback that may never arrive.
   */
  const closeOpener = () => {
    applyPendingCollection(player?.id);
    setOpeningPack(null);
    setRevealing(false);
  };

  const toggleFast = () => {
    const next = !fastMode;
    setFastMode(next);
    write(FAST_KEY, String(next));
  };

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    collection?.owned.forEach((owned) => map.set(owned.playerId, owned.count));
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
  const handleFinished = useCallback(() => {
    setRevealing(false);
    applyPendingCollection(player?.id);
  }, [applyPendingCollection, player]);

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
      if (player) void refresh(player.id);
    },
    [player, refresh],
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
   * has with `onChoose`, so it is in flight while the book shuts — and it has to land
   * before the packet itself is claimed, or the draw would have no icons to choose from.
   * That ordering is the whole reason this is two calls rather than one.
   *
   * The response is applied straight away rather than parked. That is the opposite of the
   * pack-reveal rule, and deliberately: what it carries is the *unlock*, which the claim
   * about to follow depends on. It grows the album by roughly half at the same time, and
   * that is free here because the book is shut — nothing on screen shifts.
   */
  const claimIcons = () => {
    if (!player) return;

    setRebinding(true);

    void client
      .claimIcons(player.id)
      .then(setCollection)
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
    const demo = rebindDemo.current;
    pendingIconPack.current = null;
    rebindDemo.current = false;
    setRebinding(false);

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
        <div className={`album-layout${openingPack ? ' album-layout--opening' : ''}`}>
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
            <aside className={`album-side${revealing ? ' album-side--set-aside' : ''}`}>
              <div className="pack-shelf">
                {shelfPacks.map((pack) => (
                  <PackTile key={pack.id} pack={pack} onOpen={openPack} />
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
              revealing || creating ? ' album-register--set-aside' : ''
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
                </div>
              </div>
            </aside>
          ) : null}

          <div className="album-main">
            {showChoice ? (
              <AlbumChoice
                stampName={ownerName}
                onChoose={chooseCover}
                onDone={() => {
                  setCreating(false);
                  setJustBound(true);
                }}
              />
            ) : openingPack ? (
              <>
                <PackOpener
                  key={openingPack.id}
                  pack={openingPack}
                  onOpen={() => handleOpen(openingPack)}
                  onStart={() => setRevealing(true)}
                  onFinished={handleFinished}
                  onFailed={handleFailed}
                  fastMode={fastMode}
                />
                {/*
                  The way back, and it is **not offered while the reveal is
                  running**. The shelf beside the opener already stands down for
                  that window — you cannot pick up a second packet with your hands
                  full — and a live exit next to it was the one control that
                  contradicted that, as well as the one way to strand `revealing`
                  true.

                  Hidden rather than unmounted, and the row keeps its box. Removing
                  it would shorten the column at the exact moment the first card is
                  rising out of the wrapper, and everything about this stage is
                  built so that nothing moves from the click to the last card — see
                  `.opener__stage`'s note, and the `&nbsp;` the opener's own hint
                  line renders during the tear for precisely this reason.
                */}
                <div className="game-row" style={{ justifyContent: 'center' }}>
                  <button
                    type="button"
                    className={`game-button${revealing ? ' game-button--away' : ''}`}
                    onClick={closeOpener}
                  >
                    terug naar het album
                  </button>
                </div>
              </>
            ) : (
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
                  The last beat of the opening sequence, and the only one that is words.
                  Both actions, because both are undiscoverable: the cover is the button,
                  and the page edges are the only other control on the book. The album drops
                  it the moment the cover is turned.
                */
                hint={justBound ? 'Je album ligt klaar! Open het en begin je verzameling!' : undefined}
                onCardOpen={(id) => {
                  const found = slotOrder.findIndex((s) => s.card.player.id === id);
                  if (found >= 0) setViewing(found);
                }}
                /* Keeps the book on the spread of whatever the viewer is showing. */
                focusPlayerId={viewingSlot?.card.player.id ?? null}
              />
            )}
          </div>
        </div>
      )}

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
    </GameShell>
  );
};

export default CollectionPage;
