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
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";

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

export default function GameCard({ game, onClick, onToggleFavorite, onLaunch }) {
  const platformColor = PLATFORM_COLORS[game.platform_id] || "#4a90e2";

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
          {game.cover_path ? (
            <Box
              component="img"
              src={game.cover_path}
              alt={game.name}
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
      </Box>
    </Card>
  );
}
