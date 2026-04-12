import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import FavoriteIcon from "@mui/icons-material/Favorite";
import CloudIcon from "@mui/icons-material/Cloud";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { alpha } from "@mui/material/styles";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import { useAppTheme } from "../ThemeContext";

const PLATFORM_COLORS = {
  nes: "#e60012",
  snes: "#7b5aa6",
  n64: "#00a651",
  gc: "#6a5acd",
  wii: "#00a4e4",
  wiiu: "#009ac7",
  switch: "#e60012",
  gb: "#8b956d",
  gbc: "#8b008b",
  gba: "#6b5a9e",
  nds: "#b8b8b8",
  "3ds": "#d12228",
  psx: "#003087",
  ps2: "#003087",
  ps3: "#003087",
  ps4: "#003087",
  ps5: "#003087",
  psp: "#003087",
  psvita: "#003087",
  genesis: "#1a5c9b",
  saturn: "#0072c6",
  dreamcast: "#f47920",
  xbox: "#107c10",
  xbox360: "#107c10",
  arcade: "#ff6b00",
  pc: "#00ACC1",
};

function isLocalPath(path) {
  if (!path) return false;
  return /^[a-zA-Z]:/.test(path) || path.startsWith("\\") || path.startsWith("/");
}

function getCoverSrc(coverPath) {
  if (!coverPath) return null;
  if (isLocalPath(coverPath)) return convertFileSrc(coverPath);
  return coverPath;
}

export default function ImmersiveGameTile({
  game,
  focused,
  onFocus,
  onSelect,
}) {
  const [imgError, setImgError] = useState(false);
  const { colors } = useAppTheme();
  const coverSrc = useMemo(() => getCoverSrc(game.cover_path), [game.cover_path]);
  const showCover = Boolean(coverSrc) && !imgError;
  const platformColor = PLATFORM_COLORS[game.platform_id] || colors.primary;
  // Match desktop `GameCard`: badge uses platform id (e.g. GBA, NES), not full console names.
  const platformSlug = (game.platform_id || "").toUpperCase().slice(0, 6);

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
        width: "100%",
      }}
    >
      <Box
        sx={{
          position: "relative",
          aspectRatio: "3 / 4",
          borderRadius: "8px",
          overflow: "visible",
          transition: "transform 0.18s ease, box-shadow 0.2s ease",
          transform: focused ? "scale(1.06)" : "scale(1)",
          boxShadow: focused
            ? `0 8px 32px rgba(0,0,0,0.55), 0 0 22px ${colors.focusGlow}`
            : "0 2px 10px rgba(0,0,0,0.35)",
          zIndex: focused ? 2 : 1,
          outline: focused ? `2px solid ${colors.primary}` : "none",
          outlineOffset: 2,
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: "8px",
            overflow: "hidden",
            border: focused ? `2px solid ${colors.primary}` : "2px solid transparent",
            transition: "border-color 0.18s ease",
            bgcolor: "background.paper",
          }}
        >
          {showCover ? (
            <Box
              component="img"
              src={coverSrc}
              alt={game.name}
              onError={() => setImgError(true)}
              draggable={false}
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: focused ? "brightness(1.06)" : "brightness(1)",
                transition: "filter 0.18s ease",
              }}
            />
          ) : (
            <Box
              sx={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: alpha(platformColor, 0.12),
                p: 2,
              }}
            >
              <SportsEsportsIcon sx={{ fontSize: 44, color: alpha(platformColor, 0.45), mb: 1 }} />
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  textAlign: "center",
                  fontSize: "0.7rem",
                  lineHeight: 1.25,
                  maxHeight: "2.5em",
                  overflow: "hidden",
                  px: 0.5,
                }}
              >
                {game.name}
              </Typography>
            </Box>
          )}

          <Box
            sx={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              boxShadow: "inset 0 0 12px rgba(0,0,0,0.45)",
              borderRadius: "6px",
            }}
          />

          {platformSlug ? (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                bgcolor: "rgba(0,0,0,0.75)",
                backdropFilter: "blur(8px)",
                px: 1,
                py: 0.4,
                borderBottomRightRadius: "8px",
                minWidth: 28,
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  color: "#fff",
                  letterSpacing: "0.4px",
                  textAlign: "center",
                }}
              >
                {platformSlug}
              </Typography>
            </Box>
          ) : null}

          <Box
            sx={{
              position: "absolute",
              bottom: 6,
              left: 6,
              right: 6,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              pointerEvents: "none",
            }}
          >
            {game.is_favorite ? (
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  bgcolor: "rgba(0,0,0,0.6)",
                  backdropFilter: "blur(4px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FavoriteIcon sx={{ fontSize: 12, color: "#fff" }} />
              </Box>
            ) : (
              <Box />
            )}
            <Box sx={{ flex: 1 }} />
            {(() => {
              const remote = game.sync_state === "remote_only" || game.sync_state === "RemoteOnly";
              const synced = game.sync_state === "synced" || game.sync_state === "Synced";
              if (remote) {
                return (
                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      bgcolor: "rgba(0,0,0,0.6)",
                      backdropFilter: "blur(4px)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CloudIcon sx={{ fontSize: 12, color: colors.primaryLight }} />
                  </Box>
                );
              }
              if (synced) {
                return (
                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      bgcolor: "rgba(0,0,0,0.6)",
                      backdropFilter: "blur(4px)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CheckCircleIcon sx={{ fontSize: 12, color: "#66BB6A" }} />
                  </Box>
                );
              }
              return null;
            })()}
          </Box>

          {showCover ? (
            <Box
              sx={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                p: 1.25,
                pt: 3,
                background:
                  "linear-gradient(transparent 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.88) 100%)",
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  color: "#fff",
                  textShadow: "0 1px 3px rgba(0,0,0,0.9)",
                  lineHeight: 1.25,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
                title={game.name}
              >
                {game.name}
              </Typography>
            </Box>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}
