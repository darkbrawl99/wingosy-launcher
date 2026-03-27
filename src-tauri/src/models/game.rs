use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use super::SyncState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Game {
    pub id: i64,
    pub platform_id: String,
    pub name: String,
    pub file_path: String,
    pub source: GameSource,
    pub romm_id: Option<i32>,

    // Metadata
    pub summary: Option<String>,
    pub developer: Option<String>,
    pub publisher: Option<String>,
    pub release_year: Option<i32>,
    pub genres: Vec<String>,
    pub player_count: Option<String>,

    // Media
    pub cover_path: Option<String>,
    pub screenshot_paths: Vec<String>,

    // User data
    pub is_favorite: bool,
    pub is_hidden: bool,
    pub user_rating: Option<f32>,
    pub last_played_at: Option<DateTime<Utc>>,
    pub play_count: i32,
    pub play_time_minutes: i32,

    // Sync
    pub sync_state: SyncState,
    pub local_file_path: Option<String>,
}

impl Game {
    pub fn new(name: String, file_path: String, platform_id: String) -> Self {
        Self {
            id: 0,
            platform_id,
            name,
            file_path,
            source: GameSource::Local,
            romm_id: None,
            summary: None,
            developer: None,
            publisher: None,
            release_year: None,
            genres: Vec::new(),
            player_count: None,
            cover_path: None,
            screenshot_paths: Vec::new(),
            is_favorite: false,
            is_hidden: false,
            user_rating: None,
            last_played_at: None,
            play_count: 0,
            play_time_minutes: 0,
            sync_state: SyncState::LocalOnly,
            local_file_path: None,
        }
    }

    pub fn formatted_play_time(&self) -> String {
        let hours = self.play_time_minutes / 60;
        let minutes = self.play_time_minutes % 60;
        if hours > 0 {
            format!("{}h {}m", hours, minutes)
        } else {
            format!("{}m", minutes)
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum GameSource {
    Local,
    RomM,
}

impl std::fmt::Display for GameSource {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            GameSource::Local => write!(f, "Local"),
            GameSource::RomM => write!(f, "RomM"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameFilter {
    pub platform_id: Option<String>,
    pub genre: Option<String>,
    pub favorites_only: bool,
    pub search_query: Option<String>,
    pub sort_by: GameSort,
    pub sort_descending: bool,
}

impl Default for GameFilter {
    fn default() -> Self {
        Self {
            platform_id: None,
            genre: None,
            favorites_only: false,
            search_query: None,
            sort_by: GameSort::Name,
            sort_descending: false,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum GameSort {
    Name,
    LastPlayed,
    PlayCount,
    PlayTime,
    ReleaseYear,
    RecentlyAdded,
    Rating,
}
