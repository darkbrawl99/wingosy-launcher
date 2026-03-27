#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]
#![allow(dead_code)]

mod api;
mod commands;
mod config;
mod database;
mod emulators;
mod models;
mod scanner;

use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

fn main() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "wingosy_launcher=info".into()),
        )
        .init();

    tracing::info!("Starting Wingosy Launcher v{}", env!("CARGO_PKG_VERSION"));

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::is_first_run,
            commands::complete_setup,
            commands::get_all_games,
            commands::get_games_filtered,
            commands::get_all_platforms,
            commands::get_platforms_with_games,
            commands::get_recent_games,
            commands::get_favorite_games,
            commands::toggle_favorite,
            commands::launch_game,
            commands::scan_directory,
            commands::get_config,
            commands::save_config,
            commands::connect_romm,
            commands::sync_romm_library,
            commands::detect_emulators,
            commands::get_game_details,
            commands::get_collections,
            commands::search_games,
        ])
        .setup(|_app| {
            let db = database::Database::open()
                .expect("Failed to open database");

            if db.get_all_platforms().unwrap_or_default().is_empty() {
                db.initialize_default_platforms()
                    .expect("Failed to initialize platforms");
                db.initialize_default_collections()
                    .expect("Failed to initialize collections");
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
