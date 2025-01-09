import React from 'react';
import { Theme } from '@mui/material';
import { makeStyles , createStyles, } from '@mui/styles'
import { AppBar, Toolbar, Typography, Container, Paper, Button, Grid, List, ListItem } from '@mui/material';
import { CodeiumEditor } from "@codeium/react-code-editor";

// Define styles using makeStyles
const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      flexGrow: 1,
      
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
  }),
);

// Define the functional component
const StatsPage: React.FC = () => {
  // Use the defined styles
  const classes = useStyles();

  return (
    <div className={classes.root}>    

      <Grid container spacing={2} >
        <Grid item xs={2}>

        </Grid>
        <Grid item xs={8} >
        <CodeiumEditor language="python" theme="vs-dark" />
                        </Grid> 
        <Grid item xs={2}>
        </Grid>
      </Grid>
      {/* Main Content */}
      <Container className={classes.container}>
        <Paper className={classes.paper}>
          <Typography variant="h5" gutterBottom>
            Vanwaar het initiatief?
          </Typography>
          <List>
            <ListItem>
              * Het vrijblijvende karakter van tafelvoetbalwedstrijden buiten competitieverband werd gehekeld.
            </ListItem>
            <ListItem>
              * "During holidays you can work on things you are not allowed to work on while working." (of zoiets) - Fraser Wilson 
            </ListItem>
            <ListItem>
              * Bart heeft me (geinspireerd, en daarmee) gedwongen dit te doen.
            </ListItem>
            <ListItem>
              * Het is heel vet geworden.
            </ListItem>
            <ListItem>
              * Er bestaat niet zoiets als 'te veel met tafelvoetbal bezig zijn'.
            </ListItem>
            <ListItem>
              * Ik ben verslaafd aan tafelvoetbal. Help. Ook namens Ida. (Ida if you are reading this I said I think you are a really good table soccer player.)
            </ListItem>
          </List>
        </Paper>
      </Container>
    </div>
  );
};

export default StatsPage;