use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum SyncState {
    #[default]
    LocalOnly,
    Synced,
    PendingUpload,
    PendingDownload,
    Conflict,
    RemoteOnly,
}

impl SyncState {
    pub fn icon(&self) -> &'static str {
        match self {
            SyncState::LocalOnly => "💾",
            SyncState::Synced => "✅",
            SyncState::PendingUpload => "⬆️",
            SyncState::PendingDownload => "⬇️",
            SyncState::Conflict => "⚠️",
            SyncState::RemoteOnly => "☁️",
        }
    }

    pub fn description(&self) -> &'static str {
        match self {
            SyncState::LocalOnly => "Local only",
            SyncState::Synced => "Synced",
            SyncState::PendingUpload => "Pending upload",
            SyncState::PendingDownload => "Pending download",
            SyncState::Conflict => "Sync conflict",
            SyncState::RemoteOnly => "Remote only",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncStatus {
    pub last_sync: Option<chrono::DateTime<chrono::Utc>>,
    pub pending_uploads: i32,
    pub pending_downloads: i32,
    pub conflicts: i32,
    pub is_syncing: bool,
}

impl Default for SyncStatus {
    fn default() -> Self {
        Self {
            last_sync: None,
            pending_uploads: 0,
            pending_downloads: 0,
            conflicts: 0,
            is_syncing: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveFile {
    pub id: i64,
    pub game_id: i64,
    pub emulator_id: String,
    pub file_name: String,
    pub local_path: Option<String>,
    pub remote_path: Option<String>,
    pub local_modified: Option<chrono::DateTime<chrono::Utc>>,
    pub remote_modified: Option<chrono::DateTime<chrono::Utc>>,
    pub sync_state: SyncState,
}
