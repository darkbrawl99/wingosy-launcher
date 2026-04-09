import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Settings from "../components/Settings";
import BpLibrary from "./BpLibrary";
import BpGameDetails from "./BpGameDetails";
import { invoke } from "@tauri-apps/api/tauri";
import { useFullscreen } from "./useFullscreen";

export default function BigPictureApp({
  onExit,
  rommToken,
  rommUrl,
  onRommConnect,
  /** Mirrors `cfg.display.fullscreen` from App — request OS fullscreen when entering Big Picture. */
  requestedFullscreen = false,
}) {
  const [view, setView] = useState("library"); // library | details | settings
  const [games, setGames] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayCfg, setDisplayCfg] = useState(() => ({
    big_picture: true,
    fullscreen: requestedFullscreen,
  }));
  const hasLoadedOnce = useRef(false);

  const platformNameById = useMemo(() => {
    const map = new Map();
    for (const [p] of platforms) map.set(p.id, p.short_name || p.name || p.id);
    return map;
  }, [platforms]);

  const persistDisplay = useCallback(async (next) => {
    const cfg = await invoke("get_config");
    cfg.display = cfg.display || {};
    if (typeof next.big_picture === "boolean") cfg.display.big_picture = next.big_picture;
    if (typeof next.fullscreen === "boolean") cfg.display.fullscreen = next.fullscreen;
    await invoke("save_config", { config: cfg });
    setDisplayCfg({ big_picture: Boolean(cfg.display.big_picture), fullscreen: Boolean(cfg.display.fullscreen) });
    return cfg;
  }, []);

  const { isFullscreen, setFullscreen, toggleFullscreen } = useFullscreen({
    enabled: displayCfg.fullscreen,
    onChange: async (v) => {
      try {
        await persistDisplay({ fullscreen: Boolean(v) });
      } catch {
        // ignore
      }
    },
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [gamesData, platformsData, cfg] = await Promise.all([
        invoke("get_all_games"),
        invoke("get_platforms_with_games"),
        invoke("get_config"),
      ]);
      setGames(gamesData);
      setPlatforms(platformsData);
      setDisplayCfg({
        big_picture: Boolean(cfg.display?.big_picture),
        fullscreen: Boolean(cfg.display?.fullscreen),
      });
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Exit Big Picture when the toggle is turned off via Settings
  useEffect(() => {
    if (!hasLoadedOnce.current) {
      hasLoadedOnce.current = true;
      return;
    }
    if (!displayCfg.big_picture && onExit) {
      (async () => {
        try {
          await setFullscreen(false);
        } catch {
          // ignore
        }
        onExit();
      })();
    }
  }, [displayCfg.big_picture, onExit, setFullscreen]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "F11") {
        e.preventDefault();
        toggleFullscreen();
      }
      if (e.key === "Escape" && view === "library") {
        // Escape exits Big Picture from library.
        e.preventDefault();
        handleExit();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleFullscreen, view]);

  async function handleExit() {
    try {
      await setFullscreen(false);
    } catch {
      // ignore
    }
    try {
      await persistDisplay({ big_picture: false, fullscreen: false });
    } catch {
      // ignore
    }
    if (onExit) onExit();
  }

  async function handleLaunchGame(gameId) {
    try {
      const result = await invoke("launch_game", { gameId });
      if (!result.success && result.error) setError(result.error);
      await loadData();
    } catch (err) {
      setError(err?.message || String(err));
    }
  }

  async function handleToggleFavorite(gameId) {
    try {
      const newState = await invoke("toggle_favorite", { gameId });
      setGames((prev) => prev.map((g) => (g.id === gameId ? { ...g, is_favorite: newState } : g)));
      if (selectedGame?.id === gameId) setSelectedGame((prev) => ({ ...prev, is_favorite: newState }));
    } catch (err) {
      setError(err?.message || String(err));
    }
  }

  function handleSelectGame(game) {
    setSelectedGame(game);
    setView("details");
  }

  if (view === "settings") {
    return (
      <Box sx={{ height: "100vh", overflow: "auto" }}>
        <Settings
          onBack={() => {
            setView("library");
            loadData();
          }}
          rommToken={rommToken}
          rommUrl={rommUrl}
          onRommConnect={onRommConnect}
          onLibraryChange={loadData}
          onBigPictureChange={(enabled) => {
            if (!enabled) {
              handleExit();
            }
          }}
          onFullscreenChange={(enabled) => {
            setFullscreen(enabled);
          }}
        />
      </Box>
    );
  }

  if (view === "details" && selectedGame) {
    const platformLabel = (platformNameById.get(selectedGame.platform_id) || selectedGame.platform_id || "")
      .toString()
      .toUpperCase();
    return (
      <BpGameDetails
        game={selectedGame}
        platformLabel={platformLabel}
        onBack={() => {
          setView("library");
          setSelectedGame(null);
        }}
        onLaunch={handleLaunchGame}
        onToggleFavorite={handleToggleFavorite}
      />
    );
  }

  return (
    <BpLibrary
      loading={loading}
      error={error}
      games={games}
      platforms={platforms}
      selectedIndex={selectedIndex}
      onSelectedIndexChange={setSelectedIndex}
      onSelectGame={handleSelectGame}
      onExitBigPicture={handleExit}
      onOpenSettings={() => setView("settings")}
      fullscreenActive={isFullscreen}
    />
  );
}

