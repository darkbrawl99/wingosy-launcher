import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import { alpha } from "@mui/material/styles";
import { convertFileSrc } from "@tauri-apps/api/tauri";

function isLocalPath(path) {
  if (!path) return false;
  return /^[a-zA-Z]:/.test(path) || path.startsWith("\\") || path.startsWith("/");
}

function getCoverSrc(coverPath) {
  if (!coverPath) return null;
  if (isLocalPath(coverPath)) return convertFileSrc(coverPath);
  return coverPath;
}

export default function BpGameTile({
  game,
  platformLabel,
  focused,
  onFocus,
  onSelect,
}) {
  const [imgError, setImgError] = useState(false);
  const coverSrc = useMemo(() => getCoverSrc(game.cover_path), [game.cover_path]);
  const showCover = Boolean(coverSrc) && !imgError;

  return (
    <Box
      component="button"
      type="button"
      onClick={onSelect}
      onFocus={onFocus}
      tabIndex={0}
      style={{
        appearance: "none",
        border: "none",
        padding: 0,
        background: "transparent",
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <Box
        sx={(t) => ({
          borderRadius: 3,
          overflow: "hidden",
          position: "relative",
          transform: focused ? "scale(1.04)" : "scale(1)",
          transition: "transform 120ms ease, box-shadow 120ms ease",
          boxShadow: focused
            ? `0 18px 60px ${alpha("#000", 0.55)}`
            : `0 10px 30px ${alpha("#000", 0.35)}`,
          outline: focused ? `3px solid ${t.palette.primary.main}` : "none",
          outlineOffset: 2,
          backgroundColor: alpha(t.palette.background.paper, 0.8),
        })}
      >
        <Box
          sx={(t) => ({
            height: 240,
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(139,92,246,0.18) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: t.palette.text.secondary,
          })}
        >
          {showCover ? (
            <Box
              component="img"
              src={coverSrc}
              alt={game.name}
              onError={() => setImgError(true)}
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <Typography variant="h6" sx={{ opacity: 0.8, px: 2 }}>
              {game.name}
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            p: 2,
            background:
              "linear-gradient(transparent 0%, rgba(0,0,0,0.75) 35%, rgba(0,0,0,0.92) 100%)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
            {platformLabel ? (
              <Chip
                size="small"
                label={platformLabel}
                sx={{
                  fontWeight: 800,
                  height: 22,
                  bgcolor: "rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.9)",
                }}
              />
            ) : null}
            {game.is_favorite ? (
              <Chip
                size="small"
                label="Favorite"
                sx={{
                  fontWeight: 800,
                  height: 22,
                  bgcolor: "rgba(239,68,68,0.18)",
                  color: "#fff",
                }}
              />
            ) : null}
          </Box>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 800, color: "#fff" }}
            noWrap
            title={game.name}
          >
            {game.name}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

