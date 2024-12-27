import React, { useState, ChangeEvent, useEffect } from 'react';
import {
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Typography,
  Avatar,
  IconButton,
  InputAdornment,
  TextField,
  Button,
  Grid,
  Modal,
  CircularProgress,
} from '@mui/material';
import {Link} from"react-router-dom"
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import { Theme} from '@mui/material';
import {   makeStyles,  createStyles, ThemeProvider} from '@mui/styles';
import { Client, FileParameter, DynamicRatingPlayer } from '../clients/server.generated';

// interface Player {
//   id: number;
//   name: string;
//   rating: number;
//   matchesPlayed: number;
//   wins: number;
//   losses: number;
//   goalsFor: number;
//   goalsAgainst: number;
//   avatar: Blob | null;
// }

interface RankedPlayer {
  player: DynamicRatingPlayer,
  rank: number
}

const generatePlaceholderImage = () => {
  const randomNum = Math.floor(Math.random() * 1000);
  return `https://picsum.photos/50/50?random=${randomNum}`;
};

// const initialPlayers: Player[] = [
//   { id: 1, name: 'Jan van Griensven', rating: 934, matchesPlayed: 10, wins: 5, losses: 5, goalsFor: 65, goalsAgainst: 33, avatar: null },
//   { Id: 2, name: 'Alexander', rating: 1145, matchesPlayed: 10, wins: 7, losses: 3, goalsFor: 80, goalsAgainst: 13, avatar: null },

//   // Other initial players...
// ];

const addRankToPlayers = (players: DynamicRatingPlayer[]) : RankedPlayer[] => {
  const sortedPlayers : DynamicRatingPlayer[] = [...players].sort((a, b) => b.visibleRating! - a.visibleRating!);
  console.log(sortedPlayers);

  return sortedPlayers.map((player, index) => (
    {
      player, 
      rank: numberOfPlayersWithHigherRating(sortedPlayers, index) + 1 
    }
    ));
    
};

const numberOfPlayersWithHigherRating = (sortedPlayers: DynamicRatingPlayer[], index: number) : number => {
  var player = sortedPlayers[index];
  var counter = index;
  while(counter > -1 && player.visibleRating == sortedPlayers[counter].visibleRating) {
    counter--;
  }
  return counter + 1;
}; 

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    table: {
      borderCollapse: 'collapse',
      width: '100%',
      marginTop: theme.spacing(2),
    },
    tableHeader: {
      '&.MuiTableCell-root': {
        background: '#FF0000', // Teletekst red
        color: '#fff', // White
      },
    },
    tableCell: {
      padding: theme.spacing(1),
      fontSize: '1.2rem',
      overflow: 'hidden',
      fontFamily: 'Teletext',
      background: '#FF0000', // Black background
      color: '#fff', // White text color
      border: 'none', // Remove table cell borders
      textOverflow: "ellipsis",
      maxWidth: '11rem',
    },
    searchFieldContainer: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: theme.spacing(1),
    },
    searchField: {
      marginRight: theme.spacing(1),
      background: '#000444', // Black background
      color: '#004444', // White text color
    },
    avatar: {
      marginRight: theme.spacing(1),
    },
    narrowTable: {
      maxWidth: '100%', // Adjust the width as needed
      margin: 'auto', // Center the table
      background: '#000', // black
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
    
    tableRow: {
      '&:hover': {
        backgroundColor: 'rgba(255, 0, 0, 0.1)', // Slightly transparent bright red on hover
      },
    },
    playerName: {
      color: '#ffff00', // Yellow
      background: '#000', // Black
      fontSize: '1.2rem',

    },
    otherRowValue: {
      color: '#00ff00', // Very bright green
      background: '#000', // Black
      textAlign: 'center',
    },
    firstPlayerName: {
      color: '#00ffff', // Bright blue
      background: '#000', // Black
      fontSize: '1.2rem',

    },
    inActivePlayerName: {
      color: '#0000ff', // Bright blue
      background: '#000', // Black
      fontSize: '1.2rem',
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
      color: '#00ff00',
    },
    buttonText: {
      fontFamily: 'Teletext',
      fontSize: '1.0rem',
      textTransform: 'none',

    },
    playernameTypography: {
      fontSize: '1.2rem',

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
    modalBanner: {
      color: '#ffff00', // Yellow
    },
    link: {
      "&:hover": {
        textDecoration: "underline #ffff00"
    }
    },
    inActiveLink: {
      "&:hover": {
        textDecoration: "underline #ff0000"
    }
    }
  })
);
const HistoryPage: React.FC = () => {
  const classes = useStyles();
  const client = new Client(window.TAFELVOETBAL_SERVER_URL);
  const [players, setPlayers] = useState<RankedPlayer[]>();
  const [playersLoading, setPlayersLoading] = useState(true);
  useEffect(() => {
    if (players == null) refreshPlayers();
  });

  const refreshPlayers = async () => {
    setPlayersLoading(true);
    const players : DynamicRatingPlayer[] = await client.getDynamicLeaderBoardByYear(2024);
    const rankedPlayers : RankedPlayer[] = addRankToPlayers(players);

    setPlayers(rankedPlayers);
    setPlayersLoading(false);
  }

  const getAvatarLink = (playerId: string) => {
    return `${window.TAFELVOETBAL_SERVER_URL}/api/player/${playerId}/avatar`
  }

  const showPlayersOrLoading = () => {
    if (playersLoading) {
      return (
        <CircularProgress/>
      );
    } else {
      return showPlayers();
    };
  };

  const showPlayers = () => {
    if (players) {
      return players!.map((player, index) => (
        <TableRow key={player.player.id} className={classes.tableRow}>
          <TableCell style={{width:'0.5rem'}}className={classes.tableCell + ' ' + classes.otherRowValue}>{player.rank + '.'}</TableCell>
          <TableCell className={classes.tableCell + ' ' + (GetPlayerClass(player))}>
            <Grid container display={'-ms-flexbox'} alignItems="center">
              <Grid item xs={2}>
                <Avatar alt='?' src={getAvatarLink(player.player.id!)} className={classes.avatar} />
              </Grid> 
              <Grid item xs={10} style={{ overflow: 'hidden', display: 'flex' }}>
                <Link style={{ textDecoration: 'none' }}  
                  className={classes.link + ' ' + (GetPlayerClass(player))} 
                  to={`../speler/${player.player.id}`}>
                  <Typography className={classes.playernameTypography} gutterBottom noWrap style={{ width: '100%' }}>
                    {player.player.name}
                  </Typography>
                </Link>
              </Grid>
            </Grid>
          </TableCell>
          <TableCell className={classes.tableCell + ' ' + classes.otherRowValue}>{player.player.numberOfGames}</TableCell>
          <TableCell className={classes.tableCell + ' ' + classes.otherRowValue}>{player.player.numberOfWins}</TableCell>
          <TableCell className={classes.tableCell + ' ' + classes.otherRowValue}>{player.player.numberOfLosses}</TableCell>
          <TableCell className={classes.tableCell + ' ' + classes.otherRowValue}>{player.player.goalsFor + ' - '+ player.player.goalsAgainst}</TableCell>
          <TableCell className={classes.tableCell + ' ' + classes.otherRowValue}>{player.player.visibleRating}</TableCell>
        </TableRow>
      ));
    }

    function GetPlayerClass(player: RankedPlayer) {
      if (player.rank == 1) return classes.firstPlayerName;
      if (!player.player.active) return classes.inActivePlayerName;
      return classes.playerName;
    }

    function GetLinkClass(player: RankedPlayer) {
      if (!player.player.active) return classes.inActiveLink;
      return classes.link;
    }
    
  };

  return (
    <div className={classes.centerContainer}>

      <Grid container spacing={2} >
        <Grid item xs={2}>

        </Grid>
        <Grid item xs={8} >
          <Paper className={classes.banner}>
            eindstand 2024
          </Paper>
        </Grid> 
        <Grid item xs={2}>

        </Grid>
        <Grid item xs={2} className={classes.menuContainer}>
          <div className={classes.menuContainer}>
            
          </div>
        </Grid>
        <Grid item xs={8}>
          <TableContainer component={Paper} className={classes.narrowTable}>
            <Table className={classes.table}>
              <TableBody>
                {showPlayersOrLoading()}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
        <Grid item xs={2}>

        </Grid>
      </Grid>   
    </div>
  );
};

export default HistoryPage;

