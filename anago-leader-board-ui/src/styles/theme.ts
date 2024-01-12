import { createTheme, PaletteOptions  } from '@mui/material/styles';
import { Theme } from '@mui/material';
import TeletextFont from '../fonts/MODE7GX3.TTF'

const theme: Theme = createTheme({
  palette: {
    mode: 'dark', // Set the overall theme type to dark
    primary: {
      main: '#4CAF50', // Your dark green color
    },
    secondary: {
      main: '#ffff00', // yellow
    },
    background: {
      default: '#000', // Dark background color
      paper: '#1E1E1E', // Slightly lighter color for paper elements
    },
    
  },
  typography: {
    fontFamily: 'Teletext'
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        @font-face {
          font-family: 'Teletext';
          src: local('Teletext'), url(${TeletextFont}) format('ttf');
        }
      `
    }
  }
});

export default theme;