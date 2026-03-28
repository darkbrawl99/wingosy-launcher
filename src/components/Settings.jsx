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
import ListItemSecondaryAction from "@mui/material/ListItemSecondaryAction";
import LinearProgress from "@mui/material/LinearProgress";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
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
import { invoke } from "@tauri-apps/api/tauri";
import { open } from "@tauri-apps/api/dialog";
import normalizeUrl from "../utils/normalizeUrl";

export default function Settings({ onBack, rommToken, rommUrl: rommUrlProp, onRommConnect }) {
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

  useEffect(() => {
    loadConfig();
    loadEmulators();
    loadMissingCores();
  }, []);

  async function loadConfig() {
    try {
      const cfg = await invoke("get_config");
      setConfig(cfg);
      setRommUrl(cfg.romm?.server_url || rommUrlProp || "");
      setRommUsername(cfg.romm?.username || "");
    } catch {}
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
    } catch (err) {
      setRommStatus({ type: "error", message: err.message || String(err) });
    }
  }

  async function handleScanDirectory() {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected) {
        setScanMessage({ type: "info", message: "Scanning..." });
        const games = await invoke("scan_directory", { path: selected, recursive: true });
        setScanMessage({ type: "success", message: `Found ${games.length} games!` });
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
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select a folder containing your ROM files to scan.
        </Typography>
        <Button variant="outlined" onClick={handleScanDirectory}>Scan ROM Directory</Button>
        {scanMessage && <Alert severity={scanMessage.type} sx={{ mt: 2 }}>{scanMessage.message}</Alert>}
      </Paper>

      {/* Emulators */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <SportsEsportsIcon color="primary" />
            <Typography variant="h6">Emulators</Typography>
            <Chip label={`${installedEmus.length} installed`} size="small" color="success" variant="outlined" />
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Tooltip title="Auto-apply detected paths to config">
              <Button size="small" variant="outlined" onClick={handleApplyPaths}>
                Apply Paths
              </Button>
            </Tooltip>
            <Tooltip title="Re-scan for emulators">
              <IconButton size="small" onClick={loadEmulators}><RefreshIcon /></IconButton>
            </Tooltip>
          </Box>
        </Box>

        {emuMessage && <Alert severity={emuMessage.type} onClose={() => setEmuMessage(null)} sx={{ mb: 2 }}>{emuMessage.message}</Alert>}
        {downloadingEmu && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

        {installedEmus.length > 0 && (
          <>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Installed</Typography>
            <List dense>
              {installedEmus.map((emu) => (
                <ListItem key={emu.id} sx={{ borderRadius: 2, mb: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <CheckCircleIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={emu.name}
                    secondary={emu.installed_path}
                    secondaryTypographyProps={{ fontSize: "0.7rem", noWrap: true }}
                  />
                  <Chip label={emu.supported_platforms.join(", ").toUpperCase()} size="small" variant="outlined"
                    sx={{ fontSize: "0.6rem", maxWidth: 200 }} />
                </ListItem>
              ))}
            </List>
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
      </Paper>

      {/* RetroArch Cores */}
      {missingCores.length > 0 && (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <MemoryIcon color="primary" />
            <Typography variant="h6">RetroArch Cores</Typography>
            <Chip label={`${missingCores.length} missing`} size="small" color="warning" variant="outlined" />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            These cores are needed for your game library but aren't installed yet.
          </Typography>
          {downloadingCore && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
          <List dense>
            {missingCores.map((core) => (
              <ListItem key={core.core_filename} sx={{ borderRadius: 2, mb: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <MemoryIcon color="warning" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={core.core_filename.replace("_libretro.dll", "")}
                  secondary={core.platform_name}
                  secondaryTypographyProps={{ fontSize: "0.7rem" }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleDownloadCore(core.core_filename)}
                  disabled={downloadingCore !== null}
                >
                  {downloadingCore === core.core_filename ? "Installing..." : "Download"}
                </Button>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
}
