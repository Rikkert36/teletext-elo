import React, { useState, useEffect} from "react";
import {
  Paper,
  CircularProgress,
  Typography,
  Button,
  Grid,
  Modal,
  Autocomplete,
  TextField,
  useMediaQuery,
} from "@mui/material";
import { styled } from "@mui/system";
import { Link } from "react-router-dom";
import useIsMobile from "../hooks/useIsMobile";

import {
  numberInputClasses,
  Unstable_NumberInput as NumberInput,
} from "@mui/base/Unstable_NumberInput";

import GameAnalyticsTooltipWrapper from "./GameAnalyticsTooltipWrapper";
import { readCurrentPlayerId } from "../utils/currentPlayer";
import AddIcon from "@mui/icons-material/Add";
import { Theme } from "@mui/material";
import { makeStyles, createStyles } from "@mui/styles";
import {
  Client,
  Game,
  GameForm,
  PlayerPerformance,
  TeamPerformance,
  GamesInRange,
  DynamicRatingPlayer,
  GameWithAnalytics,
} from "../clients/server.generated";

interface GamesPerDay {
  day: Date;
  games: GameWithAnalytics[];
}

interface GamesPerDayList {
  matchesPerDay: GamesPerDay[];
}

/** The four player slots on the match form. Each holds an index into `players`. */
type PlayerField =
  | "team1_player1"
  | "team1_player2"
  | "team2_player1"
  | "team2_player2";

/**
 * The four slots a freshly opened match form starts on.
 *
 * The first one is **whoever is signed in on this browser** — the id the card pages
 * remember — because the person filling in a wedstrijdformulier has, nearly always, just
 * played the match. Falling back to the top of the list when nobody is signed in, or when
 * the remembered name is not in the active list any more.
 *
 * The other three are simply the first names that are not the first slot. Skipping it
 * matters: `inValidMatch` refuses a form with a repeated player, so seeding one twice
 * would open the form already invalid.
 */
const defaultPlayerSlots = (
  players: DynamicRatingPlayer[]
): Record<PlayerField, number> => {
  const rememberedId = readCurrentPlayerId();
  const remembered = rememberedId
    ? players.findIndex((p) => p.id === rememberedId)
    : -1;
  const first = remembered >= 0 ? remembered : 0;

  const rest = players
    .map((_, index) => index)
    .filter((index) => index !== first);

  return {
    team1_player1: first,
    /* `?? first` only bites on a list too short to fill a match, where every slot
       collapses onto the same index and the form is invalid anyway. */
    team1_player2: rest[0] ?? first,
    team2_player1: rest[1] ?? first,
    team2_player2: rest[2] ?? first,
  };
};

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    avatar: {
      marginRight: theme.spacing(1),
    },
    centerContainer: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      [theme.breakpoints.down("sm")]: {
        paddingLeft: theme.spacing(1.5),
        paddingRight: theme.spacing(1.5),
      },
    },
    modal: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      [theme.breakpoints.down("sm")]: {
        alignItems: "flex-start",
      },
    },
    modalPaper: {
      backgroundColor: "#111",
      boxShadow: theme.shadows[5],
      padding: theme.spacing(4),
      borderRadius: theme.shape.borderRadius,
      color: "#fff",
      maxWidth: "100%",
      [theme.breakpoints.down("sm")]: {
        width: "100vw",
        height: "100dvh",
        maxWidth: "100vw",
        borderRadius: 0,
        padding: theme.spacing(3),
        overflowY: "auto",
      },
    },

    menuContainer: {
      display: "flex",
      justifyContent: "flex-end",
      marginBottom: theme.spacing(1),
      [theme.breakpoints.down("sm")]: {
        justifyContent: "center",
        marginBottom: 0,
      },
    },
    addButton: {
      fontFamily: "Teletext",
      margin: "2rem",
      padding: "0",
      height: 0,
      background: "#000",
      color: "#00ff00",
      [theme.breakpoints.down("sm")]: {
        margin: theme.spacing(0.5),
        marginBottom: 0,
        height: "auto",
        padding: theme.spacing(0.25, 0.5),
      },
    },
    buttonText: {
      fontFamily: "Teletext",
      fontSize: "1.0rem",
      textTransform: "none",
      [theme.breakpoints.down("sm")]: {
        fontSize: "0.85rem",
        whiteSpace: "nowrap",
      },
    },
    banner: {
      background: "#FF0000",
      fontFamily: "Teletext",
      fontSize: "2rem",
      padding: "2rem",
      color: "#ffff00",
      display: "flex",
      justifyContent: "center",
      textAlign: "center",
      [theme.breakpoints.down("sm")]: {
        fontSize: "1.15rem",
        padding: "1rem 0.4rem",
        whiteSpace: "nowrap",
      },
    },
    addPlayerSave: {
      fontFamily: "Teletext",
      margin: "1rem",
      padding: "0",
      marginTop: "2rem",
      textTransform: "none",
      height: 0,
      background: "#000",
      color: "#00ff00",
    },
    addPlayerBack: {
      fontFamily: "Teletext",
      marginTop: "2rem",
      margin: "1rem",
      padding: "0",
      textTransform: "none",
      height: 0,
      background: "#000",
      color: "#FF0000",
    },
    dayPaper: {
      color: "#00ff00",
      background: "#000",
      fontSize: "1.2em",
      [theme.breakpoints.down("sm")]: {
        fontSize: "1.15rem",
        marginTop: theme.spacing(1.5),
        marginBottom: theme.spacing(0.25),
        paddingLeft: "0.5rem",
      },
    },
    matchPaper: {
      background: "#000",
      fontSize: "1.2em",
      padding: "0.4rem",
    },
    matchCardMobile: {
      background: "#000",
      padding: "0.4rem 0.25rem",
      marginBottom: "0.4rem",
    },
    teamRowMobile: {
      display: "flex",
      alignItems: "center",
      width: "100%",
      padding: "0.1rem 0",
    },
    teamNamesMobile: {
      flex: 1,
      minWidth: 0,
      paddingLeft: "0.25rem",
      paddingRight: "0.5rem",
    },
    playerLineMobile: {
      display: "flex",
      alignItems: "baseline",
      width: "100%",
      minWidth: 0,
      padding: "0.2rem 0",
    },
    deltaMobile: {
      color: "#ffff00",
      fontFamily: "Teletext",
      fontSize: "1.05rem",
      flexShrink: 0,
      paddingLeft: "0.5rem",
      whiteSpace: "nowrap",
    },
    nameTruncate: {
      display: "block",
      maxWidth: "100%",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    matchScoreMobile: {
      color: "#00ff00",
      fontSize: "1.2rem",
      fontFamily: "Teletext",
      minWidth: "2rem",
      textAlign: "right",
      flexShrink: 0,
      paddingLeft: "0.5rem",
      marginRight: "0.5rem",
    },
    matchPaperHighlight: {
      outline: "2px solid #00ff00",
    },
    playerNames: {
      color: "#ffff00",
      background: "black",
    },
    matchScore: {
      color: "#00ff00",
    },
    playerNameTypo: {
      fontSize: "1.0em",
      color: "#ffff00",
      [theme.breakpoints.down("sm")]: {
        fontSize: "1.1rem",
        lineHeight: 1.3,
      },
    },
    link: {
      "&:hover": {
        textDecoration: "underline #ffff00",
      },
    },
    modalBanner: {
      color: "#ffff00",
    },
    select: {
      margin: 10,
      width: "15rem",
      [theme.breakpoints.down("sm")]: {
        width: "100%",
        margin: "8px 0",
      },
    },
    numberinput: {
      width: "3rem",
      background: "#000",
    },
    floatingPaper: {
      position: "fixed",
      bottom: 0,
      fontSize: "2rem",
      left: "50%",
      transform: "translateX(-50%)",
      width: "30%",
      height: "3rem",
      backgroundColor: "#FF0000",
      color: "#ffff00",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: theme.zIndex.drawer + 1,
      [theme.breakpoints.down("sm")]: {
        width: "100%",
        height: "2.75rem",
        fontSize: "1.15rem",
      },
    },
    vorigevolgendebutton: {
      fontSize: "2rem",
      backgroundColor: "#FF0000",
      color: "#ffff00",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      transition: "none",
      "&:hover": {
        backgroundColor: "#FF0000",
        color: "#ffff00",
      },
      [theme.breakpoints.down("sm")]: {
        fontSize: "1.15rem",
      },
    },
  })
);

const toDutchDay = (day: number): string => {
  switch (day) {
    case 0:
      return "Zondag";
    case 1:
      return "Maandag";
    case 2:
      return "Dinsdag";
    case 3:
      return "Woensdag";
    case 4:
      return "Donderdag";
    case 5:
      return "Vrijdag";
    case 6:
      return "Zaterdag";
    default:
      throw new Error(
        "Invalid weekday index. Month should be between 0 and 11."
      );
  }
};

const toDutchMonth = (month: number): string => {
  switch (month) {
    case 0:
      return "januari";
    case 1:
      return "februari";
    case 2:
      return "maart";
    case 3:
      return "april";
    case 4:
      return "mei";
    case 5:
      return "juni";
    case 6:
      return "juli";
    case 7:
      return "augustus";
    case 8:
      return "september";
    case 9:
      return "oktober";
    case 10:
      return "november";
    case 11:
      return "december";
    default:
      throw new Error("Invalid month index. Month should be between 0 and 11.");
  }
};

const daysAreEqual = (date1: Date, date2: Date) =>
  date1.getDate() === date2.getDate() &&
  date1.getMonth() === date2.getMonth() &&
  date1.getFullYear() === date2.getFullYear();

const insertDateInMatchDays = (
  result: GamesPerDayList,
  sameDate: GamesPerDay
) => {
  if (result.matchesPerDay.length > 0) {
    let insertAt = result.matchesPerDay.length;
    for (let i = 0; i < result.matchesPerDay.length; i++) {
      if (sameDate.day > result.matchesPerDay[i].day) {
        insertAt = i;
        break;
      }
    }
    result.matchesPerDay.splice(insertAt, 0, sameDate);
  } else {
    result.matchesPerDay.push(sameDate);
  }
};

const sortMatchesPerDay = (matches: Game[]): GamesPerDayList => {
  const result = { matchesPerDay: [] } as GamesPerDayList;
  for (const match of matches) {
    let sameDate = result.matchesPerDay.find((x) =>
      daysAreEqual(x.day, match.createdAt!)
    );
    if (!sameDate) {
      sameDate = { day: match.createdAt, games: [] } as GamesPerDay;
      insertDateInMatchDays(result, sameDate);
    }
    sameDate.games.unshift(match as any);
  }
  return result;
};

const GamesPage: React.FC = () => {
  const classes = useStyles();
  const isMobile = useIsMobile();
  const bannerShort = useMediaQuery("(max-width:520px)");
  const bannerVeryShort = useMediaQuery("(max-width:360px)");
  const client = new Client((window as any).TAFELVOETBAL_SERVER_URL);

  const [gamesPerDayList, setGamesPerDay] = useState<GamesPerDayList>();
  const [players, setPlayers] = useState<DynamicRatingPlayer[]>();

  const [isModalOpen, setModalOpen] = useState(false);
  const [isDuplicateGameDialogOpen, setDuplicateGameDialogOpen] =
    useState(false);
  const [duplicateGame, setDuplicateGame] = useState<GameForm>();
  const [isSaving, setIsSaving] = useState(false);

  const [weekIndex, setWeekIndex] = useState(0);
  const [loadGames, setLoadGames] = useState(true);
  const [weekIndexUpdated, setWeekIndexUpdated] = useState(true);
  const [thereArePreviousWeeks, setThereArePreviousWeeks] = useState(true);


  const [newMatchForm, setNewMatchForm] = useState({
    team1_player1: 0,
    team1_player2: 0,
    team2_player1: 0,
    team2_player2: 0,
    team1_score: 0 as number | undefined,
    team2_score: 0 as number | undefined,
  });

  useEffect(() => {
    if (!players) refreshPlayers();
    if (weekIndexUpdated && loadGames) {
      setWeekIndexUpdated(false);
      refreshMatches();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  const refreshPlayers = async () => {
    const p: DynamicRatingPlayer[] = await client.getPlayers(true);
    p.sort((a, b) => (a.name! > b.name! ? 1 : b.name! > a.name! ? -1 : 0));
    setPlayers(p);
    setNewMatchForm((prev) => ({ ...prev, ...defaultPlayerSlots(p) }));
  };

  const refreshMatches = async () => {
    const [start, end] = getStartAndEndOfWeek();
    const games: GamesInRange = await client.getGamesInRange(start, end);
    setThereArePreviousWeeks(games.gamesBefore!);
    const list = sortMatchesPerDay(games.games!);
    setGamesPerDay(list);
    setLoadGames(false);
  };

  const mapToMondayFirst = (index: number) => (index === 0 ? 6 : index - 1);

  const getStartAndEndOfWeek = (): [Date, Date] => {
    const now = new Date();
    const today = mapToMondayFirst(now.getDay());
    const startOfWeek = new Date(now);
    const endOfWeek = new Date(now);

    const daysAgo = weekIndex * 7;
    startOfWeek.setDate(now.getDate() - today - daysAgo);
    endOfWeek.setDate(now.getDate() + (6 - today) - daysAgo);

    startOfWeek.setHours(0, 0, 0, 0);
    endOfWeek.setHours(23, 59, 59, 999);

    return [startOfWeek, endOfWeek];
  };

  const getDateInRightFormat = (d: Date) => {
    const weekDay = toDutchDay(d.getDay());
    const dayOfMonth = d.getDate();
    const month = toDutchMonth(d.getMonth());
    return `${weekDay}, ${dayOfMonth} ${month}`;
  };

  const handleSaveMatch = async () => {
    setIsSaving(true);

    const game = {
      firstTeamForm: {
        firstPlayerId: players![newMatchForm.team1_player1].id,
        secondPlayerId: players![newMatchForm.team1_player2].id,
        goals: newMatchForm.team1_score,
      },
      secondTeamForm: {
        firstPlayerId: players![newMatchForm.team2_player1].id,
        secondPlayerId: players![newMatchForm.team2_player2].id,
        goals: newMatchForm.team2_score,
      },
    };

    const gameForm = new GameForm();
    gameForm.init(game as any);

    const gameIsDuplicate = await client.isGameDuplicate(gameForm);
    if (gameIsDuplicate) {
      setDuplicateGame(gameForm);
      setDuplicateGameDialogOpen(true);
    } else {
      await saveGame(gameForm);
    }
  };

  const saveGame = async (gameForm: GameForm) => {
    try {
      await client.createGame(gameForm);
    } catch (ex) {
      console.log(ex);
    } finally {
      closeGameModal();
    }
  };

  const closeGameModal = () => {
    // Back to the same slots a first open lands on — including the signed-in player in
    // the first one, which a hard-coded 0/1/2/3 reset used to throw away after one save.
    setNewMatchForm({
      ...defaultPlayerSlots(players ?? []),
      team1_score: 0,
      team2_score: 0,
    });
    setModalOpen(false);
    setIsSaving(false);
    refreshMatches();
  };

  const inValidMatch = (): boolean => {
    const noWinner = newMatchForm.team1_score === newMatchForm.team2_score;
    const playerSet = new Set([
      newMatchForm.team1_player1,
      newMatchForm.team1_player2,
      newMatchForm.team2_player1,
      newMatchForm.team2_player2,
    ]);
    return noWinner || playerSet.size !== 4;
  };

  const showRatingAndDelta = (playerInfo: PlayerPerformance) => {
    const delta = playerInfo.newRating! - playerInfo.oldRating!;
    const sign = delta >= 0 ? "+" : "";
    return `(${playerInfo.oldRating} ${sign}${delta})`;
  };

  const showDeltaOnly = (playerInfo: PlayerPerformance) => {
    const delta = playerInfo.newRating! - playerInfo.oldRating!;
    const sign = delta >= 0 ? "+" : "";
    return `${playerInfo.oldRating} ${sign}${delta}`;
  };

  const showTeam = (team: TeamPerformance) => (
    <>
      <Grid item xs={3} className={classes.playerNames}>
        <Link
          className={classes.playerNameTypo}
          style={{ textDecoration: "none" }}
          to={`../speler/${team.firstPlayer!.playerId}`}
        >
          <Typography
            className={classes.playerNameTypo}
            gutterBottom
            noWrap
            style={{ width: "100%" }}
          >
            {team.firstPlayer!.name}
          </Typography>
        </Link>
        <Link
          className={classes.playerNameTypo}
          style={{ textDecoration: "none" }}
          to={`../speler/${team.secondPlayer!.playerId}`}
        >
          <Typography
            className={classes.playerNameTypo}
            gutterBottom
            noWrap
            style={{ width: "100%" }}
          >
            {team.secondPlayer!.name}
          </Typography>
        </Link>
      </Grid>

      <Grid item xs={2} className={classes.playerNames}>
        <Typography
          className={classes.playerNameTypo}
          gutterBottom
          noWrap
          style={{ width: "100%" }}
        >
          {showRatingAndDelta(team.firstPlayer!)}
        </Typography>
        <Typography
          className={classes.playerNameTypo}
          gutterBottom
          noWrap
          style={{ width: "100%" }}
        >
          {showRatingAndDelta(team.secondPlayer!)}
        </Typography>
      </Grid>

      <Grid item xs={1} className={classes.matchScore}>
        {team.goals}
      </Grid>
    </>
  );

  const playerLineMobile = (playerInfo: PlayerPerformance) => (
    <div className={classes.playerLineMobile}>
      <Link
        className={classes.playerNameTypo}
        style={{ textDecoration: "none", display: "block", flex: 1, minWidth: 0, overflow: "hidden" }}
        to={`../speler/${playerInfo.playerId}`}
      >
        <Typography className={classes.playerNameTypo + " " + classes.nameTruncate} noWrap>
          {playerInfo.name}
        </Typography>
      </Link>
      <span className={classes.deltaMobile}>{showDeltaOnly(playerInfo)}</span>
    </div>
  );

  const showTeamMobile = (team: TeamPerformance) => (
    <div className={classes.teamRowMobile}>
      <div className={classes.teamNamesMobile}>
        {playerLineMobile(team.firstPlayer!)}
        {playerLineMobile(team.secondPlayer!)}
      </div>
      <div className={classes.matchScoreMobile}>{team.goals}</div>
    </div>
  );

const showMatchesOnDay = (day: GamesPerDay) =>
  day.games.map((match) =>
    isMobile ? (
      <GameAnalyticsTooltipWrapper game={match}>
        <Paper className={classes.matchCardMobile} elevation={0} sx={{ boxShadow: "none" }}>
          {showTeamMobile(match.firstTeam!)}
          {showTeamMobile(match.secondTeam!)}
        </Paper>
      </GameAnalyticsTooltipWrapper>
    ) : (
      <GameAnalyticsTooltipWrapper game={match} >
        <Paper className={classes.matchPaper} elevation={0} sx={{ boxShadow: "none" }}>
          <Grid container>
            {showTeam(match.firstTeam!)}
            {showTeam(match.secondTeam!)}
          </Grid>
        </Paper>
      </GameAnalyticsTooltipWrapper>
    )
  );

  const showMatches = () => {
    if (loadGames) return <CircularProgress />;

    if (gamesPerDayList && gamesPerDayList.matchesPerDay.length > 0) {
      return gamesPerDayList.matchesPerDay.map((day, index) => (
        <div key={day.day.toISOString()}>
          <Paper
            className={classes.dayPaper}
            style={index === 0 ? { marginTop: 0 } : undefined}
          >
            {getDateInRightFormat(day.day) + ":"}
          </Paper>
          {showMatchesOnDay(day)}
        </div>
      ));
    }

    return <div>Geen wedstrijden gespeeld deze week.</div>;
  };

  // ---- your existing modal/dialog UI left as-is (trimmed in this snippet) ----
  const showSaveButtonOrLoading = () =>
    !isSaving ? (
      <Button
        onClick={handleSaveMatch}
        className={classes.addPlayerSave}
        disabled={inValidMatch()}
      >
        opslaan
      </Button>
    ) : (
      <CircularProgress />
    );

  const blue = {
    100: "#DAECFF",
    200: "#80BFFF",
    400: "#3399FF",
    500: "#007FFF",
    600: "#0072E5",
  };
  const grey = {
    50: "#F3F6F9",
    100: "#E5EAF2",
    200: "#DAE2ED",
    300: "#C7D0DD",
    400: "#B0B8C4",
    500: "#9DA8B7",
    600: "#6B7A90",
    700: "#434D5B",
    800: "#303740",
    900: "#1C2025",
  };

  const StyledInputRoot = styled("div")(
    ({ theme }) => `
      font-weight: 400;
      border-radius: 8px;
      color: ${theme.palette.mode === "dark" ? grey[300] : grey[900]};
      background: ${theme.palette.mode === "dark" ? grey[900] : "#fff"};
      border: 1px solid ${
        theme.palette.mode === "dark" ? grey[700] : grey[200]
      };
      box-shadow: 0px 2px 2px ${
        theme.palette.mode === "dark" ? grey[900] : grey[50]
      };
      display: grid;
      grid-template-columns: 1fr 19px;
      grid-template-rows: 1fr 1fr;
      overflow: hidden;
      column-gap: 8px;
      padding: 4px;
      width: 4rem;
      &.${numberInputClasses.focused} {
        border-color: ${blue[400]};
        box-shadow: 0 0 0 3px ${
          theme.palette.mode === "dark" ? blue[600] : blue[200]
        };
      }
      &:hover { border-color: ${blue[400]}; }
      &:focus-visible { outline: 0; }
    `
  );

  const StyledInputElement = styled("input")(
    () => `
      font-size: 0.875rem;
      font-family: inherit;
      font-weight: 400;
      line-height: 1.5;
      grid-column: 1/2;
      grid-row: 1/3;
      color: grey;
      background: inherit;
      border: none;
      border-radius: inherit;
      outline: 0;
      width: 90%;
    `
  );

  const StyledButton = styled("button")(
    ({ theme }) => `
      display: flex;
      flex-flow: row nowrap;
      justify-content: center;
      align-items: center;
      appearance: none;
      padding: 0;
      width: 19px;
      height: 19px;
      font-family: system-ui, sans-serif;
      font-size: 0.875rem;
      line-height: 1;
      box-sizing: border-box;
      background: ${theme.palette.mode === "dark" ? grey[900] : "#fff"};
      border: 0;
      color: ${theme.palette.mode === "dark" ? grey[300] : grey[900]};
      transition: 120ms;
      &:hover {
        background: ${theme.palette.mode === "dark" ? grey[800] : grey[50]};
        cursor: pointer;
      }
      &.${numberInputClasses.incrementButton} {
        grid-column: 2/3;
        grid-row: 1/2;
        border-top-left-radius: 4px;
        border-top-right-radius: 4px;
        border: 1px solid;
        border-bottom: 0;
        &:hover { background: ${blue[400]}; color: ${grey[50]}; }
        border-color: ${theme.palette.mode === "dark" ? grey[800] : grey[200]};
        background: ${theme.palette.mode === "dark" ? grey[900] : grey[50]};
      }
      &.${numberInputClasses.decrementButton} {
        grid-column: 2/3;
        grid-row: 2/3;
        border-bottom-left-radius: 4px;
        border-bottom-right-radius: 4px;
        border: 1px solid;
        &:hover { background: ${blue[400]}; color: ${grey[50]}; }
        border-color: ${theme.palette.mode === "dark" ? grey[800] : grey[200]};
        background: ${theme.palette.mode === "dark" ? grey[900] : grey[50]};
      }
    `
  );

  /**
   * A player slot on the match form: a search box first, a list second.
   *
   * The four slots used to be plain dropdowns, which meant scrolling a menu of every
   * active player to find a name you already knew. This is the same control as the
   * ledger's on the album page — type a few letters, the list narrows, Enter takes the
   * top hit — only wearing MUI's clothes, because this page is MUI throughout.
   *
   * The form still stores an *index* into `players`, so nothing downstream changes:
   * `handleSaveMatch` and the duplicate check both read the same four numbers they
   * always did.
   */
  const showPlayerPicker = (field: PlayerField, label: string) => {
    const options = players ?? [];
    /* Falls back to the first name only while the list is still settling — the indices
       are clamped to the list's length the moment it lands. */
    const selected = options[newMatchForm[field]] ?? options[0];
    if (!selected) return null;

    return (
      <Autocomplete<DynamicRatingPlayer, false, true, false>
        options={options}
        value={selected}
        onChange={(_, next) =>
          setNewMatchForm({ ...newMatchForm, [field]: options.indexOf(next) })
        }
        getOptionLabel={(player) => player.name ?? ""}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        /* No clear button: a slot without a player is not a state the form has. */
        disableClearable
        /* The name is selected on focus, so typing replaces it rather than appending to
           it — what makes this read as a search box rather than as a filled-in field. */
        selectOnFocus
        autoHighlight
        openOnFocus
        blurOnSelect
        className={classes.select}
        noOptionsText="geen speler gevonden"
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            size="small"
            placeholder="zoek speler"
            inputProps={{ ...params.inputProps, "aria-label": label }}
          />
        )}
      />
    );
  };

  function showDuplicateGameDialog() {
    return (
      <Modal
        open={isDuplicateGameDialogOpen}
        onClose={() => setDuplicateGameDialogOpen(false)}
        className={classes.modal}
        style={{ maxWidth: "none" }}
      >
        <div className={classes.modalPaper} style={{ width: isMobile ? "100%" : "60rem" }}>
          <Typography variant="h6" gutterBottom className={classes.modalBanner}>
            Een wedstrijd met dezelfde uitslag was vandaag al ingevuld. Weet je
            zeker dat je dit wedstrijdformulier in wil leveren?
          </Typography>
          <Grid container justifyContent="center" spacing={2}>
            <Grid item>
              <Button
                onClick={async () => {
                  await saveGame(duplicateGame!);
                  setDuplicateGame(undefined);
                  setDuplicateGameDialogOpen(false);
                }}
                className={classes.addPlayerSave}
              >
                ja
              </Button>
            </Grid>
            <Grid item>
              <Button
                onClick={() => {
                  setDuplicateGame(undefined);
                  setDuplicateGameDialogOpen(false);
                }}
                className={classes.addPlayerBack}
              >
                nee
              </Button>
            </Grid>
          </Grid>
        </div>
      </Modal>
    );
  }

  function showModal() {
    return (
      <Modal
        open={isModalOpen}
        onClose={() => setModalOpen(false)}
        className={classes.modal}
        style={{ maxWidth: "none" }}
      >
        <div className={classes.modalPaper} style={{ width: isMobile ? "100%" : "60rem" }}>
          <Typography variant="h6" gutterBottom className={classes.modalBanner}>
            wedstrijdformulier inleveren
          </Typography>

          <Grid
            container
            spacing={2}
            alignItems="center"
            style={{ width: "100%", flexWrap: isMobile ? "wrap" : "nowrap" }}
          >
            <Grid
              item
              spacing={1}
              xs={isMobile ? 12 : 4}
              style={{ flex: "1 1 auto", width: "100%" }}
            >
              Team 1 <br />
              {showPlayerPicker("team1_player1", "Team 1, speler 1")}
              {showPlayerPicker("team1_player2", "Team 1, speler 2")}
            </Grid>

            <Grid item xs={isMobile ? 6 : 2}>
              <NumberInput
                slots={{
                  root: StyledInputRoot,
                  input: StyledInputElement,
                  incrementButton: StyledButton,
                  decrementButton: StyledButton,
                }}
                slotProps={{
                  incrementButton: { children: "▴" },
                  decrementButton: { children: "▾" },
                }}
                min={0}
                value={newMatchForm.team1_score}
                onChange={(_, val) =>
                  setNewMatchForm({ ...newMatchForm, team1_score: val })
                }
              />
            </Grid>

            <Grid item xs={isMobile ? 6 : 2} justifyContent={"center"}>
              <NumberInput
                slots={{
                  root: StyledInputRoot,
                  input: StyledInputElement,
                  incrementButton: StyledButton,
                  decrementButton: StyledButton,
                }}
                slotProps={{
                  incrementButton: { children: "▴" },
                  decrementButton: { children: "▾" },
                }}
                min={0}
                value={newMatchForm.team2_score}
                onChange={(_, val) =>
                  setNewMatchForm({ ...newMatchForm, team2_score: val })
                }
              />
            </Grid>

            <Grid item spacing={0} xs={isMobile ? 12 : 4}>
              Team 2 <br />
              {showPlayerPicker("team2_player1", "Team 2, speler 1")}
              {showPlayerPicker("team2_player2", "Team 2, speler 2")}
            </Grid>
          </Grid>

          <Grid container justifyContent="center" spacing={2}>
            <Grid item>{showSaveButtonOrLoading()}</Grid>
            <Grid item>
              <Button
                onClick={() => setModalOpen(false)}
                className={classes.addPlayerBack}
              >
                terug
              </Button>
            </Grid>
          </Grid>
        </div>
      </Modal>
    );
  }

  const showVorigeButton = () =>
    thereArePreviousWeeks && !loadGames ? (
      <Typography
        style={{ textTransform: "none" }}
        className={classes.vorigevolgendebutton}
      >
        vorige
      </Typography>
    ) : null;

  const showVolgendeButton = () =>
    weekIndex !== 0 && !loadGames ? (
      <Typography
        style={{ textTransform: "none" }}
        className={classes.vorigevolgendebutton}
      >
        volgende
      </Typography>
    ) : null;

  const clickVorigeButton = async () => {
    setWeekIndexUpdated(true);
    setLoadGames(true);
    setWeekIndex((prev) => prev + 1);
  };

  const clickVolgendeButton = async () => {
    setWeekIndexUpdated(true);
    setLoadGames(true);
    setWeekIndex((prev) => prev - 1);
  };

  const showStartAndEndOfWeek = () => {
    const [startWeek, endWeek] = getStartAndEndOfWeek();
    const startDay = `${startWeek.getDate()} ${toDutchMonth(
      startWeek.getMonth()
    )}`;
    const endDay = `${endWeek.getDate()} ${toDutchMonth(endWeek.getMonth())}`;
    return `${startDay} - ${endDay}`;
  };

  return (
    <div className={classes.centerContainer} style={{ paddingBottom: isMobile ? "4rem" : "40rem" }}>
      <Grid container spacing={2}>
        <Grid item md={2} sx={{ display: { xs: "none", md: "block" } }} />
        <Grid item xs={12} md={8}>
          <Paper className={classes.banner}>
            {bannerVeryShort
              ? showStartAndEndOfWeek()
              : bannerShort
              ? `uitslagen, ${showStartAndEndOfWeek()}`
              : `tafelvoetbal uitslagen, ${showStartAndEndOfWeek()}`}
          </Paper>
        </Grid>
        <Grid item md={2} sx={{ display: { xs: "none", md: "block" } }} />

        <Grid item xs={12} md={2} className={classes.menuContainer}>
          <div className={classes.menuContainer}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setModalOpen(true)}
              className={classes.addButton}
            >
              <Typography variant="h6" className={classes.buttonText}>
                wedstrijdformulier inleveren
              </Typography>
            </Button>
          </div>
        </Grid>

        <Grid item xs={12} md={8}>
          {showMatches()}
        </Grid>

        <Grid item md={2} sx={{ display: { xs: "none", md: "block" } }} />

        <Grid item md={2} sx={{ display: { xs: "none", md: "block" } }} />
        <Grid item xs={12} md={8}>
          <Paper className={classes.floatingPaper}>
            <Grid item xs={4}>
              <Button
                variant="text"
                disabled={!thereArePreviousWeeks || loadGames}
                onClick={clickVorigeButton}
              >
                {showVorigeButton()}
              </Button>
            </Grid>
            <Grid item xs={4}>
              <Button
                variant="text"
                disabled={weekIndex === 0 || loadGames}
                onClick={clickVolgendeButton}
              >
                {showVolgendeButton()}
              </Button>
            </Grid>
          </Paper>
        </Grid>
        <Grid item md={2} sx={{ display: { xs: "none", md: "block" } }} />
      </Grid>

      {showDuplicateGameDialog()}
      {showModal()}
    </div>
  );
};

export default GamesPage;
