mod api;
mod config;
mod database;
mod emulators;
mod models;
mod scanner;
mod ui;

use anyhow::Result;
use iced::{Application, Settings};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::ui::App;

fn main() -> Result<()> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    tracing::info!("Starting Wingosy Launcher v{}", env!("CARGO_PKG_VERSION"));

    App::run(Settings {
        window: iced::window::Settings {
            size: iced::Size::new(1280.0, 720.0),
            min_size: Some(iced::Size::new(800.0, 600.0)),
            ..Default::default()
        },
        antialiasing: true,
        ..Default::default()
    })?;

    Ok(())
}
