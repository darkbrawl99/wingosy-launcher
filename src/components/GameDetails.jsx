import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";

export default function GameDetails({
  game,
  platforms,
  onBack,
  onLaunch,
  onToggleFavorite,
}) {
  const platform = platforms.find(([p]) => p.id === game.platform_id)?.[0];
  const playHours = Math.floor(game.play_time_minutes / 60);
  const playMins = game.play_time_minutes % 60;
  const playTimeStr =
    playHours > 0 ? `${playHours}h ${playMins}m` : `${playMins}m`;

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: "auto" }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={onBack}
        sx={{ mb: 2 }}
        color="inherit"
      >
        Back to Library
      </Button>

      <Paper
        sx={{
          p: 4,
          borderRadius: 3,
          background: "linear-gradient(135deg, #1e1e26 0%, #252530 100%)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" gutterBottom>
              {game.name}
            </Typography>

            <Box sx={{ display: "flex", gap: 1, mb: 3, flexWrap: "wrap" }}>
              <Chip
                label={platform?.name || game.platform_id}
                color="primary"
                variant="outlined"
              />
              {game.source === "RomM" && (
                <Chip label="RomM" color="secondary" size="small" />
              )}
              {game.genres?.map((genre) => (
                <Chip key={genre} label={genre} size="small" variant="outlined" />
              ))}
            </Box>
          </Box>

          <IconButton
            onClick={() => onToggleFavorite(game.id)}
            size="large"
            sx={{ ml: 2 }}
          >
            {game.is_favorite ? (
              <FavoriteIcon color="error" fontSize="large" />
            ) : (
              <FavoriteBorderIcon fontSize="large" />
            )}
          </IconButton>
        </Box>

        <Button
          variant="contained"
          size="large"
          startIcon={<PlayArrowIcon />}
          onClick={() => onLaunch(game.id)}
          sx={{
            px: 5,
            py: 1.5,
            fontSize: "1.1rem",
            borderRadius: 3,
            mb: 4,
          }}
        >
          Play
        </Button>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: "flex", gap: 4, mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AccessTimeIcon color="action" />
            <Box>
              <Typography variant="caption" color="text.secondary">
                Play Time
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {playTimeStr}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <SportsEsportsIcon color="action" />
            <Box>
              <Typography variant="caption" color="text.secondary">
                Times Played
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {game.play_count}
              </Typography>
            </Box>
          </Box>

          {game.release_year && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CalendarTodayIcon color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Release Year
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {game.release_year}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

        {game.summary && (
          <>
            <Typography variant="h6" gutterBottom>
              About
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ lineHeight: 1.8 }}
            >
              {game.summary}
            </Typography>
          </>
        )}

        {!game.summary && (
          <Typography variant="body2" color="text.secondary" fontStyle="italic">
            No description available.
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
