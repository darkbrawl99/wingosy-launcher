import React from "react";
import ReactDOM from "react-dom/client";
import "./tauri-drag.css";
import "./iconifySetup";
import App from "./App";
import { AppThemeProvider } from "./ThemeContext";
import { RomDownloadsProvider } from "./RomDownloadsContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppThemeProvider>
      <RomDownloadsProvider>
        <App />
      </RomDownloadsProvider>
    </AppThemeProvider>
  </React.StrictMode>
);
