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
  useMediaQuery,
} from '@mui/material';
import {Link} from"react-router-dom"
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import { Theme} from '@mui/material';
import {   makeStyles,  createStyles, ThemeProvider} from '@mui/styles';
import { Client, FileParameter, DynamicRatingPlayer } from '../clients/server.generated';
import useIsMobile from '../hooks/useIsMobile';

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
      [theme.breakpoints.down('sm')]: {
        fontSize: '1.2rem',
        padding: theme.spacing(1.5, 1),
        maxWidth: 'none',
      },
    },
    nameTruncate: {
      display: 'block',
      maxWidth: '18rem',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      [theme.breakpoints.down('sm')]: {
        maxWidth: '100%',
      },
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
    mobileFixedTable: {
      [theme.breakpoints.down('sm')]: {
        tableLayout: 'fixed',
        width: '100%',
      },
    },
    mobileAddButtonContainer: {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#000',
      borderTop: '1px solid #222',
      padding: theme.spacing(0.75),
      zIndex: theme.zIndex.drawer + 1,
    },
    centerContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      [theme.breakpoints.down('sm')]: {
        paddingLeft: theme.spacing(1.5),
        paddingRight: theme.spacing(1.5),
        paddingBottom: theme.spacing(7),
      },
    },
    modal: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      [theme.breakpoints.down('sm')]: {
        alignItems: 'flex-start',
      },
    },
    modalPaper: {
      backgroundColor: '#111', // Black
      boxShadow: theme.shadows[5],
      padding: theme.spacing(4),
      borderRadius: theme.shape.borderRadius,
      color: '#fff', // White text color
      maxWidth: '100%',
      [theme.breakpoints.down('sm')]: {
        width: '100vw',
        height: '100dvh',
        maxWidth: '100vw',
        borderRadius: 0,
        padding: theme.spacing(3),
        overflowY: 'auto',
      },
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
      [theme.breakpoints.down('sm')]: {
        margin: 0,
        height: 'auto',
        padding: theme.spacing(0.25, 0.5),
      },
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
      justifyContent: 'center',
      textAlign: 'center',
      [theme.breakpoints.down('sm')]: {
        fontSize: '1.15rem',
        padding: '1rem 0.4rem',
        whiteSpace: 'nowrap',
      },
    },
    detailCell: {
      padding: theme.spacing(1),
      fontFamily: 'Teletext',
      background: '#000',
      color: '#00ff00', // Very bright green
      border: 'none',
      fontSize: '1rem',
    },
    detailRowLabel: {
      color: '#00ff00', // Very bright green
    },
    expandCaret: {
      color: '#00ff00', // Very bright green
      display: 'inline-block',
      transition: 'transform 0.15s ease',
      fontSize: '1.2rem',
    },
    expandCaretOpen: {
      transform: 'rotate(180deg)',
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
    }
  })
);



const LeaderboardPage: React.FC = () => {
  const classes = useStyles();
  const isMobile = useIsMobile();
  const bannerShort = useMediaQuery('(max-width:420px)');
  const client = new Client(window.TAFELVOETBAL_SERVER_URL);
  const [players, setPlayers] = useState<RankedPlayer[]>();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };
  const [playerForm, setPlayerForm] = useState({
    name: '',
    avatar: null as Blob | null,
  });
  useEffect(() => {
    if (players == null) refreshPlayers();
  });

  const refreshPlayers = async () => {
    setPlayersLoading(true);
    const players : DynamicRatingPlayer[] = await client.getDynamicLeaderBoard();
    const rankedPlayers : RankedPlayer[] = addRankToPlayers(players);

    setPlayers(rankedPlayers);
    setPlayersLoading(false);
  }

  const handleSearchToggle = () => {
    setIsSearchOpen(!isSearchOpen);
  };

  const handleOpenModal = () => {
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleSavePlayer = async () => {
    setIsSaving(true);
    try {
    let image = undefined;
    if (playerForm.avatar !== null) {
      const fileParameter = {fileName: "Avatar", data: playerForm.avatar} as FileParameter;
      const formData = new FormData();
      formData.append('file', playerForm.avatar)
      image = fileParameter
    }
    await client.createPlayer(playerForm.name, image);

  } catch (exception) {
    console.log(exception);
  } finally {
    setPlayerForm({
      name: '',
      avatar: null,
    });
    setModalOpen(false);
    setIsSaving(false);
    refreshPlayers();
  }
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const avatar = files[0];
      setPlayerForm({ ...playerForm, avatar });
    }
  };

  const getDateInRightFormat = () => {
    var d = new Date(),
      month = '' + (d.getMonth() + 1),
      day = '' + d.getDate();
    
      if (month.length < 2) 
      month = '0' + month;
      if (day.length < 2) 
      day = '0' + day;

    return [day, month].join('/');
  };

  const getAvatarLink = (playerId: string) => {
    return `${window.TAFELVOETBAL_SERVER_URL}/api/player/${playerId}/avatar`
  }

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

  const showPlayersOrLoading = () => {
    if (playersLoading) {
      return (
        <CircularProgress/>
      );
    } else {
      return showPlayers();
    };
  };

  const renderNameCell = (player: RankedPlayer) => (
    <TableCell className={classes.tableCell + ' ' + (player.rank == 1 ? classes.firstPlayerName : classes.playerName)}>
      <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
        <Avatar alt='?' src={getAvatarLink(player.player.id!)} className={classes.avatar} style={{ flexShrink: 0, marginRight: '0.9rem' }} />
        <Link style={{ textDecoration: 'none', display: 'block', flex: 1, minWidth: 0, overflow: 'hidden' }}
          className={classes.link + ' ' + (player.rank == 1 ? classes.firstPlayerName : classes.playerName)}
          to={`speler/${player.player.id}`}>
          <Typography className={classes.playernameTypography + ' ' + classes.nameTruncate} gutterBottom noWrap>
            {player.player.name}
          </Typography>
        </Link>
      </div>
    </TableCell>
  );

  const renderAddButton = () => (
    <Button
      variant="contained"
      startIcon={<AddIcon />}
      onClick={handleOpenModal}
      className={classes.addButton}
    >
      <Typography variant="h6" className={classes.buttonText}>
        speler toevoegen
      </Typography>
    </Button>
  );

  const showPlayers = () => {
    if (!players) return null;

    if (isMobile) {
      return players.map((player) => (
        <React.Fragment key={player.player.id}>
          <TableRow className={classes.tableRow} onClick={() => toggleExpanded(player.player.id!)}>
            <TableCell style={{ width: '3rem', paddingRight: 0 }} className={classes.tableCell + ' ' + classes.otherRowValue}>{player.rank + '.'}</TableCell>
            {renderNameCell(player)}
            <TableCell style={{ width: '4.5rem' }} className={classes.tableCell + ' ' + classes.otherRowValue}>{player.player.visibleRating}</TableCell>
            <TableCell style={{ width: '1.75rem', paddingLeft: 0 }} className={classes.tableCell + ' ' + classes.otherRowValue}>
              <span className={classes.expandCaret + (expandedId === player.player.id ? ' ' + classes.expandCaretOpen : '')}>▾</span>
            </TableCell>
          </TableRow>
          {expandedId === player.player.id && (
            <TableRow>
              <TableCell colSpan={4} className={classes.detailCell}>
                <Grid container spacing={1}>
                  <Grid item xs={6}><span className={classes.detailRowLabel}>gespeeld</span> {player.player.numberOfGames}</Grid>
                  <Grid item xs={6}><span className={classes.detailRowLabel}>gewonnen</span> {player.player.numberOfWins}</Grid>
                  <Grid item xs={6}><span className={classes.detailRowLabel}>verloren</span> {player.player.numberOfLosses}</Grid>
                  <Grid item xs={6}><span className={classes.detailRowLabel}>doelp.</span> {player.player.goalsFor + ' - ' + player.player.goalsAgainst}</Grid>
                </Grid>
              </TableCell>
            </TableRow>
          )}
        </React.Fragment>
      ));
    }

    return players.map((player) => (
      <TableRow key={player.player.id} className={classes.tableRow}>
        <TableCell style={{ width: '0.5rem' }} className={classes.tableCell + ' ' + classes.otherRowValue}>{player.rank + '.'}</TableCell>
        {renderNameCell(player)}
        <TableCell className={classes.tableCell + ' ' + classes.otherRowValue}>{player.player.numberOfGames}</TableCell>
        <TableCell className={classes.tableCell + ' ' + classes.otherRowValue}>{player.player.numberOfWins}</TableCell>
        <TableCell className={classes.tableCell + ' ' + classes.otherRowValue}>{player.player.numberOfLosses}</TableCell>
        <TableCell className={classes.tableCell + ' ' + classes.otherRowValue}>{player.player.goalsFor + ' - ' + player.player.goalsAgainst}</TableCell>
        <TableCell className={classes.tableCell + ' ' + classes.otherRowValue}>{player.player.visibleRating}</TableCell>
      </TableRow>
    ));
  };

  return (
    <div className={classes.centerContainer}>

      <Grid container spacing={2} >
        <Grid item md={2} sx={{ display: { xs: 'none', md: 'block' } }} />
        <Grid item xs={12} md={8} >
          <Paper className={classes.banner}>
            {bannerShort
              ? `tafelvoetbal, ${getDateInRightFormat()}`
              : `tafelvoetbal,stand per ${getDateInRightFormat()}`}
          </Paper>
        </Grid>
        <Grid item md={2} sx={{ display: { xs: 'none', md: 'block' } }} />
        {!isMobile && (
          <Grid item md={2} className={classes.menuContainer}>
            <div className={classes.menuContainer}>
              {renderAddButton()}
            </div>
          </Grid>
        )}
        <Grid item xs={12} md={8}>
          <TableContainer component={Paper} className={classes.narrowTable}>
            <Table className={classes.table + ' ' + classes.mobileFixedTable}>
              <TableBody>
                {showPlayersOrLoading()}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
        <Grid item md={2} sx={{ display: { xs: 'none', md: 'block' } }} />
        {isMobile && (
          <Grid item xs={12}>
            <div className={classes.mobileAddButtonContainer}>
              {renderAddButton()}
            </div>
          </Grid>
        )}
      </Grid>

      <Modal
        open={isModalOpen}
        onClose={handleCloseModal}
        className={classes.modal}
      >
        <div className={classes.modalPaper}>
          <Typography variant="h6" gutterBottom className={classes.modalBanner}>
            speler toevoegen
          </Typography>
          <Grid container spacing={2} display={'-ms-flexbox'} alignItems="center">
            <Grid item xs={2} style={{ overflow: 'hidden', display: 'flex' }}>
              <Avatar alt={playerForm.name} src={playerForm.avatar ? URL.createObjectURL(playerForm.avatar) : ""} className={classes.avatar} />
            </Grid>
            <Grid item xs={10}>
              <TextField
                label="naam"
                variant="outlined"
                fullWidth
                value={playerForm.name}
                onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
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
          <Button onClick={handleCloseModal} className={classes.addPlayerBack}>
            terug
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default LeaderboardPage;
