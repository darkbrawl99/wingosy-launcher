import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";
import LinearProgress from "@mui/material/LinearProgress";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import SaveIcon from "@mui/icons-material/Save";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import RefreshIcon from "@mui/icons-material/Refresh";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import { invoke, convertFileSrc } from "@tauri-apps/api/tauri";
import { open } from "@tauri-apps/api/dialog";

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

export default function GameDetails({
  game,
  platforms,
  onBack,
  onLaunch,
  onToggleFavorite,
  onGameUpdate,
  rommToken,
  rommUrl,
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState(null);
  const [saves, setSaves] = useState([]);
  const [savesLoaded, setSavesLoaded] = useState(false);
  const [savesLoading, setSavesLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [imgError, setImgError] = useState(false);
  
  // Track if ROM was just downloaded (for immediate UI update)
  const [justDownloaded, setJustDownloaded] = useState(false);
  const [downloadedPath, setDownloadedPath] = useState(null);
  
  // Game actions menu state
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionStatus, setActionStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const platform = platforms.find(([p]) => p.id === game.platform_id)?.[0];
  const playHours = Math.floor(game.play_time_minutes / 60);
  const playMins = game.play_time_minutes % 60;
  const playTimeStr =
    playHours > 0 ? `${playHours}h ${playMins}m` : `${playMins}m`;

  // Check if ROM is available locally (either has local_file_path, sync_state is not remote_only, or just downloaded)
  const isRemoteOnly = (game.sync_state === "remote_only" || game.sync_state === "RemoteOnly") && !justDownloaded;
  const hasLocalFile = (game.local_file_path && game.local_file_path.length > 0) || justDownloaded;
  const canPlay = hasLocalFile || (!isRemoteOnly && game.source !== "RomM");
  const canDownload = game.romm_id && rommToken && rommUrl;
  
  const coverSrc = getCoverSrc(game.cover_path);
  const showCover = coverSrc && !imgError;

  async function handleDownloadRom() {
    if (!rommToken || !rommUrl) return;
    try {
      setDownloading(true);
      setDownloadStatus(null);
      const destPath = await invoke("download_rom", {
        gameId: game.id,
        serverUrl: rommUrl,
        token: rommToken,
      });
      
      // Mark as downloaded for immediate UI update
      setJustDownloaded(true);
      setDownloadedPath(destPath);
      setDownloadStatus({ type: "success", message: `Downloaded! Ready to play.` });
      
      // Notify parent to refresh game list if callback provided
      if (onGameUpdate) {
        onGameUpdate(game.id);
      }
    } catch (err) {
      setDownloadStatus({ type: "error", message: err.message || String(err) });
    } finally {
      setDownloading(false);
    }
  }

  async function handleListSaves() {
    if (!game.romm_id || !rommToken || !rommUrl) return;
    try {
      setSavesLoading(true);
      setSaveStatus(null);
      const result = await invoke("get_game_saves", {
        rommId: game.romm_id,
        serverUrl: rommUrl,
        token: rommToken,
      });
      setSaves(result);
      setSavesLoaded(true);
    } catch (err) {
      setSaveStatus({ type: "error", message: err.message || String(err) });
    } finally {
      setSavesLoading(false);
    }
  }

  async function handleDownloadSave(saveId) {
    if (!game.romm_id || !rommToken || !rommUrl) return;
    try {
      setSaveStatus(null);
      const path = await invoke("download_game_save", {
        rommId: game.romm_id,
        saveId,
        serverUrl: rommUrl,
        token: rommToken,
      });
      setSaveStatus({ type: "success", message: `Save downloaded to ${path}` });
    } catch (err) {
      setSaveStatus({ type: "error", message: err.message || String(err) });
    }
  }

  async function handleUploadSave() {
    if (!game.romm_id || !rommToken || !rommUrl) return;
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Save Files", extensions: ["sav", "srm", "state", "ss0", "dat", "*"] }],
      });
      if (!selected) return;
      setSaveStatus({ type: "info", message: "Uploading save..." });
      await invoke("upload_game_save", {
        rommId: game.romm_id,
        filePath: selected,
        serverUrl: rommUrl,
        token: rommToken,
      });
      setSaveStatus({ type: "success", message: "Save uploaded!" });
      handleListSaves();
    } catch (err) {
      setSaveStatus({ type: "error", message: err.message || String(err) });
    }
  }

  // Game Actions handlers
  async function handleDeleteDownload() {
    try {
      setDeleteDialogOpen(false);
      setMenuAnchor(null);
      setActionStatus({ type: "info", message: "Deleting ROM..." });
      await invoke("delete_local_rom", { gameId: game.id });
      setActionStatus({ type: "success", message: "ROM deleted successfully" });
      setJustDownloaded(false);
      setDownloadedPath(null);
      if (onGameUpdate) {
        onGameUpdate(game.id);
      }
    } catch (err) {
      setActionStatus({ type: "error", message: err.message || String(err) });
    }
  }

  async function handleHideGame() {
    try {
      setMenuAnchor(null);
      await invoke("toggle_game_hidden", { gameId: game.id });
      setActionStatus({ type: "success", message: "Game hidden. View hidden games in Settings." });
      if (onGameUpdate) {
        onGameUpdate(game.id);
      }
      // Navigate back since game is now hidden
      setTimeout(() => onBack(), 1500);
    } catch (err) {
      setActionStatus({ type: "error", message: err.message || String(err) });
    }
  }

  async function handleRefreshMetadata() {
    if (!rommToken || !rommUrl || !game.romm_id) return;
    try {
      setMenuAnchor(null);
      setRefreshing(true);
      setActionStatus({ type: "info", message: "Refreshing metadata from RomM..." });
      await invoke("refresh_game_metadata", {
        gameId: game.id,
        serverUrl: rommUrl,
        token: rommToken,
      });
      setActionStatus({ type: "success", message: "Metadata refreshed!" });
      if (onGameUpdate) {
        onGameUpdate(game.id);
      }
    } catch (err) {
      setActionStatus({ type: "error", message: err.message || String(err) });
    } finally {
      setRefreshing(false);
    }
  }

  async function handleOpenLocation() {
    try {
      setMenuAnchor(null);
      await invoke("open_rom_location", { gameId: game.id });
    } catch (err) {
      setActionStatus({ type: "error", message: err.message || String(err) });
    }
  }

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

      {/* Hero Cover */}
      {showCover && (
        <Box
          sx={{
            width: "100%",
            height: 280,
            borderRadius: 3,
            overflow: "hidden",
            mb: 3,
            position: "relative",
            bgcolor: "rgba(0,0,0,0.3)",
          }}
        >
          <Box
            component="img"
            src={coverSrc}
            alt={game.name}
            onError={() => setImgError(true)}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "brightness(0.7)",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              p: 3,
              background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 700, color: "#fff" }}>
              {game.name}
            </Typography>
          </Box>
        </Box>
      )}

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
            {!showCover && (
              <Typography variant="h4" gutterBottom>
                {game.name}
              </Typography>
            )}

            <Box sx={{ display: "flex", gap: 1, mb: 3, flexWrap: "wrap" }}>
              <Chip
                label={platform?.name || game.platform_id}
                color="primary"
                variant="outlined"
              />
              {game.source === "RomM" && (
                <Chip label="RomM" color="secondary" size="small" />
              )}
              {game.sync_state && game.sync_state !== "local_only" && (
                <Chip
                  label={game.sync_state === "remote_only" ? "Cloud Only" : "Synced"}
                  color={game.sync_state === "remote_only" ? "info" : "success"}
                  size="small"
                  variant="outlined"
                />
              )}
              {game.genres?.map((genre) => (
                <Chip key={genre} label={genre} size="small" variant="outlined" />
              ))}
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center" }}>
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
            
            {/* Game Actions Menu */}
            <IconButton
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              size="large"
              title="More options"
            >
              <MoreVertIcon fontSize="large" />
            </IconButton>
            
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
            >
              {/* Open ROM Location - only if has local file */}
              {hasLocalFile && (
                <MenuItem onClick={handleOpenLocation}>
                  <ListItemIcon>
                    <FolderOpenIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Open ROM Location</ListItemText>
                </MenuItem>
              )}
              
              {/* Refresh Metadata - only for RomM games */}
              {game.romm_id && rommToken && rommUrl && (
                <MenuItem onClick={handleRefreshMetadata} disabled={refreshing}>
                  <ListItemIcon>
                    <RefreshIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>{refreshing ? "Refreshing..." : "Refresh Metadata"}</ListItemText>
                </MenuItem>
              )}
              
              {/* Hide Game */}
              <MenuItem onClick={handleHideGame}>
                <ListItemIcon>
                  <VisibilityOffIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Hide Game</ListItemText>
              </MenuItem>
              
              {/* Delete Download - only if has local file */}
              {hasLocalFile && (
                <MenuItem onClick={() => { setMenuAnchor(null); setDeleteDialogOpen(true); }} sx={{ color: "error.main" }}>
                  <ListItemIcon>
                    <DeleteIcon fontSize="small" color="error" />
                  </ListItemIcon>
                  <ListItemText>Delete Download</ListItemText>
                </MenuItem>
              )}
            </Menu>
          </Box>
        </Box>
        
        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Downloaded ROM?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              This will delete the local ROM file for "{game.name}".
              {game.romm_id ? " The game will remain in your library (from RomM) and can be re-downloaded." 
                : " This will remove the game from your library completely."}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteDownload} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Action Status Alert */}
        {actionStatus && (
          <Alert 
            severity={actionStatus.type} 
            sx={{ mb: 2 }}
            onClose={() => setActionStatus(null)}
          >
            {actionStatus.message}
          </Alert>
        )}

        {/* Play and/or Download buttons */}
        <Box sx={{ display: "flex", gap: 2, mb: 4, flexWrap: "wrap", alignItems: "center" }}>
          {/* Show Play button if ROM is available locally */}
          {canPlay && (
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
              }}
            >
              Play
            </Button>
          )}
          
          {/* Show Download button for RomM games that aren't downloaded */}
          {canDownload && !canPlay && (
            <Button
              variant="contained"
              size="large"
              startIcon={downloading ? null : <CloudDownloadIcon />}
              onClick={handleDownloadRom}
              disabled={downloading}
              sx={{
                px: 5,
                py: 1.5,
                fontSize: "1.1rem",
                borderRadius: 3,
              }}
            >
              {downloading ? "Downloading..." : "Download ROM"}
            </Button>
          )}
          
          {/* Show Re-download option for already downloaded RomM games */}
          {canDownload && canPlay && (
            <Button
              variant="outlined"
              size="small"
              startIcon={downloading ? null : <CloudDownloadIcon />}
              onClick={handleDownloadRom}
              disabled={downloading}
              color="secondary"
              sx={{
                borderRadius: 3,
              }}
            >
              {downloading ? "Downloading..." : "Re-download"}
            </Button>
          )}
        </Box>
        
        {downloading && <LinearProgress sx={{ mb: 2, borderRadius: 2 }} />}
        {downloadStatus && (
          <Alert severity={downloadStatus.type} sx={{ mb: 2 }}>
            {downloadStatus.message}
          </Alert>
        )}

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: "flex", gap: 4, mb: 3, flexWrap: "wrap" }}>
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

        {/* Developer / Publisher */}
        {(game.developer || game.publisher) && (
          <Box sx={{ display: "flex", gap: 4, mb: 3 }}>
            {game.developer && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Developer
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {game.developer}
                </Typography>
              </Box>
            )}
            {game.publisher && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Publisher
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {game.publisher}
                </Typography>
              </Box>
            )}
          </Box>
        )}

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

        {/* Save Sync Section */}
        {game.romm_id && rommToken && rommUrl && (
          <>
            <Divider sx={{ my: 3 }} />
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <SaveIcon color="primary" />
              <Typography variant="h6">Saves</Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleListSaves}
                disabled={savesLoading}
              >
                {savesLoading ? "Loading..." : savesLoaded ? "Refresh Saves" : "List Saves"}
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<UploadFileIcon />}
                onClick={handleUploadSave}
              >
                Upload Save
              </Button>
            </Box>

            {savesLoaded && saves.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No saves found on server.
              </Typography>
            )}

            {saves.length > 0 && (
              <List dense sx={{ bgcolor: "rgba(0,0,0,0.15)", borderRadius: 2, mb: 2 }}>
                {saves.map((save) => (
                  <ListItem
                    key={save.id}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleDownloadSave(save.id)}
                        title="Download save"
                      >
                        <FileDownloadIcon fontSize="small" />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={save.file_name}
                      secondary={save.updated_at || save.created_at || null}
                      secondaryTypographyProps={{ fontSize: "0.75rem" }}
                    />
                  </ListItem>
                ))}
              </List>
            )}

            {saveStatus && (
              <Alert severity={saveStatus.type} sx={{ mt: 1 }} onClose={() => setSaveStatus(null)}>
                {saveStatus.message}
              </Alert>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
}
