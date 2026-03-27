use serde::Serialize;

use crate::config::AppConfig;
use crate::database::Database;
use crate::emulators::detection::detect_installed_emulators;
use crate::models::*;

#[derive(Debug, Serialize)]
pub struct CommandError {
    pub message: String,
}

impl From<anyhow::Error> for CommandError {
    fn from(err: anyhow::Error) -> Self {
        CommandError {
            message: err.to_string(),
        }
    }
}

type CommandResult<T> = Result<T, CommandError>;

fn get_db() -> CommandResult<Database> {
    Database::open().map_err(|e| e.into())
}

#[tauri::command]
pub fn get_all_games() -> CommandResult<Vec<Game>> {
    let db = get_db()?;
    db.get_all_games().map_err(|e| e.into())
}

#[tauri::command]
pub fn get_games_filtered(
    platform_id: Option<String>,
    search_query: Option<String>,
    favorites_only: bool,
    sort_by: Option<String>,
) -> CommandResult<Vec<Game>> {
    let db = get_db()?;

    let sort = match sort_by.as_deref() {
        Some("last_played") => GameSort::LastPlayed,
        Some("play_count") => GameSort::PlayCount,
        Some("play_time") => GameSort::PlayTime,
        Some("release_year") => GameSort::ReleaseYear,
        Some("recently_added") => GameSort::RecentlyAdded,
        Some("rating") => GameSort::Rating,
        _ => GameSort::Name,
    };

    let filter = GameFilter {
        platform_id,
        genre: None,
        favorites_only,
        search_query,
        sort_by: sort,
        sort_descending: matches!(
            sort,
            GameSort::LastPlayed | GameSort::PlayCount | GameSort::PlayTime | GameSort::RecentlyAdded
        ),
    };

    db.get_games_filtered(&filter).map_err(|e| e.into())
}

#[tauri::command]
pub fn get_all_platforms() -> CommandResult<Vec<Platform>> {
    let db = get_db()?;
    db.get_all_platforms().map_err(|e| e.into())
}

#[tauri::command]
pub fn get_platforms_with_games() -> CommandResult<Vec<(Platform, i32)>> {
    let db = get_db()?;
    db.get_platforms_with_games().map_err(|e| e.into())
}

#[tauri::command]
pub fn get_recent_games(limit: i32) -> CommandResult<Vec<Game>> {
    let db = get_db()?;
    db.get_recent_games(limit).map_err(|e| e.into())
}

#[tauri::command]
pub fn get_favorite_games() -> CommandResult<Vec<Game>> {
    let db = get_db()?;
    db.get_favorite_games().map_err(|e| e.into())
}

#[tauri::command]
pub fn toggle_favorite(game_id: i64) -> CommandResult<bool> {
    let db = get_db()?;
    let game = db
        .get_game(game_id)
        .map_err(CommandError::from)?
        .ok_or_else(|| CommandError {
            message: "Game not found".into(),
        })?;

    let new_state = !game.is_favorite;
    db.set_favorite(game_id, new_state).map_err(CommandError::from)?;
    Ok(new_state)
}

#[tauri::command]
pub fn get_game_details(game_id: i64) -> CommandResult<Option<Game>> {
    let db = get_db()?;
    db.get_game(game_id).map_err(|e| e.into())
}

#[tauri::command]
pub async fn launch_game(game_id: i64) -> CommandResult<String> {
    let db = get_db()?;
    let config = AppConfig::load().unwrap_or_default();

    let game = db
        .get_game(game_id)
        .map_err(CommandError::from)?
        .ok_or_else(|| CommandError {
            message: "Game not found".into(),
        })?;

    let launcher = crate::emulators::EmulatorLauncher::new(config, db);
    let result = launcher.launch(&game).await.map_err(CommandError::from)?;

    match result {
        crate::emulators::LaunchResult::Success {
            duration_minutes, ..
        } => Ok(format!("Played for {} minutes", duration_minutes)),
        other => Err(CommandError {
            message: other.error_message().unwrap_or_else(|| "Unknown error".into()),
        }),
    }
}

#[tauri::command]
pub async fn scan_directory(path: String, recursive: bool) -> CommandResult<Vec<Game>> {
    let db = get_db()?;
    let platforms = db.get_all_platforms().map_err(CommandError::from)?;

    let scanner = crate::scanner::RomScanner::new(platforms);
    let (tx, _rx) = tokio::sync::mpsc::channel(100);

    let scan_path = std::path::PathBuf::from(&path);
    let games = scanner
        .scan(&scan_path, recursive, tx)
        .await
        .map_err(CommandError::from)?;

    for game in &games {
        let _ = db.insert_game(game);
    }

    Ok(games)
}

#[tauri::command]
pub fn get_config() -> CommandResult<AppConfig> {
    AppConfig::load().map_err(|e| e.into())
}

#[tauri::command]
pub fn save_config(config: AppConfig) -> CommandResult<()> {
    config.save().map_err(|e| e.into())
}

#[tauri::command]
pub async fn connect_romm(server_url: String, username: String, password: String) -> CommandResult<bool> {
    let mut client = crate::api::RomMClient::new(&server_url);
    client
        .authenticate(&username, &password)
        .await
        .map_err(CommandError::from)?;
    Ok(true)
}

#[tauri::command]
pub async fn sync_romm_library(server_url: String, token: String) -> CommandResult<Vec<Game>> {
    let client = crate::api::RomMClient::new(&server_url).with_token(token);
    let db = get_db()?;

    let romm_platforms = client.get_platforms().await.map_err(CommandError::from)?;
    let mut all_games = Vec::new();

    for platform in romm_platforms {
        let roms = client
            .get_roms(Some(platform.id), 1000, 0)
            .await
            .map_err(CommandError::from)?;

        for rom in roms.items {
            let game = Game {
                id: 0,
                platform_id: platform.slug.clone(),
                name: rom.name.clone(),
                file_path: rom.file_name.clone(),
                source: GameSource::RomM,
                romm_id: Some(rom.id),
                summary: rom.summary,
                developer: None,
                publisher: None,
                release_year: None,
                genres: rom.genres.unwrap_or_default(),
                player_count: None,
                cover_path: rom.url_cover,
                screenshot_paths: Vec::new(),
                is_favorite: false,
                is_hidden: false,
                user_rating: rom.aggregated_rating,
                last_played_at: None,
                play_count: 0,
                play_time_minutes: 0,
                sync_state: SyncState::RemoteOnly,
                local_file_path: None,
            };

            if db.get_game_by_romm_id(rom.id).map_err(CommandError::from)?.is_none() {
                let _ = db.insert_game(&game);
            }

            all_games.push(game);
        }
    }

    Ok(all_games)
}

#[tauri::command]
pub fn detect_emulators() -> CommandResult<Vec<DetectedEmulatorInfo>> {
    let detected = detect_installed_emulators();
    Ok(detected
        .into_iter()
        .map(|e| DetectedEmulatorInfo {
            id: e.id,
            name: e.name,
            path: e.path.to_string_lossy().to_string(),
        })
        .collect())
}

#[derive(Debug, Serialize)]
pub struct DetectedEmulatorInfo {
    pub id: String,
    pub name: String,
    pub path: String,
}

#[tauri::command]
pub fn get_collections() -> CommandResult<Vec<Collection>> {
    let db = get_db()?;
    db.get_all_collections().map_err(|e| e.into())
}

#[tauri::command]
pub fn search_games(query: String) -> CommandResult<Vec<Game>> {
    let db = get_db()?;
    let filter = GameFilter {
        search_query: Some(query),
        ..Default::default()
    };
    db.get_games_filtered(&filter).map_err(|e| e.into())
}
