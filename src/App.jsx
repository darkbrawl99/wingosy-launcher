import { useState, useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import Snackbar from "@mui/material/Snackbar";
import Button from "@mui/material/Button";
import Sidebar from "./components/Sidebar";
import Library from "./components/Library";
import GameDetails from "./components/GameDetails";
import Settings from "./components/Settings";
import SetupWizard from "./components/SetupWizard";
import ImmersiveModeApp from "./immersive/ImmersiveModeApp";
import { invoke } from "@tauri-apps/api/tauri";
import { open as openUrl } from "@tauri-apps/api/shell";
import { appWindow, getCurrent } from "@tauri-apps/api/window";
import { setFullscreenReliable } from "./windowFullscreen";
import WindowChrome from "./components/WindowChrome";
import { isTauri, mousedownTargetElement } from "./utils/isTauri";
import { UiSoundsProvider } from "./UiSoundsContext";

const DRAWER_WIDTH = 260;

function AppShell({ children }) {
  useEffect(() => {
    if (!isTauri()) return undefined;
    /**
     * Ensures custom titlebar dragging works even when CSS/HMR is flaky (WebView2).
     * Requires `window.startDragging` in tauri.conf.json allowlist.
     */
    function onMouseDown(e) {
      if (e.button !== 0) return;
      const el = mousedownTargetElement(e.target);
      if (!el) return;
      if (el.closest("[data-tauri-no-drag]")) return;
      if (!el.closest("[data-tauri-drag-region]")) return;
      getCurrent()
        .startDragging()
        .catch((err) => {
          console.warn(
            "[Wingosy] startDragging failed — use `tauri dev` (not dev:web), restart after `tauri.conf` changes:",
            err
          );
        });
    }
    document.addEventListener("mousedown", onMouseDown, true);
    return () => document.removeEventListener("mousedown", onMouseDown, true);
  }, []);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <WindowChrome />
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {children}
      </Box>
    </Box>
  );
}

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
  const [rommToken, setRommToken] = useState(null);
  const [rommUrl, setRommUrl] = useState("");
  const [immersiveModeEnabled, setImmersiveModeEnabled] = useState(false);
  const [immersiveModeFullscreen, setImmersiveModeFullscreen] = useState(false);
  const [updateSnack, setUpdateSnack] = useState({ open: false, url: "", version: "" });
  const startupUpdateCheckDone = useRef(false);

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
  }

  useEffect(() => {
    if (showSetup === false) {
      loadData();
    }
  }, [showSetup]);

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

      try {
        const cfg = await invoke("get_config");
        if (cfg.romm?.server_url) {
          setRommUrl(cfg.romm.server_url);
        }
        if (cfg.romm?.auth_token) {
          setRommToken(cfg.romm.auth_token);
        }
        setImmersiveModeEnabled(Boolean(cfg.display?.big_picture));
        setImmersiveModeFullscreen(Boolean(cfg.display?.fullscreen));
        if (
          !cfg.updater?.auto_update_enabled &&
          (cfg.updater?.channel === "nightly" || cfg.updater?.channel === "beta")
        ) {
          cfg.updater = cfg.updater || {};
          cfg.updater.channel = "stable";
          await invoke("save_config", { config: cfg });
        }
        if (!startupUpdateCheckDone.current && cfg.updater?.check_on_startup !== false) {
          startupUpdateCheckDone.current = true;
          const ch =
            cfg.updater?.auto_update_enabled &&
            (cfg.updater.channel === "nightly" || cfg.updater.channel === "beta")
              ? cfg.updater.channel
              : "stable";
          invoke("check_for_app_update", { channel: ch })
            .then((r) => {
              if (r?.is_update_available && r?.release_url) {
                setUpdateSnack({
                  open: true,
                  url: r.release_url,
                  version: r.latest_version || "",
                });
              }
            })
            .catch(() => {});
        }
      } catch {
        // config may not exist yet
      }
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

  function handleRommConnect(url, token) {
    setRommUrl(url);
    setRommToken(token);
  }

  useEffect(() => {
    // Global hotkey: F11 toggles fullscreen.
    function onKeyDown(e) {
      if (e.key !== "F11") return;
      e.preventDefault();
      (async () => {
        try {
          const next = !(await appWindow.isFullscreen());
          await setFullscreenReliable(next);
        } catch {
          // ignore
        }
      })();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
      const result = await invoke("launch_game", { gameId });
      
      if (!result.success && result.error) {
        setError(result.error);
      }
      
      if (!result.dry_run) {
        await refreshGames();
      }
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

  function wrapUiSounds(node) {
    return (
      <UiSoundsProvider immersiveActive={immersiveModeEnabled}>{node}</UiSoundsProvider>
    );
  }

  if (showSetup === null) {
    return wrapUiSounds(
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
    return wrapUiSounds(
      <AppShell>
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            overscrollBehavior: "contain",
          }}
        >
          <SetupWizard
            onComplete={handleSetupComplete}
            onRommConnect={handleRommConnect}
          />
        </Box>
      </AppShell>
    );
  }

  if (immersiveModeEnabled) {
    return wrapUiSounds(
      <AppShell>
        <ImmersiveModeApp
          rommToken={rommToken}
          rommUrl={rommUrl}
          onRommConnect={handleRommConnect}
          onExit={async () => {
            setImmersiveModeEnabled(false);
            setImmersiveModeFullscreen(false);
            await loadData();
            // loadData reapplies `cfg.display.big_picture`; after exit the config write can
            // lag behind get_config in rare cases — keep desktop shell until next full reload.
            setImmersiveModeEnabled(false);
            setImmersiveModeFullscreen(false);
          }}
          requestedFullscreen={immersiveModeFullscreen}
        />
      </AppShell>
    );
  }

  return wrapUiSounds(
    <AppShell>
      <Box sx={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
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
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.default",
        }}
      >
        {view === "library" && (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              overscrollBehavior: "contain",
            }}
          >
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
          </Box>
        )}
        {view === "details" && selectedGame && (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              overscrollBehavior: "contain",
            }}
          >
          <GameDetails
            game={selectedGame}
            platforms={platforms}
            onBack={() => {
              handleNavigate("library");
              loadData();
            }}
            onLaunch={handleLaunchGame}
            onToggleFavorite={handleToggleFavorite}
            onGameUpdate={async (gameId) => {
              // Refresh game data and update selected game
              try {
                const gamesData = await invoke("get_all_games");
                setGames(gamesData);
                const updated = gamesData.find(g => g.id === gameId);
                if (updated) {
                  setSelectedGame(updated);
                }
              } catch (err) {
                console.error("Failed to refresh after download:", err);
              }
            }}
            rommToken={rommToken}
            rommUrl={rommUrl}
          />
          </Box>
        )}
        {view === "settings" && (
          <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <Settings
            onBack={() => {
              handleNavigate("library");
              loadData();
            }}
            rommToken={rommToken}
            rommUrl={rommUrl}
            onRommConnect={handleRommConnect}
            onLibraryChange={loadData}
          />
          </Box>
        )}
      </Box>
      </Box>
      <Snackbar
        open={updateSnack.open}
        onClose={() => setUpdateSnack((s) => ({ ...s, open: false }))}
        message={
          updateSnack.version
            ? `Update available: ${updateSnack.version}`
            : "Update available"
        }
        action={
          <>
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                if (updateSnack.url) openUrl(updateSnack.url);
              }}
            >
              View
            </Button>
            <Button
              color="inherit"
              size="small"
              onClick={() => setUpdateSnack((s) => ({ ...s, open: false }))}
            >
              Dismiss
            </Button>
          </>
        }
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </AppShell>
  );
}

export default App;
