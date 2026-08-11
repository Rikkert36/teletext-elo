# teletext-elo

A foosball (tafelvoetbal) Elo leaderboard for the office, presented as 1980s
Dutch Teletekst. All UI copy is in Dutch.

- `AnagoLeaderboard/` — ASP.NET Core 8 API, EF Core, SQLite
- `anago-leader-board-ui/` — CRA 5, React 18, TypeScript 4.9, MUI 5

## Work in progress

**Trading cards** — a collectable card layer on top of the leaderboard. The full
design, every settled decision and the reasoning behind it lives in
[docs/trading-cards.md](docs/trading-cards.md). **Read that file before touching
anything under `src/mock/`, `src/styles/card.css`, `album.css`, `packopen.css`,
`viewer.css`, `game.css`, `components/PackOpener.tsx`, `Album.tsx`,
`PlayerCard.tsx`, `CardViewer.tsx`, `utils/sounds.ts`, or — on the API side —
`Services/PackService.cs`, `CollectionService.cs`, `CardPoolService.cs` and
`Calculators/CardRatingCalculator.cs`.** It records a great many decisions that were
arrived at by elimination and will otherwise be re-litigated or silently undone.

Two of them are load-bearing enough to repeat here. **Packs are derived, never
granted** — `CreateGame` writes a game and nothing else, and reintroducing a write
there undoes three separate guarantees. And **the rating scale lives in C# only**;
a second copy in TypeScript could print an overall inconsistent with the odds a card
was actually drawn at, and nothing would ever surface it.

Its "Where this stands" section at the top says what is done and what is next.

## Conventions

- **No animation library.** No framer-motion, react-spring or GSAP. Animation is
  plain CSS plus hand-written FLIP. Do not add one.
- Card/album/opener styles are **plain CSS** in `src/styles/`, not `@mui/styles`
  (JSS is deprecated and poor at multi-step keyframes).
- **Do not regenerate the NSwag client** (`src/clients/server.generated.ts`) — the
  `.nswag` config embeds a stale swagger snapshot. Hand-write new clients.
- Run frontend tooling via `node_modules/.bin/*` rather than `npx`, which will
  fetch a different version from the registry.
- Source files are **UTF-8 without BOM**, and contain non-ASCII characters. Editing
  them through PowerShell redirection or `Set-Content` corrupts them; use the
  editing tools, or pass an explicit `UTF8Encoding($false)`.
