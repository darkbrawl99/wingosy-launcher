import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import { alpha } from "@mui/material/styles";

function Hint({ label, detail }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Box
        sx={(t) => ({
          px: 1,
          py: 0.35,
          borderRadius: 1.25,
          bgcolor: alpha(t.palette.common.white, 0.08),
          border: `1px solid ${alpha(t.palette.common.white, 0.12)}`,
        })}
      >
        <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: "0.03em" }}>
          {label}
        </Typography>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 650 }}>
        {detail}
      </Typography>
    </Stack>
  );
}

export default function ImmersiveHintBar({ view, visible = true }) {
  if (!visible) return null;

  const hints =
    view === "details"
      ? [
          { label: "D-pad / Stick", detail: "Navigate" },
          { label: "A / Enter", detail: "Play" },
          { label: "B / Esc", detail: "Back" },
          { label: "View / H", detail: "Hide help" },
        ]
      : view === "settings"
        ? [
            { label: "D-pad / Stick", detail: "Navigate" },
            { label: "A / Enter", detail: "Select" },
            { label: "B / Esc", detail: "Back" },
            { label: "View / H", detail: "Hide help" },
          ]
        : [
            { label: "D-pad / Stick", detail: "Move" },
            { label: "A / Enter", detail: "Open" },
            { label: "B / Esc", detail: "Exit" },
            { label: "LB/RB", detail: "All / Favorites / Recent" },
            { label: "Menu / S", detail: "Settings" },
            { label: "View / H", detail: "Hide help" },
          ];

  return (
    <Box
      data-testid="immersive-hintbar"
      sx={(t) => ({
        position: "fixed",
        left: 18,
        right: 18,
        bottom: 16,
        zIndex: 2000,
        pointerEvents: "none",
        borderRadius: 3,
        px: 2.25,
        py: 1.4,
        border: `1px solid ${alpha(t.palette.common.white, 0.12)}`,
        bgcolor: alpha(t.palette.background.paper, 0.58),
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        boxShadow: `0 18px 60px ${alpha("#000", 0.52)}`,
      })}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" divider={<Divider flexItem orientation="vertical" sx={{ opacity: 0.16 }} />}>
        {hints.map((h) => (
          <Hint key={`${h.label}-${h.detail}`} label={h.label} detail={h.detail} />
        ))}
      </Stack>
    </Box>
  );
}

