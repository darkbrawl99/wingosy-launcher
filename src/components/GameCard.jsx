import { useState } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActionArea from "@mui/material/CardActionArea";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import CloudIcon from "@mui/icons-material/Cloud";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { convertFileSrc } from "@tauri-apps/api/tauri";

const PLATFORM_COLORS = {
  nes: "#e60012", snes: "#e60012", n64: "#e60012", gc: "#e60012",
  wii: "#e60012", wiiu: "#e60012", switch: "#e60012",
  gb: "#e60012", gbc: "#e60012", gba: "#e60012",
  nds: "#e60012", "3ds": "#e60012",
  psx: "#0052a5", ps2: "#0052a5", ps3: "#0052a5", psp: "#0052a5",
  genesis: "#0070c0", saturn: "#0070c0", dreamcast: "#0070c0",
  xbox: "#107c10", xbox360: "#107c10",
  arcade: "#ffcc00", pc: "#4a90e2",
};

function isLocalPath(path) {
  if (!path) return false;
  return /^[a-zA-Z]:/.test(path) || path.startsWith("\\") || path.startsWith("/");
}

function getCoverSrc(coverPath) {
  if (!coverPath) return null;
  if (isLocalPath(coverPath)) {
    return convertFileSrc(coverPath);
  }
  return coverPath;
}

export default function GameCard({ game, onClick, onToggleFavorite, onLaunch }) {
  const [imgError, setImgError] = useState(false);
  const platformColor = PLATFORM_COLORS[game.platform_id] || "#4a90e2";
  const coverSrc = getCoverSrc(game.cover_path);
  const showCover = coverSrc && !imgError;
  
  // Check if game is playable (has local file or is not remote-only)
  const isRemoteOnly = game.sync_state === "remote_only" || game.sync_state === "RemoteOnly";
  const hasLocalFile = game.local_file_path && game.local_file_path.length > 0;
  const canPlay = hasLocalFile || (!isRemoteOnly && game.source !== "RomM");

  const syncBadge = (() => {
    if (game.sync_state === "remote_only") {
      return (
        <Box
          sx={{
            position: "absolute",
            top: 6,
            left: 6,
            bgcolor: "rgba(0,0,0,0.7)",
            borderRadius: "50%",
            width: 26,
            height: 26,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(4px)",
          }}
        >
          <CloudIcon sx={{ fontSize: 16, color: "#64b5f6" }} />
        </Box>
      );
    }
    if (game.sync_state === "synced") {
      return (
        <Box
          sx={{
            position: "absolute",
            top: 6,
            left: 6,
            bgcolor: "rgba(0,0,0,0.7)",
            borderRadius: "50%",
            width: 26,
            height: 26,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(4px)",
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 16, color: "#66bb6a" }} />
        </Box>
      );
    }
    return null;
  })();

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: `0 8px 24px rgba(0,0,0,0.4)`,
        },
        "&:hover .game-actions": { opacity: 1 },
        position: "relative",
        overflow: "visible",
      }}
    >
      <CardActionArea onClick={onClick} sx={{ flexGrow: 1 }}>
        <Box
          sx={{
            height: 180,
            bgcolor: `${platformColor}22`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: `3px solid ${platformColor}`,
            position: "relative",
          }}
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
              }}
            />
          ) : (
            <SportsEsportsIcon
              sx={{ fontSize: 64, color: `${platformColor}66` }}
            />
          )}
          {syncBadge}
        </Box>

        <CardContent sx={{ py: 1.5, px: 1.5, "&:last-child": { pb: 1.5 } }}>
          <Typography
            variant="body2"
            fontWeight={600}
            noWrap
            title={game.name}
          >
            {game.name}
          </Typography>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mt: 0.5,
            }}
          >
            <Chip
              label={game.platform_id.toUpperCase()}
              size="small"
              sx={{
                height: 20,
                fontSize: "0.65rem",
                fontWeight: 700,
                bgcolor: `${platformColor}33`,
                color: platformColor,
              }}
            />
            {game.play_count > 0 && (
              <Typography variant="caption" color="text.secondary">
                {game.play_count}x played
              </Typography>
            )}
          </Box>
        </CardContent>
      </CardActionArea>

      <Box
        className="game-actions"
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          display: "flex",
          gap: 0.5,
          opacity: 0,
          transition: "opacity 0.2s",
        }}
      >
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          sx={{
            bgcolor: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            "&:hover": { bgcolor: "rgba(0,0,0,0.8)" },
          }}
        >
          {game.is_favorite ? (
            <FavoriteIcon fontSize="small" color="error" />
          ) : (
            <FavoriteBorderIcon fontSize="small" />
          )}
        </IconButton>
        {canPlay ? (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onLaunch();
            }}
            sx={{
              bgcolor: "rgba(74,144,226,0.8)",
              "&:hover": { bgcolor: "rgba(74,144,226,1)" },
            }}
          >
            <PlayArrowIcon fontSize="small" />
          </IconButton>
        ) : isRemoteOnly ? (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onClick(); // Navigate to details to download
            }}
            sx={{
              bgcolor: "rgba(255,152,0,0.8)",
              "&:hover": { bgcolor: "rgba(255,152,0,1)" },
            }}
          >
            <CloudDownloadIcon fontSize="small" />
          </IconButton>
        ) : null}
      </Box>
    </Card>
  );
}
