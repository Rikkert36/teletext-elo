import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme, PaletteOptions  } from '@mui/material/styles';
import LeaderboardPage from './pages/LeaderBoardPage';
import { CssBaseline } from '@mui/material';
import { BrowserRouter } from 'react-router-dom';
import { StyledEngineProvider } from '@mui/material/styles';
import theme from './styles/theme'


ReactDOM.render(
  <StyledEngineProvider injectFirst>
    <BrowserRouter basename="/tafelvoetbal">
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StyledEngineProvider>,
  document.getElementById('root')
);

