import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#4a90e2",
      light: "#5a9ee8",
      dark: "#3a7bd4",
    },
    secondary: {
      main: "#8c5cc5",
    },
    background: {
      default: "#14141a",
      paper: "#1e1e26",
    },
    success: {
      main: "#4cc06a",
    },
    warning: {
      main: "#f0c040",
    },
    error: {
      main: "#e55a5a",
    },
    text: {
      primary: "#f0f0f0",
      secondary: "#b0b0b8",
    },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: "none",
          backgroundColor: "#1a1a22",
        },
      },
    },
  },
});

export default theme;
