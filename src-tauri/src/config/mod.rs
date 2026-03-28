use anyhow::{Context, Result};
use directories::ProjectDirs;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub romm: RomMConfig,
    pub library: LibraryConfig,
    pub display: DisplayConfig,
    pub emulators: EmulatorPaths,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            romm: RomMConfig::default(),
            library: LibraryConfig::default(),
            display: DisplayConfig::default(),
            emulators: EmulatorPaths::default(),
        }
    }
}

impl AppConfig {
    pub fn load() -> Result<Self> {
        let config_path = Self::config_path()?;

        if config_path.exists() {
            let contents = std::fs::read_to_string(&config_path)
                .context("Failed to read config file")?;
            toml::from_str(&contents).context("Failed to parse config file")
        } else {
            Ok(Self::default())
        }
    }

    pub fn save(&self) -> Result<()> {
        let config_path = Self::config_path()?;

        if let Some(parent) = config_path.parent() {
            std::fs::create_dir_all(parent).context("Failed to create config directory")?;
        }

        let contents = toml::to_string_pretty(self).context("Failed to serialize config")?;
        std::fs::write(&config_path, contents).context("Failed to write config file")?;

        Ok(())
    }

    pub fn config_path() -> Result<PathBuf> {
        let proj_dirs = ProjectDirs::from("com", "wingosy", "launcher")
            .context("Failed to determine config directory")?;

        Ok(proj_dirs.config_dir().join("config.toml"))
    }

    pub fn data_dir() -> Result<PathBuf> {
        let proj_dirs = ProjectDirs::from("com", "wingosy", "launcher")
            .context("Failed to determine data directory")?;

        Ok(proj_dirs.data_dir().to_path_buf())
    }

    pub fn cache_dir() -> Result<PathBuf> {
        let proj_dirs = ProjectDirs::from("com", "wingosy", "launcher")
            .context("Failed to determine cache directory")?;

        Ok(proj_dirs.cache_dir().to_path_buf())
    }

    pub fn covers_dir() -> Result<PathBuf> {
        Ok(Self::cache_dir()?.join("covers"))
    }

    pub fn saves_dir() -> Result<PathBuf> {
        Ok(Self::data_dir()?.join("saves"))
    }

    pub fn downloads_dir() -> Result<PathBuf> {
        Ok(Self::data_dir()?.join("downloads"))
    }

    pub fn emulators_dir() -> Result<PathBuf> {
        Ok(Self::data_dir()?.join("emulators"))
    }

    pub fn roms_dir(&self) -> PathBuf {
        self.library.roms_directory.clone().unwrap_or_else(|| {
            Self::data_dir()
                .map(|d| d.join("roms"))
                .unwrap_or_else(|_| PathBuf::from("roms"))
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RomMConfig {
    pub server_url: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub auth_token: Option<String>,
    pub auto_sync: bool,
    pub sync_saves: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LibraryConfig {
    pub roms_directory: Option<PathBuf>,
    pub scan_subdirectories: bool,
    pub auto_extract_archives: bool,
    pub show_hidden_games: bool,
}

impl Default for LibraryConfig {
    fn default() -> Self {
        Self {
            roms_directory: None,
            scan_subdirectories: true,
            auto_extract_archives: true,
            show_hidden_games: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisplayConfig {
    pub theme: Theme,
    pub grid_columns: u8,
    pub show_platform_icons: bool,
    pub show_play_time: bool,
    pub cover_aspect_ratio: CoverAspectRatio,
}

impl Default for DisplayConfig {
    fn default() -> Self {
        Self {
            theme: Theme::Dark,
            grid_columns: 5,
            show_platform_icons: true,
            show_play_time: true,
            cover_aspect_ratio: CoverAspectRatio::Vertical,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum Theme {
    Light,
    #[default]
    Dark,
    System,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum CoverAspectRatio {
    #[default]
    Vertical,
    Square,
    Horizontal,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct EmulatorPaths {
    pub retroarch: Option<PathBuf>,
    pub dolphin: Option<PathBuf>,
    pub pcsx2: Option<PathBuf>,
    pub rpcs3: Option<PathBuf>,
    pub ppsspp: Option<PathBuf>,
    pub duckstation: Option<PathBuf>,
    pub cemu: Option<PathBuf>,
    pub yuzu: Option<PathBuf>,
    pub ryujinx: Option<PathBuf>,
    pub citra: Option<PathBuf>,
    pub melonds: Option<PathBuf>,
    pub mgba: Option<PathBuf>,
    pub flycast: Option<PathBuf>,
    pub xemu: Option<PathBuf>,
    pub xenia: Option<PathBuf>,
    pub mame: Option<PathBuf>,
}
