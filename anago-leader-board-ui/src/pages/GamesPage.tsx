import React, { useState, useEffect } from 'react';
import {
  Paper,
  CircularProgress,
  Typography,
  Button,
  Grid,
  Modal,
  Select,
  MenuItem,

} from '@mui/material';
import { styled } from '@mui/system';

import {
    numberInputClasses,
    Unstable_NumberInput as NumberInput,
  } from '@mui/base/Unstable_NumberInput';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import { Theme} from '@mui/material';
import {   makeStyles,  createStyles, ThemeProvider} from '@mui/styles';
import { Client, Player, Game, GameForm, PlayerPerformance, TeamPerformance } from '../clients/server.generated';

// interface PlayerMatchInfo {
//     id: string,
//     name: string,
//     oldRating: number,
//     newRating: number
// }

// interface TeamPerformance {
//     player1: PlayerMatchInfo,
//     player2: PlayerMatchInfo,
//     goals: number
// }

// interface Match {
//   firstTeam: TeamPerformance
//   secondTeam: TeamPerformance
//   createdAt: Date,
// }

interface GamesPerDay {
    day: Date,
    games: Game[]
}

interface GamesPerDayList {
    matchesPerDay: GamesPerDay[]
}

// const initialMatches: Game[] = [
//     {
//         firstTeam: {
//             player1: {id: 'ifsdfds', name: 'Jackie Bruinen', oldRating: 1000, newRating: 1098},
//             player2: {id: 'fdsgds', name: 'Leonie Coldeweijer', oldRating: 967, newRating: 1023},
//             goals: 10
//         },
//         secondTeam: {
//             player1: {id: 'hrfdhfdh', name: 'Peter de Leeuw', oldRating: 1203, newRating: 1192},
//             player2: {id: 'fdsgds', name: 'Karin Tulp', oldRating: 956, newRating: 950},
//             goals: 3
//         },
//         createdAt: new Date(Date.now()),
//     },
//     {
//         firstTeam: {
//             player1: {id: 'fdsgwe', name: 'Ingrid de Haan', oldRating: 688, newRating: 724},
//             player2: {id: 'fsdgrh', name: 'Sjan Kuypers', oldRating: 1320, newRating: 1322},
//             goals: 10
//         },
//         secondTeam: {
//             player1: {id: 'hfdghfdh', name: 'Martijn Koningin', oldRating: 803, newRating: 800},
//             player2: {id: 'hfdhfd', name: 'Arnd van Biestakker', oldRating: 936, newRating: 901},
//             goals: 5
//         },
//         createdAt: new Date(Date.now()),
//     },
//     {
//         firstTeam: {
//             player1: {id: 'ifsdfds', name: 'Olaf de Bolder', oldRating: 1000, newRating: 1098},
//             player2: {id: 'fdsgds', name: 'Stefanie de Kerel', oldRating: 967, newRating: 1023},
//             goals: 10
//         },
//         secondTeam: {
//             player1: {id: 'hrfdhfdh', name: 'Manneke Pis', oldRating: 1203, newRating: 1192},
//             player2: {id: 'fdsgds', name: 'Slaap Vaak', oldRating: 956, newRating: 950},
//             goals: 3
//         },
//         createdAt: new Date(Date.now() - (1000 * 3600 * 24)),
//     },
//     {
//         firstTeam: {
//             player1: {id: 'ifsdfds', name: 'Ninette van der Velden van Der Baarnd', oldRating: 1000, newRating: 1098},
//             player2: {id: 'fdsgds', name: 'Stefanie de Kerel', oldRating: 967, newRating: 1023},
//             goals: 10
//         },
//         secondTeam: {
//             player1: {id: 'hrfdhfdh', name: 'Ninette van der Veldenfff', oldRating: 1203, newRating: 1192},
//             player2: {id: 'fdsgds', name: 'Slaap Vaak', oldRating: 956, newRating: 950},
//             goals: 3
//         },
//         createdAt: new Date(Date.now() + (1000 * 3600 * 24)),
//     },
// ]



const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    
    avatar: {
      marginRight: theme.spacing(1),
    },
    
    centerContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
    modal: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalPaper: {
      backgroundColor: '#111', // Black
      boxShadow: theme.shadows[5],
      padding: theme.spacing(4),
      borderRadius: theme.shape.borderRadius,
      color: '#fff', // White text color
    },
    
    menuContainer: {
      display: 'flex',
      justifyContent: 'flex-end',
      marginBottom: theme.spacing(1),
    },
    addButton: {
      fontFamily: 'Teletext',
      margin: '2rem',
      padding: '0',
      height: 0,
      background: '#000', // Dark green color
      color: '#00ff00', // lime green
    },
    buttonText: {
      fontFamily: 'Teletext',
      fontSize: '1.0rem',
      textTransform: 'none',

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
    dayPaper: {
        color: '#00ff00', // lime green
        background: '#000',
        fontSize: '1.2em'
    },
    matchPaper: {
        background: '#000',
        fontSize: '1.2em',
        padding: '0.4rem'
    },
    playerNames: {
        color: '#ffff00', // Yellow
    },
    matchScore: {
        color: '#00ff00', // lime green
        
    },
    ratingChange: {
        color: '#ffff00', // Yellow
        
    },
    playerNameTypo: {
        fontSize: '1.0em'
    },
    modalBanner: {
        
      color: '#ffff00', // Yellow
    },
    select: {
        margin: 10,
        width: '15rem'
    },
    numberinput: {
        width: '3rem',
        background: "#000"
    }
  })
);

const toDutchDay = (day: number): string => {
    switch (day) {
        case 0:
            return 'Zondag';
        case 1:
            return 'Maandag';
        case 2:
            return 'Dinsdag';
        case 3:
            return 'Woensdag';
        case 4:
            return 'Donderdag';
        case 5:
            return 'Vrijdag';
        case 6: 
            return 'Zaterdag';
        default:
          throw new Error('Invalid weekday index. Month should be between 0 and 11.');
    }
}

const toDutchMonth = (month: number): string => {
    switch (month) {
      case 0:
        return 'januari';
      case 1:
        return 'februari';
      case 2:
        return 'maart';
      case 3:
        return 'april';
      case 4:
        return 'mei';
      case 5:
        return 'juni';
      case 6:
        return 'juli';
      case 7:
        return 'augustus';
      case 8:
        return 'september';
      case 9:
        return 'oktober';
      case 10:
        return 'november';
      case 11:
        return 'december';
      default:
        throw new Error('Invalid month index. Month should be between 0 and 11.');
    }
  };

const daysAreEqual = (date1: Date, date2: Date) => {
    return (
        date1.getDate() === date2.getDate() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getFullYear() === date2.getFullYear()
      );
}

const insertDateInMatchDays = (result: GamesPerDayList, sameDate: GamesPerDay) => {
    if (result.matchesPerDay.length > 0) {
        var insertAt = result.matchesPerDay.length;
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
}

const sortMatchesPerDay = (matches: Game[]) : GamesPerDayList => {
    const result = {matchesPerDay: []} as GamesPerDayList; 
    for (var match of matches) {
        var sameDate =  result.matchesPerDay.find((matchesPerDay) => daysAreEqual(matchesPerDay.day, match.createdAt!));
        if (sameDate === null || sameDate === undefined) {
            sameDate = {day: match.createdAt, games: []} as GamesPerDay;
            insertDateInMatchDays(result, sameDate);
        }
        sameDate?.games.unshift(match);
    }
    return result;
  }

const GamesPage: React.FC = () => {
  const classes = useStyles();
  const client = new Client(window.TAFELVOETBAL_SERVER_URL);
  const [games, setGames] = useState<Game[]>();
  const [gamesPerDayList, setGamesPerDay] = useState<GamesPerDayList>();
  const [players, setPlayers] = useState<Player[]>();
  const [isModalOpen, setModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newMatchForm, setNewMatchForm] = useState({
    team1_player1: 0,
    team1_player2: 0,
    team2_player1: 0,
    team2_player2: 0,
    team1_score: 0 as number | undefined,
    team2_score: 0 as number | undefined 
  });

  useEffect(() => {
    if (players == null) refreshPlayers();
    if (games == null) refreshMatches();
  });

  const refreshPlayers = async () => {
    const players : Player[] = await client.getPlayers();
    setPlayers(players);
    const team1_player2 = Math.min(1, players.length);
    const team2_player1 = Math.min(2, players.length);
    const team2_player2 = Math.min(3, players.length);
    setNewMatchForm({...newMatchForm, team1_player2, team2_player1, team2_player2});
  }

  const refreshMatches = async () => {
    const games: Game[] = await client.getGames();
    setGames(games);
    const gamesPerDayList = sortMatchesPerDay(games);
    setGamesPerDay(gamesPerDayList);
  };


//   const handleTeam1Player1Change = (event: SelectChangeEvent) => {
//     setNewMatchForm({
//         newMatchForm, 
//         team1_player1: event.target.value,
//     });
//   }
  

  const handleOpenModal = () => {
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const getDateInRightFormat = (d: Date) => {
      const weekDay = toDutchDay(d.getDay());
      const dayOfMonth = d.getDate();
      const month = toDutchMonth(d.getMonth());
      return `${weekDay}, ${dayOfMonth} ${month}`
  };

  const handleSaveMatch = async () => {
    setIsSaving(true);
    const game = 
    ({
        firstTeamForm: ({
            firstPlayerId: players![newMatchForm.team1_player1].id,
            secondPlayerId: players![newMatchForm.team1_player2].id,
            goals: newMatchForm.team1_score
        }),
        secondTeamForm: ({
            firstPlayerId: players![newMatchForm.team2_player1].id,
            secondPlayerId: players![newMatchForm.team2_player2].id,
            goals: newMatchForm.team2_score
        }),
    });

    const gameForm = new GameForm();
    gameForm.init(game);
    try {
    await client.createGame(gameForm);
    } catch (ex) {
      console.log(ex);
    } finally {

      const team1_player2 = Math.min(1, players!.length);
      const team2_player1 = Math.min(2, players!.length);
      const team2_player2 = Math.min(3, players!.length);
      setNewMatchForm({...newMatchForm, team1_player2, team2_player1, team2_player2});
      setNewMatchForm({
          team1_player1: 0,
          team1_player2: 1,
          team2_player1: 2,
          team2_player2: 3,
          team1_score: 0,
          team2_score: 0
      });
      setModalOpen(false);
      setIsSaving(false);
      refreshMatches();
    }
  };

  

  const showRatingAndDelta = (playerInfo: PlayerPerformance) => {
    var delta = playerInfo.newRating! - playerInfo.oldRating!;
    var sign = delta >= 0 ? '+' : '';
    return (
    // <Typography display="inline" className={classes.ratingChange}>        
    //  {`(${playerInfo.oldRating} ${sign}${delta})`}
    // </Typography>);
        `(${playerInfo.oldRating} ${sign}${delta})`
    )
    };

    const showTeam = (team: TeamPerformance) => {
        return (
            <>
                <Grid item xs={3} className={classes.playerNames}>
                    <Typography className={classes.playerNameTypo} gutterBottom noWrap style={{ width: '100%' }}>
                        {team.firstPlayer!.name} 
                    </Typography>
                    <Typography className={classes.playerNameTypo} gutterBottom noWrap style={{ width: '100%' }}>
                        {team.secondPlayer!.name} 
                    </Typography>
                </Grid>
                <Grid item xs={2} className={classes.playerNames}>
                    <Typography className={classes.playerNameTypo} gutterBottom noWrap style={{ width: '100%' }}>
                        {showRatingAndDelta(team.firstPlayer!)}
                    </Typography>
                    <Typography className={classes.playerNameTypo} gutterBottom noWrap style={{ width: '100%' }}>
                        {showRatingAndDelta(team.secondPlayer!)}
                    </Typography>
                </Grid>
                <Grid item xs={1} className={classes.matchScore}>
                    {team.goals}
                </Grid>
            </>
            
        );
    }

  const showMatchesOnDay = (day: GamesPerDay) => {
    return day.games.map((match) => (
        <Paper className={classes.matchPaper}>
            <Grid container>
                {showTeam(match.firstTeam!)}
                {showTeam(match.secondTeam!)}
            </Grid>
            
        </Paper>
    ));
  };

  const showMatches = () => {
    if (gamesPerDayList) {
      return gamesPerDayList.matchesPerDay!.map((day, index) => (
        <div>
            <Paper className={classes.dayPaper}>
                {getDateInRightFormat(day.day) + ':'}
            </Paper>
            {showMatchesOnDay(day)}
        </div>
        
      ));
    }
  };

  const inValidMatch = (): boolean => {
    const noWinner = newMatchForm.team1_score == newMatchForm.team2_score;
    const playerSet = new Set([newMatchForm.team1_player1, newMatchForm.team1_player2, newMatchForm.team2_player1, newMatchForm.team2_player2]);
    const duplicatePlayers = playerSet.size != 4;
    return noWinner || duplicatePlayers;
  }

  const showSaveButtonOrLoading = () => {
    if (!isSaving) {
      return (
        <Button onClick={handleSaveMatch} className={classes.addPlayerSave} disabled={inValidMatch()}>
          opslaan
        </Button>
      );
    } else {
      return <CircularProgress />
    }
  }

  const blue = {
    100: '#DAECFF',
    200: '#80BFFF',
    400: '#3399FF',
    500: '#007FFF',
    600: '#0072E5',
  };
  
  const grey = {
    50: '#F3F6F9',
    100: '#E5EAF2',
    200: '#DAE2ED',
    300: '#C7D0DD',
    400: '#B0B8C4',
    500: '#9DA8B7',
    600: '#6B7A90',
    700: '#434D5B',
    800: '#303740',
    900: '#1C2025',
  };

  const StyledInputRoot = styled('div')(
    ({ theme }) => `
    font-weight: 400;
    border-radius: 8px;
    color: ${theme.palette.mode === 'dark' ? grey[300] : grey[900]};
    background: ${theme.palette.mode === 'dark' ? grey[900] : '#fff'};
    border: 1px solid ${theme.palette.mode === 'dark' ? grey[700] : grey[200]};
    box-shadow: 0px 2px 2px ${theme.palette.mode === 'dark' ? grey[900] : grey[50]};
    display: grid;
    grid-template-columns: 1fr 19px;
    grid-template-rows: 1fr 1fr;
    overflow: hidden;
    column-gap: 8px;
    padding: 4px;
    width: 4rem;

  
    &.${numberInputClasses.focused} {
        border-color: ${blue[400]};
        box-shadow: 0 0 0 3px ${theme.palette.mode === 'dark' ? blue[600] : blue[200]};
      }
    
      &:hover {
        border-color: ${blue[400]};
      }

    // firefox
    &:focus-visible {
      outline: 0;
    }
  `,
  );

  
  const StyledInputElement = styled('input')(
    ({ theme }) => `
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
  `,
  );
  
  const StyledButton = styled('button')(
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
    background: ${theme.palette.mode === 'dark' ? grey[900] : '#fff'};
    border: 0;
    color: ${theme.palette.mode === 'dark' ? grey[300] : grey[900]};
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 120ms;
  
    &:hover {
      background: ${theme.palette.mode === 'dark' ? grey[800] : grey[50]};
      border-color: ${theme.palette.mode === 'dark' ? grey[600] : grey[300]};
      cursor: pointer;
    }
  
    &.${numberInputClasses.incrementButton} {
      grid-column: 2/3;
      grid-row: 1/2;
      border-top-left-radius: 4px;
      border-top-right-radius: 4px;
      border: 1px solid;
      border-bottom: 0;
      &:hover {
        cursor: pointer;
        background: ${blue[400]};
        color: ${grey[50]};
      }
  
    border-color: ${theme.palette.mode === 'dark' ? grey[800] : grey[200]};
    background: ${theme.palette.mode === 'dark' ? grey[900] : grey[50]};
    color: ${theme.palette.mode === 'dark' ? grey[200] : grey[900]};
    }
  
    &.${numberInputClasses.decrementButton} {
      grid-column: 2/3;
      grid-row: 2/3;
      border-bottom-left-radius: 4px;
      border-bottom-right-radius: 4px;
      border: 1px solid;
      &:hover {
        cursor: pointer;
        background: ${blue[400]};
        color: ${grey[50]};
      }
  
    border-color: ${theme.palette.mode === 'dark' ? grey[800] : grey[200]};
    background: ${theme.palette.mode === 'dark' ? grey[900] : grey[50]};
    color: ${theme.palette.mode === 'dark' ? grey[200] : grey[900]};
    }
    & .arrow {
      transform: translateY(-1px);
    }
  `,
  );

  function showModal() {
    return <Modal
        open={isModalOpen}
        onClose={handleCloseModal}
        className={classes.modal}
        style={{ maxWidth: 'none' }}
    >
        <div className={classes.modalPaper} style={{ width: '60rem'}}>
            <Typography variant="h6" gutterBottom className={classes.modalBanner}>
                wedstrijdformulier inleveren
            </Typography>
            <Grid container spacing={2} alignItems="center"  style={{width: '100%', flexWrap: 'nowrap' }}>
                <Grid item spacing={1} xs={4} style={{ flex: '1 1 auto', width: '100%'}}>
                    Team 1 <br />
                    <Select
                        variant="outlined"
                        value={newMatchForm.team1_player1}
                        onChange={(e) => setNewMatchForm({ ...newMatchForm, team1_player1: (e.target.value as number) })}
                        className={classes.select}
                    >
                        {players?.map((player, index) => { return (<MenuItem value={index}>{player.name}</MenuItem>); })}
                    </Select>
                    <br />

                    <Select
                        value={newMatchForm.team1_player2}
                        onChange={(e) => setNewMatchForm({ ...newMatchForm, team1_player2: (e.target.value as number) })}
                        className={classes.select}

                    >
                        {players?.map((player, index) => { return (<MenuItem value={index}>{player.name}</MenuItem>); })}
                    </Select>
                </Grid>
                <Grid item xs={2} >
                    <NumberInput
                        slots={{
                            root: StyledInputRoot,
                            input: StyledInputElement,
                            incrementButton: StyledButton,
                            decrementButton: StyledButton,
                          }}
                          slotProps={{
                            incrementButton: {
                              children: '▴',
                            },
                            decrementButton: {
                              children: '▾',
                            },
                          }}
                        min={0}
                        value={newMatchForm.team1_score}
                        onChange={(e, val) => setNewMatchForm({ ...newMatchForm, team1_score: val})}
                    />
                </Grid>
                <Grid item xs={2} justifyContent={'center'}>
                <NumberInput
                        slots={{
                            root: StyledInputRoot,
                            input: StyledInputElement,
                            incrementButton: StyledButton,
                            decrementButton: StyledButton,
                          }}
                          slotProps={{
                            incrementButton: {
                              children: '▴',
                            },
                            decrementButton: {
                              children: '▾',
                            }, 
                          }}
                        min={0}
                        value={newMatchForm.team2_score}
                        onChange={(e, val) => setNewMatchForm({ ...newMatchForm, team2_score: val})}
                    />
                </Grid>
                <Grid item spacing={0} xs={4}>
                    Team 2 <br />
                    <Select
                        variant="outlined"
                        value={newMatchForm.team2_player1}
                        onChange={(e,) => setNewMatchForm({ ...newMatchForm, team2_player1: (e.target.value as number) })}
                        className={classes.select}
                    >
                        {players?.map((player, index) => { return (<MenuItem value={index}>{player.name}</MenuItem>); })}
                    </Select>
                    <br />
                    <Select
                        value={newMatchForm.team2_player2}
                        onChange={(e) => setNewMatchForm({ ...newMatchForm, team2_player2: (e.target.value as number) })}
                        className={classes.select}

                    >
                        {players?.map((player, index) => { return (<MenuItem value={index}>{player.name}</MenuItem>); })}
                    </Select>
                </Grid>
            </Grid>
            <Grid container justifyContent="center" spacing={2}>
                <Grid item>
                    {showSaveButtonOrLoading()}
                </Grid>
                <Grid item>
                    <Button onClick={handleCloseModal} className={classes.addPlayerBack}>
                    terug
                    </Button>
                </Grid>
            </Grid>
        </div>
    </Modal>;
}

  return (
    <div className={classes.centerContainer}>

      <Grid container spacing={2} >
        <Grid item xs={2}>

        </Grid>
        <Grid item xs={8} >
          <Paper className={classes.banner}>
            tafelvoetbal uitslagen
          </Paper>
        </Grid> 
        <Grid item xs={2}>

        </Grid>
        <Grid item xs={2} className={classes.menuContainer}>
          <div className={classes.menuContainer}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenModal}
              className={classes.addButton}
            >
              <Typography variant="h6" className={classes.buttonText}>
                wedstrijdformulier inleveren
              </Typography>
            </Button>
          </div>
        </Grid>
        <Grid item xs={8}>
                {showMatches()}
        </Grid>
        <Grid item xs={2}>

        </Grid>
      </Grid>      

      {showModal()} 
    </div>
  );

    
};

export default GamesPage;


