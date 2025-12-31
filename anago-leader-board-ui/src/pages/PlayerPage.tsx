import React, { ChangeEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Avatar,
  CircularProgress,
  IconButton,
  Modal,
  Snackbar,
  TextField,
  Theme,
  Tooltip,
} from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import {
  ChartsItemContentProps,
  ChartContainer,
  ChartsTooltip,
  ChartsTooltipSlots,
  DefaultChartsItemTooltipContent,
} from "@mui/x-charts";

import { makeStyles, createStyles } from "@mui/styles";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Paper,
  Button,
  Grid,
  List,
  ListItem,
  ButtonGroup,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import {
  Client,
  DynamicRatingPlayer,
  FileParameter,
  Game,
  PlayerGameNumberTuple,
  PlayerGamePage,
  PlayerStatistics,
  TeamPerformance,
  PlayerPerformance,
} from "../clients/server.generated";

type WinStreak = {
  games: Game[];
  length: number;
  // Optional metadata that can be handy
  startIndex: number;
  endIndex: number;
};

// Define styles using makeStyles
const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      flexGrow: 1,
    },
    avatar: {
      marginRight: theme.spacing(1),
      marginUp: "10rem",
      height: "10rem",
      width: "10rem",
    },
    modalAvatar: {
      marginRight: theme.spacing(1),
    },
    appBar: {
      marginBottom: theme.spacing(2),
    },
    dayPaper: {
      color: "#00ff00", // lime green
      background: "#000",
      fontSize: "1.2em",
    },
    container: {
      paddingTop: theme.spacing(2),
      backgroundColor: "#000",
      maxWidth: "84rem",
    },
    paper: {
      padding: theme.spacing(2),
      backgroundColor: "#000000",
      background: "#000000",
      color: "#00ffff", // Bright blue
    },
    banner: {
      background: "#FF0000", // Teletekst red
      fontFamily: "Teletext",
      fontSize: "2rem",
      padding: "2rem",
      color: "#ffff00", // Yellow
      display: "flex",
      justifyContent: "center",
    },
    modal: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    addPlayerBack: {
      fontFamily: "Teletext",
      marginTop: "2rem",
      margin: "1rem",
      padding: "0",
      textTransform: "none",
      height: 0,
      background: "#000", // Dark green color
      color: "#FF0000",
    },
    uploadButton: {
      fontFamily: "Teletext",
      marginTop: "2rem",
      margin: "1rem",
      padding: "0",
      textTransform: "none",
      height: 0,
      background: "#000", //
      color: "#00ffff", // Bright blue
    },
    addPlayerSave: {
      fontFamily: "Teletext",
      margin: "1rem",
      padding: "0",
      marginTop: "2rem",
      textTransform: "none",
      height: 0,
      background: "#000", // Dark green color
      color: "#00ff00",
    },
    modalPaper: {
      backgroundColor: "#111", // Black
      boxShadow: theme.shadows[5],
      padding: theme.spacing(4),
      borderRadius: theme.shape.borderRadius,
      color: "#fff", // White text color
    },
    modalBanner: {
      color: "#ffff00", // Yellow
    },
    name: {
      fontSize: "1.6rem",
    },
    stats: {
      fontSize: "1.2rem",
      color: "#00ff00", // Very bright green
    },
    editButton: {
      fontSize: "1.6rem",
      textTransform: "none",
      width: "100%",
      height: "12rem",
      color: "#ffff00", // Yellow
    },
    playerNames: {
      color: "#ffff00", // Yellow
    },
    matchScore: {
      color: "#00ff00", // lime green
    },
    playerNameTypo: {
      fontSize: "1.0em",
    },
    matchPaper: {
      background: "#000",
      fontSize: "1.0em",
      padding: "0.4rem",
    },
    buttonContainer: {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
    },
    grow: {
      flexGrow: 1,
    },
    button: {
      margin: theme.spacing(1),
      fontFamily: "Teletext",
      fontSize: "1.0rem",
      textTransform: "none",
    },
    ranglijstButton: {
      color: "#FF0000", // Teletekst red
    },
    selectedRange: {
      color: "#00ff00", // Very bright green
    },
    unselectedRange: {
      color: "#ffff00", // Yellow
    },
    historyButton: {
      color: "#00ffff", // Bright blue
    },
  })
);

// Define the functional component
const PlayerPage: React.FC = () => {
  // Use the defined styles
  const classes = useStyles();
  const { id } = useParams();

  const [player, setPlayer] = useState<DynamicRatingPlayer>();
  const [playerLoading, setPlayerLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAvatar, setNewAvatar] = useState<Blob | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [timestamp, setTimestamp] = useState(Date.now());
  const [newImageSuccess, setNewImageSuccess] = useState(false);
  const [markBericht, setMarkBericht] = useState(false);
  const [isIconVisible, setIsIconVisible] = useState(false);
  const [playerGames, setPlayerGames] = useState<Game[]>();
  const [allPlayerGames, setAllPlayerGames] = useState<Game[]>();
  const [gamesIndex, setGamesIndex] = useState(0);
  const [playerRank, setPlayerRank] = useState<number>();
  const [playerStats, SetPlayerStats] = useState<PlayerStatistics>();
  const [playerGamesIndexUpdated, SetPlayerGamesIndexUpdated] = useState(true);
  const [dateRange, setDateRange] = useState("3months");
  const client = new Client(window.TAFELVOETBAL_SERVER_URL);

  useEffect(() => {
    if (!player) {
      fetchPlayer();
    }
  }, [player]);

  useEffect(() => {
    if (!playerStats) {
      fetchStats();
    }
  }, [playerStats]);

  useEffect(() => {
    if (!playerRank) {
      fetchRank();
    }
  }, [playerRank]);

  useEffect(() => {
    if (playerGamesIndexUpdated) {
      fetchPlayerGames();
    }
  }, [playerGamesIndexUpdated]);

  useEffect(() => {
    if (!allPlayerGames) {
      fetchAllPlayerGames();
    }
  }, [allPlayerGames]);

  const fetchPlayer = async () => {
    setPlayerLoading(true);
    const player: DynamicRatingPlayer = await client.getPlayer(id!);
    setPlayer(player);
    setPlayerLoading(false);
    setNewName(player.name!);
  };

  const fetchStats = async () => {
    const playerStats: PlayerStatistics = await client.getPlayerStats(id!);
    SetPlayerStats(playerStats);
  };

  const fetchRank = async () => {
    const rank = await client.getPlayerRank(id!);
    setPlayerRank(rank);
  };

  const fetchPlayerGames = async () => {
    const playerGamePage: PlayerGamePage = await client.getPlayerGamesPage(
      id!,
      gamesIndex
    );
    setPlayerGames(playerGamePage.games);
    SetPlayerGamesIndexUpdated(false);
  };

  const fetchAllPlayerGames = async () => {
    const allPlayerGames: Game[] = await client.getPlayerGames(id!);

    const normalizedGames = allPlayerGames.map((game) => {
      const createdAt = new Date(game.createdAt!); // Parse the date
      createdAt.setHours(12, 0, 0, 0); // Set to 12:00 PM, resetting minutes, seconds, and milliseconds
      return {
        ...game,
        createdAt: createdAt, // Optional: Format it back as a string if needed
      } as Game;
    });

    setAllPlayerGames(normalizedGames);
  };

  const handleSavePlayer = async () => {
    setIsSaving(true);
    try {
      if (newAvatar !== null) {
        let image = undefined;
        const fileParameter = {
          fileName: "Avatar",
          data: newAvatar,
        } as FileParameter;
        const formData = new FormData();
        formData.append("file", newAvatar!);
        image = fileParameter;
        await client.updateAvatar(player!.id!, image);

        if (player!.id! === "08548a49-477a-405c-b742-40e6de5bb7af") {
          setMarkBericht(true);
        } else {
          setNewImageSuccess(true);
        }
      }
      if (newName != player?.name) {
        await client.updatePlayerName(player!.id!, newName);
      }
    } catch (exception) {
      console.log(exception);
    } finally {
      setNewAvatar(null);
      setIsModalOpen(false);
      setIsSaving(false);
      fetchPlayer();
      setTimestamp(Date.now());
    }
  };

  const gameWon = (game: Game) => {
    const winningTeam =
      game.firstTeam!.goals! > game.secondTeam!.goals!
        ? game.firstTeam
        : game.secondTeam;

    return (
      id === winningTeam?.firstPlayer?.playerId ||
      id === winningTeam?.secondPlayer?.playerId
    );
  };

  const getTopWinStreaks = (max = 10): WinStreak[] => {
    if (!allPlayerGames?.length) return [];

    const streaks: WinStreak[] = [];

    let currentStreak: Game[] = [];
    let currentStartIndex = 0;

    for (let i = 0; i < allPlayerGames.length; i++) {
      const game = allPlayerGames[i];

      if (gameWon(game)) {
        if (currentStreak.length === 0) {
          currentStartIndex = i;
        }
        currentStreak.push(game);
      } else if (currentStreak.length > 0) {
        streaks.push({
          games: currentStreak,
          length: currentStreak.length,
          startIndex: currentStartIndex,
          endIndex: i - 1,
        });
        currentStreak = [];
      }
    }

    // If it ends with a streak, flush it
    if (currentStreak.length > 0) {
      streaks.push({
        games: currentStreak,
        length: currentStreak.length,
        startIndex: currentStartIndex,
        endIndex: allPlayerGames.length - 1,
      });
    }

    // Sort by length desc, then most recent streak first (higher endIndex)
    streaks.sort((a, b) => b.length - a.length || b.endIndex - a.endIndex);

    return streaks.slice(0, max);
  };

  const getCurrentWinStreak = (): WinStreak => {
    if (!allPlayerGames?.length) {
      return {
        games: [],
        length: 0,
        startIndex: -1,
        endIndex: -1,
      };
    }

    const endIndex = allPlayerGames.length - 1;
    const lastWasWin = gameWon(allPlayerGames[endIndex]);

    const games: Game[] = [];
    let startIndex = endIndex;

    // Walk backwards while result matches last game
    for (let i = endIndex; i >= 0; i--) {
      const game = allPlayerGames[i];

      if (gameWon(game) !== lastWasWin) break;

      startIndex = i;
      games.unshift(game); // keep chronological order
    }

    const length = lastWasWin ? games.length : -games.length;

    return {
      games,
      length,
      startIndex,
      endIndex,
    };
  };

  const showSaveButtonOrLoading = () => {
    if (!isSaving) {
      return (
        <Button onClick={handleSavePlayer} className={classes.addPlayerSave}>
          opslaan
        </Button>
      );
    } else {
      return <CircularProgress />;
    }
  };

  const getAvatarLink = (playerId: string) => {
    return `${window.TAFELVOETBAL_SERVER_URL}/api/player/${playerId}/avatar`;
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const avatar = files[0];
      setNewAvatar(avatar);
    }
  };

  const editPlayerModal = () => {
    if (player) {
      return (
        <Modal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          className={classes.modal}
        >
          <div className={classes.modalPaper}>
            <Typography
              variant="h6"
              gutterBottom
              className={classes.modalBanner}
            >
              speler bewerken
            </Typography>
            <Grid
              container
              spacing={2}
              display={"-ms-flexbox"}
              alignItems="center"
            >
              <Grid item xs={2} style={{ overflow: "hidden", display: "flex" }}>
                <Avatar
                  alt={player!.name}
                  src={newAvatar ? URL.createObjectURL(newAvatar) : ""}
                  className={classes.modalAvatar}
                />
              </Grid>
              <Grid item xs={10}>
                <TextField
                  label="naam"
                  variant="outlined"
                  fullWidth
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </Grid>
            </Grid>

            <input
              accept="image/*"
              id="avatar-upload"
              type="file"
              onChange={handleAvatarChange}
              style={{ display: "none" }}
            />
            <label htmlFor="avatar-upload">
              <Button component="span" className={classes.uploadButton}>
                foto toevoegen
              </Button>
            </label>
            {showSaveButtonOrLoading()}
            <Button
              onClick={() => setIsModalOpen(false)}
              className={classes.addPlayerBack}
            >
              terug
            </Button>
          </div>
        </Modal>
      );
    }
  };

  const winstPercText = () => {
    let factor = Math.round(
      (player!.numberOfWins! / player!.numberOfGames!) * 100
    );
    if (player!.numberOfGames! == 0) factor = 0;
    return factor + "%";
  };

  function getThreshold(gamesPlayed: PlayerGameNumberTuple[]) {
    const playedAtLeast5TimesWith = gamesPlayed.filter(
      (player) => player.numberOfGames! >= 5
    );

    if (playedAtLeast5TimesWith.length >= 5) {
      return 5;
    }

    const playedAtLeast3TimesWith = gamesPlayed.filter(
      (player) => player.numberOfGames! >= 3
    );

    if (playedAtLeast3TimesWith.length >= 1) {
      return 3;
    }

    return 1;
  }

  const getDateInRightFormat = (d: Date) => {
    const weekDay = toDutchDay(d.getDay());
    const dayOfMonth = d.getDate();
    const month = toDutchMonth(d.getMonth());
    return `${weekDay}, ${dayOfMonth} ${month}`;
  };

  const getDateInStreakFormat = (d: Date | undefined) => {
    if (!d) return "-";

    const weekDay = toDutchDay(d.getDay());
    const dayOfMonth = d.getDate();
    const month = toDutchMonth(d.getMonth());
    return `${weekDay.toLocaleLowerCase()} ${dayOfMonth} ${month}`;
  };

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
        throw new Error(
          "Invalid month index. Month should be between 0 and 11."
        );
    }
  };

  const getTop10Bffs = (
    gamesWithList: PlayerGameNumberTuple[],
    gamesPlayedByA: number
  ): Array<[DynamicRatingPlayer, number, number]> => {
    const rows: Array<[DynamicRatingPlayer, number, number]> = [];

    for (const t of gamesWithList ?? []) {
      const player = t?.player;
      const gamesWith = Math.max(0, t?.numberOfGames ?? 0);
      const gamesB = Math.max(0, player?.numberOfGames ?? 0);

      // Skip unusable rows
      if (!player) continue;
      if (gamesWith <= 0) continue;
      if (gamesB <= 0) continue;

      const aShare = gamesWith / gamesPlayedByA;
      const bShare = gamesWith / gamesB;

      // Numerical safety
      const scorePercent = Math.round(Math.sqrt(aShare * bShare) * 100);

      rows.push([player, gamesWith, scorePercent]);
    }

    // Sort by score desc, tie-breaker by gamesWith desc
    rows.sort((x, y) => y[2] - x[2] || y[1] - x[1]);

    return rows.slice(0, 10);
  };

  const getRelations = (players: PlayerGameNumberTuple[]) => {
    const thresHold = getThreshold(players);
    const eligiblePlayers = players.filter(
      (g) => g.numberOfGames! >= thresHold
    );

    const sortedPlayers = eligiblePlayers
      .slice()
      .sort((a, b) => getAverageDelta(b) - getAverageDelta(a));

    const result = sortedPlayers.map((player) => {
      const playerName = player?.player?.name ?? "-";

      const avgDeltaNum = getAverageDelta(player);
      const avgDeltaFormatted =
        avgDeltaNum > 0 ? `+${avgDeltaNum.toFixed(2)}` : avgDeltaNum.toFixed(2);

      const delta = player?.delta;
      const deltaFormatted =
        delta == null ? "-" : delta > 0 ? `+${delta}` : `${delta}`;

      return [playerName, `${avgDeltaFormatted} (${deltaFormatted})`];
    });

    return result;
  };

  const getAverageDelta = (player: PlayerGameNumberTuple) => {
    return player.delta! / player.numberOfGames!;
  };

  const getSelectedColor = (buttonText: string) => {
    if (buttonText === dateRange) {
      return classes.selectedRange;
    }
    return classes.unselectedRange;
  };

  const showBasicStatsOrLoading = () => {
    if (playerLoading || playerRank == null) {
      return <CircularProgress />;
    } else {
      const winstreaks: WinStreak[] = getTopWinStreaks();
      const currentStreak: WinStreak = getCurrentWinStreak();

      return (
        <Grid
          container
          style={{ paddingTop: "1rem" }}
          display={"-ms-flexbox"}
          alignItems="center"
          spacing={2}
        >
          <Grid item xs={4} className={classes.stats}>
            <Typography className={classes.stats}># </Typography>
            <Typography className={classes.stats}>rating </Typography>
            <Typography className={classes.stats}>doelp. voor </Typography>
            <Typography className={classes.stats}>doelp. tegen </Typography>
          </Grid>
          <Grid item xs={2} className={classes.stats}>
            <Typography className={classes.stats}>
              {playerRank > 0 ? playerRank : "-"}
            </Typography>
            <Typography className={classes.stats}>
              {player!.visibleRating}
            </Typography>
            <Typography className={classes.stats}>
              {player!.goalsFor}
            </Typography>
            <Typography className={classes.stats}>
              {player!.goalsAgainst}
            </Typography>
          </Grid>
          <Grid item xs={4} className={classes.stats}>
            <Typography className={classes.stats}>gespeeld </Typography>
            <Typography className={classes.stats}>gewonnen </Typography>
            <Typography className={classes.stats}>verloren </Typography>
            <Typography className={classes.stats}>winst perc. </Typography>
          </Grid>
          <Grid item xs={2} className={classes.stats}>
            <Typography className={classes.stats}>
              {player!.numberOfGames}
            </Typography>
            <Typography className={classes.stats}>
              {player!.numberOfWins}
            </Typography>
            <Typography className={classes.stats}>
              {player!.numberOfLosses}
            </Typography>
            <Typography className={classes.stats}>{winstPercText()}</Typography>
          </Grid>
          <Grid container item>
            <Grid item xs={6} className={classes.stats}>
              <Typography className={classes.stats}>
                huidige winstreak{" "}
              </Typography>
            </Grid>
            <Grid item xs={6} className={classes.stats}>
              <Typography className={classes.stats}>
                {currentStreak.length}
              </Typography>
            </Grid>
            <Grid item xs={12} className={classes.stats}>
              <Typography
                className={classes.playerNames}
                gutterBottom
                noWrap
                style={{ width: "100%" }}
              >
                vanaf {getDateInStreakFormat(currentStreak.games[0]?.createdAt)}
              </Typography>
            </Grid>
          </Grid>
          <Grid container item>
            <Grid item xs={6} className={classes.stats}>
              <Typography className={classes.stats}>
                hoogste winstreak{" "}
              </Typography>
            </Grid>
            <Grid item xs={6} className={classes.stats}>
              <Typography className={classes.stats}>
                {winstreaks[0]?.length ?? 0}
              </Typography>
            </Grid>
            <Grid item xs={12} className={classes.stats}>
              <Typography
                className={classes.playerNames}
                gutterBottom
                noWrap
                style={{ width: "100%" }}
              >
                {getDateInStreakFormat(winstreaks[0]?.games[0].createdAt)} -{" "}
                {getDateInStreakFormat(winstreaks[0]?.games!.at(-1)!.createdAt)}
              </Typography>
            </Grid>
          </Grid>
        </Grid>
      );
    }
  };

  const tooltipBffPlayers = (
    players: Array<[DynamicRatingPlayer, number, number]>
  ): JSX.Element => (
    <Grid
      container
      spacing={0.5}
      direction="column"
      style={{ minWidth: 400, maxWidth: 600 }}
    >
      {players.map((player, i) => (
        <Grid
          container
          item
          key={i}
          wrap="nowrap"
          spacing={1}
          alignItems="center"
        >
          <Grid item xs={7}>
            <Typography
              noWrap
              title={players[i][0]?.name ?? ""}
              className={classes.playerNames}
              style={{ maxWidth: "100%" }}
            >
              {players[i][0].name}
            </Typography>
          </Grid>
          <Grid item xs={5}>
            <Typography
              noWrap
              title={players[i][0]?.name ?? ""}
              className={classes.stats}
              style={{ maxWidth: "100%" }}
            >
              {players[i][2] + "%" + " (" + players[i][1] + ")"}
            </Typography>
          </Grid>
        </Grid>
      ))}
    </Grid>
  );

  const tooltipPlayers = (players: (string | undefined)[][]): JSX.Element => (
    <Grid
      container
      spacing={0.5}
      direction="column"
      style={{ minWidth: 400, maxWidth: 600 }}
    >
      {players.map(([first, second], i) => (
        <Grid
          container
          item
          key={i}
          wrap="nowrap"
          spacing={1}
          alignItems="center"
        >
          <Grid item xs={7}>
            <Typography
              noWrap
              title={first ?? ""}
              className={classes.playerNames}
              style={{ maxWidth: "100%" }}
            >
              {first ?? ""}
            </Typography>
          </Grid>
          <Grid item xs={5}>
            <Typography
              noWrap
              title={second ?? ""}
              className={classes.stats}
              style={{ maxWidth: "100%" }}
            >
              {second ?? ""}
            </Typography>
          </Grid>
        </Grid>
      ))}
    </Grid>
  );

  const tooltipStyle = {
    tooltip: {
      style: {
        maxWidth: "450px",
        minWidth: "300px",
        backgroundColor: "black",
        borderRadius: "4px",
        padding: "0.5rem 0.75rem",
      },
    },
  };

  const showCoolStatsOrLoading = () => {
    if (playerStats == null || !player?.numberOfGames) {
      return <CircularProgress />;
    } else {
      const winstMagneets = getRelations(playerStats.gamesWith!).slice(0, 10);
      const partnerInPains = getRelations(playerStats.gamesWith!)
        .reverse()
        .slice(0, 10);

      const bffs = getTop10Bffs(playerStats.gamesWith!, player!.numberOfGames!);

      const practiceMaterials = getRelations(playerStats.gamesAgainst!).slice(
        0,
        10
      );
      const nemeses = getRelations(playerStats.gamesAgainst!)
        .reverse()
        .slice(0, 10);

      const archnemesis = getTop10Bffs(
        playerStats.gamesAgainst!,
        player!.numberOfGames!
      );

      return (
        <Grid
          container
          style={{ paddingTop: "1rem" }}
          alignItems="center"
          spacing={2}
        >
          {/* Winstmagneet */}
          <Tooltip
            title={tooltipPlayers(winstMagneets)}
            componentsProps={tooltipStyle}
          >
            <Grid container item>
              <Grid item xs={6} className={classes.stats}>
                <Typography className={classes.stats}>winstmagneet</Typography>
              </Grid>
              <Grid item xs={6} className={classes.stats}>
                <Typography className={classes.stats}>
                  {winstMagneets[0][1]}
                </Typography>
              </Grid>
              <Grid item xs={12} className={classes.stats}>
                <Typography
                  className={classes.playerNames}
                  gutterBottom
                  noWrap
                  style={{ width: "100%" }}
                >
                  {winstMagneets[0][0]}
                </Typography>
              </Grid>
            </Grid>
          </Tooltip>

          {/* Partner in pijn */}
          <Tooltip
            title={tooltipPlayers(partnerInPains)}
            componentsProps={tooltipStyle}
          >
            <Grid container item>
              <Grid item xs={6} className={classes.stats}>
                <Typography className={classes.stats}>
                  partner in pijn
                </Typography>
              </Grid>
              <Grid item xs={6} className={classes.stats}>
                <Typography className={classes.stats}>
                  {partnerInPains[0][1]}
                </Typography>
              </Grid>
              <Grid item xs={12} className={classes.stats}>
                <Typography
                  className={classes.playerNames}
                  gutterBottom
                  noWrap
                  style={{ width: "100%" }}
                >
                  {partnerInPains[0][0]}
                </Typography>
              </Grid>
            </Grid>
          </Tooltip>

          {/* BFF */}
          <Tooltip
            title={tooltipBffPlayers(bffs)}
            componentsProps={tooltipStyle}
          >
            <Grid container item>
              <Grid item xs={6} className={classes.stats}>
                <Typography className={classes.stats}>bff</Typography>
              </Grid>
              <Grid item xs={6} className={classes.stats}>
                <Typography className={classes.stats}>
                  {`${bffs[0][2]}% (${bffs[0][1]})`}
                </Typography>
              </Grid>
              <Grid item xs={12} className={classes.stats}>
                <Typography
                  className={classes.playerNames}
                  gutterBottom
                  noWrap
                  style={{ width: "100%" }}
                >
                  {bffs[0][0].name}
                </Typography>
              </Grid>
            </Grid>
          </Tooltip>

          {/* Oefenmateriaal */}
          <Tooltip
            title={tooltipPlayers(practiceMaterials)}
            componentsProps={tooltipStyle}
          >
            <Grid container item>
              <Grid item xs={6} className={classes.stats}>
                <Typography className={classes.stats}>
                  oefenmateriaal
                </Typography>
              </Grid>
              <Grid item xs={6} className={classes.stats}>
                <Typography className={classes.stats}>
                  {practiceMaterials[0][1]}
                </Typography>
              </Grid>
              <Grid item xs={12} className={classes.stats}>
                <Typography
                  className={classes.playerNames}
                  gutterBottom
                  noWrap
                  style={{ width: "100%" }}
                >
                  {practiceMaterials[0][0]}
                </Typography>
              </Grid>
            </Grid>
          </Tooltip>

          {/* Angstgegner */}
          <Tooltip
            title={tooltipPlayers(nemeses)}
            componentsProps={tooltipStyle}
          >
            <Grid container item>
              <Grid item xs={6} className={classes.stats}>
                <Typography className={classes.stats}>angstgegner</Typography>
              </Grid>
              <Grid item xs={6} className={classes.stats}>
                <Typography className={classes.stats}>
                  {nemeses[0][1]}
                </Typography>
              </Grid>
              <Grid item xs={12} className={classes.stats}>
                <Typography
                  className={classes.playerNames}
                  gutterBottom
                  noWrap
                  style={{ width: "100%" }}
                >
                  {nemeses[0][0]}
                </Typography>
              </Grid>
            </Grid>
          </Tooltip>

          {/* aartsrivaal */}
          <Tooltip
            title={tooltipBffPlayers(archnemesis)}
            componentsProps={tooltipStyle}
          >
            <Grid container item>
              <Grid item xs={6} className={classes.stats}>
                <Typography className={classes.stats}>aartsrivaal</Typography>
              </Grid>
              <Grid item xs={6} className={classes.stats}>
                <Typography className={classes.stats}>
                  {`${archnemesis[0][2]}% (${archnemesis[0][1]})`}
                </Typography>
              </Grid>
              <Grid item xs={12} className={classes.stats}>
                <Typography
                  className={classes.playerNames}
                  gutterBottom
                  noWrap
                  style={{ width: "100%" }}
                >
                  {archnemesis[0][0]?.name}
                </Typography>
              </Grid>
            </Grid>
          </Tooltip>
        </Grid>
      );
    }
  };

  const showProfileOrloading = () => {
    if (playerLoading) {
      return <CircularProgress />;
    } else
      return (
        <Button
          className={classes.editButton}
          onMouseEnter={() => setIsIconVisible(true)}
          onMouseLeave={() => setIsIconVisible(false)}
          onClick={() => setIsModalOpen(true)}
        >
          <Grid
            container
            display={"-ms-flexbox"}
            alignItems="center"
            spacing={2}
          >
            <Grid item xs={4} className={classes.avatar}>
              <Avatar
                key={timestamp}
                alt="?"
                src={getAvatarLink(player!.id!)}
                className={classes.avatar}
              />
            </Grid>
            <Grid
              item
              xs={7}
              style={{ marginTop: "1rem" }}
              textAlign="left"
              className={classes.name}
            >
              {player?.name}
            </Grid>
            {isIconVisible && (
              <EditIcon style={{ fontSize: "1.6rem", color: "#ffff00" }} />
            )}
          </Grid>
        </Button>
      );
  };

  const showOwnTeam = (game: Game) => {
    const ownTeamPerformance = getOwnTeamPerformance(game);
    const playerPerformance =
      ownTeamPerformance.firstPlayer?.playerId === id
        ? ownTeamPerformance.firstPlayer!
        : ownTeamPerformance.secondPlayer!;
    const teamMatePerformance =
      ownTeamPerformance.firstPlayer?.playerId !== id
        ? ownTeamPerformance.firstPlayer!
        : ownTeamPerformance.secondPlayer!;

    return (
      <>
        <Grid item xs={4} className={classes.playerNames}>
          <Typography
            className={classes.playerNameTypo}
            gutterBottom
            noWrap
            style={{ width: "100%" }}
          >
            {showRatingAndDelta(playerPerformance)}
          </Typography>
          <Typography
            className={classes.playerNameTypo}
            gutterBottom
            noWrap
            style={{ width: "100%" }}
          >
            {teamMatePerformance.name}
          </Typography>
        </Grid>
        <Grid item xs={1} className={classes.matchScore}>
          {ownTeamPerformance.goals}
        </Grid>
      </>
    );
  };

  const showRatingAndDelta = (playerInfo: PlayerPerformance) => {
    var delta = playerInfo.newRating! - playerInfo.oldRating!;
    var sign = delta >= 0 ? "+" : "";
    return `${playerInfo.oldRating} ${sign}${delta}`;
  };

  const getDayDelta = (gamesOnDay: Game[]) => {
    var firstPerformance = getPlayerPerformance(gamesOnDay[0]);
    var lastPerformance = getPlayerPerformance(
      gamesOnDay[gamesOnDay.length - 1]
    );

    var delta = lastPerformance.newRating! - firstPerformance.oldRating!;
    var sign = delta >= 0 ? "+" : "";
    return ` (${firstPerformance.oldRating} ${sign}${delta})`;
  };

  const showTeam = (team: TeamPerformance) => {
    return (
      <>
        <Grid item xs={4} className={classes.playerNames}>
          <Typography
            className={classes.playerNameTypo}
            gutterBottom
            noWrap
            style={{ width: "100%" }}
          >
            {team.firstPlayer!.name}
          </Typography>
          <Typography
            className={classes.playerNameTypo}
            gutterBottom
            noWrap
            style={{ width: "100%" }}
          >
            {team.secondPlayer!.name}
          </Typography>
        </Grid>
        <Grid item xs={1} className={classes.matchScore}>
          {team.goals}
        </Grid>
      </>
    );
  };

  const getOwnTeamPerformance = (game: Game): TeamPerformance => {
    if (game.firstTeam?.firstPlayer?.playerId == id) return game.firstTeam!;
    if (game.firstTeam?.secondPlayer?.playerId == id) return game.firstTeam!;
    if (game.secondTeam?.firstPlayer?.playerId == id) return game.secondTeam!;
    return game.secondTeam!;
  };

  const getOtherTeamPerformance = (game: Game): TeamPerformance => {
    if (game.firstTeam?.firstPlayer?.playerId == id) return game.secondTeam!;
    if (game.firstTeam?.secondPlayer?.playerId == id) return game.secondTeam!;
    if (game.secondTeam?.firstPlayer?.playerId == id) return game.firstTeam!;
    return game.firstTeam!;
  };

  const getPlayerPerformance = (game: Game): PlayerPerformance => {
    if (game.firstTeam?.firstPlayer?.playerId == id)
      return game.firstTeam?.firstPlayer!;
    if (game.firstTeam?.secondPlayer?.playerId == id)
      return game.firstTeam?.secondPlayer!;
    if (game.secondTeam?.firstPlayer?.playerId == id)
      return game.secondTeam?.firstPlayer!;
    return game.secondTeam?.secondPlayer!;
  };

  const showGames = (games: Game[]) => {
    if (games != null && games[0].createdAt != null) {
      return (
        <div>
          <Paper className={classes.dayPaper}>
            {getDateInRightFormat(games[0].createdAt!) +
              " - " +
              getPlayerPerformance(games[games.length - 1]).newRating +
              getDayDelta(games) +
              ":"}
          </Paper>
          {games!.map((game) => showTooltipGame(game))}
        </div>
      );
    } else {
      return <div>{"no"}</div>;
    }
  };

  const showTooltipGame = (game: Game) => {
    return (
      <Paper className={classes.matchPaper}>
        <Grid container>
          {showOwnTeam(game)}
          {showTeam(getOtherTeamPerformance(game))}
        </Grid>
      </Paper>
    );
  };

  function createZeroRatingGame(referenceDate: Date): Game {
    // Helper function to create a PlayerPerformance
    const createPlayerPerformance = (playerId: string): PlayerPerformance => {
      return new PlayerPerformance({
        playerId: playerId,
        name: undefined,
        oldRating: undefined,
        newRating: 0,
        stdBefore: undefined,
        stdAfter: undefined,
      });
    };

    // Create two teams with two players each
    const firstTeam = new TeamPerformance();
    firstTeam.firstPlayer = createPlayerPerformance(id!);
    firstTeam.secondPlayer = createPlayerPerformance(id!);
    firstTeam.goals = 0;

    const secondTeam = new TeamPerformance();
    secondTeam.firstPlayer = createPlayerPerformance(id!);
    secondTeam.secondPlayer = createPlayerPerformance(id!);
    secondTeam.goals = 0;

    // Create the game
    const game = new Game();
    game.id = "<game-id>"; // Set an appropriate ID or leave undefined if optional
    game.firstTeam = firstTeam;
    game.secondTeam = secondTeam;
    game.createdAt = new Date(
      referenceDate.getTime() - 7 * 24 * 60 * 60 * 1000
    ); // A day before the reference date

    return game;
  }

  function groupGamesByDate(games: Game[]): Game[][] {
    // Use a Map to group games by their date
    const groupedGames = games.reduce((acc, game) => {
      // Extract the date portion from the `createdAt` timestamp (ignoring the time)
      const gameDate = new Date(game.createdAt!).toISOString().split("T")[0];

      // Initialize the array for this date if it doesn't exist
      if (!acc.has(gameDate)) {
        acc.set(gameDate, []);
      }

      // Add the current game to the array for this date
      acc.get(gameDate).push(game);

      return acc;
    }, new Map());

    // Convert the Map to a 2D array
    const groupedArray: Game[][] = Array.from(groupedGames.values());

    var result = groupedArray.filter((gameList) => {
      const gameDate = new Date(gameList[0].createdAt!);
      const now = new Date();

      switch (dateRange) {
        case "1month":
          return gameDate >= new Date(now.setMonth(now.getMonth() - 1));
        case "3months":
          return gameDate >= new Date(now.setMonth(now.getMonth() - 3));
        case "6months":
          return gameDate >= new Date(now.setMonth(now.getMonth() - 6));
        case "1year":
          return gameDate >= new Date(now.setFullYear(now.getFullYear() - 1));
        case "all":
          return true; // Show all games
        default:
          return true;
      }
    });
    return result;
  }

  const showRatingProgressChart = () => {
    if (allPlayerGames == null) {
      return <CircularProgress />;
    } else if (allPlayerGames.length == 0) {
      return <div>{"geen wedstrijden gespeeld"}</div>;
    } else {
      const gamesWith0 = [
        createZeroRatingGame(allPlayerGames[0].createdAt!),
        ...allPlayerGames,
      ];

      const filteredGames = Object.values(
        gamesWith0.reduce((acc, game) => {
          // Get the date portion of the `createdAt` timestamp (ignoring the time)
          const gameDate = new Date(game.createdAt!)
            .toISOString()
            .split("T")[0];

          // If there's no game for this date or the current game is later, update the entry
          if (
            !acc[gameDate] ||
            new Date(game.createdAt!) >= new Date(acc[gameDate].createdAt!)
          ) {
            acc[gameDate] = game;
          }

          return acc;
        }, {} as Record<string, Game>)
      );

      const recentGames = filteredGames.filter((game) => {
        const gameDate = new Date(game.createdAt!);
        const now = new Date();

        switch (dateRange) {
          case "1month":
            return gameDate >= new Date(now.setMonth(now.getMonth() - 1));
          case "3months":
            return gameDate >= new Date(now.setMonth(now.getMonth() - 3));
          case "6months":
            return gameDate >= new Date(now.setMonth(now.getMonth() - 6));
          case "1year":
            return gameDate >= new Date(now.setFullYear(now.getFullYear() - 1));
          case "all":
            return true; // Show all games
          default:
            return true;
        }
      });

      const playerPerGame = recentGames.map((game) => {
        let player;
        if (game.firstTeam?.firstPlayer?.playerId == id!)
          player = game.firstTeam.firstPlayer;
        if (game.firstTeam?.secondPlayer?.playerId == id!)
          player = game.firstTeam.secondPlayer;
        if (game.secondTeam?.firstPlayer?.playerId == id!)
          player = game.secondTeam.firstPlayer;
        if (game.secondTeam?.secondPlayer?.playerId == id!)
          player = game.secondTeam.secondPlayer;
        return player;
      });
      const ratingPerGame = [
        ...playerPerGame.map((player) => player?.newRating!),
      ];

      const dates = [...recentGames.map((game) => game.createdAt)];
      const maxTicks = 7; // Maximum number of labels
      const minDate = dates[0]; // Earliest date in milliseconds
      const maxDate = dates[dates.length - 1]; // Latest date in milliseconds
      const step = (maxDate?.getTime()! - minDate?.getTime()!) / maxTicks;

      // Generate custom ticks
      const customTicks = Array.from({ length: maxTicks + 1 }, (_, i) => {
        const tickDate = new Date(minDate?.getTime()! + i * step); // Calculate the tick date
        tickDate.setHours(12, 0, 0, 0); // Set time to 12:00 PM
        return tickDate.getTime(); // Return the timestamp
      });

      const tooltipGames: Game[][] = groupGamesByDate(gamesWith0);
      return (
        <Paper style={{ width: "100%" }} className={classes.matchPaper}>
          <LineChart
            tooltip={{
              trigger: "axis",
              axisContent: (props) => {
                const { dataIndex, series } = props;

                return showGames(tooltipGames[dataIndex!]);
              },
            }}
            series={[
              {
                data: ratingPerGame,
                showMark: false,
                //area: true,
                baseline: "min",
                curve: "linear",
                id: "pvId",
              },
            ]}
            xAxis={[
              {
                data: dates,
                min: dates[0],
                max: dates[dates.length - 1],
                valueFormatter: (value) => {
                  return new Intl.DateTimeFormat("nl-NL", {
                    day: "2-digit",
                    month: "short",
                  }).format(new Date(value));
                },
                tickInterval: customTicks,
              },
            ]}
            grid={{ horizontal: true }}
            height={600}
            sx={{
              ".MuiLineElement-series-pvId": {
                strokeDasharray: "2 2", // Dashed line for the first series
                stroke: "#00ff00",
              },
              "& .MuiPopper-root": {
                stroke: "#ff0000", // Set vertical cursor line color
                strokeWidth: 2, // Set line thickness
                strokeDasharray: "4 2", // Optional: dashed line style
              },
              "& .MuiChartsAxis-left .MuiChartsAxis-tickLabel": {
                fill: "#00ff00",
              },
              "& .MuiMarkElement-root": {
                fill: "#ff0000", // Set the mark color (red in this case)
              },
              "& .MuiChartsAxis-bottom .MuiChartsAxis-tickLabel": {
                fill: "#00ff00",
              },
              "& .MuiChartsAxis-bottom .MuiChartsAxis-line": {
                stroke: "#00ff00",
              },
              "& .MuiChartsAxis-left .MuiChartsAxis-line": {
                stroke: "#00ff00",
              },
              "& .MuiChartsAxis-tick": {
                stroke: "#00ff00",
              },
            }}
            yAxis={[
              {
                tickNumber: 5,
              },
            ]}
          />

          <div className={classes.buttonContainer}>
            <Button
              className={classes.button + " " + getSelectedColor("all")}
              onClick={() => setDateRange("all")}
            >
              altijd
            </Button>
            <Button
              className={classes.button + " " + getSelectedColor("1year")}
              onClick={() => setDateRange("1year")}
            >
              1 jaar
            </Button>
            <Button
              className={classes.button + " " + getSelectedColor("6months")}
              onClick={() => setDateRange("6months")}
            >
              6 maanden
            </Button>
            <Button
              className={classes.button + " " + getSelectedColor("3months")}
              onClick={() => setDateRange("3months")}
            >
              3 maanden
            </Button>
            <Button
              className={classes.button + " " + getSelectedColor("1month")}
              onClick={() => setDateRange("1month")}
            >
              1 maand
            </Button>
          </div>
        </Paper>
      );
    }
  };

  console.log("PlayerPage - id:", id);
  return (
    <div className={classes.root}>
      <Snackbar open={newImageSuccess}>
        <Alert severity="success" onClose={() => setNewImageSuccess(false)}>
          Je nieuwe foto is geupload. Click op ctrl-shift-r om je nieuwe foto te
          zien.
        </Alert>
      </Snackbar>
      <Snackbar open={markBericht}>
        <Alert severity="success" onClose={() => setMarkBericht(false)}>
          Oke Mark, jij wint.
        </Alert>
      </Snackbar>
      <Grid container spacing={2}>
        <Grid item xs={2}></Grid>
        <Grid item xs={8}>
          <Paper className={classes.banner} style={{ marginBottom: "1rem" }}>
            speler profiel
          </Paper>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              {showProfileOrloading()}
              {showBasicStatsOrLoading()}
            </Grid>
            <Grid item xs={6}>
              {showCoolStatsOrLoading()}
            </Grid>
            <Grid item xs={12}>
              {showRatingProgressChart()}
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      <Grid item xs={2}></Grid>
      {editPlayerModal()}
    </div>
  );
};

export default PlayerPage;
