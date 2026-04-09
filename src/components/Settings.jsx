import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";
import LinearProgress from "@mui/material/LinearProgress";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Collapse from "@mui/material/Collapse";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloudIcon from "@mui/icons-material/Cloud";
import FolderIcon from "@mui/icons-material/Folder";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DownloadIcon from "@mui/icons-material/Download";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RefreshIcon from "@mui/icons-material/Refresh";
import MemoryIcon from "@mui/icons-material/Memory";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ListItemSecondaryAction from "@mui/material/ListItemSecondaryAction";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import DeleteIcon from "@mui/icons-material/Delete";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import TuneIcon from "@mui/icons-material/Tune";
import { invoke } from "@tauri-apps/api/tauri";
import { open } from "@tauri-apps/api/dialog";
import normalizeUrl from "../utils/normalizeUrl";

export default function Settings({ onBack, rommToken, rommUrl: rommUrlProp, onRommConnect, onLibraryChange, onBigPictureChange, onFullscreenChange }) {
  const [config, setConfig] = useState(null);
  const [rommUrl, setRommUrl] = useState(rommUrlProp || "");
  const [rommUsername, setRommUsername] = useState("");
  const [rommPassword, setRommPassword] = useState("");
  const [rommStatus, setRommStatus] = useState(null);
  const [scanMessage, setScanMessage] = useState(null);
  const [emulators, setEmulators] = useState([]);
  const [downloadingEmu, setDownloadingEmu] = useState(null);
  const [missingCores, setMissingCores] = useState([]);
  const [downloadingCore, setDownloadingCore] = useState(null);
  const [emuMessage, setEmuMessage] = useState(null);
  const [emuMenuAnchor, setEmuMenuAnchor] = useState(null);
  const [selectedEmu, setSelectedEmu] = useState(null);
  const [expandedEmu, setExpandedEmu] = useState(null);
  
  // Hidden games state
  const [hiddenGames, setHiddenGames] = useState([]);
  const [hiddenDialogOpen, setHiddenDialogOpen] = useState(false);
  const [hiddenLoading, setHiddenLoading] = useState(false);
  
  // Library directory state
  const [romsDirectory, setRomsDirectory] = useState("");
  
  // Platform default emulators
  const [platformDefaults, setPlatformDefaults] = useState({});
  const [platforms, setPlatforms] = useState([]);
  
  // Big Picture / fullscreen UI flags
  const [bigPictureEnabled, setBigPictureEnabled] = useState(false);
  const [fullscreenEnabled, setFullscreenEnabled] = useState(false);

  useEffect(() => {
    loadConfig();
    loadEmulators();
    loadMissingCores();
    loadPlatformDefaults();
    loadPlatforms();
  }, []);

  async function loadConfig() {
    try {
      const cfg = await invoke("get_config");
      setConfig(cfg);
      setRommUrl(cfg.romm?.server_url || rommUrlProp || "");
      setRommUsername(cfg.romm?.username || "");
      setRomsDirectory(cfg.library?.roms_directory || "");
      setBigPictureEnabled(Boolean(cfg.display?.big_picture));
      setFullscreenEnabled(Boolean(cfg.display?.fullscreen));
    } catch {}
  }

  async function persistDisplayFlags(nextBigPicture, nextFullscreen) {
    const cfg = config || (await invoke("get_config"));
    cfg.display = cfg.display || {};
    cfg.display.big_picture = Boolean(nextBigPicture);
    cfg.display.fullscreen = Boolean(nextFullscreen);
    await invoke("save_config", { config: cfg });
    setConfig(cfg);
  }

  async function loadEmulators() {
    try {
      const emus = await invoke("get_all_emulators");
      setEmulators(emus);
    } catch (err) {
      console.error("Failed to load emulators:", err);
    }
  }

  async function loadMissingCores() {
    try {
      const cores = await invoke("get_missing_cores");
      setMissingCores(cores);
    } catch {}
  }

  async function loadPlatformDefaults() {
    try {
      const defaults = await invoke("get_platform_default_emulators");
      setPlatformDefaults(defaults || {});
    } catch {}
  }

  async function loadPlatforms() {
    try {
      const plats = await invoke("get_platforms_with_games");
      setPlatforms(plats);
    } catch {}
  }

  async function handleSetDefaultEmulator(platformId, emulatorId) {
    try {
      await invoke("set_platform_default_emulator", { 
        platformId, 
        emulatorId: emulatorId || null 
      });
      setPlatformDefaults(prev => {
        const next = { ...prev };
        if (emulatorId) {
          next[platformId] = emulatorId;
        } else {
          delete next[platformId];
        }
        return next;
      });
      setEmuMessage({ type: "success", message: `Default emulator updated for ${platformId.toUpperCase()}` });
    } catch (err) {
      setEmuMessage({ type: "error", message: err.message || String(err) });
    }
  }

  async function handleConnectRomM() {
    try {
      setRommStatus(null);
      const normalizedUrl = normalizeUrl(rommUrl);
      setRommUrl(normalizedUrl);
      const token = await invoke("connect_romm", {
        serverUrl: normalizedUrl,
        username: rommUsername,
        password: rommPassword,
      });
      onRommConnect(normalizedUrl, token);
      setRommStatus({ type: "success", message: "Connected! Click 'Sync Library' to pull your games." });
    } catch (err) {
      setRommStatus({ type: "error", message: err.message || String(err) });
    }
  }

  async function handleSyncRomM() {
    if (!rommUrl) {
      setRommStatus({ type: "error", message: "Enter a server URL first." });
      return;
    }
    try {
      setRommStatus({ type: "info", message: "Syncing library..." });
      const normalizedUrl = normalizeUrl(rommUrl);
      if (!rommToken) {
        if (!rommUsername || !rommPassword) {
          setRommStatus({ type: "error", message: "Enter credentials and click Connect first." });
          return;
        }
        const token = await invoke("connect_romm", {
          serverUrl: normalizedUrl, username: rommUsername, password: rommPassword,
        });
        onRommConnect(normalizedUrl, token);
      }
      const games = await invoke("sync_romm_library", {
        serverUrl: normalizedUrl, token: rommToken || "re-auth",
      });
      setRommStatus({ type: "success", message: `Synced ${games.length} games from RomM!` });
      // Refresh sidebar platform counts
      if (onLibraryChange) {
        onLibraryChange();
      }
    } catch (err) {
      setRommStatus({ type: "error", message: err.message || String(err) });
    }
  }

  async function handleScanDirectory() {
    try {
      // If ROM directory is set, scan that. Otherwise, ask user to pick a folder.
      let pathToScan = romsDirectory;
      if (!pathToScan) {
        const selected = await open({ directory: true, multiple: false });
        if (!selected) return;
        pathToScan = selected;
      }
      
      setScanMessage({ type: "info", message: `Scanning ${pathToScan}...` });
      const games = await invoke("scan_directory", { path: pathToScan, recursive: true });
      setScanMessage({ type: "success", message: `Found ${games.length} games!` });
      if (onLibraryChange) onLibraryChange();
    } catch (err) {
      setScanMessage({ type: "error", message: err.message || String(err) });
    }
  }

  async function handleScanCustomDirectory() {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected) {
        setScanMessage({ type: "info", message: `Scanning ${selected}...` });
        const games = await invoke("scan_directory", { path: selected, recursive: true });
        setScanMessage({ type: "success", message: `Found ${games.length} games!` });
        if (onLibraryChange) onLibraryChange();
      }
    } catch (err) {
      setScanMessage({ type: "error", message: err.message || String(err) });
    }
  }

  async function handleChangeRomsDirectory() {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected) {
        // Update config with new directory
        const cfg = await invoke("get_config");
        cfg.library = cfg.library || {};
        cfg.library.roms_directory = selected;
        await invoke("save_config", { config: cfg });
        setRomsDirectory(selected);
        setScanMessage({ type: "success", message: `ROM directory set to: ${selected}` });
      }
    } catch (err) {
      setScanMessage({ type: "error", message: err.message || String(err) });
    }
  }

  async function handleDownloadEmulator(emuId) {
    try {
      setDownloadingEmu(emuId);
      setEmuMessage({ type: "info", message: `Downloading ${emuId}...` });
      const path = await invoke("download_emulator", { emulatorId: emuId });
      setEmuMessage({ type: "success", message: `Installed ${emuId} at ${path}` });
      await loadEmulators();
      await loadMissingCores();
    } catch (err) {
      setEmuMessage({ type: "error", message: err.message || String(err) });
    } finally {
      setDownloadingEmu(null);
    }
  }

  async function handleDownloadCore(coreFilename) {
    try {
      setDownloadingCore(coreFilename);
      setEmuMessage({ type: "info", message: `Downloading core ${coreFilename}...` });
      await invoke("download_retroarch_core", { coreName: coreFilename });
      setEmuMessage({ type: "success", message: `Installed core ${coreFilename}` });
      await loadMissingCores();
    } catch (err) {
      setEmuMessage({ type: "error", message: err.message || String(err) });
    } finally {
      setDownloadingCore(null);
    }
  }

  function handleEmuMenuOpen(event, emu) {
    setEmuMenuAnchor(event.currentTarget);
    setSelectedEmu(emu);
  }

  function handleEmuMenuClose() {
    setEmuMenuAnchor(null);
    setSelectedEmu(null);
  }

  async function handleLaunchEmulator() {
    if (!selectedEmu?.installed_path) return;
    try {
      await invoke("launch_emulator", { emulatorPath: selectedEmu.installed_path });
      setEmuMessage({ type: "success", message: `Launched ${selectedEmu.name}` });
    } catch (err) {
      setEmuMessage({ type: "error", message: `Failed to launch: ${err}` });
    }
    handleEmuMenuClose();
  }

  async function handleOpenLocation() {
    if (!selectedEmu?.installed_path) return;
    try {
      await invoke("open_emulator_location", { emulatorPath: selectedEmu.installed_path });
    } catch (err) {
      setEmuMessage({ type: "error", message: `Failed to open location: ${err}` });
    }
    handleEmuMenuClose();
  }

  async function handleUninstallEmulator() {
    if (!selectedEmu?.id) return;
    
    // Only allow uninstalling managed emulators
    if (selectedEmu.install_type !== "managed") {
      setEmuMessage({ type: "error", message: "Can only uninstall emulators installed via Wingosy" });
      handleEmuMenuClose();
      return;
    }
    
    try {
      setDownloadingEmu(selectedEmu.id); // Reuse for loading state
      setEmuMessage({ type: "info", message: `Uninstalling ${selectedEmu.name}...` });
      await invoke("uninstall_emulator", { emulatorId: selectedEmu.id });
      setEmuMessage({ type: "success", message: `Successfully uninstalled ${selectedEmu.name}` });
      await loadEmulators();
      await loadMissingCores();
    } catch (err) {
      setEmuMessage({ type: "error", message: `Failed to uninstall: ${err}` });
    } finally {
      setDownloadingEmu(null);
      handleEmuMenuClose();
    }
  }

  // Hidden Games functions
  async function loadHiddenGames() {
    try {
      setHiddenLoading(true);
      const games = await invoke("get_hidden_games");
      setHiddenGames(games);
    } catch (err) {
      console.error("Failed to load hidden games:", err);
    } finally {
      setHiddenLoading(false);
    }
  }

  async function handleUnhideGame(gameId) {
    try {
      await invoke("unhide_game", { gameId });
      setHiddenGames(hiddenGames.filter(g => g.id !== gameId));
    } catch (err) {
      console.error("Failed to unhide game:", err);
    }
  }

  function handleOpenHiddenDialog() {
    loadHiddenGames();
    setHiddenDialogOpen(true);
  }

  function getInstallTypeLabel(installType) {
    switch (installType) {
      case "steam": return "Steam";
      case "system": return "System";
      case "portable": return "Portable";
      case "managed": return "Wingosy";
      case "custom": return "Custom";
      default: return "Installed";
    }
  }

  async function handleApplyPaths() {
    try {
      const count = await invoke("apply_detected_paths");
      setEmuMessage({ type: "success", message: `Applied ${count} emulator paths to config.` });
      await loadEmulators();
    } catch (err) {
      setEmuMessage({ type: "error", message: err.message || String(err) });
    }
  }

  const installedEmus = emulators.filter((e) => e.is_installed);
  const availableEmus = emulators.filter((e) => !e.is_installed && e.has_download);
  const unavailableEmus = emulators.filter((e) => !e.is_installed && !e.has_download);

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: "auto" }}>
      <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mb: 2 }} color="inherit">
        Back
      </Button>

      <Typography variant="h4" gutterBottom>Settings</Typography>

      {/* UI */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom>UI</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Big Picture is a fullscreen, 10-foot-friendly interface for couch play.
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={bigPictureEnabled}
                onChange={async (e) => {
                  const next = e.target.checked;
                  setBigPictureEnabled(next);
                  // If enabling Big Picture, default fullscreen on.
                  const nextFs = next ? true : fullscreenEnabled;
                  if (next) setFullscreenEnabled(nextFs);
                  await persistDisplayFlags(next, nextFs);
                  // Notify parent of Big Picture change
                  if (onBigPictureChange) {
                    onBigPictureChange(next);
                  } else if (next && onLibraryChange) {
                    // Fallback: trigger library refresh so App.jsx picks up the new display flags
                    onLibraryChange();
                  }
                }}
              />
            }
            label="Big Picture mode"
          />
          <FormControlLabel
            control={
              <Switch
                checked={fullscreenEnabled}
                disabled={!bigPictureEnabled}
                onChange={async (e) => {
                  const nextFs = e.target.checked;
                  setFullscreenEnabled(nextFs);
                  await persistDisplayFlags(bigPictureEnabled, nextFs);
                  if (onFullscreenChange) {
                    onFullscreenChange(nextFs);
                  }
                }}
              />
            }
            label="Fullscreen (Big Picture)"
          />
          <Typography variant="caption" color="text.secondary">
            Tip: Press F11 to toggle fullscreen. Press Esc to go back.
          </Typography>
        </Box>
      </Paper>

      {/* RomM */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <CloudIcon color="primary" />
          <Typography variant="h6">RomM Server</Typography>
          {rommToken && <CheckCircleIcon color="success" fontSize="small" />}
        </Box>
        <TextField fullWidth label="Server URL" placeholder="romm.example.com or 192.168.1.2:3000"
          value={rommUrl} onChange={(e) => setRommUrl(e.target.value)} sx={{ mb: 2 }} size="small" />
        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <TextField label="Username" value={rommUsername} onChange={(e) => setRommUsername(e.target.value)} size="small" sx={{ flex: 1 }} />
          <TextField label="Password" type="password" value={rommPassword} onChange={(e) => setRommPassword(e.target.value)} size="small" sx={{ flex: 1 }} />
        </Box>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button variant="contained" onClick={handleConnectRomM}>Connect</Button>
          <Button variant="outlined" onClick={handleSyncRomM} disabled={!rommUrl}>Sync Library</Button>
        </Box>
        {rommStatus && <Alert severity={rommStatus.type} sx={{ mt: 2 }}>{rommStatus.message}</Alert>}
      </Paper>

      {/* Library */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <FolderIcon color="primary" />
          <Typography variant="h6">Library</Typography>
        </Box>
        
        {/* Current ROM Directory */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          ROM Storage Directory
        </Typography>
        <Box sx={{ 
          display: "flex", 
          alignItems: "center", 
          gap: 2, 
          mb: 2,
          p: 1.5,
          bgcolor: "rgba(0,0,0,0.2)",
          borderRadius: 2,
        }}>
          <FolderOpenIcon color="action" />
          <Typography 
            variant="body2" 
            sx={{ 
              flex: 1, 
              fontFamily: "monospace",
              color: romsDirectory ? "text.primary" : "text.secondary",
              fontStyle: romsDirectory ? "normal" : "italic",
            }}
          >
            {romsDirectory || "Not set (using default location)"}
          </Typography>
          <Button size="small" variant="outlined" onClick={handleChangeRomsDirectory}>
            Change
          </Button>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Scan for ROMs to add them to your library.
        </Typography>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <Button 
            variant="contained" 
            onClick={handleScanDirectory}
            disabled={!romsDirectory}
            title={romsDirectory ? `Scan ${romsDirectory}` : "Set a ROM directory first"}
          >
            Scan ROM Directory
          </Button>
          <Button variant="outlined" onClick={handleScanCustomDirectory}>
            Scan Other Folder...
          </Button>
        </Box>
        {scanMessage && <Alert severity={scanMessage.type} sx={{ mt: 2 }}>{scanMessage.message}</Alert>}
      </Paper>

      {/* Emulators & Cores - Unified Section */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <SportsEsportsIcon color="primary" />
            <Typography variant="h6">Emulators</Typography>
            <Chip label={`${installedEmus.length} installed`} size="small" color="success" variant="outlined" />
            {missingCores.length > 0 && (
              <Chip 
                label={`${missingCores.length} cores needed`} 
                size="small" 
                color="warning" 
                variant="outlined"
                icon={<MemoryIcon sx={{ fontSize: 14 }} />}
              />
            )}
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Tooltip title="Auto-apply detected paths to config">
              <Button size="small" variant="outlined" onClick={handleApplyPaths}>
                Apply Paths
              </Button>
            </Tooltip>
            <Tooltip title="Re-scan for emulators">
              <IconButton size="small" onClick={() => { loadEmulators(); loadMissingCores(); }}><RefreshIcon /></IconButton>
            </Tooltip>
          </Box>
        </Box>

        {emuMessage && <Alert severity={emuMessage.type} onClose={() => setEmuMessage(null)} sx={{ mb: 2 }}>{emuMessage.message}</Alert>}
        {(downloadingEmu || downloadingCore) && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

        {installedEmus.length > 0 && (
          <>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Installed</Typography>
            <List dense>
              {installedEmus.map((emu) => {
                const isRetroArch = emu.id === "retroarch";
                const emuCores = isRetroArch ? missingCores : [];
                const isExpanded = expandedEmu === emu.id;
                
                return (
                  <Box key={emu.id}>
                    <ListItem 
                      sx={{ 
                        borderRadius: isExpanded ? "8px 8px 0 0" : 2, 
                        mb: isExpanded ? 0 : 0.5,
                        bgcolor: "rgba(76, 175, 80, 0.08)",
                        "&:hover": { bgcolor: "rgba(76, 175, 80, 0.12)" },
                        cursor: isRetroArch && emuCores.length > 0 ? "pointer" : "default"
                      }}
                      onClick={() => isRetroArch && emuCores.length > 0 && setExpandedEmu(isExpanded ? null : emu.id)}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <CheckCircleIcon color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            {emu.name}
                            {emu.version && (
                              <Typography variant="caption" color="text.secondary">
                                v{emu.version}
                              </Typography>
                            )}
                            <Chip 
                              label={getInstallTypeLabel(emu.install_type)} 
                              size="small" 
                              color={emu.install_type === "steam" ? "primary" : "default"}
                              variant="outlined"
                              sx={{ fontSize: "0.6rem", height: 18 }}
                            />
                            {isRetroArch && emuCores.length > 0 && (
                              <Chip 
                                label={`${emuCores.length} cores needed`}
                                size="small" 
                                color="warning"
                                variant="filled"
                                sx={{ fontSize: "0.6rem", height: 18 }}
                              />
                            )}
                          </Box>
                        }
                        secondary={emu.installed_path}
                        secondaryTypographyProps={{ fontSize: "0.7rem", noWrap: true, sx: { maxWidth: 300 } }}
                      />
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Chip 
                          label={emu.supported_platforms.slice(0, 3).join(", ").toUpperCase() + (emu.supported_platforms.length > 3 ? "..." : "")} 
                          size="small" 
                          variant="outlined"
                          sx={{ fontSize: "0.6rem", maxWidth: 120 }} 
                        />
                        <Tooltip title="Launch">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              invoke("launch_emulator", { emulatorPath: emu.installed_path })
                                .then(() => setEmuMessage({ type: "success", message: `Launched ${emu.name}` }))
                                .catch(err => setEmuMessage({ type: "error", message: `Failed: ${err}` }));
                            }}
                          >
                            <PlayArrowIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Open folder">
                          <IconButton 
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              invoke("open_emulator_location", { emulatorPath: emu.installed_path })
                                .catch(err => setEmuMessage({ type: "error", message: `Failed: ${err}` }));
                            }}
                          >
                            <FolderOpenIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleEmuMenuOpen(e, emu); }}>
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                        {isRetroArch && emuCores.length > 0 && (
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setExpandedEmu(isExpanded ? null : emu.id); }}>
                            {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                          </IconButton>
                        )}
                      </Box>
                    </ListItem>
                    
                    {/* Cores section for RetroArch */}
                    {isRetroArch && (
                      <Collapse in={isExpanded}>
                        <Box sx={{ 
                          bgcolor: "rgba(255, 152, 0, 0.05)", 
                          borderRadius: "0 0 8px 8px",
                          border: "1px solid rgba(255, 152, 0, 0.2)",
                          borderTop: "none",
                          mb: 0.5,
                          p: 2
                        }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                            Missing cores for your game library:
                          </Typography>
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                            {emuCores.map((core) => (
                              <Chip
                                key={core.core_filename}
                                icon={downloadingCore === core.core_filename ? null : <MemoryIcon sx={{ fontSize: 14 }} />}
                                label={
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                    <span>{core.core_filename.replace("_libretro.dll", "")}</span>
                                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                      ({core.platform_name})
                                    </Typography>
                                  </Box>
                                }
                                onClick={() => handleDownloadCore(core.core_filename)}
                                onDelete={() => handleDownloadCore(core.core_filename)}
                                deleteIcon={
                                  downloadingCore === core.core_filename 
                                    ? <Box sx={{ width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <Box sx={{ width: 14, height: 14, border: "2px solid", borderColor: "warning.main", borderRadius: "50%", borderRightColor: "transparent", animation: "spin 1s linear infinite", "@keyframes spin": { "0%": { transform: "rotate(0deg)" }, "100%": { transform: "rotate(360deg)" } } }} />
                                      </Box>
                                    : <DownloadIcon sx={{ fontSize: 16 }} />
                                }
                                disabled={downloadingCore !== null}
                                sx={{ 
                                  bgcolor: "rgba(255, 152, 0, 0.1)",
                                  "&:hover": { bgcolor: "rgba(255, 152, 0, 0.2)" },
                                  "& .MuiChip-deleteIcon": { color: "warning.main" }
                                }}
                                size="small"
                              />
                            ))}
                          </Box>
                          {emuCores.length > 1 && (
                            <Button 
                              size="small" 
                              variant="outlined" 
                              color="warning"
                              startIcon={<DownloadIcon />}
                              onClick={async () => {
                                for (const core of emuCores) {
                                  await handleDownloadCore(core.core_filename);
                                }
                              }}
                              disabled={downloadingCore !== null}
                              sx={{ mt: 1.5 }}
                            >
                              Download All Cores
                            </Button>
                          )}
                        </Box>
                      </Collapse>
                    )}
                  </Box>
                );
              })}
            </List>
            <Menu
              anchorEl={emuMenuAnchor}
              open={Boolean(emuMenuAnchor)}
              onClose={handleEmuMenuClose}
            >
              <MenuItem onClick={handleLaunchEmulator}>
                <PlayArrowIcon fontSize="small" sx={{ mr: 1 }} />
                Launch Emulator
              </MenuItem>
              <MenuItem onClick={handleOpenLocation}>
                <FolderOpenIcon fontSize="small" sx={{ mr: 1 }} />
                Open Install Location
              </MenuItem>
              {selectedEmu?.install_type === "managed" && (
                <MenuItem 
                  onClick={handleUninstallEmulator}
                  sx={{ color: "error.main" }}
                >
                  <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                  Uninstall
                </MenuItem>
              )}
            </Menu>
          </>
        )}

        {availableEmus.length > 0 && (
          <>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
              Available for Download
            </Typography>
            <List dense>
              {availableEmus.map((emu) => (
                <ListItem key={emu.id} sx={{ borderRadius: 2, mb: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <CloudDownloadIcon color="action" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={emu.name}
                    secondary={emu.supported_platforms.join(", ").toUpperCase()}
                    secondaryTypographyProps={{ fontSize: "0.7rem" }}
                  />
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleDownloadEmulator(emu.id)}
                    disabled={downloadingEmu !== null}
                    sx={{ ml: 1 }}
                  >
                    {downloadingEmu === emu.id ? "Installing..." : "Install"}
                  </Button>
                </ListItem>
              ))}
            </List>
          </>
        )}

        {unavailableEmus.length > 0 && (
          <>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
              Manual Install Required
            </Typography>
            <List dense>
              {unavailableEmus.map((emu) => (
                <ListItem key={emu.id} sx={{ borderRadius: 2, mb: 0.5, opacity: 0.6 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <OpenInNewIcon color="action" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={emu.name} secondary="Download manually from the emulator's website" secondaryTypographyProps={{ fontSize: "0.7rem" }} />
                </ListItem>
              ))}
            </List>
          </>
        )}
        
        {/* Show missing cores alert if RetroArch is NOT installed but cores are needed */}
        {missingCores.length > 0 && !installedEmus.some(e => e.id === "retroarch") && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2" fontWeight={500}>
              {missingCores.length} cores needed for your games
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Install RetroArch to use these cores: {missingCores.map(c => c.platform_name).join(", ")}
            </Typography>
          </Alert>
        )}
      </Paper>

      {/* Platform Default Emulators */}
      {platforms.length > 0 && installedEmus.length > 0 && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3, background: "linear-gradient(135deg, #1e1e26 0%, #252530 100%)" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <TuneIcon color="primary" />
            <Typography variant="h6">Platform Defaults</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose which emulator to use for each platform. "Auto" uses the first available.
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {platforms.map(([platform, gameCount]) => {
              const compatibleEmus = installedEmus.filter(e => 
                e.supported_platforms.includes(platform.id)
              );
              if (compatibleEmus.length === 0) return null;
              
              const currentDefault = platformDefaults[platform.id] || "";
              
              return (
                <Box key={platform.id} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box sx={{ minWidth: 140 }}>
                    <Typography variant="body2" fontWeight={500}>
                      {platform.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {gameCount} game{gameCount !== 1 ? "s" : ""}
                    </Typography>
                  </Box>
                  <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
                    <InputLabel>Emulator</InputLabel>
                    <Select
                      value={currentDefault}
                      label="Emulator"
                      onChange={(e) => handleSetDefaultEmulator(platform.id, e.target.value)}
                    >
                      <MenuItem value="">
                        <em>Auto (use first available)</em>
                      </MenuItem>
                      {compatibleEmus.map(emu => (
                        <MenuItem key={emu.id} value={emu.id}>
                          {emu.name}
                          {emu.id === "retroarch" && " (+ cores)"}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              );
            })}
          </Box>
        </Paper>
      )}

      {/* Hidden Games Section */}
      <Paper sx={{ p: 3, borderRadius: 3, background: "linear-gradient(135deg, #1e1e26 0%, #252530 100%)" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <VisibilityOffIcon color="primary" />
          <Typography variant="h6">Hidden Games</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          View and restore games that you've hidden from your library.
        </Typography>
        <Button
          variant="outlined"
          startIcon={<VisibilityIcon />}
          onClick={handleOpenHiddenDialog}
        >
          View Hidden Games
        </Button>
      </Paper>

      {/* Hidden Games Dialog */}
      <Dialog
        open={hiddenDialogOpen}
        onClose={() => setHiddenDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <VisibilityOffIcon />
            Hidden Games
          </Box>
        </DialogTitle>
        <DialogContent>
          {hiddenLoading ? (
            <LinearProgress sx={{ my: 2 }} />
          ) : hiddenGames.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
              No hidden games. Games you hide will appear here.
            </Typography>
          ) : (
            <List dense>
              {hiddenGames.map((game) => (
                <ListItem key={game.id}>
                  <ListItemText
                    primary={game.name}
                    secondary={game.platform_id?.toUpperCase()}
                    secondaryTypographyProps={{ fontSize: "0.7rem" }}
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<VisibilityIcon />}
                    onClick={() => handleUnhideGame(game.id)}
                  >
                    Unhide
                  </Button>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHiddenDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
