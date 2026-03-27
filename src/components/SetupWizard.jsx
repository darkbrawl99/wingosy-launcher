import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Paper from "@mui/material/Paper";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Alert from "@mui/material/Alert";
import LinearProgress from "@mui/material/LinearProgress";
import Fade from "@mui/material/Fade";
import Chip from "@mui/material/Chip";
import CloudIcon from "@mui/icons-material/Cloud";
import FolderIcon from "@mui/icons-material/Folder";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import { invoke } from "@tauri-apps/api/tauri";
import { open } from "@tauri-apps/api/dialog";
import normalizeUrl from "../utils/normalizeUrl";

const STEPS = ["RomM Server", "ROM Folder", "Scan Games"];

export default function SetupWizard({ onComplete }) {
  const [activeStep, setActiveStep] = useState(-1); // -1 = welcome screen
  const [rommUrl, setRommUrl] = useState("");
  const [rommUsername, setRommUsername] = useState("");
  const [rommPassword, setRommPassword] = useState("");
  const [rommStatus, setRommStatus] = useState(null);
  const [rommConnected, setRommConnected] = useState(false);
  const [romsDir, setRomsDir] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleConnectRomM() {
    try {
      setRommStatus(null);
      setError(null);
      const normalizedUrl = normalizeUrl(rommUrl);
      setRommUrl(normalizedUrl);
      await invoke("connect_romm", {
        serverUrl: normalizedUrl,
        username: rommUsername,
        password: rommPassword,
      });
      setRommConnected(true);
      setRommStatus({ type: "success", message: "Connected successfully!" });
    } catch (err) {
      setRommStatus({
        type: "error",
        message: err.message || String(err),
      });
    }
  }

  async function handleSelectFolder() {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected) {
        setRomsDir(selected);
      }
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  async function handleScan() {
    if (!romsDir) return;
    try {
      setScanning(true);
      setScanResult(null);
      setError(null);
      const games = await invoke("scan_directory", {
        path: romsDir,
        recursive: true,
      });

      const platformCounts = {};
      for (const game of games) {
        platformCounts[game.platform_id] =
          (platformCounts[game.platform_id] || 0) + 1;
      }

      setScanResult({ total: games.length, platforms: platformCounts });
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setScanning(false);
    }
  }

  async function handleFinish() {
    try {
      await invoke("complete_setup", {
        rommUrl: rommConnected ? rommUrl : null,
        rommUsername: rommConnected ? rommUsername : null,
        romsDirectory: romsDir || null,
      });
      onComplete();
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  function handleNext() {
    setActiveStep((prev) => prev + 1);
    setError(null);
  }

  function handleBack() {
    setActiveStep((prev) => prev - 1);
    setError(null);
  }

  // Welcome screen
  if (activeStep === -1) {
    return (
      <WizardContainer>
        <Fade in timeout={600}>
          <Box sx={{ textAlign: "center", py: 6 }}>
            <SportsEsportsIcon
              sx={{ fontSize: 80, color: "primary.main", mb: 3 }}
            />
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                mb: 1,
                background:
                  "linear-gradient(135deg, #4a90e2 0%, #8c5cc5 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Wingosy
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ mb: 5, fontWeight: 400 }}
            >
              Your Windows game launcher. Let's get you set up.
            </Typography>
            <Button
              variant="contained"
              size="large"
              endIcon={<ArrowForwardIcon />}
              onClick={handleNext}
              sx={{ px: 5, py: 1.5, fontSize: "1.1rem", borderRadius: 3 }}
            >
              Get Started
            </Button>
          </Box>
        </Fade>
      </WizardContainer>
    );
  }

  return (
    <WizardContainer>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Fade in timeout={400} key={activeStep}>
        <Box>
          {/* Step 1: RomM Server */}
          {activeStep === 0 && (
            <StepPanel
              icon={<CloudIcon sx={{ fontSize: 48, color: "primary.main" }} />}
              title="Connect to RomM Server"
              subtitle="RomM lets you sync your game library from a self-hosted server. This is optional — you can use local files only."
            >
              {!rommConnected ? (
                <>
                  <TextField
                    fullWidth
                    label="Server URL"
                    placeholder="romm.example.com or 192.168.1.2:3000"
                    value={rommUrl}
                    onChange={(e) => setRommUrl(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
                    <TextField
                      label="Username"
                      value={rommUsername}
                      onChange={(e) => setRommUsername(e.target.value)}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Password"
                      type="password"
                      value={rommPassword}
                      onChange={(e) => setRommPassword(e.target.value)}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                  {rommStatus && (
                    <Alert severity={rommStatus.type} sx={{ mb: 2 }}>
                      {rommStatus.message}
                    </Alert>
                  )}
                  <Button
                    variant="contained"
                    onClick={handleConnectRomM}
                    disabled={!rommUrl}
                    sx={{ mr: 2 }}
                  >
                    Connect
                  </Button>
                </>
              ) : (
                <Alert severity="success" icon={<CheckCircleIcon />}>
                  Connected to {rommUrl}
                </Alert>
              )}

              <StepNav
                onBack={handleBack}
                onNext={handleNext}
                onSkip={handleNext}
                showSkip={!rommConnected}
                showBack={false}
                nextLabel={rommConnected ? "Continue" : "Skip"}
              />
            </StepPanel>
          )}

          {/* Step 2: ROM Folder */}
          {activeStep === 1 && (
            <StepPanel
              icon={<FolderIcon sx={{ fontSize: 48, color: "primary.main" }} />}
              title="Select ROM Folder"
              subtitle="Choose the folder where your game files (ROMs) are stored. Wingosy will scan subfolders automatically."
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  mb: 2,
                }}
              >
                <TextField
                  fullWidth
                  label="ROM Directory"
                  value={romsDir}
                  onChange={(e) => setRomsDir(e.target.value)}
                  placeholder="C:\Games\ROMs"
                  InputProps={{ readOnly: true }}
                />
                <Button
                  variant="outlined"
                  onClick={handleSelectFolder}
                  sx={{ whiteSpace: "nowrap", py: 1.8 }}
                >
                  Browse
                </Button>
              </Box>

              {romsDir && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Selected: {romsDir}
                </Alert>
              )}

              <StepNav
                onBack={handleBack}
                onNext={handleNext}
                onSkip={handleNext}
                showSkip={!romsDir}
                nextLabel={romsDir ? "Continue" : "Skip"}
              />
            </StepPanel>
          )}

          {/* Step 3: Scan */}
          {activeStep === 2 && (
            <StepPanel
              icon={<SearchIcon sx={{ fontSize: 48, color: "primary.main" }} />}
              title="Scan for Games"
              subtitle={
                romsDir
                  ? `Ready to scan ${romsDir} for game files.`
                  : "No ROM folder selected. You can scan later from Settings."
              }
            >
              {!scanResult && !scanning && romsDir && (
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<SearchIcon />}
                  onClick={handleScan}
                  sx={{ mb: 3 }}
                >
                  Scan Now
                </Button>
              )}

              {scanning && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Scanning for games...
                  </Typography>
                  <LinearProgress sx={{ borderRadius: 2 }} />
                </Box>
              )}

              {scanResult && (
                <Box sx={{ mb: 3 }}>
                  <Alert
                    severity="success"
                    icon={<CheckCircleIcon />}
                    sx={{ mb: 2 }}
                  >
                    Found {scanResult.total} games!
                  </Alert>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {Object.entries(scanResult.platforms).map(
                      ([platform, count]) => (
                        <Chip
                          key={platform}
                          label={`${platform.toUpperCase()}: ${count}`}
                          variant="outlined"
                          color="primary"
                        />
                      )
                    )}
                  </Box>
                </Box>
              )}

              <StepNav
                onBack={handleBack}
                onNext={handleFinish}
                showSkip={!scanResult && !romsDir}
                onSkip={handleFinish}
                nextLabel={scanResult || !romsDir ? "Finish" : "Skip"}
              />
            </StepPanel>
          )}
        </Box>
      </Fade>
    </WizardContainer>
  );
}

function WizardContainer({ children }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        bgcolor: "background.default",
        p: 3,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          width: "100%",
          maxWidth: 640,
          p: 5,
          borderRadius: 4,
          background: "linear-gradient(180deg, #1e1e26 0%, #232330 100%)",
        }}
      >
        {children}
      </Paper>
    </Box>
  );
}

function StepPanel({ icon, title, subtitle, children }) {
  return (
    <Box>
      <Box sx={{ textAlign: "center", mb: 4 }}>
        {icon}
        <Typography variant="h5" sx={{ mt: 1, fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1, maxWidth: 480, mx: "auto" }}
        >
          {subtitle}
        </Typography>
      </Box>
      {children}
    </Box>
  );
}

function StepNav({
  onBack,
  onNext,
  onSkip,
  showBack = true,
  showSkip = false,
  nextLabel = "Continue",
}) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        mt: 4,
        pt: 3,
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <Box>
        {showBack && (
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={onBack}
            color="inherit"
          >
            Back
          </Button>
        )}
      </Box>
      <Box sx={{ display: "flex", gap: 1 }}>
        {showSkip && (
          <Button
            endIcon={<SkipNextIcon />}
            onClick={onSkip}
            color="inherit"
          >
            Skip
          </Button>
        )}
        {!showSkip && (
          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            onClick={onNext}
          >
            {nextLabel}
          </Button>
        )}
      </Box>
    </Box>
  );
}
