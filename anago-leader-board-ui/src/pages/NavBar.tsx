import { Outlet, Link } from "react-router-dom";
import { AppBar, Toolbar, Typography, Container, Paper, Button } from '@mui/material';
import { makeStyles, createStyles } from '@mui/styles';
import { Theme } from '@mui/material';
import TeletextFont from '../fonts/MODE7GX3.TTF';

import React from 'react';

const useStyles = makeStyles((theme: Theme) => ({
  appBar: {
    marginBottom: theme.spacing(2),
    backgroundColor: '#000', // Set the background color to green
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'center', // Center the content horizontally
    alignItems: 'center',
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  grow: {
    flexGrow: 1,
  },
  button: {
    margin: theme.spacing(1),
    fontFamily: 'Teletext',
    fontSize: '1.5rem',
    textTransform: 'none'
  },
  ranglijstButton: {
    color: '#FF0000', // Teletekst red
  },
  wedstrijdenButton: {
    color: '#00ff00', // Very bright green
  },
  waaromButton: {
    color: '#ffff00', // Yellow
  }
}));

const NavBar = () => {
  const classes = useStyles();

  return (
    <AppBar sx={{bgcolor: "black"}}position="static" className={classes.appBar }>
      <Toolbar  sx={{bgcolor: "black"}}className={classes.toolbar}>
        <div className={classes.buttonContainer}>
          <Button component={Link} to="/" className={classes.button + ' ' + classes.ranglijstButton}>
            ranglijst
          </Button>
          <Button component={Link} to="/wedstrijden" className={classes.button + ' ' + classes.wedstrijdenButton}>
            wedstrijden
          </Button>
          <Button component={Link} to="/about" className={classes.button + ' ' + classes.waaromButton}>
            vaak gevragen vragen
          </Button>
          
        </div>
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;