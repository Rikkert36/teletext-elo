import { Outlet, Link } from "react-router-dom";
import { AppBar, Toolbar, Typography, Container, Paper, Button, Menu, MenuItem } from '@mui/material';
import { makeStyles, createStyles } from '@mui/styles';
import { Theme } from '@mui/material';
import TeletextFont from '../fonts/MODE7GX3.TTF';
import useIsMobile from '../hooks/useIsMobile';

import React, { useState } from 'react';

const useStyles = makeStyles((theme: Theme) => ({
  appBar: {
    marginBottom: theme.spacing(2),
    backgroundColor: '#000', // Set the background color to green
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'center', // Center the content horizontally
    alignItems: 'center',
    [theme.breakpoints.down('sm')]: {
      paddingLeft: theme.spacing(0.5),
      paddingRight: theme.spacing(0.5),
      minHeight: 'auto',
    },
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  grow: {
    flexGrow: 1,
  },
  button: {
    margin: theme.spacing(1),
    fontFamily: 'Teletext',
    fontSize: '1.5rem',
    textTransform: 'none',
    [theme.breakpoints.down('sm')]: {
      fontSize: '1.05rem',
      margin: theme.spacing(0.25),
      minWidth: 'auto',
      padding: theme.spacing(0.5, 0.5),
    },
  },
  ranglijstButton: {
    color: '#FF0000', // Teletekst red
  },
  wedstrijdenButton: {
    color: '#00ff00', // Very bright green
  },
  waaromButton: {
    color: '#ffff00', // Yellow
  },
  historyButton: {
    color: '#00ffff', // Bright blue
  },
  meerButton: {
    color: '#ffff00', // Yellow
  },
  menuItemFaq: {
    fontFamily: 'Teletext',
    textTransform: 'none',
    fontSize: '1rem',
    color: '#ffff00', // Yellow
  },
  menuItemHist: {
    fontFamily: 'Teletext',
    textTransform: 'none',
    fontSize: '1rem',
    color: '#00ffff', // Bright blue
  },
}));

const NavBar = () => {
  const classes = useStyles();
  const isMobile = useIsMobile();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleCloseMenu = () => setAnchorEl(null);

  const secondaryButtons = (
    <>
      <Button component={Link} to="/about" className={classes.button + ' ' + classes.waaromButton}>
        vaak gevragen vragen
      </Button>
      <Button component={Link} to="/historie" className={classes.button + ' ' + classes.historyButton}>
        historie
      </Button>
    </>
  );

  const secondaryMenu = (
    <>
      <Button
        onClick={handleOpenMenu}
        className={classes.button + ' ' + classes.meerButton}
      >
        {menuOpen ? 'meer ▴' : 'meer ▾'}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        PaperProps={{ sx: { bgcolor: '#000', border: '1px solid #333' } }}
      >
        <MenuItem component={Link} to="/about" onClick={handleCloseMenu} className={classes.menuItemFaq}>
          vaak gevragen vragen
        </MenuItem>
        <MenuItem component={Link} to="/historie" onClick={handleCloseMenu} className={classes.menuItemHist}>
          historie
        </MenuItem>
      </Menu>
    </>
  );

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
          {isMobile ? secondaryMenu : secondaryButtons}
        </div>
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;