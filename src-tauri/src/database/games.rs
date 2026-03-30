use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use rusqlite::{params, Row};

use super::Database;
use crate::models::{Game, GameFilter, GameSort, GameSource, SyncState};

impl Database {
    pub fn insert_game(&self, game: &Game) -> Result<i64> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            r#"
            INSERT INTO games (
                platform_id, name, file_path, source, romm_id,
                summary, developer, publisher, release_year, genres, player_count,
                cover_path, screenshot_paths,
                is_favorite, is_hidden, user_rating,
                last_played_at, play_count, play_time_minutes,
                sync_state, local_file_path
            ) VALUES (
                ?1, ?2, ?3, ?4, ?5,
                ?6, ?7, ?8, ?9, ?10, ?11,
                ?12, ?13,
                ?14, ?15, ?16,
                ?17, ?18, ?19,
                ?20, ?21
            )
            "#,
            params![
                game.platform_id,
                game.name,
                game.file_path,
                game.source.to_db_str(),
                game.romm_id,
                game.summary,
                game.developer,
                game.publisher,
                game.release_year,
                serde_json::to_string(&game.genres).ok(),
                game.player_count,
                game.cover_path,
                serde_json::to_string(&game.screenshot_paths).ok(),
                game.is_favorite,
                game.is_hidden,
                game.user_rating,
                game.last_played_at.map(|d| d.to_rfc3339()),
                game.play_count,
                game.play_time_minutes,
                game.sync_state.to_db_str(),
                game.local_file_path,
            ],
        )
        .context("Failed to insert game")?;

        Ok(conn.last_insert_rowid())
    }

    pub fn update_game(&self, game: &Game) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            r#"
            UPDATE games SET
                platform_id = ?2,
                name = ?3,
                file_path = ?4,
                source = ?5,
                romm_id = ?6,
                summary = ?7,
                developer = ?8,
                publisher = ?9,
                release_year = ?10,
                genres = ?11,
                player_count = ?12,
                cover_path = ?13,
                screenshot_paths = ?14,
                is_favorite = ?15,
                is_hidden = ?16,
                user_rating = ?17,
                last_played_at = ?18,
                play_count = ?19,
                play_time_minutes = ?20,
                sync_state = ?21,
                local_file_path = ?22,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?1
            "#,
            params![
                game.id,
                game.platform_id,
                game.name,
                game.file_path,
                game.source.to_db_str(),
                game.romm_id,
                game.summary,
                game.developer,
                game.publisher,
                game.release_year,
                serde_json::to_string(&game.genres).ok(),
                game.player_count,
                game.cover_path,
                serde_json::to_string(&game.screenshot_paths).ok(),
                game.is_favorite,
                game.is_hidden,
                game.user_rating,
                game.last_played_at.map(|d| d.to_rfc3339()),
                game.play_count,
                game.play_time_minutes,
                game.sync_state.to_db_str(),
                game.local_file_path,
            ],
        )
        .context("Failed to update game")?;

        Ok(())
    }

    pub fn get_game(&self, id: i64) -> Result<Option<Game>> {
        let conn = self.conn.lock().unwrap();

        let mut stmt = conn
            .prepare("SELECT * FROM games WHERE id = ?1")
            .context("Failed to prepare statement")?;

        let game = stmt
            .query_row(params![id], |row: &Row| Ok(Self::row_to_game(row)))
            .optional()
            .context("Failed to query game")?;

        match game {
            Some(Ok(g)) => Ok(Some(g)),
            Some(Err(e)) => Err(e),
            None => Ok(None),
        }
    }

    pub fn get_game_by_romm_id(&self, romm_id: i32) -> Result<Option<Game>> {
        let conn = self.conn.lock().unwrap();

        let mut stmt = conn
            .prepare("SELECT * FROM games WHERE romm_id = ?1")
            .context("Failed to prepare statement")?;

        let game = stmt
            .query_row(params![romm_id], |row: &Row| Ok(Self::row_to_game(row)))
            .optional()
            .context("Failed to query game")?;

        match game {
            Some(Ok(g)) => Ok(Some(g)),
            Some(Err(e)) => Err(e),
            None => Ok(None),
        }
    }

    pub fn get_all_games(&self) -> Result<Vec<Game>> {
        let conn = self.conn.lock().unwrap();

        let mut stmt = conn
            .prepare("SELECT * FROM games WHERE is_hidden = 0 ORDER BY name")
            .context("Failed to prepare statement")?;

        let games = stmt
            .query_map([], |row: &Row| Ok(Self::row_to_game(row)))
            .context("Failed to query games")?
            .filter_map(|r| r.ok().and_then(|g| g.ok()))
            .collect();

        Ok(games)
    }

    pub fn get_games_filtered(&self, filter: &GameFilter) -> Result<Vec<Game>> {
        let conn = self.conn.lock().unwrap();

        let mut sql = String::from("SELECT * FROM games WHERE 1=1");
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if !filter.favorites_only {
            sql.push_str(" AND is_hidden = 0");
        }

        if let Some(ref platform_id) = filter.platform_id {
            sql.push_str(" AND platform_id = ?");
            params_vec.push(Box::new(platform_id.clone()));
        }

        if filter.favorites_only {
            sql.push_str(" AND is_favorite = 1");
        }

        if let Some(ref query) = filter.search_query {
            sql.push_str(" AND name LIKE ?");
            params_vec.push(Box::new(format!("%{}%", query)));
        }

        let order = match filter.sort_by {
            GameSort::Name => "name",
            GameSort::LastPlayed => "last_played_at",
            GameSort::PlayCount => "play_count",
            GameSort::PlayTime => "play_time_minutes",
            GameSort::ReleaseYear => "release_year",
            GameSort::RecentlyAdded => "created_at",
            GameSort::Rating => "user_rating",
        };

        let direction = if filter.sort_descending { "DESC" } else { "ASC" };
        sql.push_str(&format!(" ORDER BY {} {} NULLS LAST", order, direction));

        let mut stmt = conn.prepare(&sql).context("Failed to prepare statement")?;

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

        let games = stmt
            .query_map(params_refs.as_slice(), |row: &Row| Ok(Self::row_to_game(row)))
            .context("Failed to query games")?
            .filter_map(|r| r.ok().and_then(|g| g.ok()))
            .collect();

        Ok(games)
    }

    pub fn get_recent_games(&self, limit: i32) -> Result<Vec<Game>> {
        let conn = self.conn.lock().unwrap();

        let mut stmt = conn
            .prepare(
                "SELECT * FROM games WHERE last_played_at IS NOT NULL AND is_hidden = 0 
                 ORDER BY last_played_at DESC LIMIT ?1",
            )
            .context("Failed to prepare statement")?;

        let games = stmt
            .query_map(params![limit], |row: &Row| Ok(Self::row_to_game(row)))
            .context("Failed to query games")?
            .filter_map(|r| r.ok().and_then(|g| g.ok()))
            .collect();

        Ok(games)
    }

    pub fn get_favorite_games(&self) -> Result<Vec<Game>> {
        let conn = self.conn.lock().unwrap();

        let mut stmt = conn
            .prepare("SELECT * FROM games WHERE is_favorite = 1 AND is_hidden = 0 ORDER BY name")
            .context("Failed to prepare statement")?;

        let games = stmt
            .query_map([], |row: &Row| Ok(Self::row_to_game(row)))
            .context("Failed to query games")?
            .filter_map(|r| r.ok().and_then(|g| g.ok()))
            .collect();

        Ok(games)
    }

    pub fn set_favorite(&self, game_id: i64, is_favorite: bool) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            "UPDATE games SET is_favorite = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
            params![game_id, is_favorite],
        )
        .context("Failed to update favorite status")?;

        Ok(())
    }

    pub fn record_play_session(&self, game_id: i64, duration_minutes: i32) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            r#"
            UPDATE games SET
                last_played_at = CURRENT_TIMESTAMP,
                play_count = play_count + 1,
                play_time_minutes = play_time_minutes + ?2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?1
            "#,
            params![game_id, duration_minutes],
        )
        .context("Failed to record play session")?;

        Ok(())
    }

    pub fn upsert_game(&self, game: &Game) -> Result<i64> {
        if let Some(romm_id) = game.romm_id {
            if let Some(existing) = self.get_game_by_romm_id(romm_id)? {
                let mut updated = game.clone();
                updated.id = existing.id;
                updated.is_favorite = existing.is_favorite;
                updated.play_count = existing.play_count;
                updated.play_time_minutes = existing.play_time_minutes;
                updated.last_played_at = existing.last_played_at;
                self.update_game(&updated)?;
                return Ok(existing.id);
            }
        }
        self.insert_game(game)
    }

    pub fn delete_game(&self, game_id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute("DELETE FROM games WHERE id = ?1", params![game_id])
            .context("Failed to delete game")?;

        Ok(())
    }

    fn row_to_game(row: &Row) -> Result<Game> {
        let source_str: String = row.get("source")?;
        let source = GameSource::from_db_str(&source_str);

        let sync_state_str: String = row.get("sync_state")?;
        let sync_state = SyncState::from_db_str(&sync_state_str);

        let genres_json: Option<String> = row.get("genres")?;
        let genres: Vec<String> = genres_json
            .and_then(|j: String| serde_json::from_str(&j).ok())
            .unwrap_or_default();

        let screenshots_json: Option<String> = row.get("screenshot_paths")?;
        let screenshot_paths: Vec<String> = screenshots_json
            .and_then(|j: String| serde_json::from_str(&j).ok())
            .unwrap_or_default();

        let last_played_str: Option<String> = row.get("last_played_at")?;
        let last_played_at = last_played_str.and_then(|s: String| DateTime::parse_from_rfc3339(&s).ok().map(|d| d.with_timezone(&Utc)));

        Ok(Game {
            id: row.get("id")?,
            platform_id: row.get("platform_id")?,
            name: row.get("name")?,
            file_path: row.get("file_path")?,
            source,
            romm_id: row.get("romm_id")?,
            summary: row.get("summary")?,
            developer: row.get("developer")?,
            publisher: row.get("publisher")?,
            release_year: row.get("release_year")?,
            genres,
            player_count: row.get("player_count")?,
            cover_path: row.get("cover_path")?,
            screenshot_paths,
            is_favorite: row.get("is_favorite")?,
            is_hidden: row.get("is_hidden")?,
            user_rating: row.get("user_rating")?,
            last_played_at,
            play_count: row.get("play_count")?,
            play_time_minutes: row.get("play_time_minutes")?,
            sync_state,
            local_file_path: row.get("local_file_path")?,
        })
    }

    /// Set the hidden status of a game
    pub fn set_hidden(&self, game_id: i64, is_hidden: bool) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE games SET is_hidden = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
            params![game_id, is_hidden],
        )
        .context("Failed to update hidden status")?;
        Ok(())
    }

    /// Get all hidden games
    pub fn get_hidden_games(&self) -> Result<Vec<Game>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn
            .prepare("SELECT * FROM games WHERE is_hidden = 1 ORDER BY name")
            .context("Failed to prepare statement")?;

        let games = stmt
            .query_map([], |row: &Row| Ok(Self::row_to_game(row)))
            .context("Failed to query games")?
            .filter_map(|r| r.ok().and_then(|g| g.ok()))
            .collect();

        Ok(games)
    }

    /// Clear the local file path (after deleting the ROM)
    pub fn clear_local_path(&self, game_id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE games SET local_file_path = NULL, sync_state = 'remote_only', updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
            params![game_id],
        )
        .context("Failed to clear local path")?;
        Ok(())
    }
}

trait OptionalExt<T> {
    fn optional(self) -> Result<Option<T>, rusqlite::Error>;
}

impl<T> OptionalExt<T> for std::result::Result<T, rusqlite::Error> {
    fn optional(self) -> Result<Option<T>, rusqlite::Error> {
        match self {
            Ok(v) => Ok(Some(v)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{Game, GameSource, SyncState};

    fn create_test_game(name: &str) -> Game {
        Game {
            id: 0,
            platform_id: "gba".to_string(),
            name: name.to_string(),
            file_path: String::new(),
            source: GameSource::Local,
            romm_id: None,
            summary: None,
            developer: None,
            publisher: None,
            release_year: None,
            genres: vec![],
            player_count: None,
            cover_path: None,
            screenshot_paths: vec![],
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

    #[test]
    fn test_game_filter_default() {
        let filter = GameFilter::default();
        assert!(filter.platform_id.is_none());
        assert!(filter.genre.is_none());
        assert!(filter.search_query.is_none());
        assert!(!filter.favorites_only);
        assert!(!filter.sort_descending);
    }

    #[test]
    fn test_game_sort_variants() {
        let sorts = [
            GameSort::Name,
            GameSort::LastPlayed,
            GameSort::PlayCount,
            GameSort::PlayTime,
            GameSort::ReleaseYear,
            GameSort::RecentlyAdded,
            GameSort::Rating,
        ];
        assert_eq!(sorts.len(), 7);
    }

    #[test]
    fn test_create_test_game_defaults() {
        let game = create_test_game("Test Game");
        assert_eq!(game.name, "Test Game");
        assert_eq!(game.platform_id, "gba");
        assert!(!game.is_favorite);
        assert!(!game.is_hidden);
        assert_eq!(game.play_count, 0);
    }

    #[test]
    fn test_game_with_hidden_flag() {
        let mut game = create_test_game("Hidden Game");
        game.is_hidden = true;
        assert!(game.is_hidden);
    }

    #[test]
    fn test_game_with_romm_id() {
        let mut game = create_test_game("RomM Game");
        game.romm_id = Some(123);
        game.source = GameSource::RomM;
        assert_eq!(game.romm_id, Some(123));
        assert!(matches!(game.source, GameSource::RomM));
    }

    #[test]
    fn test_game_with_local_file_path() {
        let mut game = create_test_game("Local Game");
        game.local_file_path = Some("C:\\ROMs\\game.gba".to_string());
        game.sync_state = SyncState::Synced;
        assert!(game.local_file_path.is_some());
        assert!(matches!(game.sync_state, SyncState::Synced));
    }

    #[test]
    fn test_sync_state_variants() {
        let states = [
            SyncState::LocalOnly,
            SyncState::RemoteOnly,
            SyncState::Synced,
            SyncState::PendingUpload,
            SyncState::PendingDownload,
            SyncState::Conflict,
        ];
        assert_eq!(states.len(), 6);
    }

    #[test]
    fn test_game_source_to_db_str() {
        assert_eq!(GameSource::Local.to_db_str(), "local");
        assert_eq!(GameSource::RomM.to_db_str(), "romm");
    }
}
