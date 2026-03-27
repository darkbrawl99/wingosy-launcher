import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import FavoriteIcon from "@mui/icons-material/Favorite";
import SettingsIcon from "@mui/icons-material/Settings";
import VideogameAssetIcon from "@mui/icons-material/VideogameAsset";
import HomeIcon from "@mui/icons-material/Home";

const PLATFORM_ICONS = {
  nes: "🎮", snes: "🎮", n64: "🎮", gc: "🎮", wii: "🎮",
  wiiu: "🎮", switch: "🎮", gb: "🕹️", gbc: "🕹️", gba: "🕹️",
  nds: "🕹️", "3ds": "🕹️", psx: "🎮", ps2: "🎮", ps3: "🎮",
  psp: "🕹️", genesis: "🎮", dreamcast: "🎮", xbox: "🎮",
  xbox360: "🎮", arcade: "🕹️", pc: "🖥️",
};

export default function Sidebar({
  platforms,
  selectedPlatform,
  onSelectPlatform,
  onNavigate,
  currentView,
  drawerWidth,
}) {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        },
      }}
    >
      <Box sx={{ p: 2.5, pb: 1 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 800,
            background: "linear-gradient(135deg, #4a90e2 0%, #8c5cc5 100%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-0.5px",
          }}
        >
          Wingosy
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Game Launcher
        </Typography>
      </Box>

      <Divider sx={{ mx: 2, my: 1 }} />

      <List sx={{ px: 1 }}>
        <ListItemButton
          selected={currentView === "library" && !selectedPlatform}
          onClick={() => onSelectPlatform(null)}
          sx={{ borderRadius: 2, mb: 0.5 }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <HomeIcon />
          </ListItemIcon>
          <ListItemText primary="All Games" />
        </ListItemButton>

        <ListItemButton
          onClick={() => {
            onSelectPlatform(null);
            onNavigate("library");
          }}
          sx={{ borderRadius: 2, mb: 0.5 }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <FavoriteIcon color="error" />
          </ListItemIcon>
          <ListItemText primary="Favorites" />
        </ListItemButton>
      </List>

      <Divider sx={{ mx: 2, my: 1 }} />

      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ px: 2.5, py: 0.5 }}
      >
        Platforms
      </Typography>

      <List
        sx={{
          px: 1,
          flex: 1,
          overflow: "auto",
          "&::-webkit-scrollbar": { width: 4 },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: "rgba(255,255,255,0.1)",
            borderRadius: 2,
          },
        }}
      >
        {platforms.map(([platform, count]) => (
          <ListItemButton
            key={platform.id}
            selected={selectedPlatform === platform.id}
            onClick={() => onSelectPlatform(platform.id)}
            sx={{ borderRadius: 2, mb: 0.25, py: 0.75 }}
          >
            <ListItemIcon sx={{ minWidth: 36, fontSize: "1.1rem" }}>
              {PLATFORM_ICONS[platform.id] || "🎮"}
            </ListItemIcon>
            <ListItemText
              primary={platform.short_name || platform.name}
              primaryTypographyProps={{ fontSize: "0.875rem" }}
            />
            <Typography variant="caption" color="text.secondary">
              {count}
            </Typography>
          </ListItemButton>
        ))}
      </List>

      <Divider sx={{ mx: 2 }} />

      <List sx={{ px: 1, pb: 1 }}>
        <ListItemButton
          selected={currentView === "settings"}
          onClick={() => onNavigate("settings")}
          sx={{ borderRadius: 2 }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText primary="Settings" />
        </ListItemButton>
      </List>
    </Drawer>
  );
}
