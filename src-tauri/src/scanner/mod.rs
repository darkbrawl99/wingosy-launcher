use anyhow::Result;
use std::path::{Path, PathBuf};
use tokio::sync::mpsc;
use walkdir::WalkDir;

use crate::models::{detect_platform_by_extension, Game, Platform};

#[derive(Debug, Clone)]
pub enum ScanEvent {
    Started { total_files: usize },
    Progress { current: usize, total: usize },
    GameFound { game: Game },
    Error { path: PathBuf, error: String },
    Completed { games_found: usize },
}

pub struct RomScanner {
    platforms: Vec<Platform>,
}

impl RomScanner {
    pub fn new(platforms: Vec<Platform>) -> Self {
        Self { platforms }
    }

    pub async fn scan(
        &self,
        directory: &Path,
        recursive: bool,
        tx: mpsc::Sender<ScanEvent>,
    ) -> Result<Vec<Game>> {
        let files = self.collect_files(directory, recursive)?;
        let total_files = files.len();

        tx.send(ScanEvent::Started { total_files })
            .await
            .ok();

        let mut games = Vec::new();

        for (index, file_path) in files.iter().enumerate() {
            tx.send(ScanEvent::Progress {
                current: index + 1,
                total: total_files,
            })
            .await
            .ok();

            match self.process_file(file_path) {
                Ok(Some(game)) => {
                    tx.send(ScanEvent::GameFound { game: game.clone() })
                        .await
                        .ok();
                    games.push(game);
                }
                Ok(None) => {}
                Err(e) => {
                    tx.send(ScanEvent::Error {
                        path: file_path.clone(),
                        error: e.to_string(),
                    })
                    .await
                    .ok();
                }
            }
        }

        tx.send(ScanEvent::Completed {
            games_found: games.len(),
        })
        .await
        .ok();

        Ok(games)
    }

    fn collect_files(&self, directory: &Path, recursive: bool) -> Result<Vec<PathBuf>> {
        let walker = if recursive {
            WalkDir::new(directory)
        } else {
            WalkDir::new(directory).max_depth(1)
        };

        let extensions: Vec<String> = self
            .platforms
            .iter()
            .flat_map(|p| p.extensions.clone())
            .map(|e| e.to_lowercase())
            .collect();

        let files: Vec<PathBuf> = walker
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().is_file())
            .filter(|e| {
                if let Some(ext) = e.path().extension() {
                    let ext_str = format!(".{}", ext.to_string_lossy().to_lowercase());
                    extensions.contains(&ext_str)
                } else {
                    false
                }
            })
            .map(|e| e.path().to_path_buf())
            .collect();

        Ok(files)
    }

    fn process_file(&self, file_path: &Path) -> Result<Option<Game>> {
        let extension = file_path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| format!(".{}", e.to_lowercase()))
            .unwrap_or_default();

        let platform_id = match detect_platform_by_extension(&extension) {
            Some(id) => id,
            None => return Ok(None),
        };

        let name = file_path
            .file_stem()
            .and_then(|n| n.to_str())
            .map(|n| clean_rom_name(n))
            .unwrap_or_else(|| "Unknown".to_string());

        let file_path_str = file_path.to_string_lossy().to_string();

        let game = Game::new(name, file_path_str.clone(), platform_id);

        Ok(Some(Game {
            local_file_path: Some(file_path_str),
            ..game
        }))
    }

    pub fn scan_single(&self, file_path: &Path) -> Result<Option<Game>> {
        self.process_file(file_path)
    }
}

fn clean_rom_name(name: &str) -> String {
    let mut result = name.to_string();

    let patterns = [
        (r"\s*\([^)]*\)", ""),
        (r"\s*\[[^\]]*\]", ""),
        (r"\s*\{[^}]*\}", ""),
    ];

    for (pattern, replacement) in patterns {
        if let Ok(re) = regex_lite::Regex::new(pattern) {
            result = re.replace_all(&result, replacement).to_string();
        }
    }

    result = result.replace('_', " ");

    result.split_whitespace().collect::<Vec<_>>().join(" ")
}

pub fn detect_multi_disc(name: &str) -> Option<(String, u8)> {
    let patterns = [
        r"(?i)\s*\(disc\s*(\d+)\)",
        r"(?i)\s*\(cd\s*(\d+)\)",
        r"(?i)\s*disc\s*(\d+)",
        r"(?i)\s*cd\s*(\d+)",
        r"(?i)\s*d(\d+)$",
    ];

    for pattern in patterns {
        if let Ok(re) = regex_lite::Regex::new(pattern) {
            if let Some(caps) = re.captures(name) {
                if let Some(disc_num) = caps.get(1) {
                    if let Ok(num) = disc_num.as_str().parse::<u8>() {
                        let base_name = re.replace(name, "").trim().to_string();
                        return Some((base_name, num));
                    }
                }
            }
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clean_rom_name() {
        assert_eq!(
            clean_rom_name("Final Fantasy VII (USA) (Disc 1)"),
            "Final Fantasy VII"
        );
        assert_eq!(
            clean_rom_name("Chrono_Trigger_(USA)"),
            "Chrono Trigger"
        );
        assert_eq!(
            clean_rom_name("Legend of Zelda, The [USA] [Rev 1]"),
            "Legend of Zelda, The"
        );
    }

    #[test]
    fn test_detect_multi_disc() {
        let (name, disc) = detect_multi_disc("Final Fantasy VII (Disc 1)").unwrap();
        assert_eq!(name, "Final Fantasy VII");
        assert_eq!(disc, 1);

        let (name, disc) = detect_multi_disc("Metal Gear Solid CD2").unwrap();
        assert_eq!(name, "Metal Gear Solid");
        assert_eq!(disc, 2);
    }
}
