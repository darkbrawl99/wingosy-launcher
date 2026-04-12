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
import ListItemButton from "@mui/material/ListItemButton";
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
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Select from "@mui/material/Select";
import Slider from "@mui/material/Slider";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import RadioGroup from "@mui/material/RadioGroup";
import Radio from "@mui/material/Radio";
import InputLabel from "@mui/material/InputLabel";
import TuneIcon from "@mui/icons-material/Tune";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import LockIcon from "@mui/icons-material/Lock";
import PaletteIcon from "@mui/icons-material/Palette";
import DesktopWindowsIcon from "@mui/icons-material/DesktopWindows";
import SystemUpdateIcon from "@mui/icons-material/SystemUpdate";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { invoke } from "@tauri-apps/api/tauri";
import { open as shellOpen } from "@tauri-apps/api/shell";
import { useAppTheme } from "../ThemeContext";
import { useUiSounds } from "../UiSoundsContext";
import AccentHueSlider from "./AccentHueSlider";
import { open } from "@tauri-apps/api/dialog";
import normalizeUrl from "../utils/normalizeUrl";
import { tauriDragRegionProps, tauriDragRegionSx, tauriNoDragProps, tauriNoDragSx } from "../utils/isTauri";

/** Full-width cards in the scroll column (avoids uneven widths after flex/scroll changes). */
const SETTINGS_CARD_SX = {
  p: 3,
  mb: 3,
  borderRadius: 3,
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
};
const SETTINGS_CARD_GRADIENT_SX = {
  ...SETTINGS_CARD_SX,
  background: "linear-gradient(135deg, #1e1e26 0%, #252530 100%)",
};

const SETTINGS_SECTIONS = [
  { id: "general", label: "General", Icon: DesktopWindowsIcon },
  { id: "appearance", label: "Appearance", Icon: PaletteIcon },
  { id: "sound", label: "Sound", Icon: VolumeUpIcon },
  { id: "romm", label: "RomM", Icon: CloudIcon },
  { id: "library", label: "Library", Icon: FolderIcon },
  { id: "emulators", label: "Emulators", Icon: SportsEsportsIcon },
  { id: "integrations", label: "Integrations", Icon: EmojiEventsIcon },
  { id: "updates", label: "Updates", Icon: SystemUpdateIcon },
];

export default function Settings({ onBack, rommToken, rommUrl: rommUrlProp, onRommConnect, onLibraryChange, onImmersiveModeChange, onFullscreenChange }) {
  const [config, setConfig] = useState(null);
  const [rommUrl, setRommUrl] = useState(rommUrlProp || "");
  const [rommUsername, setRommUsername] = useState("");
  const [rommPassword, setRommPassword] = useState("");
  const [rommDirectToken, setRommDirectToken] = useState("");
  const [rommAuthMode, setRommAuthMode] = useState("password"); // "password" or "token"
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
  
  // UI Mode flags: Desktop (default) vs Immersive mode (`display.big_picture` in config)
  const [immersiveModeEnabled, setImmersiveModeEnabled] = useState(false);
  const [fullscreenEnabled, setFullscreenEnabled] = useState(false);
  const [retroachievementsEnabled, setRetroachievementsEnabled] = useState(false);
  
  // Theme/Appearance settings from context
  const { themeMode, setThemeMode, accentHue, setAccentHue } = useAppTheme();
  const {
    uiSoundsEnabled,
    uiSoundsVolume,
    setUiSoundsEnabled,
    setUiSoundsVolume,
    refreshUiSoundsFromConfig,
  } = useUiSounds();
  const [ambientEnabled, setAmbientEnabled] = useState(false);
  const [ambientVolume, setAmbientVolume] = useState(35);
  const [ambientPath, setAmbientPath] = useState(null);
  const [ambientIsFolder, setAmbientIsFolder] = useState(false);
  const [ambientShuffle, setAmbientShuffle] = useState(false);
  const [settingsSection, setSettingsSection] = useState("general");
  const [appVersion, setAppVersion] = useState("");
  const [checkOnStartup, setCheckOnStartup] = useState(true);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(false);
  const [updateChannel, setUpdateChannel] = useState("stable");
  const [updateCheckLoading, setUpdateCheckLoading] = useState(false);
  const [updateCheckResult, setUpdateCheckResult] = useState(null);
  const [prereleaseLeaveDialogOpen, setPrereleaseLeaveDialogOpen] = useState(false);
  /** Which pre-release channel the user is leaving (`nightly` | `beta`) — drives dialog copy. */
  const [leavingPrereleaseChannel, setLeavingPrereleaseChannel] = useState(null);
  const [pendingChannel, setPendingChannel] = useState("stable");
  const [pendingAutoOff, setPendingAutoOff] = useState(false);

  useEffect(() => {
    loadConfig();
    loadEmulators();
    loadMissingCores();
    loadPlatformDefaults();
    loadPlatforms();
  }, []);

  useEffect(() => {
    invoke("get_app_version")
      .then((v) => setAppVersion(String(v)))
      .catch(() => setAppVersion(""));
  }, []);

  async function loadConfig() {
    try {
      const cfg = await invoke("get_config");
      setConfig(cfg);
      setRommUrl(cfg.romm?.server_url || rommUrlProp || "");
      setRommUsername(cfg.romm?.username || "");
      setRomsDirectory(cfg.library?.roms_directory || "");
      setImmersiveModeEnabled(Boolean(cfg.display?.big_picture));
      setFullscreenEnabled(Boolean(cfg.display?.fullscreen));
      setRetroachievementsEnabled(Boolean(cfg.display?.retroachievements_enabled));
      setCheckOnStartup(cfg.updater?.check_on_startup !== false);
      const auto = Boolean(cfg.updater?.auto_update_enabled);
      setAutoUpdateEnabled(auto);
      let ch = cfg.updater?.channel;
      if (ch !== "nightly" && ch !== "beta") ch = "stable";
      if (!auto) ch = "stable";
      setUpdateChannel(ch);
      const a = cfg.audio || {};
      setAmbientEnabled(Boolean(a.ambient_enabled));
      setAmbientVolume(typeof a.ambient_volume === "number" ? a.ambient_volume : 35);
      setAmbientPath(a.ambient_path || null);
      setAmbientIsFolder(Boolean(a.ambient_is_folder));
      setAmbientShuffle(Boolean(a.ambient_shuffle));
      refreshUiSoundsFromConfig(cfg);
    } catch {}
  }

  async function applyUpdateChannel(nextChannel) {
    try {
      const cfg = config || (await invoke("get_config"));
      cfg.updater = cfg.updater || {};
      cfg.updater.channel = nextChannel;
      await invoke("save_config", { config: cfg });
      setConfig(cfg);
      setUpdateChannel(nextChannel);
    } catch {}
  }

  function requestChannelChange(nextChannel) {
    const leavingPre = updateChannel === "nightly" || updateChannel === "beta";
    if (leavingPre && nextChannel !== updateChannel) {
      setLeavingPrereleaseChannel(updateChannel);
      setPendingChannel(nextChannel);
      setPendingAutoOff(false);
      setPrereleaseLeaveDialogOpen(true);
      return;
    }
    applyUpdateChannel(nextChannel);
  }

  async function confirmPrereleaseLeave() {
    try {
      const cfg = config || (await invoke("get_config"));
      cfg.updater = cfg.updater || {};
      cfg.updater.channel = pendingChannel || "stable";
      if (pendingAutoOff) {
        cfg.updater.auto_update_enabled = false;
        setAutoUpdateEnabled(false);
      }
      await invoke("save_config", { config: cfg });
      setConfig(cfg);
      setUpdateChannel(pendingChannel || "stable");
    } catch {}
    setPrereleaseLeaveDialogOpen(false);
    setLeavingPrereleaseChannel(null);
    setPendingChannel("stable");
    setPendingAutoOff(false);
  }

  function cancelPrereleaseLeave() {
    setPrereleaseLeaveDialogOpen(false);
    setLeavingPrereleaseChannel(null);
    setPendingChannel("stable");
    setPendingAutoOff(false);
  }

  async function persistAutoUpdate(nextAuto) {
    if (!nextAuto && (updateChannel === "nightly" || updateChannel === "beta")) {
      setLeavingPrereleaseChannel(updateChannel);
      setPendingAutoOff(true);
      setPendingChannel("stable");
      setPrereleaseLeaveDialogOpen(true);
      return;
    }
    try {
      const cfg = config || (await invoke("get_config"));
      cfg.updater = cfg.updater || {};
      cfg.updater.auto_update_enabled = nextAuto;
      if (!nextAuto) {
        cfg.updater.channel = "stable";
        setUpdateChannel("stable");
      }
      await invoke("save_config", { config: cfg });
      setConfig(cfg);
      setAutoUpdateEnabled(nextAuto);
    } catch {}
  }

  async function handleCheckForUpdates() {
    setUpdateCheckLoading(true);
    setUpdateCheckResult(null);
    try {
      const r = await invoke("check_for_app_update", { channel: updateChannel });
      setUpdateCheckResult(r);
    } catch (err) {
      setUpdateCheckResult({
        current_version: appVersion,
        error: err?.message || String(err),
        is_update_available: false,
        latest_version: null,
        release_url: null,
        channel: updateChannel,
      });
    } finally {
      setUpdateCheckLoading(false);
    }
  }

  async function persistDisplayFlags(nextImmersive, nextFullscreen) {
    const cfg = config || (await invoke("get_config"));
    cfg.display = cfg.display || {};
    cfg.display.big_picture = Boolean(nextImmersive);
    cfg.display.fullscreen = Boolean(nextFullscreen);
    await invoke("save_config", { config: cfg });
    setConfig(cfg);
  }

  async function persistRetroachievements(next) {
    try {
      const cfg = config || (await invoke("get_config"));
      cfg.display = cfg.display || {};
      cfg.display.retroachievements_enabled = Boolean(next);
      await invoke("save_config", { config: cfg });
      setConfig(cfg);
      setRetroachievementsEnabled(Boolean(next));
    } catch (err) {
      console.error("Failed to save RetroAchievements preference:", err);
    }
  }

  async function persistUiSounds(next) {
    try {
      const cfg = config || (await invoke("get_config"));
      cfg.display = cfg.display || {};
      cfg.display.ui_sounds_enabled = Boolean(next);
      await invoke("save_config", { config: cfg });
      setConfig(cfg);
      setUiSoundsEnabled(Boolean(next));
      refreshUiSoundsFromConfig(cfg);
      onLibraryChange?.();
    } catch {}
  }

  async function persistUiSoundsVolume(vol) {
    try {
      const cfg = config || (await invoke("get_config"));
      cfg.audio = cfg.audio || {};
      cfg.audio.ui_sounds_volume = Math.min(100, Math.max(0, Math.round(vol)));
      await invoke("save_config", { config: cfg });
      setConfig(cfg);
      setUiSoundsVolume(cfg.audio.ui_sounds_volume);
      refreshUiSoundsFromConfig(cfg);
      onLibraryChange?.();
    } catch {}
  }

  async function persistAmbient(partial) {
    try {
      const cfg = config || (await invoke("get_config"));
      cfg.audio = { ...(cfg.audio || {}), ...partial };
      await invoke("save_config", { config: cfg });
      setConfig(cfg);
      const a = cfg.audio || {};
      if (typeof a.ambient_enabled === "boolean") setAmbientEnabled(a.ambient_enabled);
      if (typeof a.ambient_volume === "number") setAmbientVolume(a.ambient_volume);
      if (a.ambient_path === undefined) setAmbientPath(null);
      else if (a.ambient_path === null) setAmbientPath(null);
      else setAmbientPath(a.ambient_path);
      if (typeof a.ambient_is_folder === "boolean") setAmbientIsFolder(a.ambient_is_folder);
      if (typeof a.ambient_shuffle === "boolean") setAmbientShuffle(a.ambient_shuffle);
      refreshUiSoundsFromConfig(cfg);
      onLibraryChange?.();
    } catch {}
  }

  async function pickAmbientFile() {
    try {
      const sel = await open({
        multiple: false,
        filters: [{ name: "Audio", extensions: ["mp3", "ogg", "wav", "flac", "m4a", "opus"] }],
      });
      if (typeof sel !== "string" || !sel) return;
      await persistAmbient({
        ambient_path: sel,
        ambient_is_folder: false,
      });
    } catch {}
  }

  async function pickAmbientFolder() {
    try {
      const sel = await open({ directory: true, multiple: false });
      if (typeof sel !== "string" || !sel) return;
      await persistAmbient({
        ambient_path: sel,
        ambient_is_folder: true,
      });
    } catch {}
  }

  async function clearAmbientSource() {
    await persistAmbient({
      ambient_path: null,
      ambient_is_folder: false,
      ambient_shuffle: false,
      ambient_enabled: false,
    });
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
      
      let token;
      if (rommAuthMode === "token") {
        // Connect using direct token (API key / access token)
        token = await invoke("connect_romm_with_token", {
          serverUrl: normalizedUrl,
          token: rommDirectToken.trim(),
        });
      } else {
        // Connect using username/password
        token = await invoke("connect_romm", {
          serverUrl: normalizedUrl,
          username: rommUsername,
          password: rommPassword,
        });
      }
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
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        maxWidth: 1120,
        width: "100%",
        mx: "auto",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        flex: 1,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
          mb: 2,
        }}
      >
        <Button
          {...tauriNoDragProps()}
          data-argosy-sound="back"
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          color="inherit"
          sx={{ ...tauriNoDragSx, flexShrink: 0 }}
        >
          Back
        </Button>
        <Box
          {...tauriDragRegionProps()}
          sx={{
            flex: 1,
            minWidth: 120,
            minHeight: 40,
            display: "flex",
            alignItems: "center",
            ...tauriDragRegionSx,
          }}
        >
          <Typography variant="h4" sx={{ mb: 0 }}>
            Settings
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
          flex: 1,
          minHeight: 0,
          mt: 1,
        }}
      >
        <Paper
          component="nav"
          variant="outlined"
          elevation={0}
          sx={{
            width: { xs: "100%", md: 232 },
            flexShrink: 0,
            borderRadius: 2,
            overflow: "hidden",
            alignSelf: { xs: "stretch", md: "flex-start" },
          }}
        >
          <List disablePadding sx={{ py: 0.5 }}>
            {SETTINGS_SECTIONS.map(({ id, label, Icon }) => (
              <ListItemButton
                key={id}
                selected={settingsSection === id}
                onClick={() => setSettingsSection(id)}
                data-testid={`settings-nav-${id}`}
                sx={{ py: 1.25, px: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Icon fontSize="small" color={settingsSection === id ? "primary" : "action"} />
                </ListItemIcon>
                <ListItemText
                  primary={label}
                  primaryTypographyProps={{
                    variant: "body2",
                    fontWeight: settingsSection === id ? 600 : 400,
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            overscrollBehavior: "contain",
          }}
        >
      {settingsSection === "general" && (
      <Paper sx={SETTINGS_CARD_SX}>
        <Typography variant="h6" gutterBottom>UI</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Switch between desktop (default) and Immersive mode — a large-type, controller-friendly layout aligned with the Wingosy look. Optional OS fullscreen is ideal for couch play.
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Box data-testid="immersive-mode-row">
            <FormControlLabel
              control={
                <Switch
                  inputProps={{ "data-testid": "immersive-mode-switch" }}
                  checked={immersiveModeEnabled}
                  onChange={async (e) => {
                    const next = e.target.checked;
                    setImmersiveModeEnabled(next);
                    // When enabling Immersive mode, default fullscreen on.
                    const nextFs = next ? true : fullscreenEnabled;
                    if (next) setFullscreenEnabled(nextFs);
                    await persistDisplayFlags(next, nextFs);
                    if (onImmersiveModeChange) {
                      onImmersiveModeChange(next);
                    } else if (next && onLibraryChange) {
                      // Fallback: trigger library refresh so App.jsx picks up the new display flags
                      onLibraryChange();
                    }
                  }}
                />
              }
              label="Immersive mode"
            />
          </Box>
          <FormControlLabel
            control={
              <Switch
                inputProps={{ "data-testid": "immersive-fullscreen-switch" }}
                checked={fullscreenEnabled}
                disabled={!immersiveModeEnabled}
                onChange={async (e) => {
                  const nextFs = e.target.checked;
                  setFullscreenEnabled(nextFs);
                  await persistDisplayFlags(immersiveModeEnabled, nextFs);
                  if (onFullscreenChange) {
                    onFullscreenChange(nextFs);
                  }
                }}
              />
            }
            label="Fullscreen (Immersive)"
          />
          <Typography variant="caption" color="text.secondary">
            Tip: F11 toggles fullscreen. From the Immersive library, Esc exits to desktop.
          </Typography>
        </Box>
      </Paper>
      )}

      {settingsSection === "appearance" && (
      <Paper sx={SETTINGS_CARD_SX}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <PaletteIcon color="primary" />
          <Typography variant="h6">Appearance</Typography>
        </Box>
        
        {/* Theme Mode */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Theme
        </Typography>
        <ToggleButtonGroup
          value={themeMode}
          exclusive
          onChange={async (e, newMode) => {
            if (!newMode) return;
            setThemeMode(newMode);
            try {
              const cfg = await invoke("get_config");
              cfg.display = cfg.display || {};
              cfg.display.theme_mode = newMode;
              await invoke("save_config", { config: cfg });
            } catch (err) {
              console.error("Failed to save theme mode:", err);
            }
          }}
          size="small"
          sx={{ mb: 3 }}
        >
          <ToggleButton value="system" sx={{ px: 2 }}>System</ToggleButton>
          <ToggleButton value="light" sx={{ px: 2 }}>Light</ToggleButton>
          <ToggleButton value="dark" sx={{ px: 2 }}>Dark</ToggleButton>
        </ToggleButtonGroup>
        
        {/* Accent Color */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Accent Color
        </Typography>
        <AccentHueSlider accentHue={accentHue} setAccentHue={setAccentHue} />
      </Paper>
      )}

      {settingsSection === "sound" && (
      <Paper sx={SETTINGS_CARD_SX}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <VolumeUpIcon color="primary" />
          <Typography variant="h6">Sound (Immersive)</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          UI feedback and background music apply only while Immersive mode is active (not on the desktop shell).
        </Typography>

        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          UI sounds
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          Argosy-style taps and navigation (bundled clips).
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={uiSoundsEnabled}
              onChange={async (e) => {
                await persistUiSounds(e.target.checked);
              }}
            />
          }
          label="Enable UI sounds"
        />
        <Box sx={{ px: 1, mt: 1, mb: 2, maxWidth: 400 }}>
          <Typography variant="caption" color="text.secondary">
            Volume
          </Typography>
          <Slider
            size="small"
            disabled={!uiSoundsEnabled}
            value={uiSoundsVolume}
            min={0}
            max={100}
            valueLabelDisplay="auto"
            onChange={(_, v) => setUiSoundsVolume(v)}
            onChangeCommitted={(_, v) => persistUiSoundsVolume(v)}
          />
        </Box>

        <Typography variant="subtitle2" sx={{ mb: 0.5, mt: 1 }}>
          Background music
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          Optional looping track or shuffled folder playback while browsing in Immersive mode.
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={ambientEnabled}
              onChange={async (e) => {
                await persistAmbient({ ambient_enabled: e.target.checked });
              }}
              disabled={!ambientPath}
            />
          }
          label="Play background music"
        />
        {!ambientPath ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1, ml: 4.5 }}>
            Choose an audio file or folder below to enable.
          </Typography>
        ) : null}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
          <Button size="small" variant="outlined" onClick={pickAmbientFile}>
            Audio file…
          </Button>
          <Button size="small" variant="outlined" onClick={pickAmbientFolder}>
            Folder…
          </Button>
          {ambientPath ? (
            <Button size="small" color="inherit" onClick={clearAmbientSource}>
              Clear
            </Button>
          ) : null}
        </Box>
        {ambientPath ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontFamily: "monospace", fontSize: "0.75rem", wordBreak: "break-all" }}>
            {ambientIsFolder ? "[Folder] " : "[File] "}
            {ambientPath}
          </Typography>
        ) : null}
        {ambientIsFolder ? (
          <FormControlLabel
            sx={{ mb: 2 }}
            control={
              <Switch
                checked={ambientShuffle}
                onChange={async (e) => {
                  await persistAmbient({ ambient_shuffle: e.target.checked });
                }}
                disabled={!ambientPath}
              />
            }
            label="Shuffle tracks"
          />
        ) : null}
        <Box sx={{ px: 1, maxWidth: 400 }}>
          <Typography variant="caption" color="text.secondary">
            Music volume
          </Typography>
          <Slider
            size="small"
            disabled={!ambientEnabled || !ambientPath}
            value={ambientVolume}
            min={0}
            max={100}
            valueLabelDisplay="auto"
            onChange={(_, v) => setAmbientVolume(v)}
            onChangeCommitted={(_, v) =>
              persistAmbient({ ambient_volume: Math.min(100, Math.max(0, Math.round(v))) })
            }
          />
        </Box>
      </Paper>
      )}

      {settingsSection === "romm" && (
      <Paper sx={SETTINGS_CARD_SX}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <CloudIcon color="primary" />
          <Typography variant="h6">RomM Server</Typography>
          {rommToken && <CheckCircleIcon color="success" fontSize="small" />}
        </Box>
        <TextField fullWidth label="Server URL" placeholder="romm.example.com or 192.168.1.2:3000"
          value={rommUrl} onChange={(e) => setRommUrl(e.target.value)} sx={{ mb: 2 }} size="small" />
        
        {/* Auth mode toggle */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Authentication Method
          </Typography>
          <ToggleButtonGroup
            value={rommAuthMode}
            exclusive
            onChange={(e, newMode) => newMode && setRommAuthMode(newMode)}
            size="small"
            sx={{ mb: 2 }}
          >
            <ToggleButton value="password" sx={{ px: 2 }}>
              <LockIcon sx={{ mr: 1, fontSize: 18 }} />
              Username / Password
            </ToggleButton>
            <ToggleButton value="token" sx={{ px: 2 }}>
              <VpnKeyIcon sx={{ mr: 1, fontSize: 18 }} />
              Access Token
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        
        {rommAuthMode === "password" ? (
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField label="Username" value={rommUsername} onChange={(e) => setRommUsername(e.target.value)} size="small" sx={{ flex: 1 }} />
            <TextField label="Password" type="password" value={rommPassword} onChange={(e) => setRommPassword(e.target.value)} size="small" sx={{ flex: 1 }} />
          </Box>
        ) : (
          <Box sx={{ mb: 2 }}>
            <TextField 
              fullWidth 
              label="Access Token" 
              placeholder="Paste your RomM access token here"
              value={rommDirectToken} 
              onChange={(e) => setRommDirectToken(e.target.value)} 
              size="small"
              type="password"
              helperText="Get your token from RomM web UI → Settings → Access Tokens, or from your OAuth provider"
            />
          </Box>
        )}
        
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button variant="contained" onClick={handleConnectRomM}>Connect</Button>
          <Button variant="outlined" onClick={handleSyncRomM} disabled={!rommUrl}>Sync Library</Button>
        </Box>
        {rommStatus && <Alert severity={rommStatus.type} sx={{ mt: 2 }}>{rommStatus.message}</Alert>}
      </Paper>
      )}

      {settingsSection === "library" && (
      <>
      <Paper sx={SETTINGS_CARD_SX}>
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

      <Paper sx={SETTINGS_CARD_GRADIENT_SX}>
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
      </>
      )}

      {settingsSection === "emulators" && (
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 3,
          width: "100%",
          alignItems: "stretch",
        }}
      >
      <Paper sx={{ ...SETTINGS_CARD_SX, flex: 1, minWidth: 0 }}>
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
                                data-testid="retroarch-core-chip"
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

      {platforms.length > 0 && installedEmus.length > 0 ? (
        <Paper sx={{ ...SETTINGS_CARD_GRADIENT_SX, flex: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <TuneIcon color="primary" />
            <Typography variant="h6">Platform defaults</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose which emulator to use for each platform. &quot;Auto&quot; uses the first available.
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {platforms.map(([platform, gameCount]) => {
              const compatibleEmus = installedEmus.filter(e =>
                e.supported_platforms.includes(platform.id)
              );
              if (compatibleEmus.length === 0) return null;

              const currentDefault = platformDefaults[platform.id] || "";

              return (
                <Box key={platform.id} sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                  <Box sx={{ minWidth: 120 }}>
                    <Typography variant="body2" fontWeight={500}>
                      {platform.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {gameCount} game{gameCount !== 1 ? "s" : ""}
                    </Typography>
                  </Box>
                  <FormControl size="small" sx={{ minWidth: 160, flex: 1 }}>
                    <InputLabel>Emulator</InputLabel>
                    <Select
                      value={currentDefault}
                      label="Emulator"
                      onChange={(e) => handleSetDefaultEmulator(platform.id, e.target.value)}
                    >
                      <MenuItem value="">
                        <em>Auto (use first available)</em>
                      </MenuItem>
                      {compatibleEmus.map((emu) => (
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
      ) : (
        <Paper sx={{ ...SETTINGS_CARD_GRADIENT_SX, flex: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <TuneIcon color="primary" />
            <Typography variant="h6">Platform defaults</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Add games to your library and install at least one emulator to choose a default per platform.
          </Typography>
        </Paper>
      )}
      </Box>
      )}

      {settingsSection === "integrations" && (
      <Paper sx={SETTINGS_CARD_GRADIENT_SX}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <EmojiEventsIcon color="primary" />
          <Typography variant="h6">Integrations</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          App-wide preferences for third-party services. These apply to your whole library, not individual games.
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={retroachievementsEnabled}
              onChange={(e) => persistRetroachievements(e.target.checked)}
            />
          }
          label="Enable RetroAchievements"
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, maxWidth: 520 }}>
          When enabled, Wingosy may connect to RetroAchievements for tracking and display where supported. Full integration is planned for a future release.
        </Typography>
      </Paper>
      )}

      {settingsSection === "updates" && (
      <Paper sx={SETTINGS_CARD_SX}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <SystemUpdateIcon color="primary" />
          <Typography variant="h6">Updates</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Compare this build to GitHub releases on the channel you choose. When an update is available, open the release page to download the installer. Full silent install may be added in a future build; enabling &quot;Automatic updates&quot; saves your preference for when that ships.
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Current version:{" "}
          <Box component="span" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
            {appVersion || "—"}
          </Box>
        </Typography>

        <FormControlLabel
          control={
            <Switch
              checked={autoUpdateEnabled}
              onChange={(e) => persistAutoUpdate(e.target.checked)}
            />
          }
          label="Automatic updates"
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2, ml: 4.5, maxWidth: 560 }}>
          When enabled, you can opt into pre-release channels below. In-app download/install is not active yet; this toggle records your intent for future releases.
        </Typography>

        <FormControl component="fieldset" sx={{ mb: 2 }} variant="standard">
          <FormLabel component="legend">Update channel</FormLabel>
          <RadioGroup
            value={updateChannel}
            onChange={(e) => requestChannelChange(e.target.value)}
          >
            <FormControlLabel value="stable" control={<Radio size="small" />} label="Stable — latest official release" />
            <FormControlLabel
              value="beta"
              control={<Radio size="small" />}
              label='Beta — prerelease builds (tag contains "beta")'
              disabled={!autoUpdateEnabled}
            />
            <FormControlLabel
              value="nightly"
              control={<Radio size="small" />}
              label='Nightly — automated prerelease builds (tag contains "nightly")'
              disabled={!autoUpdateEnabled}
            />
          </RadioGroup>
          {!autoUpdateEnabled && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
              Turn on Automatic updates to use Beta or Nightly.
            </Typography>
          )}
        </FormControl>

        <FormControlLabel
          control={
            <Switch
              checked={checkOnStartup}
              onChange={async (e) => {
                const next = e.target.checked;
                setCheckOnStartup(next);
                try {
                  const cfg = config || (await invoke("get_config"));
                  cfg.updater = cfg.updater || {};
                  cfg.updater.check_on_startup = next;
                  await invoke("save_config", { config: cfg });
                  setConfig(cfg);
                } catch {}
              }}
            />
          }
          label="Check for updates when Wingosy starts (uses your selected channel)"
        />

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
          <Button
            variant="contained"
            startIcon={<SystemUpdateIcon />}
            disabled={updateCheckLoading}
            onClick={handleCheckForUpdates}
            data-testid="check-for-updates-button"
          >
            {updateCheckLoading ? "Checking…" : "Check for updates"}
          </Button>
          <Button
            variant="outlined"
            startIcon={<OpenInNewIcon />}
            onClick={() => shellOpen("https://github.com/yash-1o1/wingosy-launcher/releases")}
          >
            All releases
          </Button>
        </Box>
        {updateCheckLoading && <LinearProgress sx={{ mt: 2, borderRadius: 1 }} />}
        {updateCheckResult?.error && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {updateCheckResult.error}
            {updateCheckResult.channel ? (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Channel: {updateCheckResult.channel}
              </Typography>
            ) : null}
          </Alert>
        )}
        {updateCheckResult && !updateCheckResult.error && updateCheckResult.is_update_available && (
          <Alert
            severity="success"
            sx={{ mt: 2 }}
            action={
              updateCheckResult.release_url ? (
                <Button color="inherit" size="small" onClick={() => shellOpen(updateCheckResult.release_url)}>
                  Open release
                </Button>
              ) : null
            }
          >
            Update available on {updateCheckResult.channel || updateChannel}
            {updateCheckResult.latest_version ? ` (${updateCheckResult.latest_version})` : ""}.
          </Alert>
        )}
        {updateCheckResult && !updateCheckResult.error && !updateCheckResult.is_update_available && (
          <Alert severity="info" sx={{ mt: 2 }}>
            You’re up to date on {updateCheckResult.channel || updateChannel}
            {updateCheckResult.latest_version ? ` (latest: ${updateCheckResult.latest_version})` : ""}.
          </Alert>
        )}
      </Paper>
      )}

        </Box>
      </Box>

      <Dialog open={prereleaseLeaveDialogOpen} onClose={cancelPrereleaseLeave} maxWidth="sm" fullWidth>
        <DialogTitle>
          {pendingAutoOff
            ? "Turn off automatic updates?"
            : leavingPrereleaseChannel === "beta"
              ? "Leave the Beta channel?"
              : "Leave the Nightly channel?"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            {pendingAutoOff ? (
              <>
                You’re on <strong>{leavingPrereleaseChannel === "beta" ? "Beta" : "Nightly"}</strong>. Turning off
                automatic updates moves you to the <strong>Stable</strong> channel. Your next in-app update check will
                follow stable releases until you enable automatic updates and pick a pre-release channel again.
              </>
            ) : (
              <>
                You’re switching away from{" "}
                <strong>{leavingPrereleaseChannel === "beta" ? "Beta" : "Nightly"}</strong>. Your update checks will
                follow the <strong>{pendingChannel === "stable" ? "Stable" : pendingChannel === "beta" ? "Beta" : "Nightly"}</strong>{" "}
                channel.
              </>
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {(pendingAutoOff || pendingChannel === "stable") && (
              <>
                On <strong>Stable</strong>, in-app updates follow regular releases.{" "}
              </>
            )}
            If you want the <strong>latest stable build immediately</strong> (for example, to leave beta or nightly sooner
            than the next stable release), download and install it manually from{" "}
            <Box component="span" sx={{ fontWeight: 600 }}>GitHub Releases</Box> — the app does not downgrade by itself.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelPrereleaseLeave}>Cancel</Button>
          <Button variant="contained" onClick={confirmPrereleaseLeave}>
            {pendingAutoOff ? "Turn off & use Stable" : "Continue"}
          </Button>
        </DialogActions>
      </Dialog>

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
