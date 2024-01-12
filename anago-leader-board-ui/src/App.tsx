import ReactDOM from "react-dom/client";
import { Route, Routes } from 'react-router-dom';
import './App.css';
import NavBar from "./pages/NavBar";
import AboutPage from "./pages/AboutPage";
import LeaderBoardPage from "./pages/LeaderBoardPage";
import NoPage from "./pages/NoPage";
import theme from "./styles/theme";
import GamesPage from "./pages/GamesPage";

declare global {
  interface Window {
    TAFELVOETBAL_SERVER_URL: string;
  }
} 

function App() {
  return (
    <div >
      <NavBar />
      <Routes>
        <Route path="/" element={<LeaderBoardPage/>} />
        <Route path="wedstrijden" element={<GamesPage/>} />
        <Route path="about" element={<AboutPage />} />
        <Route path="*" element={<NoPage />} />
      </Routes>
    </div>
  );
}

export default App;
