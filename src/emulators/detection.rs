use std::path::PathBuf;

#[cfg(windows)]
use std::env;

pub fn detect_installed_emulators() -> Vec<DetectedEmulator> {
    let mut detected = Vec::new();

    #[cfg(windows)]
    {
        detected.extend(detect_windows_emulators());
    }

    detected
}

#[derive(Debug, Clone)]
pub struct DetectedEmulator {
    pub id: String,
    pub name: String,
    pub path: PathBuf,
    pub version: Option<String>,
}

#[cfg(windows)]
fn detect_windows_emulators() -> Vec<DetectedEmulator> {
    let mut detected = Vec::new();

    let common_paths = get_common_install_paths();

    let emulator_patterns = [
        ("retroarch", "RetroArch", &["retroarch.exe", "RetroArch.exe"][..]),
        ("dolphin", "Dolphin", &["Dolphin.exe"][..]),
        ("pcsx2", "PCSX2", &["pcsx2.exe", "pcsx2-qt.exe", "pcsx2-qtx64.exe"][..]),
        ("rpcs3", "RPCS3", &["rpcs3.exe"][..]),
        ("ppsspp", "PPSSPP", &["PPSSPPWindows.exe", "PPSSPPWindows64.exe"][..]),
        ("duckstation", "DuckStation", &["duckstation-qt-x64-ReleaseLTCG.exe", "duckstation-nogui-x64-ReleaseLTCG.exe"][..]),
        ("cemu", "Cemu", &["Cemu.exe"][..]),
        ("ryujinx", "Ryujinx", &["Ryujinx.exe"][..]),
        ("citra", "Citra", &["citra-qt.exe", "lime3ds.exe"][..]),
        ("melonds", "melonDS", &["melonDS.exe"][..]),
        ("mgba", "mGBA", &["mGBA.exe"][..]),
        ("flycast", "Flycast", &["flycast.exe"][..]),
        ("xemu", "xemu", &["xemu.exe"][..]),
        ("xenia", "Xenia", &["xenia_canary.exe", "xenia.exe"][..]),
        ("mame", "MAME", &["mame.exe", "mame64.exe"][..]),
    ];

    for base_path in &common_paths {
        for (id, name, executables) in &emulator_patterns {
            for exe in *executables {
                let potential_paths = [
                    base_path.join(exe),
                    base_path.join(name).join(exe),
                    base_path.join(&name.to_lowercase()).join(exe),
                ];

                for path in potential_paths {
                    if path.exists() {
                        detected.push(DetectedEmulator {
                            id: id.to_string(),
                            name: name.to_string(),
                            path,
                            version: None,
                        });
                        break;
                    }
                }
            }
        }
    }

    detected
}

#[cfg(windows)]
fn get_common_install_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();

    if let Ok(program_files) = env::var("ProgramFiles") {
        paths.push(PathBuf::from(&program_files));
        paths.push(PathBuf::from(&program_files).join("Emulators"));
    }

    if let Ok(program_files_x86) = env::var("ProgramFiles(x86)") {
        paths.push(PathBuf::from(&program_files_x86));
    }

    if let Ok(local_app_data) = env::var("LOCALAPPDATA") {
        paths.push(PathBuf::from(&local_app_data));
        paths.push(PathBuf::from(&local_app_data).join("Programs"));
    }

    if let Ok(app_data) = env::var("APPDATA") {
        paths.push(PathBuf::from(&app_data));
    }

    if let Ok(user_profile) = env::var("USERPROFILE") {
        let user_path = PathBuf::from(&user_profile);
        paths.push(user_path.join("Emulators"));
        paths.push(user_path.join("Games").join("Emulators"));
        paths.push(user_path.join("Downloads"));
    }

    for drive in &['C', 'D', 'E', 'F'] {
        let drive_path = PathBuf::from(format!("{}:", drive));
        if drive_path.exists() {
            paths.push(drive_path.join("Emulators"));
            paths.push(drive_path.join("Games").join("Emulators"));
        }
    }

    paths
}

#[cfg(not(windows))]
fn get_common_install_paths() -> Vec<PathBuf> {
    Vec::new()
}

pub fn find_retroarch_cores(retroarch_path: &PathBuf) -> Vec<RetroArchCore> {
    let mut cores = Vec::new();

    let cores_dir = retroarch_path
        .parent()
        .map(|p| p.join("cores"))
        .unwrap_or_else(|| PathBuf::from("cores"));

    if cores_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&cores_dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let path = entry.path();
                if path.extension().map(|e| e == "dll").unwrap_or(false) {
                    if let Some(name) = path.file_stem().and_then(|n| n.to_str()) {
                        cores.push(RetroArchCore {
                            name: name.to_string(),
                            path,
                        });
                    }
                }
            }
        }
    }

    cores
}

#[derive(Debug, Clone)]
pub struct RetroArchCore {
    pub name: String,
    pub path: PathBuf,
}
