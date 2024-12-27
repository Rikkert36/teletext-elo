import React, { ChangeEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Avatar, CircularProgress, IconButton, Modal, Snackbar, TextField, Theme } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import { makeStyles, createStyles, } from '@mui/styles'
import { AppBar, Toolbar, Typography, Container, Paper, Button, Grid, List, ListItem } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { Client, DynamicRatingPlayer, FileParameter, Game, PlayerGameNumberTuple, PlayerGamePage, PlayerStatistics, TeamPerformance } from '../clients/server.generated';

// Define styles using makeStyles
const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      flexGrow: 1,

    },
    avatar: {
      marginRight: theme.spacing(1),
      marginUp: '10rem',
      height: '10rem',
      width: '10rem'
    },
    modalAvatar: {
      marginRight: theme.spacing(1),

    },
    appBar: {
      marginBottom: theme.spacing(2),
    },
    container: {
      paddingTop: theme.spacing(2),
      backgroundColor: '#000',
      maxWidth: '84rem'
    },
    paper: {
      padding: theme.spacing(2),
      backgroundColor: '#000000',
      background: '#000000',
      color: '#00ffff', // Bright blue
    },
    banner: {
      background: '#FF0000', // Teletekst red
      fontFamily: 'Teletext',
      fontSize: '2rem',
      padding: '2rem',
      color: '#ffff00', // Yellow
      display: 'flex',
      justifyContent: 'center'
    },
    modal: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    addPlayerBack: {
      fontFamily: 'Teletext',
      marginTop: '2rem',
      margin: '1rem',
      padding: '0',
      textTransform: 'none',
      height: 0,
      background: '#000', // Dark green color
      color: '#FF0000',
    },
    uploadButton: {
      fontFamily: 'Teletext',
      marginTop: '2rem',
      margin: '1rem',
      padding: '0',
      textTransform: 'none',
      height: 0,
      background: '#000', //
      color: '#00ffff', // Bright blue
    },
    addPlayerSave: {
      fontFamily: 'Teletext',
      margin: '1rem',
      padding: '0',
      marginTop: '2rem',
      textTransform: 'none',
      height: 0,
      background: '#000', // Dark green color
      color: '#00ff00',
    },
    modalPaper: {
      backgroundColor: '#111', // Black
      boxShadow: theme.shadows[5],
      padding: theme.spacing(4),
      borderRadius: theme.shape.borderRadius,
      color: '#fff', // White text color
    },
    modalBanner: {
      color: '#ffff00', // Yellow
    },
    name: {
      fontSize: '1.6rem'
    },
    stats: {
      fontSize: '1.2rem',
      color: '#00ff00', // Very bright green
    },
    editButton: {
      fontSize: '1.6rem',
      textTransform: 'none',
      width: '100%',
      height: '12rem',
      color: '#ffff00', // Yellow
    },
    playerNames: {
      color: '#ffff00', // Yellow
    },
    matchScore: {
      color: '#00ff00', // lime green

    },
    playerNameTypo: {
      fontSize: '1.0em'
    },
    matchPaper: {
      background: '#000',
      fontSize: '1.0em',
      padding: '0.4rem'
    },
  }),
);

// Define the functional component
const PlayerPage: React.FC = () => {
  // Use the defined styles
  const classes = useStyles();
  const { id } = useParams();

  const [player, setPlayer] = useState<DynamicRatingPlayer>();
  const [playerLoading, setPlayerLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('')
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
  const client = new Client(window.TAFELVOETBAL_SERVER_URL);

  useEffect(() => {
    if (player == null) {
      fetchPlayer();
    }
    if (playerRank == null) {
      fetchRank();
    }
    if (playerGamesIndexUpdated) fetchPlayerGames();
  });

  const fetchPlayer = async () => {
    setPlayerLoading(true);
    const player: DynamicRatingPlayer = await client.getPlayer(id!);
    const playerStats: PlayerStatistics = await client.getPlayerStats(id!);
    setPlayer(player);
    SetPlayerStats(playerStats);
    setPlayerLoading(false);
    setNewName(player.name!)
  }

  const fetchRank = async () => {
    const rank = await client.getPlayerRank(id!);
    setPlayerRank(rank);
  }

  const fetchPlayerGames = async () => {
    const playerGamePage: PlayerGamePage = await client.getPlayerGamesPage(id!, gamesIndex);
    setPlayerGames(playerGamePage.games);
    SetPlayerGamesIndexUpdated(false);
  }

  const fetchAllPlayerGames = async () => {
    const allPlayerGames: Game[] = await client.getPlayerGames(id!);
    setAllPlayerGames(allPlayerGames);
  }

  const handleSavePlayer = async () => {
    setIsSaving(true);
    try {
      if (newAvatar !== null) {
        let image = undefined;
        const fileParameter = { fileName: "Avatar", data: newAvatar } as FileParameter;
        const formData = new FormData();
        formData.append('file', newAvatar!)
        image = fileParameter
        await client.updateAvatar(player!.id!, image);

        if (player!.id! === '08548a49-477a-405c-b742-40e6de5bb7af') {
          setMarkBericht(true)
        } else {
          setNewImageSuccess(true)
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

  const showSaveButtonOrLoading = () => {
    if (!isSaving) {
      return (
        <Button onClick={handleSavePlayer} className={classes.addPlayerSave} >
          opslaan
        </Button>
      );
    } else {
      return <CircularProgress />
    }
  }

  const getAvatarLink = (playerId: string) => {
    return `${window.TAFELVOETBAL_SERVER_URL}/api/player/${playerId}/avatar`
  }

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
            <Typography variant="h6" gutterBottom className={classes.modalBanner}>
              speler bewerken
            </Typography>
            <Grid container spacing={2} display={'-ms-flexbox'} alignItems="center">
              <Grid item xs={2} style={{ overflow: 'hidden', display: 'flex' }}>
                <Avatar alt={player!.name}
                  src={newAvatar ? URL.createObjectURL(newAvatar) : ""} className={classes.modalAvatar} />
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
              style={{ display: 'none' }}
            />
            <label htmlFor="avatar-upload">
              <Button
                component="span"
                className={classes.uploadButton}
              >
                foto toevoegen
              </Button>
            </label>
            {showSaveButtonOrLoading()}
            <Button onClick={() => setIsModalOpen(false)} className={classes.addPlayerBack}>
              terug
            </Button>
          </div>
        </Modal>
      );
    }
  }

  const winstPercText = () => {
    let factor = Math.round(player!.numberOfWins! / player!.numberOfGames! * 100);
    if (player!.numberOfGames! == 0) factor = 0;
    return factor + '%';
  }

  const getWinstMagneet = () => {
    let bestPlayer = undefined;
    let bestWinPercentage = 0;
    let wins = 0;
    let total = 0;

    const threshHold = getThreshold(playerStats?.gamesWith!);

    for (let player of playerStats?.gamesWith!) {
      const totalGames = player.won! + player.lost!;
      if (player.won! + player.lost! >= threshHold) {
        let winPercentage = player.won! / totalGames;
        if (winPercentage > bestWinPercentage 
          || (winPercentage == bestWinPercentage && totalGames > total)
        ) {
          bestPlayer = player;
          bestWinPercentage = winPercentage;
          wins = player.won!;
          total = totalGames;
        }
      }
    }

    const playerName = (bestPlayer == undefined) ? "-" : bestPlayer.player!.name;
    var percentage = Math.round(bestWinPercentage * 100);
    return [playerName, `${percentage}% (${wins}/${total})`];    
  }

  function getThreshold(gamesPlayed: PlayerGameNumberTuple[] ) {
    const playedAtLeast10Times = gamesPlayed.filter(
      player => (player.won! + player.lost!) >= 10);
      
    if (playedAtLeast10Times.length >= 5) {
      return 10;
    }

    const playedAtLeast5TimesWith = gamesPlayed.filter(
      player => (player.won! + player.lost!) >= 5);

    if (playedAtLeast5TimesWith.length >= 3) {
      return 5;
    }

    const playedAtLeast3TimesWith = gamesPlayed.filter(
      player => (player.won! + player.lost!) >= 3);

    if (playedAtLeast3TimesWith.length >= 1) {
      return 3;
    }

    return 1;
  }

  const getPartnerInPain = () => {
    let worstPlayer = undefined;
    let worstWinPercentage = 1;
    let wins = 0;
    let total = 0;

    const threshHold = getThreshold(playerStats?.gamesWith!);

    for (let player of playerStats?.gamesWith!) {
      const totalGames = player.won! + player.lost!;
      if (player.won! + player.lost! >= threshHold) {
        let winPercentage = player.won! / totalGames;
        if (winPercentage < worstWinPercentage 
          || (winPercentage == worstWinPercentage && totalGames > total)) {
          worstPlayer = player;
          worstWinPercentage = winPercentage;
          wins = player.won!;
          total = totalGames;
        }
      }
    }

    const playerName = (worstPlayer == undefined) ? "-" : worstPlayer.player!.name;
    var percentage = Math.round(worstWinPercentage * 100);
    return [playerName, `${percentage}% (${wins}/${total})`];
  }

  const getPracticeMaterial = () => {
    let worstPlayer = undefined;
    let bestWinPercentage = 0;
    let wins = 0;
    let total = 0;

    const threshHold = getThreshold(playerStats?.gamesAgainst!);

    for (let player of playerStats?.gamesAgainst!) {
      const totalGames = player.won! + player.lost!;
      if (player.won! + player.lost! >= threshHold) {
        let winPercentage = player.won! / totalGames;
        if (winPercentage > bestWinPercentage 
          || (winPercentage == bestWinPercentage && totalGames > total)) {
          worstPlayer = player;
          bestWinPercentage = winPercentage;
          wins = player.won!;
          total = totalGames;
        }
      }
    }

    const playerName = (worstPlayer == undefined) ? "-" : worstPlayer.player!.name;
    var percentage = Math.round(bestWinPercentage * 100);
    return [playerName, `${percentage}% (${wins}/${total})`];
  }

  const getNemesis = () => {
    let bestPlayer = undefined;
    let worstWinPercentage = 1;
    let wins = 0;
    let total = 0;

    const threshHold = getThreshold(playerStats?.gamesAgainst!);

    for (let player of playerStats?.gamesAgainst!) {
      const totalGames = player.won! + player.lost!;
      if (player.won! + player.lost! >= threshHold) {
        let winPercentage = player.won! / totalGames;
        if (winPercentage < worstWinPercentage
          || (winPercentage == worstWinPercentage && totalGames > total)
        ) {
          bestPlayer = player;
          worstWinPercentage = winPercentage;
          wins = player.won!;
          total = totalGames;
        }
      }
    }

    const playerName = (bestPlayer == undefined) ? "-" : bestPlayer.player!.name;
    var percentage = Math.round(worstWinPercentage * 100);
    return [playerName, `${percentage}% (${wins}/${total})`];
  }

  const showStatsOrLoading = () => {
    if (playerLoading || playerRank == null) {
      return <CircularProgress />;
    } else {
      var [winstMagnet, winstMagnetPerc] = getWinstMagneet();
      var [partnerInPain, partnerInPainPerc] = getPartnerInPain();
      var [practiceMaterial, practiceMaterialPerc] = getPracticeMaterial();
      var [nemesis, nemesisPerc] = getNemesis();

      return (
        <Grid container style={{ paddingTop: '1rem' }} display={'-ms-flexbox'} alignItems="center" spacing={2}>
          <Grid item xs={4} className={classes.stats}>
            <Typography className={classes.stats}># </Typography>
            <Typography className={classes.stats}>rating </Typography>
            <Typography className={classes.stats}>doelp. voor </Typography>
            <Typography className={classes.stats}>doelp. tegen </Typography>

          </Grid>
          <Grid item xs={2} className={classes.stats}>
            <Typography className={classes.stats}>{playerRank > 0 ? playerRank : '-'}</Typography>
            <Typography className={classes.stats}>{player!.visibleRating}</Typography>
            <Typography className={classes.stats}>{player!.goalsFor}</Typography>
            <Typography className={classes.stats}>{player!.goalsAgainst}</Typography>
          </Grid>
          <Grid item xs={4} className={classes.stats}>
            <Typography className={classes.stats}>gespeeld </Typography>
            <Typography className={classes.stats}>gewonnen </Typography>
            <Typography className={classes.stats}>verloren </Typography>
            <Typography className={classes.stats}>winst perc. </Typography>
          </Grid>
          <Grid item xs={2} className={classes.stats}>
            <Typography className={classes.stats}>{player!.numberOfGames}</Typography>
            <Typography className={classes.stats}>{player!.numberOfWins}</Typography>
            <Typography className={classes.stats}>{player!.numberOfLosses}</Typography>
            <Typography className={classes.stats}>{winstPercText()}</Typography>
          </Grid>
          <Grid item xs={6} className={classes.stats}>
            <Typography className={classes.stats}>winstmagneet</Typography>
          </Grid>
          <Grid item xs={6} className={classes.stats}>
            <Typography className={classes.stats}>{winstMagnetPerc}</Typography>
          </Grid>
          <Grid item xs={12} className={classes.stats}>
            <Typography className={classes.playerNames} gutterBottom noWrap style={{ width: '100%' }}>{winstMagnet}</Typography>
          </Grid>
          <Grid item xs={6} className={classes.stats}>
            <Typography className={classes.stats}>partner in pijn</Typography>
          </Grid>
          <Grid item xs={6} className={classes.stats}>
            <Typography className={classes.stats}>{partnerInPainPerc}</Typography>
          </Grid>
          <Grid item xs={12} className={classes.stats}>
            <Typography className={classes.playerNames} gutterBottom noWrap style={{ width: '100%' }}>{partnerInPain}</Typography>
          </Grid>
          <Grid item xs={6} className={classes.stats}>
            <Typography className={classes.stats}>oefenmateriaal</Typography>
          </Grid>
          <Grid item xs={6} className={classes.stats}>
            <Typography className={classes.stats}>{practiceMaterialPerc}</Typography>
          </Grid>
          <Grid item xs={12} className={classes.stats}>
            <Typography className={classes.playerNames} gutterBottom noWrap style={{ width: '100%' }}>{practiceMaterial}</Typography>
          </Grid>
          <Grid item xs={6} className={classes.stats}>
            <Typography className={classes.stats}>angstgegner</Typography>
          </Grid>
          <Grid item xs={6} className={classes.stats}>
            <Typography className={classes.stats}>{nemesisPerc}</Typography>
          </Grid>
          <Grid item xs={12} className={classes.stats}>
            <Typography className={classes.playerNames} gutterBottom noWrap style={{ width: '100%' }}>{nemesis}</Typography>
          </Grid>
        </Grid>
      );
    };
  }



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
          <Grid container display={'-ms-flexbox'} alignItems="center" spacing={2}>
            <Grid item xs={4} className={classes.avatar}>
              <Avatar key={timestamp} alt='?' src={getAvatarLink(player!.id!)} className={classes.avatar} />
            </Grid>
            <Grid item xs={7} style={{ marginTop: '1rem' }} textAlign="left" className={classes.name}>
              {player?.name}
            </Grid>
            {isIconVisible && <EditIcon style={{ fontSize: '1.6rem', color: '#ffff00' }} />}
          </Grid>
        </Button>

      );
  };

  const showTeam = (team: TeamPerformance) => {
    return (
      <>
        <Grid item xs={4} className={classes.playerNames}>
          <Typography className={classes.playerNameTypo} gutterBottom noWrap style={{ width: '100%' }}>
            {team.firstPlayer!.name}
          </Typography>
          <Typography className={classes.playerNameTypo} gutterBottom noWrap style={{ width: '100%' }}>
            {team.secondPlayer!.name}
          </Typography>
        </Grid>
        <Grid item xs={1} className={classes.matchScore}>
          {team.goals}
        </Grid>
      </>

    );
  }

  const showGameDate = (game: Game) => {

    var d = game!.createdAt!,
      month = '' + (d.getMonth() + 1),
      day = '' + d.getDate(),
      year = '' + d.getFullYear();

    if (month.length < 2)
      month = '0' + month;
    if (day.length < 2)
      day = '0' + day;

    const dateText: String = day + '/' + month + '/' + year;

    return (
      <Grid item xs={2}>
        <Typography className={classes.matchScore}>
          {dateText}
        </Typography>
      </Grid>
    );
  }

  const showPlayerGamesOrLoading = () => {
    if (playerGamesIndexUpdated) {
      return <CircularProgress />;
    } else
      return playerGames!.map((game) => (
        <Paper className={classes.matchPaper}>
          <Grid container>
            {showTeam(game.firstTeam!)}
            {showTeam(game.secondTeam!)}
            {showGameDate(game)}
          </Grid>

        </Paper>
      ));
  };

  const showRatingProgressChart = () => {
    if (allPlayerGames == null) {
      return <CircularProgress />;
    } else

    return <LineChart
              series={[{ data: [null, null, 10, 11, 12] }]}
              xAxis={[{ data: [0, 1, 2, 3, 4, 5, 6] }]}
          /> 

  }

  console.log('PlayerPage - id:', id);
  return (
    <div className={classes.root}>
      <Snackbar
        open={newImageSuccess}
      >
        <Alert severity="success" onClose={() => setNewImageSuccess(false)}>
          Je nieuwe foto is geupload. Click op ctrl-shift-r om je nieuwe foto te zien.
        </Alert>
      </Snackbar>
      <Snackbar
        open={markBericht}
      >
        <Alert severity="success" onClose={() => setMarkBericht(false)}>
          Oke Mark, jij wint.
        </Alert>
      </Snackbar>
      <Grid container spacing={2} >
        <Grid item xs={2}>

        </Grid>
        <Grid item xs={8} >
          <Paper className={classes.banner} style={{ marginBottom: '1rem' }}>
            speler profiel
          </Paper>
          <Grid container spacing={2}>
          <Grid item xs={12}>
              {showRatingProgressChart()}
            </Grid>
            <Grid item xs={6}>
              {showProfileOrloading()}
              {showStatsOrLoading()}
            </Grid>
            <Grid item xs={6}>
              {showPlayerGamesOrLoading()}
            </Grid>
            
          </Grid>
        </Grid>
      </Grid>
      <Grid item xs={2}>
      </Grid>
      {editPlayerModal()}
    </div>
  );
};

export default PlayerPage;