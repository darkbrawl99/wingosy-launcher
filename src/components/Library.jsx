import { useState } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import SearchIcon from "@mui/icons-material/Search";
import GameCard from "./GameCard";

export default function Library({
  games,
  loading,
  searchQuery,
  onSearchChange,
  onSelectGame,
  onToggleFavorite,
  onLaunchGame,
  error,
  onDismissError,
}) {
  return (
    <Box sx={{ p: 3 }}>
      {error && (
        <Alert severity="error" onClose={onDismissError} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4">Library</Typography>
        <TextField
          size="small"
          placeholder="Search games..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          sx={{ width: 320 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {loading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "60vh",
          }}
        >
          <CircularProgress />
        </Box>
      ) : games.length === 0 ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "60vh",
            color: "text.secondary",
          }}
        >
          <Typography variant="h6" gutterBottom>
            No games found
          </Typography>
          <Typography variant="body2">
            Add ROMs to your library or sync with your RomM server.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {games.map((game) => (
            <Grid item xs={6} sm={4} md={3} lg={2.4} xl={2} key={game.id}>
              <GameCard
                game={game}
                onClick={() => onSelectGame(game)}
                onToggleFavorite={() => onToggleFavorite(game.id)}
                onLaunch={() => onLaunchGame(game.id)}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
