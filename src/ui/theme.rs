use iced::Color;

pub struct WingosyTheme {
    pub background: Color,
    pub surface: Color,
    pub surface_light: Color,
    pub primary: Color,
    pub primary_hover: Color,
    pub secondary: Color,
    pub text: Color,
    pub text_secondary: Color,
    pub text_muted: Color,
    pub success: Color,
    pub warning: Color,
    pub error: Color,
    pub border: Color,
}

impl WingosyTheme {
    pub fn dark() -> Self {
        Self {
            background: Color::from_rgb(0.08, 0.08, 0.10),
            surface: Color::from_rgb(0.12, 0.12, 0.14),
            surface_light: Color::from_rgb(0.18, 0.18, 0.20),
            primary: Color::from_rgb(0.29, 0.56, 0.89),
            primary_hover: Color::from_rgb(0.35, 0.62, 0.95),
            secondary: Color::from_rgb(0.55, 0.35, 0.85),
            text: Color::from_rgb(0.95, 0.95, 0.95),
            text_secondary: Color::from_rgb(0.75, 0.75, 0.75),
            text_muted: Color::from_rgb(0.50, 0.50, 0.55),
            success: Color::from_rgb(0.30, 0.75, 0.45),
            warning: Color::from_rgb(0.95, 0.75, 0.25),
            error: Color::from_rgb(0.90, 0.35, 0.35),
            border: Color::from_rgb(0.25, 0.25, 0.28),
        }
    }

    pub fn light() -> Self {
        Self {
            background: Color::from_rgb(0.96, 0.96, 0.98),
            surface: Color::from_rgb(1.0, 1.0, 1.0),
            surface_light: Color::from_rgb(0.98, 0.98, 0.99),
            primary: Color::from_rgb(0.20, 0.45, 0.80),
            primary_hover: Color::from_rgb(0.25, 0.50, 0.85),
            secondary: Color::from_rgb(0.50, 0.30, 0.75),
            text: Color::from_rgb(0.10, 0.10, 0.12),
            text_secondary: Color::from_rgb(0.35, 0.35, 0.40),
            text_muted: Color::from_rgb(0.55, 0.55, 0.60),
            success: Color::from_rgb(0.20, 0.65, 0.35),
            warning: Color::from_rgb(0.85, 0.65, 0.15),
            error: Color::from_rgb(0.80, 0.25, 0.25),
            border: Color::from_rgb(0.85, 0.85, 0.88),
        }
    }
}

pub mod colors {
    use super::*;

    pub const NINTENDO_RED: Color = Color::from_rgb(0.89, 0.12, 0.15);
    pub const PLAYSTATION_BLUE: Color = Color::from_rgb(0.00, 0.32, 0.65);
    pub const SEGA_BLUE: Color = Color::from_rgb(0.00, 0.44, 0.75);
    pub const XBOX_GREEN: Color = Color::from_rgb(0.07, 0.49, 0.04);
    pub const ARCADE_YELLOW: Color = Color::from_rgb(1.00, 0.80, 0.00);
}

pub fn platform_color(platform_id: &str) -> Color {
    match platform_id {
        "nes" | "snes" | "n64" | "gc" | "wii" | "wiiu" | "switch" | "gb" | "gbc" | "gba"
        | "nds" | "3ds" => colors::NINTENDO_RED,
        "psx" | "ps2" | "ps3" | "psp" | "psvita" => colors::PLAYSTATION_BLUE,
        "genesis" | "saturn" | "dreamcast" => colors::SEGA_BLUE,
        "xbox" | "xbox360" => colors::XBOX_GREEN,
        "arcade" => colors::ARCADE_YELLOW,
        _ => WingosyTheme::dark().primary,
    }
}
