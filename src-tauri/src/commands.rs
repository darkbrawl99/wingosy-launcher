use serde::Serialize;
use std::path::PathBuf;

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
pub fn is_first_run() -> CommandResult<bool> {
    let config_path = AppConfig::config_path().map_err(CommandError::from)?;
    Ok(!config_path.exists())
}

#[tauri::command]
pub fn complete_setup(
    romm_url: Option<String>,
    romm_username: Option<String>,
    roms_directory: Option<String>,
) -> CommandResult<()> {
    let mut config = AppConfig::load().unwrap_or_default();

    if let Some(url) = romm_url {
        config.romm.server_url = Some(url);
    }
    if let Some(username) = romm_username {
        config.romm.username = Some(username);
    }
    if let Some(dir) = roms_directory {
        config.library.roms_directory = Some(std::path::PathBuf::from(dir));
    }

    config.save().map_err(|e| e.into())
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
pub async fn connect_romm(server_url: String, username: String, password: String) -> CommandResult<String> {
    let mut client = crate::api::RomMClient::new(&server_url);
    let token_response = client
        .authenticate(&username, &password)
        .await
        .map_err(CommandError::from)?;

    let mut config = AppConfig::load().unwrap_or_default();
    config.romm.server_url = Some(server_url);
    config.romm.username = Some(username);
    config.romm.password = Some(password);
    config.romm.auth_token = Some(token_response.access_token.clone());
    config.save().map_err(CommandError::from)?;

    Ok(token_response.access_token)
}

#[tauri::command]
pub async fn sync_romm_library(server_url: String, _token: String) -> CommandResult<Vec<Game>> {
    let config = AppConfig::load().unwrap_or_default();
    let username = config.romm.username.unwrap_or_default();
    let password = config.romm.password.unwrap_or_default();

    let mut client = crate::api::RomMClient::new(&server_url);
    client.authenticate(&username, &password).await.map_err(CommandError::from)?;

    let db = get_db()?;

    let mut all_games = Vec::new();
    let mut seen_ids = std::collections::HashSet::new();
    let covers_dir = AppConfig::covers_dir().unwrap_or_default();
    std::fs::create_dir_all(&covers_dir).ok();
    let page_size = 100;
    let mut offset = 0;

    loop {
        let roms = client
            .get_roms(None, page_size, offset)
            .await
            .map_err(CommandError::from)?;

        if roms.items.is_empty() {
            break;
        }

        for rom in &roms.items {
            if !seen_ids.insert(rom.id) {
                continue;
            }

            let mapped_platform = map_romm_slug(&rom.platform_slug);
            let release_year = rom.first_release_date().and_then(|ts| {
                chrono::DateTime::from_timestamp(ts, 0)
                    .map(|dt| {
                        use chrono::Datelike;
                        dt.year() as i32
                    })
            }).filter(|&y| y > 0);

            let cover_path = rom.url_cover.as_ref().map(|_| {
                covers_dir.join(format!("{}.jpg", rom.id)).to_string_lossy().to_string()
            });

            let game = Game {
                id: 0,
                platform_id: mapped_platform,
                name: rom.name.clone(),
                file_path: rom.fs_name.clone(),
                source: GameSource::RomM,
                romm_id: Some(rom.id),
                summary: rom.summary.clone(),
                developer: None,
                publisher: None,
                release_year,
                genres: rom.genres(),
                player_count: None,
                cover_path,
                screenshot_paths: Vec::new(),
                is_favorite: false,
                is_hidden: false,
                user_rating: rom.aggregated_rating(),
                last_played_at: None,
                play_count: 0,
                play_time_minutes: 0,
                sync_state: SyncState::RemoteOnly,
                local_file_path: None,
            };

            let _ = db.upsert_game(&game);
            all_games.push(game);
        }

        let fetched = offset + roms.items.len() as i32;
        if fetched >= roms.total {
            break;
        }
        offset = fetched;
    }

    // Download covers in background (don't block sync)
    let covers_dir_bg = covers_dir.clone();
    let roms_for_covers: Vec<(i32, String)> = all_games.iter()
        .filter_map(|g| {
            g.romm_id.and_then(|rid| {
                g.cover_path.as_ref().map(|_| {
                    let cover_file = covers_dir_bg.join(format!("{}.jpg", rid));
                    if cover_file.exists() { return None; }
                    Some((rid, g.name.clone()))
                }).flatten()
            })
        })
        .collect();

    if !roms_for_covers.is_empty() {
        let server = server_url.clone();
        let user = username.clone();
        let pass = password.clone();
        tokio::spawn(async move {
            let mut dl_client = crate::api::RomMClient::new(&server);
            if dl_client.authenticate(&user, &pass).await.is_err() { return; }
            let dl = crate::api::download::DownloadManager::new();
            for (rom_id, _name) in roms_for_covers {
                let cover_url = dl_client.cover_url(rom_id);
                let cover_path = covers_dir_bg.join(format!("{}.jpg", rom_id));
                if let Ok(bytes) = dl.download_bytes(&cover_url, dl_client.token()).await {
                    if bytes.len() > 100 {
                        std::fs::write(&cover_path, &bytes).ok();
                    }
                }
            }
        });
    }

    Ok(all_games)
}

#[tauri::command]
pub async fn download_rom(game_id: i64, server_url: String, _token: String) -> CommandResult<String> {
    let db = get_db()?;
    let config = AppConfig::load().unwrap_or_default();
    let game = db
        .get_game(game_id)
        .map_err(CommandError::from)?
        .ok_or_else(|| CommandError {
            message: "Game not found".into(),
        })?;

    let romm_id = game.romm_id.ok_or_else(|| CommandError {
        message: "Game has no RomM ID".into(),
    })?;

    let mut client = crate::api::RomMClient::new(&server_url);
    client.authenticate(
        &config.romm.username.unwrap_or_default(),
        &config.romm.password.unwrap_or_default(),
    ).await.map_err(CommandError::from)?;
    let rom = client.get_rom(romm_id).await.map_err(CommandError::from)?;

    let download_url = client.rom_download_url(romm_id, &rom.fs_name);

    let config = AppConfig::load().unwrap_or_default();
    let dest_dir = config.roms_dir().join(&game.platform_id);
    std::fs::create_dir_all(&dest_dir).ok();
    let dest_path = dest_dir.join(&rom.fs_name);

    let dl = crate::api::download::DownloadManager::new();
    dl.download_file(&download_url, &dest_path, client.token(), |_progress| {})
        .await
        .map_err(CommandError::from)?;

    let mut updated = game.clone();
    updated.local_file_path = Some(dest_path.to_string_lossy().to_string());
    updated.file_path = dest_path.to_string_lossy().to_string();
    updated.sync_state = SyncState::Synced;
    db.update_game(&updated).map_err(CommandError::from)?;

    Ok(dest_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_game_saves(romm_id: i32, server_url: String, _token: String) -> CommandResult<Vec<crate::api::RomMSave>> {
    let config = AppConfig::load().unwrap_or_default();
    let mut client = crate::api::RomMClient::new(&server_url);
    client.authenticate(&config.romm.username.unwrap_or_default(), &config.romm.password.unwrap_or_default()).await.map_err(CommandError::from)?;
    client.get_saves(romm_id).await.map_err(|e| e.into())
}

#[tauri::command]
pub async fn download_game_save(romm_id: i32, save_id: i32, server_url: String, _token: String) -> CommandResult<String> {
    let config = AppConfig::load().unwrap_or_default();
    let mut client = crate::api::RomMClient::new(&server_url);
    client.authenticate(&config.romm.username.unwrap_or_default(), &config.romm.password.unwrap_or_default()).await.map_err(CommandError::from)?;

    let saves = client.get_saves(romm_id).await.map_err(CommandError::from)?;
    let save = saves
        .iter()
        .find(|s| s.id == save_id)
        .ok_or_else(|| CommandError {
            message: "Save not found".into(),
        })?;

    let bytes = client.download_save(romm_id, save_id).await.map_err(CommandError::from)?;

    let saves_dir = AppConfig::saves_dir().map_err(CommandError::from)?;
    std::fs::create_dir_all(&saves_dir).ok();
    let save_path = saves_dir.join(&save.file_name);

    std::fs::write(&save_path, &bytes).map_err(|e| CommandError {
        message: format!("Failed to write save file: {}", e),
    })?;

    Ok(save_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn upload_game_save(romm_id: i32, file_path: String, server_url: String, _token: String) -> CommandResult<()> {
    let config = AppConfig::load().unwrap_or_default();
    let mut client = crate::api::RomMClient::new(&server_url);
    client.authenticate(&config.romm.username.unwrap_or_default(), &config.romm.password.unwrap_or_default()).await.map_err(CommandError::from)?;

    let path = std::path::Path::new(&file_path);
    let filename = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("save.dat")
        .to_string();

    let data = std::fs::read(path).map_err(|e| CommandError {
        message: format!("Failed to read save file: {}", e),
    })?;

    client
        .upload_save(romm_id, data, &filename)
        .await
        .map_err(|e| e.into())
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

#[derive(Debug, Serialize)]
pub struct EmulatorInfo {
    pub id: String,
    pub name: String,
    pub is_installed: bool,
    pub installed_path: Option<String>,
    pub has_download: bool,
    pub github_repo: Option<String>,
    pub download_url: Option<String>,
    pub supported_platforms: Vec<String>,
    pub is_retroarch: bool,
}

#[tauri::command]
pub fn get_all_emulators() -> CommandResult<Vec<EmulatorInfo>> {
    let detected = crate::emulators::detection::detect_installed_emulators();
    let all = crate::models::default_emulators();

    let result: Vec<EmulatorInfo> = all
        .iter()
        .map(|emu| {
            let detected_entry = detected.iter().find(|d| d.id == emu.id);
            let is_detected = detected_entry.is_some();
            let detected_path = detected_entry.map(|d| d.path.to_string_lossy().to_string());

            EmulatorInfo {
                id: emu.id.clone(),
                name: emu.name.clone(),
                is_installed: is_detected,
                installed_path: detected_path,
                has_download: emu.github_repo.is_some() || emu.download_url.is_some(),
                github_repo: emu.github_repo.clone(),
                download_url: emu.download_url.clone(),
                supported_platforms: emu.supported_platforms.clone(),
                is_retroarch: emu.is_retroarch,
            }
        })
        .collect();

    Ok(result)
}

#[tauri::command]
pub async fn download_emulator(emulator_id: String) -> CommandResult<String> {
    let emulators = crate::models::default_emulators();
    let emu = emulators
        .iter()
        .find(|e| e.id == emulator_id)
        .ok_or_else(|| CommandError {
            message: format!("Unknown emulator: {}", emulator_id),
        })?;

    let install_dir = AppConfig::emulators_dir()
        .map_err(CommandError::from)?
        .join(&emulator_id);
    std::fs::create_dir_all(&install_dir).ok();

    let (download_url, archive_format) = if let Some(ref repo) = emu.github_repo {
        let release = crate::emulators::github::fetch_latest_release(repo)
            .await
            .map_err(CommandError::from)?;

        let pattern = emu.asset_pattern.as_deref().unwrap_or(".*");
        let asset = crate::emulators::github::find_matching_asset(&release, pattern)
            .ok_or_else(|| CommandError {
                message: format!(
                    "No matching asset found for {} in release {}",
                    emulator_id, release.tag_name
                ),
            })?;

        (asset.browser_download_url.clone(), emu.archive_format.clone())
    } else if let Some(ref url) = emu.download_url {
        (url.clone(), emu.archive_format.clone())
    } else {
        return Err(CommandError {
            message: format!("No download source for {}", emulator_id),
        });
    };

    let file_ext = archive_format.as_deref().unwrap_or("zip");
    let archive_path = install_dir.join(format!("{}.{}", emulator_id, file_ext));

    crate::emulators::installer::download_file(&download_url, &archive_path)
        .await
        .map_err(CommandError::from)?;

    if let Some(ref fmt) = archive_format {
        if fmt != "exe" {
            crate::emulators::installer::extract_archive(&archive_path, &install_dir, fmt)
                .map_err(CommandError::from)?;
            std::fs::remove_file(&archive_path).ok();
        }
    }

    let exe_names = get_exe_names(&emulator_id);
    let exe_path = crate::emulators::installer::find_executable(&install_dir, &exe_names);

    if let Some(ref path) = exe_path {
        let mut config = AppConfig::load().unwrap_or_default();
        set_emulator_path(&mut config.emulators, &emulator_id, path.clone());
        config.save().ok();
    }

    Ok(exe_path
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| install_dir.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn download_retroarch_core(core_name: String) -> CommandResult<String> {
    let config = AppConfig::load().unwrap_or_default();
    let retroarch_path = config
        .emulators
        .retroarch
        .or_else(|| {
            let detected = crate::emulators::detection::detect_installed_emulators();
            detected
                .iter()
                .find(|d| d.id == "retroarch")
                .map(|d| d.path.clone())
        })
        .ok_or_else(|| CommandError {
            message: "RetroArch not found. Install RetroArch first.".into(),
        })?;

    let cores_dir = crate::emulators::cores::get_cores_dir(&retroarch_path);
    let core_path = crate::emulators::cores::download_core(&core_name, &cores_dir)
        .await
        .map_err(CommandError::from)?;

    Ok(core_path.to_string_lossy().to_string())
}

#[derive(Debug, Serialize)]
pub struct MissingCore {
    pub platform_id: String,
    pub platform_name: String,
    pub core_filename: String,
}

#[tauri::command]
pub fn get_missing_cores() -> CommandResult<Vec<MissingCore>> {
    let config = AppConfig::load().unwrap_or_default();
    let retroarch_path = config.emulators.retroarch.clone().or_else(|| {
        let detected = crate::emulators::detection::detect_installed_emulators();
        detected
            .iter()
            .find(|d| d.id == "retroarch")
            .map(|d| d.path.clone())
    });

    let cores = crate::models::retroarch_cores();
    let db = get_db()?;
    let platforms_with_games = db.get_platforms_with_games().map_err(CommandError::from)?;

    let mut missing = Vec::new();
    for (platform, _count) in &platforms_with_games {
        if let Some(core) = cores.get(&platform.id) {
            let installed = retroarch_path
                .as_ref()
                .map(|p| crate::emulators::cores::is_core_installed(p, core))
                .unwrap_or(false);

            if !installed {
                missing.push(MissingCore {
                    platform_id: platform.id.clone(),
                    platform_name: platform.name.clone(),
                    core_filename: core.to_string(),
                });
            }
        }
    }

    Ok(missing)
}

#[tauri::command]
pub fn apply_detected_paths() -> CommandResult<i32> {
    let detected = crate::emulators::detection::detect_installed_emulators();
    let mut config = AppConfig::load().unwrap_or_default();
    let mut count = 0;

    for emu in &detected {
        let current = get_emulator_path_from_config(&config.emulators, &emu.id);
        if current.is_none() {
            set_emulator_path(&mut config.emulators, &emu.id, emu.path.clone());
            count += 1;
        }
    }

    if count > 0 {
        config.save().map_err(CommandError::from)?;
    }

    Ok(count)
}

fn get_exe_names(emulator_id: &str) -> Vec<&'static str> {
    match emulator_id {
        "retroarch" => vec!["retroarch.exe", "RetroArch.exe"],
        "dolphin" => vec!["Dolphin.exe"],
        "pcsx2" => vec!["pcsx2-qt.exe", "pcsx2.exe", "pcsx2-qtx64.exe"],
        "rpcs3" => vec!["rpcs3.exe"],
        "ppsspp" => vec!["PPSSPPWindows64.exe", "PPSSPPWindows.exe"],
        "duckstation" => vec![
            "duckstation-qt-x64-ReleaseLTCG.exe",
            "duckstation-nogui-x64-ReleaseLTCG.exe",
        ],
        "cemu" => vec!["Cemu.exe"],
        "ryujinx" => vec!["Ryujinx.exe"],
        "citra" => vec!["lime3ds-gui.exe", "lime3ds.exe", "citra-qt.exe"],
        "melonds" => vec!["melonDS.exe"],
        "mgba" => vec!["mGBA.exe"],
        "flycast" => vec!["flycast.exe"],
        "xemu" => vec!["xemu.exe"],
        "xenia" => vec!["xenia_canary.exe", "xenia.exe"],
        "mame" => vec!["mame.exe", "mame64.exe"],
        _ => vec![],
    }
}

fn set_emulator_path(paths: &mut crate::config::EmulatorPaths, id: &str, path: PathBuf) {
    match id {
        "retroarch" => paths.retroarch = Some(path),
        "dolphin" => paths.dolphin = Some(path),
        "pcsx2" => paths.pcsx2 = Some(path),
        "rpcs3" => paths.rpcs3 = Some(path),
        "ppsspp" => paths.ppsspp = Some(path),
        "duckstation" => paths.duckstation = Some(path),
        "cemu" => paths.cemu = Some(path),
        "yuzu" => paths.yuzu = Some(path),
        "ryujinx" => paths.ryujinx = Some(path),
        "citra" => paths.citra = Some(path),
        "melonds" => paths.melonds = Some(path),
        "mgba" => paths.mgba = Some(path),
        "flycast" => paths.flycast = Some(path),
        "xemu" => paths.xemu = Some(path),
        "xenia" => paths.xenia = Some(path),
        "mame" => paths.mame = Some(path),
        _ => {}
    }
}

fn get_emulator_path_from_config(
    paths: &crate::config::EmulatorPaths,
    id: &str,
) -> Option<PathBuf> {
    match id {
        "retroarch" => paths.retroarch.clone(),
        "dolphin" => paths.dolphin.clone(),
        "pcsx2" => paths.pcsx2.clone(),
        "rpcs3" => paths.rpcs3.clone(),
        "ppsspp" => paths.ppsspp.clone(),
        "duckstation" => paths.duckstation.clone(),
        "cemu" => paths.cemu.clone(),
        "yuzu" => paths.yuzu.clone(),
        "ryujinx" => paths.ryujinx.clone(),
        "citra" => paths.citra.clone(),
        "melonds" => paths.melonds.clone(),
        "mgba" => paths.mgba.clone(),
        "flycast" => paths.flycast.clone(),
        "xemu" => paths.xemu.clone(),
        "xenia" => paths.xenia.clone(),
        "mame" => paths.mame.clone(),
        _ => None,
    }
}
