import { useCallback, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { alpha, useTheme } from "@mui/material/styles";
import RemoveIcon from "@mui/icons-material/Remove";
import CropSquareIcon from "@mui/icons-material/CropSquare";
import CloseIcon from "@mui/icons-material/Close";
import { appWindow } from "@tauri-apps/api/window";
import { isTauri, tauriDragRegionProps, tauriDragRegionSx, tauriNoDragProps, tauriNoDragSx } from "../utils/isTauri";

const CHROME_HEIGHT = 40;

/**
 * Frameless-window top bar: drag region + window controls (Tauri only).
 * Hidden while OS fullscreen so content can use the full display.
 */
export default function WindowChrome() {
  const theme = useTheme();
  const [fullscreen, setFullscreen] = useState(false);

  const syncFullscreen = useCallback(async () => {
    if (!isTauri()) return;
    try {
      setFullscreen(Boolean(await appWindow.isFullscreen()));
    } catch {
      // web preview / tests
    }
  }, []);

  useEffect(() => {
    if (!isTauri()) return undefined;

    let unlistenResize;
    let cancelled = false;

    (async () => {
      await syncFullscreen();
      try {
        unlistenResize = await appWindow.onResized(() => {
          if (!cancelled) syncFullscreen();
        });
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
      unlistenResize?.();
    };
  }, [syncFullscreen]);

  if (!isTauri() || fullscreen) {
    return null;
  }

  async function minimize() {
    try {
      await appWindow.minimize();
    } catch {
      // ignore
    }
  }

  async function toggleMaximize() {
    try {
      await appWindow.toggleMaximize();
    } catch {
      // ignore
    }
  }

  async function close() {
    try {
      await appWindow.close();
    } catch {
      // ignore
    }
  }

  // Same surface as the app body so the drag strip reads as part of the UI, not a separate bar.
  const chromeBg = theme.palette.background.default;

  return (
    <Box
      data-testid="window-chrome"
      {...tauriDragRegionProps()}
      sx={{
        height: CHROME_HEIGHT,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        pl: 1.25,
        pr: 0.25,
        bgcolor: chromeBg,
        ...tauriDragRegionSx,
      }}
    >
      <Box
        sx={{
          flex: 1,
          height: "100%",
          display: "flex",
          alignItems: "center",
          minWidth: 0,
          cursor: "default",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            letterSpacing: "0.06em",
            color: "text.secondary",
            userSelect: "none",
            ml: 0.5,
          }}
        >
          Wingosy Launcher
        </Typography>
      </Box>
      <Box
        {...tauriNoDragProps()}
        sx={{ display: "flex", alignItems: "center", flexShrink: 0, ...tauriNoDragSx }}
      >
        <Tooltip title="Minimize">
          <IconButton
            {...tauriNoDragProps()}
            size="small"
            onClick={minimize}
            aria-label="Minimize"
            sx={{ borderRadius: 1, color: "text.secondary", ...tauriNoDragSx }}
          >
            <RemoveIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Maximize">
          <IconButton
            {...tauriNoDragProps()}
            size="small"
            onClick={toggleMaximize}
            aria-label="Maximize"
            sx={{ borderRadius: 1, color: "text.secondary", ...tauriNoDragSx }}
          >
            <CropSquareIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Close">
          <IconButton
            {...tauriNoDragProps()}
            size="small"
            onClick={close}
            aria-label="Close"
            sx={{
              borderRadius: 1,
              color: "text.secondary",
              ...tauriNoDragSx,
              "&:hover": {
                bgcolor: alpha(theme.palette.error.main, 0.12),
                color: "error.main",
              },
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
