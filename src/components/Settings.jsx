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
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloudIcon from "@mui/icons-material/Cloud";
import FolderIcon from "@mui/icons-material/Folder";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { invoke } from "@tauri-apps/api/tauri";
import { open } from "@tauri-apps/api/dialog";
import normalizeUrl from "../utils/normalizeUrl";

export default function Settings({ onBack, rommToken, rommUrl: rommUrlProp, onRommConnect }) {
  const [config, setConfig] = useState(null);
  const [rommUrl, setRommUrl] = useState(rommUrlProp || "");
  const [rommUsername, setRommUsername] = useState("");
  const [rommPassword, setRommPassword] = useState("");
  const [rommStatus, setRommStatus] = useState(null);
  const [detectedEmulators, setDetectedEmulators] = useState([]);
  const [scanMessage, setScanMessage] = useState(null);

  useEffect(() => {
    loadConfig();
    detectEmulators();
  }, []);

  async function loadConfig() {
    try {
      const cfg = await invoke("get_config");
      setConfig(cfg);
      if (!rommUrlProp) {
        setRommUrl(cfg.romm?.server_url || "");
      }
      setRommUsername(cfg.romm?.username || "");
    } catch (err) {
      console.error("Failed to load config:", err);
    }
  }

  async function detectEmulators() {
    try {
      const emulators = await invoke("detect_emulators");
      setDetectedEmulators(emulators);
    } catch (err) {
      console.error("Failed to detect emulators:", err);
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
      setRommStatus({
        type: "error",
        message: err.message || String(err),
      });
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
          serverUrl: normalizedUrl,
          username: rommUsername,
          password: rommPassword,
        });
        onRommConnect(normalizedUrl, token);
      }

      const games = await invoke("sync_romm_library", {
        serverUrl: normalizedUrl,
        token: rommToken || "re-auth",
      });
      setRommStatus({
        type: "success",
        message: `Synced ${games.length} games from RomM!`,
      });
    } catch (err) {
      setRommStatus({
        type: "error",
        message: err.message || String(err),
      });
    }
  }

  async function handleScanDirectory() {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected) {
        setScanMessage({ type: "info", message: "Scanning..." });
        const games = await invoke("scan_directory", {
          path: selected,
          recursive: true,
        });
        setScanMessage({
          type: "success",
          message: `Found ${games.length} games!`,
        });
      }
    } catch (err) {
      setScanMessage({
        type: "error",
        message: err.message || String(err),
      });
    }
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: "auto" }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={onBack}
        sx={{ mb: 2 }}
        color="inherit"
      >
        Back
      </Button>

      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      {/* RomM Connection */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <CloudIcon color="primary" />
          <Typography variant="h6">RomM Server</Typography>
          {rommToken && (
            <CheckCircleIcon color="success" fontSize="small" sx={{ ml: 1 }} />
          )}
        </Box>

        <TextField
          fullWidth
          label="Server URL"
          placeholder="romm.example.com or 192.168.1.2:3000"
          value={rommUrl}
          onChange={(e) => setRommUrl(e.target.value)}
          sx={{ mb: 2 }}
          size="small"
        />
        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <TextField
            label="Username"
            value={rommUsername}
            onChange={(e) => setRommUsername(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
          />
          <TextField
            label="Password"
            type="password"
            value={rommPassword}
            onChange={(e) => setRommPassword(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
          />
        </Box>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button variant="contained" onClick={handleConnectRomM}>
            Connect
          </Button>
          <Button
            variant="outlined"
            onClick={handleSyncRomM}
            disabled={!rommUrl || !rommToken}
          >
            Sync Library
          </Button>
        </Box>
        {rommStatus && (
          <Alert severity={rommStatus.type} sx={{ mt: 2 }}>
            {rommStatus.message}
          </Alert>
        )}
      </Paper>

      {/* Library */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <FolderIcon color="primary" />
          <Typography variant="h6">Library</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select a folder containing your ROM files to scan and add to your
          library.
        </Typography>
        <Button variant="outlined" onClick={handleScanDirectory}>
          Scan ROM Directory
        </Button>
        {scanMessage && (
          <Alert severity={scanMessage.type} sx={{ mt: 2 }}>
            {scanMessage.message}
          </Alert>
        )}
      </Paper>

      {/* Detected Emulators */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <SportsEsportsIcon color="primary" />
          <Typography variant="h6">Detected Emulators</Typography>
        </Box>
        {detectedEmulators.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No emulators detected. Install emulators and click refresh.
          </Typography>
        ) : (
          <List dense>
            {detectedEmulators.map((emu) => (
              <ListItem key={emu.id}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <CheckCircleIcon color="success" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={emu.name}
                  secondary={emu.path}
                  secondaryTypographyProps={{ fontSize: "0.75rem" }}
                />
              </ListItem>
            ))}
          </List>
        )}
        <Button
          variant="outlined"
          size="small"
          onClick={detectEmulators}
          sx={{ mt: 1 }}
        >
          Refresh
        </Button>
      </Paper>
    </Box>
  );
}
