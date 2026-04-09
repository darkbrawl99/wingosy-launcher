import { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import BpGameTile from "./BpGameTile";

const DEFAULT_COLUMNS = 6;

function byLastPlayedDesc(a, b) {
  const ax = a.last_played_at || "";
  const bx = b.last_played_at || "";
  return bx.localeCompare(ax);
}

export default function BpLibrary({
  loading,
  error,
  games,
  platforms,
  selectedIndex,
  onSelectedIndexChange,
  onSelectGame,
  onExitBigPicture,
  onOpenSettings,
}) {
  const [section, setSection] = useState("all"); // all | favorites | recent
  const gridRef = useRef(null);

  const platformNameById = useMemo(() => {
    const map = new Map();
    for (const [p] of platforms) map.set(p.id, p.short_name || p.name || p.id);
    return map;
  }, [platforms]);

  const favorites = useMemo(
    () => games.filter((g) => g.is_favorite),
    [games]
  );

  const recent = useMemo(() => {
    const played = games.filter((g) => g.last_played_at);
    played.sort(byLastPlayedDesc);
    return played.slice(0, 24);
  }, [games]);

  const visibleGames = useMemo(() => {
    if (section === "favorites") return favorites;
    if (section === "recent") return recent;
    return games;
  }, [section, games, favorites, recent]);

  useEffect(() => {
    if (selectedIndex >= visibleGames.length) {
      onSelectedIndexChange(Math.max(0, visibleGames.length - 1));
    }
  }, [selectedIndex, visibleGames.length, onSelectedIndexChange]);

  function handleKeyDown(e) {
    if (e.key === "F11") {
      // Let parent handler deal with it.
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      onExitBigPicture();
      return;
    }

    if (loading) return;
    if (!visibleGames.length) return;

    const cols = DEFAULT_COLUMNS;
    let next = selectedIndex;

    switch (e.key) {
      case "ArrowLeft":
        next = Math.max(0, selectedIndex - 1);
        break;
      case "ArrowRight":
        next = Math.min(visibleGames.length - 1, selectedIndex + 1);
        break;
      case "ArrowUp":
        next = Math.max(0, selectedIndex - cols);
        break;
      case "ArrowDown":
        next = Math.min(visibleGames.length - 1, selectedIndex + cols);
        break;
      case "Enter":
        e.preventDefault();
        onSelectGame(visibleGames[selectedIndex]);
        return;
      default:
        return;
    }

    if (next !== selectedIndex) {
      e.preventDefault();
      onSelectedIndexChange(next);
      const el = gridRef.current?.querySelector?.(
        `[data-bp-index="${next}"]`
      );
      el?.focus?.();
    }
  }

  return (
    <Box
      tabIndex={0}
      onKeyDown={handleKeyDown}
      sx={{
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        outline: "none",
      }}
    >
      <Box sx={{ px: 5, pt: 4, pb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: "-0.8px" }}>
            Wingosy
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 700 }}>
            Big Picture
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Button
            variant={section === "all" ? "contained" : "outlined"}
            onClick={() => setSection("all")}
            sx={{ borderRadius: 999, px: 2.5 }}
          >
            All
          </Button>
          <Button
            variant={section === "favorites" ? "contained" : "outlined"}
            onClick={() => setSection("favorites")}
            sx={{ borderRadius: 999, px: 2.5 }}
          >
            Favorites
          </Button>
          <Button
            variant={section === "recent" ? "contained" : "outlined"}
            onClick={() => setSection("recent")}
            sx={{ borderRadius: 999, px: 2.5 }}
          >
            Recent
          </Button>
          <Divider flexItem orientation="vertical" sx={{ mx: 1, opacity: 0.25 }} />
          <Button variant="outlined" onClick={onOpenSettings} sx={{ borderRadius: 999, px: 2.5 }}>
            Settings
          </Button>
          <Button color="error" variant="outlined" onClick={onExitBigPicture} sx={{ borderRadius: 999, px: 2.5 }}>
            Exit
          </Button>
        </Stack>
      </Box>

      <Divider sx={{ opacity: 0.12 }} />

      <Box sx={{ flex: 1, overflow: "auto", px: 5, py: 3 }}>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        {loading ? (
          <Box sx={{ height: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : visibleGames.length === 0 ? (
          <Box sx={{ height: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography variant="h5" color="text.secondary">
              No games found.
            </Typography>
          </Box>
        ) : (
          <Box
            ref={gridRef}
            sx={{
              display: "grid",
              gridTemplateColumns: `repeat(${DEFAULT_COLUMNS}, minmax(0, 1fr))`,
              gap: 3,
            }}
          >
            {visibleGames.map((g, idx) => (
              <Box key={g.id} data-bp-index={idx}>
                <BpGameTile
                  game={g}
                  platformLabel={(platformNameById.get(g.platform_id) || g.platform_id || "").toUpperCase()}
                  focused={idx === selectedIndex}
                  onFocus={() => onSelectedIndexChange(idx)}
                  onSelect={() => onSelectGame(g)}
                />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

