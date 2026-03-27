use anyhow::{Context, Result};
use rusqlite::{Connection, params};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use crate::config::AppConfig;

pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Database {
    pub fn open() -> Result<Self> {
        let db_path = Self::database_path()?;

        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).context("Failed to create database directory")?;
        }

        let conn = Connection::open(&db_path).context("Failed to open database")?;

        let db = Self {
            conn: Arc::new(Mutex::new(conn)),
        };

        db.initialize()?;

        Ok(db)
    }

    pub fn open_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory().context("Failed to open in-memory database")?;

        let db = Self {
            conn: Arc::new(Mutex::new(conn)),
        };

        db.initialize()?;

        Ok(db)
    }

    fn database_path() -> Result<PathBuf> {
        Ok(AppConfig::data_dir()?.join("wingosy.db"))
    }

    fn initialize(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS platforms (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                short_name TEXT,
                extensions TEXT NOT NULL,
                logo_path TEXT,
                sort_order INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                platform_id TEXT NOT NULL,
                name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                source TEXT NOT NULL DEFAULT 'local',
                romm_id INTEGER,
                summary TEXT,
                developer TEXT,
                publisher TEXT,
                release_year INTEGER,
                genres TEXT,
                player_count TEXT,
                cover_path TEXT,
                screenshot_paths TEXT,
                is_favorite INTEGER DEFAULT 0,
                is_hidden INTEGER DEFAULT 0,
                user_rating REAL,
                last_played_at TEXT,
                play_count INTEGER DEFAULT 0,
                play_time_minutes INTEGER DEFAULT 0,
                sync_state TEXT DEFAULT 'local_only',
                local_file_path TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (platform_id) REFERENCES platforms(id)
            );

            CREATE TABLE IF NOT EXISTS collections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                is_smart INTEGER DEFAULT 0,
                smart_filter TEXT,
                cover_path TEXT,
                sort_order INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS collection_games (
                collection_id INTEGER NOT NULL,
                game_id INTEGER NOT NULL,
                sort_order INTEGER DEFAULT 0,
                PRIMARY KEY (collection_id, game_id),
                FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
                FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS emulator_configs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                platform_id TEXT,
                game_id INTEGER,
                emulator_id TEXT NOT NULL,
                core_name TEXT,
                is_default INTEGER DEFAULT 0,
                FOREIGN KEY (platform_id) REFERENCES platforms(id),
                FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS saves (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id INTEGER NOT NULL,
                emulator_id TEXT NOT NULL,
                file_name TEXT NOT NULL,
                local_path TEXT,
                remote_path TEXT,
                local_modified TEXT,
                remote_modified TEXT,
                sync_state TEXT DEFAULT 'local_only',
                FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_games_platform ON games(platform_id);
            CREATE INDEX IF NOT EXISTS idx_games_name ON games(name);
            CREATE INDEX IF NOT EXISTS idx_games_favorite ON games(is_favorite);
            CREATE INDEX IF NOT EXISTS idx_games_last_played ON games(last_played_at);
            CREATE INDEX IF NOT EXISTS idx_games_romm_id ON games(romm_id);
            "#,
        )
        .context("Failed to initialize database schema")?;

        Ok(())
    }

    pub fn connection(&self) -> Arc<Mutex<Connection>> {
        Arc::clone(&self.conn)
    }
}

impl Clone for Database {
    fn clone(&self) -> Self {
        Self {
            conn: Arc::clone(&self.conn),
        }
    }
}
