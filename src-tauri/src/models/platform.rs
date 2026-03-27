use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Platform {
    pub id: String,
    pub name: String,
    pub short_name: Option<String>,
    pub extensions: Vec<String>,
    pub logo_path: Option<String>,
    pub sort_order: i32,
}

impl Platform {
    pub fn new(id: impl Into<String>, name: impl Into<String>, extensions: Vec<&str>) -> Self {
        Self {
            id: id.into(),
            name: name.into(),
            short_name: None,
            extensions: extensions.into_iter().map(String::from).collect(),
            logo_path: None,
            sort_order: 0,
        }
    }
}

pub fn default_platforms() -> Vec<Platform> {
    vec![
        Platform::new("nes", "Nintendo Entertainment System", vec![".nes", ".unf", ".unif"]),
        Platform::new("snes", "Super Nintendo", vec![".sfc", ".smc"]),
        Platform::new("n64", "Nintendo 64", vec![".n64", ".z64", ".v64"]),
        Platform::new("gc", "Nintendo GameCube", vec![".iso", ".gcm", ".gcz", ".rvz"]),
        Platform::new("wii", "Nintendo Wii", vec![".iso", ".wbfs", ".rvz"]),
        Platform::new("wiiu", "Nintendo Wii U", vec![".wud", ".wux", ".rpx"]),
        Platform::new("switch", "Nintendo Switch", vec![".nsp", ".xci", ".nsz"]),
        Platform::new("gb", "Game Boy", vec![".gb"]),
        Platform::new("gbc", "Game Boy Color", vec![".gbc"]),
        Platform::new("gba", "Game Boy Advance", vec![".gba"]),
        Platform::new("nds", "Nintendo DS", vec![".nds"]),
        Platform::new("3ds", "Nintendo 3DS", vec![".3ds", ".cia", ".cci", ".cxi"]),
        Platform::new("psx", "PlayStation", vec![".bin", ".cue", ".iso", ".chd", ".pbp"]),
        Platform::new("ps2", "PlayStation 2", vec![".iso", ".bin", ".chd"]),
        Platform::new("ps3", "PlayStation 3", vec![".iso", ".pkg"]),
        Platform::new("psp", "PlayStation Portable", vec![".iso", ".cso", ".pbp"]),
        Platform::new("psvita", "PlayStation Vita", vec![".vpk"]),
        Platform::new("genesis", "Sega Genesis", vec![".md", ".gen", ".bin", ".smd"]),
        Platform::new("saturn", "Sega Saturn", vec![".iso", ".bin", ".cue", ".chd"]),
        Platform::new("dreamcast", "Sega Dreamcast", vec![".gdi", ".cdi", ".chd"]),
        Platform::new("xbox", "Xbox", vec![".iso", ".xiso"]),
        Platform::new("xbox360", "Xbox 360", vec![".iso", ".xex"]),
        Platform::new("arcade", "Arcade", vec![".zip"]),
        Platform::new("pc", "PC Games", vec![".exe"]),
    ]
}

pub fn detect_platform_by_extension(ext: &str) -> Option<String> {
    let ext_lower = ext.to_lowercase();
    for platform in default_platforms() {
        if platform.extensions.iter().any(|e| e == &ext_lower) {
            return Some(platform.id);
        }
    }
    None
}
