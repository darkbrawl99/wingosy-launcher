use serde::Serialize;

use crate::api::{RomMClient, download::DownloadManager};
use crate::config::AppConfig;
use crate::database::Database;
use crate::emulators::{EmulatorLauncher, LaunchCommand, LaunchResult};
use crate::emulators::detection::{detect_installed_emulators, find_retroarch_cores};
use crate::models::{Game, Platform, Collection, GameFilter, GameSort, default_emulators, retroarch_cores};
use crate::scanner::RomScanner;

#[derive(Debug, Serialize)]
pub struct EmulatorInfo {
    pub id: String,
    pub name: String,
    pub is_installed: bool,
    pub installed_path: Option<String>,
    pub install_type: Option<String>,
    pub version: Option<String>,
    pub has_download: bool,
    pub supported_platforms: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct MissingCore {
    pub core_filename: String,
    pub platform_name: String,
}

#[tauri::command]
pub async fn is_first_run() -> Result<bool, String> {
    let config_path = AppConfig::config_path().map_err(|e| e.to_string())?;
    let is_first = !config_path.exists();
    tracing::debug!("[App] First run check: {}", is_first);
    Ok(is_first)
}

#[tauri::command]
pub async fn complete_setup() -> Result<(), String> {
    tracing::info!("[Setup] Completing initial setup");
    let config = AppConfig::default();
    config.save().map_err(|e| e.to_string())?;
    tracing::info!("[Setup] Setup completed successfully");
    Ok(())
}

#[tauri::command]
pub async fn get_all_games() -> Result<Vec<Game>, String> {
    tracing::debug!("[Library] Fetching all games");
    let db = Database::open().map_err(|e| e.to_string())?;
    let games = db.get_all_games().map_err(|e| e.to_string())?;
    tracing::info!("[Library] Loaded {} games from database", games.len());
    Ok(games)
}

#[tauri::command]
pub async fn get_games_filtered(
    platform_id: Option<String>,
    search_query: Option<String>,
    favorites_only: bool,
    sort_by: Option<String>,
) -> Result<Vec<Game>, String> {
    let db = Database::open().map_err(|e| e.to_string())?;
    
    let sort = sort_by.as_deref().map(|s| match s {
        "name" => GameSort::Name,
        "last_played" => GameSort::LastPlayed,
        "play_count" => GameSort::PlayCount,
        "play_time" => GameSort::PlayTime,
        "release_year" => GameSort::ReleaseYear,
        _ => GameSort::Name,
    }).unwrap_or(GameSort::Name);
    
    let filter = GameFilter {
        platform_id,
        genre: None,
        search_query,
        favorites_only,
        sort_by: sort,
        sort_descending: false,
    };
    
    db.get_games_filtered(&filter).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_all_platforms() -> Result<Vec<Platform>, String> {
    let db = Database::open().map_err(|e| e.to_string())?;
    db.get_all_platforms().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_platforms_with_games() -> Result<Vec<(Platform, i32)>, String> {
    let db = Database::open().map_err(|e| e.to_string())?;
    db.get_platforms_with_games().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_recent_games(limit: i32) -> Result<Vec<Game>, String> {
    let db = Database::open().map_err(|e| e.to_string())?;
    db.get_recent_games(limit).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_favorite_games() -> Result<Vec<Game>, String> {
    let db = Database::open().map_err(|e| e.to_string())?;
    db.get_favorite_games().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn toggle_favorite(game_id: i64) -> Result<bool, String> {
    let db = Database::open().map_err(|e| e.to_string())?;
    let game = db.get_game(game_id).map_err(|e| e.to_string())?
        .ok_or("Game not found")?;
    let new_state = !game.is_favorite;
    db.set_favorite(game_id, new_state).map_err(|e| e.to_string())?;
    Ok(new_state)
}

#[derive(Debug, Serialize)]
pub struct LaunchGameResult {
    pub success: bool,
    pub error: Option<String>,
    pub dry_run: bool,
    pub duration_minutes: Option<i32>,
    pub exit_code: Option<i32>,
}

#[tauri::command]
pub async fn launch_game(game_id: i64) -> Result<LaunchGameResult, String> {
    tracing::info!("[Launch] Launching game id={}", game_id);
    
    let config = AppConfig::load().map_err(|e| e.to_string())?;
    let db = Database::open().map_err(|e| e.to_string())?;
    
    let game = db.get_game(game_id).map_err(|e| e.to_string())?
        .ok_or("Game not found")?;
    
    tracing::info!("[Launch] Game: {} ({})", game.name, game.platform_id);
    
    let launcher = EmulatorLauncher::new(config, db);
    
    let result = launcher.launch(&game).await
        .map_err(|e| {
            tracing::error!("[Launch] Failed to launch: {}", e);
            e.to_string()
        })?;
    
    match result {
        LaunchResult::Success { duration_minutes, exit_code, .. } => {
            tracing::info!("[Launch] Game exited successfully (duration: {}min, exit_code: {:?})", duration_minutes, exit_code);
            Ok(LaunchGameResult {
                success: true,
                error: None,
                dry_run: false,
                duration_minutes: Some(duration_minutes),
                exit_code,
            })
        }
        LaunchResult::DryRun { ref command } => {
            tracing::info!("[Launch] Dry run completed for: {}", command.full_command);
            Ok(LaunchGameResult {
                success: true,
                error: None,
                dry_run: true,
                duration_minutes: None,
                exit_code: None,
            })
        }
        _ => {
            let error_msg = result.error_message();
            tracing::error!("[Launch] Launch failed: {:?}", error_msg);
            Ok(LaunchGameResult {
                success: false,
                error: error_msg,
                dry_run: false,
                duration_minutes: None,
                exit_code: None,
            })
        }
    }
}

#[tauri::command]
pub async fn get_launch_command(game_id: i64) -> Result<LaunchCommand, String> {
    let config = AppConfig::load().map_err(|e| e.to_string())?;
    let db = Database::open().map_err(|e| e.to_string())?;
    
    let game = db.get_game(game_id).map_err(|e| e.to_string())?
        .ok_or("Game not found")?;
    
    let launcher = EmulatorLauncher::new(config, db);
    launcher.build_command(&game).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn scan_directory(path: String, recursive: bool) -> Result<Vec<Game>, String> {
    tracing::info!("[Scan] Starting directory scan: {} (recursive={})", path, recursive);
    
    let db = Database::open().map_err(|e| e.to_string())?;
    let platforms = db.get_all_platforms().map_err(|e| e.to_string())?;
    
    let scanner = RomScanner::new(platforms);
    let (tx, mut rx) = tokio::sync::mpsc::channel(100);
    
    let scan_path = std::path::PathBuf::from(&path);
    let games = scanner.scan(&scan_path, recursive, tx).await.map_err(|e| {
        tracing::error!("[Scan] Scan failed: {}", e);
        e.to_string()
    })?;
    
    while rx.recv().await.is_some() {}
    
    tracing::info!("[Scan] Saving {} games to database", games.len());
    for game in &games {
        db.upsert_game(game).map_err(|e| e.to_string())?;
    }
    
    tracing::info!("[Scan] Directory scan complete");
    Ok(games)
}

#[tauri::command]
pub async fn get_config() -> Result<AppConfig, String> {
    AppConfig::load().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_config(config: AppConfig) -> Result<(), String> {
    config.save().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn connect_romm(
    server_url: String,
    username: String,
    password: String,
) -> Result<String, String> {
    tracing::info!("[RomM] Connecting to server: {}", server_url);
    
    let mut client = RomMClient::new(&server_url);
    let token_response = client.authenticate(&username, &password).await
        .map_err(|e| {
            tracing::error!("[RomM] Connection failed: {}", e);
            e.to_string()
        })?;
    
    tracing::info!("[RomM] Authentication successful, saving credentials");
    
    let mut config = AppConfig::load().unwrap_or_default();
    config.romm.server_url = Some(server_url.clone());
    config.romm.username = Some(username);
    config.romm.auth_token = Some(token_response.access_token.clone());
    config.save().map_err(|e| e.to_string())?;
    
    tracing::info!("[RomM] Connected to {}", server_url);
    Ok(token_response.access_token)
}

#[tauri::command]
pub async fn sync_romm_library(
    server_url: String,
    token: String,
) -> Result<Vec<Game>, String> {
    use crate::models::map_romm_slug;
    
    tracing::info!("[RomM] Starting library sync from {}", server_url);
    
    let client = RomMClient::new(&server_url).with_token(token);
    let db = Database::open().map_err(|e| e.to_string())?;
    
    let romm_platforms = client.get_platforms().await.map_err(|e| {
        tracing::error!("[RomM] Failed to fetch platforms: {}", e);
        e.to_string()
    })?;
    
    tracing::info!("[RomM] Syncing {} platforms", romm_platforms.len());
    let mut all_games = Vec::new();
    
    for romm_platform in &romm_platforms {
        // Map RomM platform to our internal platform with logo
        let platform_id = map_romm_slug(&romm_platform.slug);
        
        // Build full logo URL if available
        let logo_url = romm_platform.url_logo.as_ref().map(|logo| {
            if logo.starts_with("http") {
                logo.clone()
            } else {
                format!("{}{}", server_url.trim_end_matches('/'), logo)
            }
        });
        
        if let Some(ref url) = logo_url {
            tracing::debug!("[RomM] Platform {} logo: {}", platform_id, url);
        }
        
        // Update platform with logo URL
        let platform = Platform {
            id: platform_id.clone(),
            name: romm_platform.display_name.clone().unwrap_or_else(|| romm_platform.name.clone()),
            short_name: Some(romm_platform.name.clone()),
            extensions: vec![],
            logo_path: logo_url,
            sort_order: 0,
        };
        
        // Insert/update platform in database
        if let Err(e) = db.insert_platform(&platform) {
            tracing::warn!("[RomM] Failed to update platform {}: {}", platform_id, e);
        }
        
        tracing::debug!("[RomM] Syncing platform: {} (id={})", romm_platform.name, romm_platform.id);
        let response = client.get_roms(Some(romm_platform.id), 1000, 0).await
            .map_err(|e| e.to_string())?;
        
        for rom in response.items {
            let game = rom.into_game(&server_url);
            db.upsert_game(&game).map_err(|e| e.to_string())?;
            all_games.push(game);
        }
    }
    
    tracing::info!("[RomM] Library sync complete: {} games imported", all_games.len());
    Ok(all_games)
}

#[tauri::command]
pub async fn download_rom(
    game_id: i64,
    server_url: String,
    token: String,
) -> Result<String, String> {
    tracing::info!("[Download] Downloading ROM for game id={}", game_id);
    
    let db = Database::open().map_err(|e| e.to_string())?;
    let config = AppConfig::load().map_err(|e| e.to_string())?;
    
    let game = db.get_game(game_id).map_err(|e| e.to_string())?
        .ok_or("Game not found")?;
    
    let romm_id = game.romm_id.ok_or("Game has no RomM ID")?;
    tracing::debug!("[Download] Game: {} (romm_id={})", game.name, romm_id);
    
    let client = RomMClient::new(&server_url).with_token(token.clone());
    let rom = client.get_rom(romm_id).await.map_err(|e| e.to_string())?;
    
    let file_name = if rom.fs_name.is_empty() { rom.name.clone() } else { rom.fs_name.clone() };
    let download_url = client.rom_download_url(romm_id, &file_name);
    
    let dest_dir = config.roms_dir().join(&game.platform_id);
    std::fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;
    
    let dest_path = dest_dir.join(&file_name);
    tracing::info!("[Download] Downloading to {:?}", dest_path);
    
    let manager = DownloadManager::new();
    manager.download_file(&download_url, &dest_path, Some(&token), |_| {}).await
        .map_err(|e| {
            tracing::error!("[Download] Download failed: {}", e);
            e.to_string()
        })?;
    
    let mut updated_game = game.clone();
    updated_game.local_file_path = Some(dest_path.to_string_lossy().to_string());
    updated_game.sync_state = crate::models::SyncState::Synced;
    db.update_game(&updated_game).map_err(|e| e.to_string())?;
    
    tracing::info!("[Download] ROM download complete: {}", file_name);
    Ok(dest_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_game_saves(
    romm_id: i32,
    server_url: String,
    token: String,
) -> Result<Vec<crate::api::RomMSave>, String> {
    let client = RomMClient::new(&server_url).with_token(token);
    client.get_saves(romm_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn download_game_save(
    romm_id: i32,
    save_id: i32,
    server_url: String,
    token: String,
) -> Result<String, String> {
    let client = RomMClient::new(&server_url).with_token(token);
    
    let save_data = client.download_save(romm_id, save_id).await
        .map_err(|e| e.to_string())?;
    
    let saves_dir = AppConfig::saves_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&saves_dir).map_err(|e| e.to_string())?;
    
    let save_path = saves_dir.join(format!("save_{}_{}.sav", romm_id, save_id));
    std::fs::write(&save_path, save_data).map_err(|e| e.to_string())?;
    
    Ok(save_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn upload_game_save(
    romm_id: i32,
    file_path: String,
    server_url: String,
    token: String,
) -> Result<(), String> {
    let client = RomMClient::new(&server_url).with_token(token);
    
    let save_data = std::fs::read(&file_path).map_err(|e| e.to_string())?;
    let filename = std::path::Path::new(&file_path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "save.sav".to_string());
    
    client.upload_save(romm_id, save_data, &filename).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn detect_emulators() -> Result<Vec<EmulatorInfo>, String> {
    tracing::info!("[Emulators] Starting emulator detection");
    
    let detected = detect_installed_emulators();
    let all_emulators = default_emulators();
    
    let mut result: Vec<EmulatorInfo> = Vec::new();
    let mut installed_count = 0;
    
    for emu in all_emulators {
        let detected_match = detected.iter().find(|d| d.id == emu.id);
        if detected_match.is_some() {
            installed_count += 1;
        }
        
        result.push(EmulatorInfo {
            id: emu.id.clone(),
            name: emu.name.clone(),
            is_installed: detected_match.is_some(),
            installed_path: detected_match.map(|d| d.path.to_string_lossy().to_string()),
            install_type: detected_match.map(|d| d.install_type.as_str().to_string()),
            version: detected_match.and_then(|d| d.version.clone()),
            has_download: emu.download_url.is_some() || emu.github_repo.is_some(),
            supported_platforms: emu.supported_platforms,
        });
    }
    
    tracing::info!("[Emulators] Detection complete: {}/{} emulators installed", installed_count, result.len());
    Ok(result)
}

#[tauri::command]
pub async fn launch_emulator(emulator_path: String) -> Result<(), String> {
    tracing::info!("[Emulators] Launching emulator: {}", emulator_path);
    let path = std::path::PathBuf::from(&emulator_path);
    crate::emulators::detection::launch_emulator(&path)
}

#[tauri::command]
pub async fn open_emulator_location(emulator_path: String) -> Result<(), String> {
    tracing::info!("[Emulators] Opening location: {}", emulator_path);
    let path = std::path::PathBuf::from(&emulator_path);
    crate::emulators::detection::open_emulator_location(&path)
}

#[tauri::command]
pub async fn get_game_details(game_id: i64) -> Result<Game, String> {
    let db = Database::open().map_err(|e| e.to_string())?;
    db.get_game(game_id).map_err(|e| e.to_string())?
        .ok_or_else(|| "Game not found".to_string())
}

#[tauri::command]
pub async fn get_collections() -> Result<Vec<Collection>, String> {
    let db = Database::open().map_err(|e| e.to_string())?;
    db.get_all_collections().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn search_games(query: String) -> Result<Vec<Game>, String> {
    let db = Database::open().map_err(|e| e.to_string())?;
    
    let filter = GameFilter {
        platform_id: None,
        genre: None,
        search_query: Some(query),
        favorites_only: false,
        sort_by: GameSort::Name,
        sort_descending: false,
    };
    
    db.get_games_filtered(&filter).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_all_emulators() -> Result<Vec<EmulatorInfo>, String> {
    detect_emulators().await
}

#[tauri::command]
pub async fn download_emulator(emulator_id: String) -> Result<String, String> {
    tracing::info!("[Emulators] Downloading emulator: {}", emulator_id);
    
    let emulators = default_emulators();
    let emu = emulators.iter()
        .find(|e| e.id == emulator_id)
        .ok_or("Emulator not found")?;
    
    let dest_dir = AppConfig::emulators_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;
    
    let emu_dir = dest_dir.join(&emulator_id);
    std::fs::create_dir_all(&emu_dir).map_err(|e| e.to_string())?;
    
    let (download_url, archive_name, format) = if let Some(github_repo) = &emu.github_repo {
        // GitHub release download
        tracing::debug!("[Emulators] Fetching GitHub release from: {}", github_repo);
        
        let release = crate::emulators::github::fetch_latest_release(github_repo).await
            .map_err(|e| {
                tracing::error!("[Emulators] Failed to fetch GitHub release: {}", e);
                e.to_string()
            })?;
        
        tracing::debug!("[Emulators] Found release: {}", release.tag_name);
        
        // Use emulator's asset pattern if available, otherwise fallback to generic Windows patterns
        let asset = if let Some(pattern) = &emu.asset_pattern {
            crate::emulators::github::find_matching_asset(&release, pattern)
        } else {
            None
        }.or_else(|| crate::emulators::github::find_matching_asset(&release, "(?i)windows.*x64"))
         .or_else(|| crate::emulators::github::find_matching_asset(&release, "(?i)win64"))
         .or_else(|| crate::emulators::github::find_matching_asset(&release, "(?i)win.*\\.zip$"))
         .or_else(|| crate::emulators::github::find_matching_asset(&release, "(?i)win.*\\.7z$"))
         .ok_or_else(|| {
             tracing::error!("[Emulators] No matching Windows asset found in release. Assets: {:?}", 
                 release.assets.iter().map(|a| &a.name).collect::<Vec<_>>());
             "No Windows asset found in GitHub release".to_string()
         })?;
        
        let fmt = if asset.name.ends_with(".zip") { "zip" } 
            else if asset.name.ends_with(".7z") { "7z" }
            else { emu.archive_format.as_deref().unwrap_or("zip") };
        
        (asset.browser_download_url.clone(), asset.name.clone(), fmt.to_string())
    } else if let Some(direct_url) = &emu.download_url {
        // Direct download URL (e.g., RetroArch buildbot)
        tracing::debug!("[Emulators] Using direct download URL: {}", direct_url);
        
        let filename = direct_url.split('/').last().unwrap_or("emulator.zip").to_string();
        let fmt = emu.archive_format.as_deref().unwrap_or(
            if filename.ends_with(".7z") { "7z" } else { "zip" }
        );
        
        (direct_url.clone(), filename, fmt.to_string())
    } else {
        tracing::error!("[Emulators] No download source configured for {}", emulator_id);
        return Err("Emulator has no download URL or GitHub repo configured".to_string());
    };
    
    tracing::info!("[Emulators] Downloading: {}", archive_name);
    
    let archive_path = dest_dir.join(&archive_name);
    crate::emulators::installer::download_file(&download_url, &archive_path).await
        .map_err(|e| {
            tracing::error!("[Emulators] Download failed: {}", e);
            e.to_string()
        })?;
    
    tracing::info!("[Emulators] Download complete, extracting {} archive...", format);
    
    let extracted_dir = crate::emulators::installer::extract_archive(&archive_path, &emu_dir, &format)
        .map_err(|e| {
            tracing::error!("[Emulators] Extraction failed: {}", e);
            e.to_string()
        })?;
    
    // Clean up the archive
    std::fs::remove_file(&archive_path).ok();
    
    // Find the actual executable
    let exe_names: Vec<&str> = match emulator_id.as_str() {
        "retroarch" => vec!["retroarch.exe", "RetroArch.exe"],
        "dolphin" => vec!["Dolphin.exe"],
        "pcsx2" => vec!["pcsx2-qt.exe", "pcsx2.exe", "pcsx2-qtx64.exe"],
        "rpcs3" => vec!["rpcs3.exe"],
        "ppsspp" => vec!["PPSSPPWindows64.exe", "PPSSPPWindows.exe"],
        "duckstation" => vec!["duckstation-qt-x64-ReleaseLTCG.exe", "duckstation-nogui-x64-ReleaseLTCG.exe"],
        "cemu" => vec!["Cemu.exe"],
        "eden" => vec!["eden.exe", "Eden.exe"],
        "citra" => vec!["lime3ds.exe", "citra-qt.exe"],
        "melonds" => vec!["melonDS.exe"],
        "mgba" => vec!["mGBA.exe"],
        "flycast" => vec!["flycast.exe"],
        "xemu" => vec!["xemu.exe"],
        "xenia" => vec!["xenia_canary.exe", "xenia.exe"],
        "mame" => vec!["mame.exe", "mame64.exe"],
        _ => vec![],
    };
    
    let exe_path = if !exe_names.is_empty() {
        crate::emulators::installer::find_executable(&extracted_dir, &exe_names)
            .unwrap_or(extracted_dir.clone())
    } else {
        extracted_dir.clone()
    };
    
    tracing::info!("[Emulators] Emulator installed: {:?}", exe_path);
    
    // Update config with the new emulator path
    let mut config = AppConfig::load().map_err(|e| e.to_string())?;
    match emulator_id.as_str() {
        "retroarch" => config.emulators.retroarch = Some(exe_path.clone()),
        "dolphin" => config.emulators.dolphin = Some(exe_path.clone()),
        "pcsx2" => config.emulators.pcsx2 = Some(exe_path.clone()),
        "rpcs3" => config.emulators.rpcs3 = Some(exe_path.clone()),
        "ppsspp" => config.emulators.ppsspp = Some(exe_path.clone()),
        "duckstation" => config.emulators.duckstation = Some(exe_path.clone()),
        "cemu" => config.emulators.cemu = Some(exe_path.clone()),
        "eden" => config.emulators.eden = Some(exe_path.clone()),
        "citra" => config.emulators.citra = Some(exe_path.clone()),
        "melonds" => config.emulators.melonds = Some(exe_path.clone()),
        "mgba" => config.emulators.mgba = Some(exe_path.clone()),
        "flycast" => config.emulators.flycast = Some(exe_path.clone()),
        "xemu" => config.emulators.xemu = Some(exe_path.clone()),
        "xenia" => config.emulators.xenia = Some(exe_path.clone()),
        "mame" => config.emulators.mame = Some(exe_path.clone()),
        _ => {}
    }
    config.save().map_err(|e| e.to_string())?;
    tracing::info!("[Emulators] Config updated with {} path", emulator_id);
    
    Ok(exe_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn download_retroarch_core(core_name: String) -> Result<String, String> {
    tracing::info!("[RetroArch] Downloading core: {}", core_name);
    
    let config = AppConfig::load().map_err(|e| e.to_string())?;
    
    let retroarch_path = config.emulators.retroarch
        .ok_or("RetroArch not configured")?;
    
    let cores_dir = crate::emulators::cores::get_cores_dir(&retroarch_path);
    tracing::debug!("[RetroArch] Cores directory: {:?}", cores_dir);
    
    let core_path = crate::emulators::cores::download_core(&core_name, &cores_dir).await
        .map_err(|e| {
            tracing::error!("[RetroArch] Core download failed: {}", e);
            e.to_string()
        })?;
    
    tracing::info!("[RetroArch] Core installed: {:?}", core_path);
    Ok(core_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_missing_cores() -> Result<Vec<MissingCore>, String> {
    let config = AppConfig::load().map_err(|e| e.to_string())?;
    let db = Database::open().map_err(|e| e.to_string())?;
    
    let retroarch_path = match &config.emulators.retroarch {
        Some(p) => p,
        None => return Ok(vec![]),
    };
    
    let platforms = db.get_platforms_with_games().map_err(|e| e.to_string())?;
    let cores_map = retroarch_cores();
    let installed_cores = find_retroarch_cores(retroarch_path);
    
    let mut missing = Vec::new();
    
    for (platform, count) in platforms {
        if count == 0 { continue; }
        
        if let Some(core_name) = cores_map.get(&platform.id) {
            let core_filename = format!("{}_libretro.dll", core_name);
            let is_installed = installed_cores.iter().any(|c| {
                c.path.file_name()
                    .map(|n| n.to_string_lossy() == core_filename)
                    .unwrap_or(false)
            });
            
            if !is_installed {
                missing.push(MissingCore {
                    core_filename,
                    platform_name: platform.name,
                });
            }
        }
    }
    
    Ok(missing)
}

#[tauri::command]
pub async fn apply_detected_paths() -> Result<i32, String> {
    tracing::info!("[Config] Applying detected emulator paths");
    
    let detected = detect_installed_emulators();
    let mut config = AppConfig::load().map_err(|e| e.to_string())?;
    let mut count = 0;
    
    for emu in &detected {
        let path = Some(emu.path.clone());
        let changed = match emu.id.as_str() {
            "retroarch" if config.emulators.retroarch.is_none() => {
                config.emulators.retroarch = path;
                true
            }
            "dolphin" if config.emulators.dolphin.is_none() => {
                config.emulators.dolphin = path;
                true
            }
            "pcsx2" if config.emulators.pcsx2.is_none() => {
                config.emulators.pcsx2 = path;
                true
            }
            "rpcs3" if config.emulators.rpcs3.is_none() => {
                config.emulators.rpcs3 = path;
                true
            }
            "ppsspp" if config.emulators.ppsspp.is_none() => {
                config.emulators.ppsspp = path;
                true
            }
            "duckstation" if config.emulators.duckstation.is_none() => {
                config.emulators.duckstation = path;
                true
            }
            "cemu" if config.emulators.cemu.is_none() => {
                config.emulators.cemu = path;
                true
            }
            "eden" if config.emulators.eden.is_none() => {
                config.emulators.eden = path;
                true
            }
            "citra" if config.emulators.citra.is_none() => {
                config.emulators.citra = path;
                true
            }
            "melonds" if config.emulators.melonds.is_none() => {
                config.emulators.melonds = path;
                true
            }
            "mgba" if config.emulators.mgba.is_none() => {
                config.emulators.mgba = path;
                true
            }
            "flycast" if config.emulators.flycast.is_none() => {
                config.emulators.flycast = path;
                true
            }
            "xemu" if config.emulators.xemu.is_none() => {
                config.emulators.xemu = path;
                true
            }
            "xenia" if config.emulators.xenia.is_none() => {
                config.emulators.xenia = path;
                true
            }
            "mame" if config.emulators.mame.is_none() => {
                config.emulators.mame = path;
                true
            }
            _ => false,
        };
        
        if changed {
            tracing::debug!("[Config] Applied path for emulator: {}", emu.id);
            count += 1;
        }
    }
    
    config.save().map_err(|e| e.to_string())?;
    tracing::info!("[Config] Applied {} emulator paths", count);
    Ok(count)
}

