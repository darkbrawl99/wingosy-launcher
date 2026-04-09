import { useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import { alpha } from "@mui/material/styles";

export default function BpGameDetails({
  game,
  platformLabel,
  onBack,
  onLaunch,
  onToggleFavorite,
}) {
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onBack();
      }
      if (e.key === "Enter") {
        // Enter = primary action
        onLaunch(game.id);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [game.id, onBack, onLaunch]);

  return (
    <Box sx={{ height: "100vh", overflow: "auto", p: 5 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={onBack}
        color="inherit"
        sx={{ mb: 3, borderRadius: 999, px: 2.5 }}
      >
        Back
      </Button>

      <Paper
        sx={(t) => ({
          borderRadius: 4,
          overflow: "hidden",
          background:
            "linear-gradient(135deg, rgba(30,30,38,1) 0%, rgba(18,18,24,1) 100%)",
          boxShadow: `0 20px 70px ${alpha("#000", 0.6)}`,
          border: `1px solid ${alpha(t.palette.common.white, 0.06)}`,
        })}
      >
        <Box
          sx={{
            p: 4,
            background:
              "radial-gradient(1200px 500px at 15% 0%, rgba(99,102,241,0.35) 0%, transparent 55%), radial-gradient(900px 450px at 85% 10%, rgba(139,92,246,0.25) 0%, transparent 60%)",
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2, flexWrap: "wrap" }}>
            {platformLabel ? (
              <Chip
                label={platformLabel}
                sx={{
                  fontWeight: 900,
                  bgcolor: "rgba(255,255,255,0.08)",
                  color: "#fff",
                }}
              />
            ) : null}
            {game.is_favorite ? (
              <Chip
                label="Favorite"
                sx={{
                  fontWeight: 900,
                  bgcolor: "rgba(239,68,68,0.18)",
                  color: "#fff",
                }}
              />
            ) : null}
          </Stack>

          <Typography variant="h3" sx={{ fontWeight: 950, letterSpacing: "-0.9px", mb: 1 }}>
            {game.name}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 1100, lineHeight: 1.8 }}>
            {game.summary || "No description available."}
          </Typography>

          <Divider sx={{ my: 3, opacity: 0.12 }} />

          <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<PlayArrowIcon />}
              onClick={() => onLaunch(game.id)}
              sx={{ borderRadius: 3, px: 4, py: 1.6, fontSize: "1.1rem" }}
            >
              Play
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={game.is_favorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
              onClick={() => onToggleFavorite(game.id)}
              sx={{ borderRadius: 3, px: 4, py: 1.6, fontSize: "1.1rem" }}
            >
              {game.is_favorite ? "Unfavorite" : "Favorite"}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}

