use anyhow::{Context, Result, bail};
use std::path::Path;
use std::process::Command;
use std::time::Instant;

use crate::config::AppConfig;
use crate::database::Database;
use crate::models::{Emulator, Game, retroarch_cores};

pub struct EmulatorLauncher {
    config: AppConfig,
    db: Database,
}

impl EmulatorLauncher {
    pub fn new(config: AppConfig, db: Database) -> Self {
        Self { config, db }
    }

    pub async fn launch(&self, game: &Game) -> Result<LaunchResult> {
        let emulator = self.resolve_emulator(game)?;

        let rom_path = game
            .local_file_path
            .as_ref()
            .or(Some(&game.file_path))
            .context("No ROM path available")?;

        if !Path::new(rom_path).exists() {
            return Ok(LaunchResult::FileNotFound(rom_path.clone()));
        }

        let (exe_path, args) = emulator
            .build_launch_command(rom_path)
            .context("Failed to build launch command")?;

        if !exe_path.exists() {
            return Ok(LaunchResult::EmulatorNotInstalled {
                name: emulator.name.clone(),
                id: emulator.id.clone(),
            });
        }

        tracing::info!(
            "Launching {} with {}: {:?} {:?}",
            game.name,
            emulator.name,
            exe_path,
            args
        );

        let start_time = Instant::now();

        let mut child = Command::new(&exe_path)
            .args(&args)
            .spawn()
            .context("Failed to launch emulator")?;

        let status = child.wait().context("Failed to wait for emulator")?;

        let duration = start_time.elapsed();
        let duration_minutes = (duration.as_secs() / 60) as i32;

        if duration_minutes > 0 {
            self.db.record_play_session(game.id, duration_minutes)?;
        }

        Ok(LaunchResult::Success {
            duration_minutes,
            exit_code: status.code(),
        })
    }

    fn resolve_emulator(&self, game: &Game) -> Result<Emulator> {
        if let Ok(Some(config)) = self.db.get_emulator_for_game(game.id, &game.platform_id) {
            let mut emulators = crate::models::default_emulators();
            
            if let Some(mut emu) = emulators.into_iter().find(|e| e.id == config.emulator_id) {
                emu.executable_path = self.get_emulator_path(&emu.id);
                emu.core_name = config.core_name;
                return Ok(emu);
            }
        }

        let mut emulators = crate::models::default_emulators();
        
        for emu in &mut emulators {
            if emu.supported_platforms.contains(&game.platform_id)
                || emu.supported_platforms.contains(&"*".to_string())
            {
                emu.executable_path = self.get_emulator_path(&emu.id);
                
                if emu.is_retroarch {
                    if let Some(core) = retroarch_cores().get(&game.platform_id) {
                        emu.core_name = Some(core.to_string());
                    }
                }
                
                if emu.executable_path.is_some() {
                    return Ok(emu.clone());
                }
            }
        }

        if let Some(retroarch) = emulators.iter_mut().find(|e| e.id == "retroarch") {
            retroarch.executable_path = self.get_emulator_path("retroarch");
            if let Some(core) = retroarch_cores().get(&game.platform_id) {
                retroarch.core_name = Some(core.to_string());
            }
            if retroarch.executable_path.is_some() {
                return Ok(retroarch.clone());
            }
        }

        bail!(
            "No emulator configured for platform: {}",
            game.platform_id
        )
    }

    fn get_emulator_path(&self, emulator_id: &str) -> Option<std::path::PathBuf> {
        match emulator_id {
            "retroarch" => self.config.emulators.retroarch.clone(),
            "dolphin" => self.config.emulators.dolphin.clone(),
            "pcsx2" => self.config.emulators.pcsx2.clone(),
            "rpcs3" => self.config.emulators.rpcs3.clone(),
            "ppsspp" => self.config.emulators.ppsspp.clone(),
            "duckstation" => self.config.emulators.duckstation.clone(),
            "cemu" => self.config.emulators.cemu.clone(),
            "yuzu" => self.config.emulators.yuzu.clone(),
            "ryujinx" => self.config.emulators.ryujinx.clone(),
            "citra" => self.config.emulators.citra.clone(),
            "melonds" => self.config.emulators.melonds.clone(),
            "mgba" => self.config.emulators.mgba.clone(),
            "flycast" => self.config.emulators.flycast.clone(),
            "xemu" => self.config.emulators.xemu.clone(),
            "xenia" => self.config.emulators.xenia.clone(),
            "mame" => self.config.emulators.mame.clone(),
            _ => None,
        }
    }

    pub fn get_available_emulators_for_platform(&self, platform_id: &str) -> Vec<Emulator> {
        let mut emulators = crate::models::default_emulators();
        
        emulators
            .into_iter()
            .filter(|e| {
                e.supported_platforms.contains(&platform_id.to_string())
                    || e.supported_platforms.contains(&"*".to_string())
            })
            .map(|mut e| {
                e.executable_path = self.get_emulator_path(&e.id);
                e.is_installed = e.executable_path.as_ref().map(|p| p.exists()).unwrap_or(false);
                e
            })
            .collect()
    }
}

#[derive(Debug, Clone)]
pub enum LaunchResult {
    Success {
        duration_minutes: i32,
        exit_code: Option<i32>,
    },
    FileNotFound(String),
    EmulatorNotInstalled {
        name: String,
        id: String,
    },
    EmulatorNotConfigured {
        platform: String,
    },
}

impl LaunchResult {
    pub fn is_success(&self) -> bool {
        matches!(self, LaunchResult::Success { .. })
    }

    pub fn error_message(&self) -> Option<String> {
        match self {
            LaunchResult::Success { .. } => None,
            LaunchResult::FileNotFound(path) => Some(format!("ROM file not found: {}", path)),
            LaunchResult::EmulatorNotInstalled { name, .. } => {
                Some(format!("{} is not installed", name))
            }
            LaunchResult::EmulatorNotConfigured { platform } => {
                Some(format!("No emulator configured for {}", platform))
            }
        }
    }
}
