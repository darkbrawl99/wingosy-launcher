import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Sidebar from "./components/Sidebar";
import Library from "./components/Library";
import GameDetails from "./components/GameDetails";
import Settings from "./components/Settings";
import SetupWizard from "./components/SetupWizard";
import { invoke } from "@tauri-apps/api/tauri";

const DRAWER_WIDTH = 260;

function App() {
  const [showSetup, setShowSetup] = useState(null);
  const [view, setView] = useState("library");
  const [games, setGames] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkFirstRun();
  }, []);

  async function checkFirstRun() {
    try {
      const firstRun = await invoke("is_first_run");
      setShowSetup(firstRun);
      if (!firstRun) {
        loadData();
      }
    } catch {
      setShowSetup(false);
      loadData();
    }
  }

  function handleSetupComplete() {
    setShowSetup(false);
    loadData();
  }

  useEffect(() => {
    if (showSetup === false && !loading) {
      refreshGames();
    }
  }, [selectedPlatform, searchQuery]);

  async function loadData() {
    try {
      setLoading(true);
      const [gamesData, platformsData] = await Promise.all([
        invoke("get_all_games"),
        invoke("get_platforms_with_games"),
      ]);
      setGames(gamesData);
      setPlatforms(platformsData);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function refreshGames() {
    try {
      const gamesData = await invoke("get_games_filtered", {
        platformId: selectedPlatform,
        searchQuery: searchQuery || null,
        favoritesOnly: false,
        sortBy: null,
      });
      setGames(gamesData);
    } catch (err) {
      console.error("Failed to refresh games:", err);
    }
  }

  async function handleToggleFavorite(gameId) {
    try {
      const newState = await invoke("toggle_favorite", { gameId });
      setGames((prev) =>
        prev.map((g) =>
          g.id === gameId ? { ...g, is_favorite: newState } : g
        )
      );
      if (selectedGame?.id === gameId) {
        setSelectedGame((prev) => ({ ...prev, is_favorite: newState }));
      }
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  async function handleLaunchGame(gameId) {
    try {
      await invoke("launch_game", { gameId });
      await refreshGames();
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  function handleSelectGame(game) {
    setSelectedGame(game);
    setView("details");
  }

  function handleSelectPlatform(platformId) {
    setSelectedPlatform(platformId);
    setView("library");
    setSelectedGame(null);
  }

  function handleNavigate(newView) {
    setView(newView);
    if (newView === "library") {
      setSelectedGame(null);
    }
  }

  if (showSetup === null) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          bgcolor: "background.default",
        }}
      />
    );
  }

  if (showSetup) {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar
        platforms={platforms}
        selectedPlatform={selectedPlatform}
        onSelectPlatform={handleSelectPlatform}
        onNavigate={handleNavigate}
        currentView={view}
        drawerWidth={DRAWER_WIDTH}
      />
      <Box
        component="main"
        sx={{
          width: `calc(100vw - ${DRAWER_WIDTH}px)`,
          ml: `${DRAWER_WIDTH}px`,
          height: "100vh",
          overflow: "auto",
          bgcolor: "background.default",
        }}
      >
        {view === "library" && (
          <Library
            games={games}
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectGame={handleSelectGame}
            onToggleFavorite={handleToggleFavorite}
            onLaunchGame={handleLaunchGame}
            onNavigateSettings={() => handleNavigate("settings")}
            error={error}
            onDismissError={() => setError(null)}
          />
        )}
        {view === "details" && selectedGame && (
          <GameDetails
            game={selectedGame}
            platforms={platforms}
            onBack={() => handleNavigate("library")}
            onLaunch={handleLaunchGame}
            onToggleFavorite={handleToggleFavorite}
          />
        )}
        {view === "settings" && (
          <Settings
            onBack={() => {
              handleNavigate("library");
              loadData();
            }}
          />
        )}
      </Box>
    </Box>
  );
}

export default App;
