use anyhow::{Context, Result};
use rusqlite::params;

use super::Database;
use crate::models::Platform;

impl Database {
    pub fn insert_platform(&self, platform: &Platform) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            r#"
            INSERT OR REPLACE INTO platforms (id, name, short_name, extensions, logo_path, sort_order)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            "#,
            params![
                platform.id,
                platform.name,
                platform.short_name,
                serde_json::to_string(&platform.extensions).unwrap_or_default(),
                platform.logo_path,
                platform.sort_order,
            ],
        )
        .context("Failed to insert platform")?;

        Ok(())
    }

    pub fn get_all_platforms(&self) -> Result<Vec<Platform>> {
        let conn = self.conn.lock().unwrap();

        let mut stmt = conn
            .prepare("SELECT * FROM platforms ORDER BY sort_order, name")
            .context("Failed to prepare statement")?;

        let platforms = stmt
            .query_map([], |row: &rusqlite::Row| {
                let extensions_json: String = row.get("extensions")?;
                let extensions: Vec<String> =
                    serde_json::from_str(&extensions_json).unwrap_or_default();

                Ok(Platform {
                    id: row.get("id")?,
                    name: row.get("name")?,
                    short_name: row.get("short_name")?,
                    extensions,
                    logo_path: row.get("logo_path")?,
                    sort_order: row.get("sort_order")?,
                })
            })
            .context("Failed to query platforms")?
            .filter_map(|r| r.ok())
            .collect();

        Ok(platforms)
    }

    pub fn get_platform(&self, id: &str) -> Result<Option<Platform>> {
        let conn = self.conn.lock().unwrap();

        let mut stmt = conn
            .prepare("SELECT * FROM platforms WHERE id = ?1")
            .context("Failed to prepare statement")?;

        let platform = stmt
            .query_row(params![id], |row: &rusqlite::Row| {
                let extensions_json: String = row.get("extensions")?;
                let extensions: Vec<String> =
                    serde_json::from_str(&extensions_json).unwrap_or_default();

                Ok(Platform {
                    id: row.get("id")?,
                    name: row.get("name")?,
                    short_name: row.get("short_name")?,
                    extensions,
                    logo_path: row.get("logo_path")?,
                    sort_order: row.get("sort_order")?,
                })
            })
            .optional()
            .context("Failed to query platform")?;

        Ok(platform)
    }

    pub fn initialize_default_platforms(&self) -> Result<()> {
        let platforms = crate::models::default_platforms();

        for (i, mut platform) in platforms.into_iter().enumerate() {
            platform.sort_order = i as i32;
            self.insert_platform(&platform)?;
        }

        Ok(())
    }

    pub fn get_platforms_with_games(&self) -> Result<Vec<(Platform, i32)>> {
        let conn = self.conn.lock().unwrap();

        let mut stmt = conn
            .prepare(
                r#"
                SELECT p.*, COUNT(g.id) as game_count
                FROM platforms p
                LEFT JOIN games g ON g.platform_id = p.id AND g.is_hidden = 0
                GROUP BY p.id
                HAVING game_count > 0
                ORDER BY p.sort_order, p.name
                "#,
            )
            .context("Failed to prepare statement")?;

        let platforms = stmt
            .query_map([], |row: &rusqlite::Row| {
                let extensions_json: String = row.get("extensions")?;
                let extensions: Vec<String> =
                    serde_json::from_str(&extensions_json).unwrap_or_default();

                let platform = Platform {
                    id: row.get("id")?,
                    name: row.get("name")?,
                    short_name: row.get("short_name")?,
                    extensions,
                    logo_path: row.get("logo_path")?,
                    sort_order: row.get("sort_order")?,
                };

                let count: i32 = row.get("game_count")?;

                Ok((platform, count))
            })
            .context("Failed to query platforms")?
            .filter_map(|r| r.ok())
            .collect();

        Ok(platforms)
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
