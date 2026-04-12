use anyhow::{Context, Result};
use chrono::Datelike;
use reqwest::Client;
use serde::{Deserialize, Serialize};
#[derive(Debug, Clone)]
pub struct RomMClient {
    client: Client,
    base_url: String,
    token: Option<String>,
}

impl RomMClient {
    pub fn new(base_url: impl Into<String>) -> Self {
        let client = Client::builder()
            .cookie_store(true)
            .timeout(std::time::Duration::from_secs(120)) // 2 minute timeout for slow servers
            .build()
            .unwrap_or_else(|_| Client::new());

        Self {
            client,
            base_url: base_url.into().trim_end_matches('/').to_string(),
            token: None,
        }
    }

    pub fn with_token(mut self, token: String) -> Self {
        self.token = Some(token);
        self
    }

    pub async fn authenticate(&mut self, username: &str, password: &str) -> Result<TokenResponse> {
        tracing::info!("[RomM] Authenticating user '{}' at {}", username, self.base_url);
        
        let response = self
            .client
            .post(format!("{}/api/token", self.base_url))
            .form(&[
                ("username", username),
                ("password", password),
                ("grant_type", "password"),
                ("scope", "me.read me.write roms.read platforms.read roms.user.read roms.user.write"),
            ])
            .send()
            .await
            .context("Failed to connect to RomM server")?;

        let status = response.status();
        if !status.is_success() {
            tracing::error!("[RomM] Authentication failed: HTTP {}", status);
            anyhow::bail!("Authentication failed: HTTP {}", status);
        }

        let token: TokenResponse = response
            .json()
            .await
            .context("Failed to parse authentication response")?;

        self.token = Some(token.access_token.clone());
        tracing::info!("[RomM] Authentication successful for '{}'", username);
        Ok(token)
    }

    fn auth_header(&self) -> Option<String> {
        self.token.as_ref().map(|t| format!("Bearer {}", t))
    }

    pub async fn get_platforms(&self) -> Result<Vec<RomMPlatform>> {
        tracing::debug!("[RomM] Fetching platforms from {}", self.base_url);
        
        let mut request = self.client.get(format!("{}/api/platforms", self.base_url));

        if let Some(auth) = self.auth_header() {
            request = request.header("Authorization", auth);
        }

        let response = request.send().await.context("Failed to fetch platforms")?;

        let status = response.status();
        let text = response.text().await.context("Failed to read platforms response body")?;

        if !status.is_success() {
            tracing::error!("[RomM] Platforms API returned {}", status);
            anyhow::bail!("Platforms API returned {}: {}", status, &text[..text.len().min(200)]);
        }

        let platforms: Vec<RomMPlatform> = serde_json::from_str(&text).context(format!(
            "Failed to parse platforms JSON (first 300 chars): {}",
            &text[..text.len().min(300)]
        ))?;
        
        tracing::info!("[RomM] Found {} platforms", platforms.len());
        Ok(platforms)
    }

    pub async fn get_roms(
        &self,
        platform_id: Option<i32>,
        limit: i32,
        offset: i32,
    ) -> Result<PaginatedResponse<RomMRom>> {
        tracing::debug!("[RomM] Fetching ROMs (platform_id={:?}, limit={}, offset={})", platform_id, limit, offset);
        
        let mut request = self
            .client
            .get(format!("{}/api/roms", self.base_url))
            .query(&[("limit", limit.to_string()), ("offset", offset.to_string())]);

        if let Some(pid) = platform_id {
            request = request.query(&[("platform_id", pid.to_string())]);
        }

        if let Some(auth) = self.auth_header() {
            request = request.header("Authorization", auth);
        }

        let response = request.send().await.context("Failed to fetch ROMs")?;

        let status = response.status();
        let text = response.text().await.context("Failed to read ROMs response body")?;

        if !status.is_success() {
            tracing::error!("[RomM] ROMs API returned {}", status);
            anyhow::bail!("ROMs API returned {}: {}", status, &text[..text.len().min(200)]);
        }

        let raw: serde_json::Value = serde_json::from_str(&text)
            .context("ROMs response is not valid JSON")?;

        let total = raw["total"].as_i64().unwrap_or(0) as i32;
        let items_raw = raw["items"].as_array()
            .context("ROMs response missing 'items' array")?;

        let base = self.base_url.clone();
        let items: Vec<RomMRom> = items_raw.iter().filter_map(|v| {
            let screenshots = screenshot_urls_from_rom_json(v, &base);
            Some(RomMRom {
                id: v["id"].as_i64()? as i32,
                platform_id: v["platform_id"].as_i64().unwrap_or(0) as i32,
                platform_slug: v["platform_slug"].as_str().unwrap_or("").to_string(),
                name: v["name"].as_str().unwrap_or("").to_string(),
                fs_name: v["fs_name"].as_str()
                    .or_else(|| v["file_name"].as_str())
                    .unwrap_or("").to_string(),
                fs_size_bytes: v["fs_size_bytes"].as_i64()
                    .or_else(|| v["file_size_bytes"].as_i64())
                    .unwrap_or(0),
                igdb_id: v["igdb_id"].as_i64().map(|x| x as i32),
                summary: v["summary"].as_str().map(|s| s.to_string()),
                url_cover: v["url_cover"].as_str().map(|s| s.to_string()),
                igdb_metadata: v.get("igdb_metadata")
                    .filter(|m| m.is_object() && !m.as_object().unwrap().is_empty())
                    .and_then(|m| serde_json::from_value(m.clone()).ok()),
                screenshots,
            })
        }).collect();

        tracing::info!("[RomM] Fetched {} ROMs (total: {})", items.len(), total);
        
        Ok(PaginatedResponse {
            items,
            total,
            page: raw["page"].as_i64().map(|x| x as i32),
            size: raw["size"].as_i64().map(|x| x as i32),
        })
    }

    pub async fn get_rom(&self, rom_id: i32) -> Result<RomMRom> {
        tracing::debug!("[RomM] Fetching ROM id={}", rom_id);
        
        let mut request = self
            .client
            .get(format!("{}/api/roms/{}", self.base_url, rom_id));

        if let Some(auth) = self.auth_header() {
            request = request.header("Authorization", auth);
        }

        let response = request.send().await.context("Failed to fetch ROM")?;
        
        let status = response.status();
        let text = response.text().await.context("Failed to read ROM response")?;
        
        if !status.is_success() {
            tracing::error!("[RomM] ROM API returned {}: {}", status, &text[..text.len().min(200)]);
            anyhow::bail!("ROM API returned {}", status);
        }
        
        // Parse with flexible field handling
        let raw: serde_json::Value = serde_json::from_str(&text)
            .context(format!("ROM response is not valid JSON: {}", &text[..text.len().min(100)]))?;
        
        let screenshots = screenshot_urls_from_rom_json(&raw, &self.base_url);
        let rom = RomMRom {
            id: raw["id"].as_i64().context("ROM missing 'id' field")? as i32,
            platform_id: raw["platform_id"].as_i64().unwrap_or(0) as i32,
            platform_slug: raw["platform_slug"].as_str().unwrap_or("").to_string(),
            name: raw["name"].as_str().unwrap_or("").to_string(),
            fs_name: raw["fs_name"].as_str()
                .or_else(|| raw["file_name"].as_str())
                .unwrap_or("").to_string(),
            fs_size_bytes: raw["fs_size_bytes"].as_i64()
                .or_else(|| raw["file_size_bytes"].as_i64())
                .unwrap_or(0),
            igdb_id: raw["igdb_id"].as_i64().map(|x| x as i32),
            summary: raw["summary"].as_str().map(|s| s.to_string()),
            url_cover: raw["url_cover"].as_str().map(|s| s.to_string()),
            igdb_metadata: raw.get("igdb_metadata")
                .filter(|m| m.is_object() && !m.as_object().unwrap().is_empty())
                .and_then(|m| serde_json::from_value(m.clone()).ok()),
            screenshots,
        };
        
        tracing::debug!("[RomM] Fetched ROM: {} (fs_name={})", rom.name, rom.fs_name);
        Ok(rom)
    }

    pub fn rom_download_url(&self, rom_id: i32, filename: &str) -> String {
        format!(
            "{}/api/roms/{}/content/{}",
            self.base_url, rom_id, filename
        )
    }

    pub fn cover_url(&self, rom_id: i32) -> String {
        format!("{}/api/roms/{}/cover", self.base_url, rom_id)
    }

    pub async fn get_saves(&self, rom_id: i32) -> Result<Vec<RomMSave>> {
        tracing::debug!("[RomM] Fetching saves for ROM id={}", rom_id);
        
        let mut request = self
            .client
            .get(format!("{}/api/roms/{}/saves", self.base_url, rom_id));

        if let Some(auth) = self.auth_header() {
            request = request.header("Authorization", auth);
        }

        let response = request.send().await.context("Failed to fetch saves")?;
        
        let status = response.status();
        let text = response.text().await.context("Failed to read saves response")?;
        
        if !status.is_success() {
            // 404 means saves feature might not be enabled or no saves exist
            if status.as_u16() == 404 {
                tracing::debug!("[RomM] Saves not available for ROM id={} (404)", rom_id);
                return Ok(vec![]);
            }
            tracing::error!("[RomM] Saves API returned {}: {}", status, &text[..text.len().min(200)]);
            anyhow::bail!("Saves API returned {}", status);
        }
        
        // Handle empty response (no saves)
        if text.is_empty() || text == "[]" || text == "null" {
            tracing::debug!("[RomM] No saves found for ROM id={}", rom_id);
            return Ok(vec![]);
        }
        
        // Try to parse as array first
        let raw: serde_json::Value = serde_json::from_str(&text)
            .context(format!("Saves response is not valid JSON: {}", &text[..text.len().min(100)]))?;
        
        // Handle both array and object with items field
        let saves_array = if raw.is_array() {
            raw.as_array().cloned().unwrap_or_default()
        } else if let Some(items) = raw.get("items").and_then(|v| v.as_array()) {
            items.clone()
        } else if let Some(saves) = raw.get("saves").and_then(|v| v.as_array()) {
            saves.clone()
        } else {
            tracing::warn!("[RomM] Unexpected saves response format: {}", &text[..text.len().min(200)]);
            return Ok(vec![]);
        };
        
        let saves: Vec<RomMSave> = saves_array.iter().filter_map(|v| {
            Some(RomMSave {
                id: v["id"].as_i64()? as i32,
                rom_id: v["rom_id"].as_i64().unwrap_or(rom_id as i64) as i32,
                file_name: v["file_name"].as_str()
                    .or_else(|| v["filename"].as_str())
                    .or_else(|| v["name"].as_str())
                    .unwrap_or("unknown")
                    .to_string(),
                file_size_bytes: v["file_size_bytes"].as_i64()
                    .or_else(|| v["size"].as_i64())
                    .unwrap_or(0),
                emulator: v["emulator"].as_str().map(|s| s.to_string()),
                created_at: v["created_at"].as_str()
                    .or_else(|| v["createdAt"].as_str())
                    .unwrap_or("")
                    .to_string(),
                updated_at: v["updated_at"].as_str()
                    .or_else(|| v["updatedAt"].as_str())
                    .unwrap_or("")
                    .to_string(),
            })
        }).collect();
        
        tracing::info!("[RomM] Found {} saves for ROM id={}", saves.len(), rom_id);
        Ok(saves)
    }

    pub async fn upload_save(&self, rom_id: i32, save_data: Vec<u8>, filename: &str) -> Result<()> {
        let part = reqwest::multipart::Part::bytes(save_data).file_name(filename.to_string());

        let form = reqwest::multipart::Form::new().part("file", part);

        let mut request = self
            .client
            .post(format!("{}/api/roms/{}/saves", self.base_url, rom_id))
            .multipart(form);

        if let Some(auth) = self.auth_header() {
            request = request.header("Authorization", auth);
        }

        request.send().await.context("Failed to upload save")?;

        Ok(())
    }

    pub async fn download_save(&self, rom_id: i32, save_id: i32) -> Result<Vec<u8>> {
        let mut request = self.client.get(format!(
            "{}/api/roms/{}/saves/{}/content",
            self.base_url, rom_id, save_id
        ));

        if let Some(auth) = self.auth_header() {
            request = request.header("Authorization", auth);
        }

        let response = request.send().await.context("Failed to download save")?;

        response
            .bytes()
            .await
            .map(|b| b.to_vec())
            .context("Failed to read save data")
    }

    pub fn token(&self) -> Option<&str> {
        self.token.as_deref()
    }

    pub fn is_authenticated(&self) -> bool {
        self.token.is_some()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub token_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    pub total: i32,
    #[serde(default)]
    pub page: Option<i32>,
    #[serde(default)]
    pub size: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RomMPlatform {
    pub id: i32,
    #[serde(default)]
    pub slug: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub rom_count: i32,
    #[serde(default)]
    pub igdb_id: Option<i32>,
    #[serde(default)]
    pub url_logo: Option<String>,
    #[serde(default)]
    pub display_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IgdbMetadata {
    #[serde(default)]
    pub genres: Option<Vec<String>>,
    #[serde(default)]
    pub first_release_date: Option<i64>,
    #[serde(default)]
    pub aggregated_rating: Option<f64>,
    #[serde(default)]
    pub total_rating: Option<f64>,
    #[serde(default)]
    pub franchises: Option<Vec<String>>,
    #[serde(default)]
    pub companies: Option<Vec<String>>,
    /// IGDB game mode labels when RomM exposes them (e.g. Single player, Multiplayer).
    #[serde(default)]
    pub game_modes: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RomMRom {
    pub id: i32,
    #[serde(default)]
    pub platform_id: i32,
    #[serde(default)]
    pub platform_slug: String,
    #[serde(default)]
    pub name: String,
    #[serde(default, alias = "file_name")]
    pub fs_name: String,
    #[serde(default, alias = "file_size_bytes")]
    pub fs_size_bytes: i64,

    #[serde(default)]
    pub igdb_id: Option<i32>,
    #[serde(default)]
    pub summary: Option<String>,
    #[serde(default)]
    pub url_cover: Option<String>,
    #[serde(default)]
    pub igdb_metadata: Option<IgdbMetadata>,
    /// Resolved from RomM JSON (`screenshots`, `igdb_screenshots`, etc.); not serde-filled from list API.
    #[serde(default)]
    pub screenshots: Vec<String>,
}

impl RomMRom {
    pub fn has_cover(&self) -> bool {
        self.url_cover.is_some()
    }

    pub fn genres(&self) -> Vec<String> {
        self.igdb_metadata.as_ref()
            .and_then(|m| m.genres.clone())
            .unwrap_or_default()
    }

    pub fn first_release_date(&self) -> Option<i64> {
        self.igdb_metadata.as_ref()
            .and_then(|m| m.first_release_date)
    }

    pub fn aggregated_rating(&self) -> Option<f32> {
        self.igdb_metadata.as_ref()
            .and_then(|m| m.aggregated_rating.or(m.total_rating))
            .map(|r| r as f32)
    }

    pub fn into_game(self, server_url: &str) -> crate::models::Game {
        let platform_id = crate::models::map_romm_slug(&self.platform_slug);
        
        let release_year = self.first_release_date()
            .and_then(|ts| {
                chrono::DateTime::from_timestamp(ts, 0)
                    .map(|dt| dt.year())
            });

        let cover_path = self.url_cover.clone().map(|url| {
            if url.starts_with("http") {
                url
            } else {
                format!("{}{}", server_url.trim_end_matches('/'), url)
            }
        });

        let file_name = if self.fs_name.is_empty() { 
            self.name.clone() 
        } else { 
            self.fs_name.clone() 
        };

        let genres = self.genres();
        let rating = self.aggregated_rating();
        let (developer, publisher) = self
            .igdb_metadata
            .as_ref()
            .and_then(|m| m.companies.as_ref())
            .map(|c| {
                let dev = c.first().cloned();
                let pub_ = if c.len() > 1 {
                    c.get(1).cloned()
                } else {
                    None
                };
                (dev, pub_)
            })
            .unwrap_or((None, None));

        let player_count = self
            .igdb_metadata
            .as_ref()
            .and_then(|m| m.game_modes.as_ref())
            .filter(|modes| !modes.is_empty())
            .map(|modes| modes.join(", "));

        crate::models::Game {
            id: 0,
            platform_id,
            name: self.name,
            file_path: file_name,
            source: crate::models::GameSource::RomM,
            romm_id: Some(self.id),
            summary: self.summary,
            developer,
            publisher,
            release_year,
            genres,
            player_count,
            cover_path,
            screenshot_paths: self.screenshots,
            is_favorite: false,
            is_hidden: false,
            user_rating: rating,
            library_status: None,
            personal_rating: 0,
            personal_difficulty: 0,
            last_played_at: None,
            play_count: 0,
            play_time_minutes: 0,
            sync_state: crate::models::SyncState::RemoteOnly,
            local_file_path: None,
        }
    }
}

fn absolutize_media_url(path: &str, server_url: &str) -> String {
    let p = path.trim();
    if p.starts_with("http://") || p.starts_with("https://") {
        return p.to_string();
    }
    let base = server_url.trim_end_matches('/');
    if p.starts_with('/') {
        format!("{}{}", base, p)
    } else {
        format!("{}/{}", base, p)
    }
}

/// Collect screenshot / artwork URLs from a RomM `/api/roms` or `/api/roms/{id}` JSON object.
///
/// RomM’s OpenAPI exposes the on-disk / resolved gallery as **`merged_screenshots`** (same field Argosy
/// and the RomM web UI use). Older payloads may use `screenshots`, `url_screenshots`, etc.
fn screenshot_urls_from_rom_json(raw: &serde_json::Value, server_url: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut push = |u: &str| {
        let s = absolutize_media_url(u, server_url);
        if !s.is_empty() && !out.contains(&s) {
            out.push(s);
        }
    };

    // Primary: RomM 4.x SimpleRomSchema / DetailedRomSchema — cached files + IGDB URLs merged server-side
    if let Some(arr) = raw.get("merged_screenshots").and_then(|v| v.as_array()) {
        for item in arr {
            if let Some(s) = item.as_str() {
                push(s);
            }
        }
    }

    // Raw DB-style URL list (IGDB), when present alongside or instead of merged
    if let Some(arr) = raw.get("url_screenshots").and_then(|v| v.as_array()) {
        for item in arr {
            if let Some(s) = item.as_str() {
                push(s);
            }
        }
    }

    // Cached files on the RomM host (relative paths under resources), if API exposes them without merge
    if let Some(arr) = raw.get("path_screenshots").and_then(|v| v.as_array()) {
        for item in arr {
            if let Some(s) = item.as_str() {
                push(s);
            }
        }
    }

    // Legacy / alternate keys (objects or strings)
    for key in &["screenshots", "igdb_screenshots", "arts"] {
        if let Some(arr) = raw.get(*key).and_then(|v| v.as_array()) {
            for item in arr {
                if let Some(s) = item.as_str() {
                    push(s);
                } else if let Some(u) = item.get("url").and_then(|x| x.as_str()) {
                    push(u);
                } else if let Some(u) = item.get("url_cover").and_then(|x| x.as_str()) {
                    push(u);
                }
            }
        }
    }

    out
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RomMSave {
    pub id: i32,
    #[serde(default)]
    pub rom_id: i32,
    #[serde(default, alias = "filename", alias = "name")]
    pub file_name: String,
    #[serde(default, alias = "size")]
    pub file_size_bytes: i64,
    #[serde(default)]
    pub emulator: Option<String>,
    #[serde(default, alias = "createdAt")]
    pub created_at: String,
    #[serde(default, alias = "updatedAt")]
    pub updated_at: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn client_new_trims_trailing_slash() {
        let client = RomMClient::new("https://romm.example.com/");
        assert_eq!(client.base_url, "https://romm.example.com");
    }

    #[test]
    fn client_new_preserves_url_without_slash() {
        let client = RomMClient::new("https://romm.example.com");
        assert_eq!(client.base_url, "https://romm.example.com");
    }

    #[test]
    fn client_starts_unauthenticated() {
        let client = RomMClient::new("https://romm.example.com");
        assert!(!client.is_authenticated());
        assert!(client.token().is_none());
    }

    #[test]
    fn client_with_token_is_authenticated() {
        let client = RomMClient::new("https://romm.example.com")
            .with_token("test_token".into());
        assert!(client.is_authenticated());
        assert_eq!(client.token(), Some("test_token"));
    }

    #[test]
    fn rom_download_url_format() {
        let client = RomMClient::new("https://romm.example.com");
        let url = client.rom_download_url(123, "Super Mario Bros.nes");
        assert_eq!(url, "https://romm.example.com/api/roms/123/content/Super Mario Bros.nes");
    }

    #[test]
    fn cover_url_format() {
        let client = RomMClient::new("https://romm.example.com");
        let url = client.cover_url(456);
        assert_eq!(url, "https://romm.example.com/api/roms/456/cover");
    }

    #[test]
    fn screenshot_urls_read_merged_screenshots_like_romm_openapi() {
        let raw = serde_json::json!({
            "merged_screenshots": [
                "/assets/romm/resources/1/2/a.png",
                "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/xy.jpg"
            ]
        });
        let urls = screenshot_urls_from_rom_json(&raw, "https://romm.example.com");
        assert_eq!(urls.len(), 2);
        assert_eq!(
            urls[0],
            "https://romm.example.com/assets/romm/resources/1/2/a.png"
        );
        assert_eq!(
            urls[1],
            "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/xy.jpg"
        );
    }

    #[test]
    fn rom_has_cover_when_url_present() {
        let rom = RomMRom {
            id: 1,
            platform_id: 1,
            platform_slug: "snes".into(),
            name: "Test".into(),
            fs_name: "test.sfc".into(),
            fs_size_bytes: 1024,
            igdb_id: None,
            summary: None,
            url_cover: Some("https://example.com/cover.jpg".into()),
            igdb_metadata: None,
            screenshots: vec![],
        };
        assert!(rom.has_cover());
    }

    #[test]
    fn rom_no_cover_when_url_none() {
        let rom = RomMRom {
            id: 1,
            platform_id: 1,
            platform_slug: "snes".into(),
            name: "Test".into(),
            fs_name: "test.sfc".into(),
            fs_size_bytes: 1024,
            igdb_id: None,
            summary: None,
            url_cover: None,
            igdb_metadata: None,
            screenshots: vec![],
        };
        assert!(!rom.has_cover());
    }

    #[test]
    fn rom_genres_empty_without_metadata() {
        let rom = RomMRom {
            id: 1,
            platform_id: 1,
            platform_slug: "snes".into(),
            name: "Test".into(),
            fs_name: "test.sfc".into(),
            fs_size_bytes: 1024,
            igdb_id: None,
            summary: None,
            url_cover: None,
            igdb_metadata: None,
            screenshots: vec![],
        };
        assert!(rom.genres().is_empty());
    }

    #[test]
    fn rom_genres_from_metadata() {
        let rom = RomMRom {
            id: 1,
            platform_id: 1,
            platform_slug: "snes".into(),
            name: "Test".into(),
            fs_name: "test.sfc".into(),
            fs_size_bytes: 1024,
            igdb_id: None,
            summary: None,
            url_cover: None,
            igdb_metadata: Some(IgdbMetadata {
                genres: Some(vec!["RPG".into(), "Action".into()]),
                first_release_date: None,
                aggregated_rating: None,
                total_rating: None,
                franchises: None,
                companies: None,
                game_modes: None,
            }),
            screenshots: vec![],
        };
        let genres = rom.genres();
        assert_eq!(genres.len(), 2);
        assert!(genres.contains(&"RPG".to_string()));
    }

    #[test]
    fn rom_rating_prefers_aggregated() {
        let rom = RomMRom {
            id: 1,
            platform_id: 1,
            platform_slug: "snes".into(),
            name: "Test".into(),
            fs_name: "test.sfc".into(),
            fs_size_bytes: 1024,
            igdb_id: None,
            summary: None,
            url_cover: None,
            igdb_metadata: Some(IgdbMetadata {
                genres: None,
                first_release_date: None,
                aggregated_rating: Some(85.5),
                total_rating: Some(90.0),
                franchises: None,
                companies: None,
                game_modes: None,
            }),
            screenshots: vec![],
        };
        assert_eq!(rom.aggregated_rating(), Some(85.5));
    }

    #[test]
    fn rom_rating_falls_back_to_total() {
        let rom = RomMRom {
            id: 1,
            platform_id: 1,
            platform_slug: "snes".into(),
            name: "Test".into(),
            fs_name: "test.sfc".into(),
            fs_size_bytes: 1024,
            igdb_id: None,
            summary: None,
            url_cover: None,
            igdb_metadata: Some(IgdbMetadata {
                genres: None,
                first_release_date: None,
                aggregated_rating: None,
                total_rating: Some(75.0),
                franchises: None,
                companies: None,
                game_modes: None,
            }),
            screenshots: vec![],
        };
        assert_eq!(rom.aggregated_rating(), Some(75.0));
    }

    #[test]
    fn rom_into_game_maps_platform_slug() {
        let rom = RomMRom {
            id: 42,
            platform_id: 1,
            platform_slug: "sega-genesis".into(),
            name: "Sonic".into(),
            fs_name: "sonic.md".into(),
            fs_size_bytes: 2048,
            igdb_id: None,
            summary: Some("Fast hedgehog".into()),
            url_cover: None,
            igdb_metadata: None,
            screenshots: vec![],
        };
        
        let game = rom.into_game("https://romm.example.com");
        
        assert_eq!(game.platform_id, "genesis"); // mapped from sega-genesis
        assert_eq!(game.name, "Sonic");
        assert_eq!(game.romm_id, Some(42));
        assert_eq!(game.summary, Some("Fast hedgehog".into()));
        assert_eq!(game.sync_state, crate::models::SyncState::RemoteOnly);
    }

    #[test]
    fn rom_into_game_uses_name_when_fs_name_empty() {
        let rom = RomMRom {
            id: 1,
            platform_id: 1,
            platform_slug: "snes".into(),
            name: "Game Name".into(),
            fs_name: "".into(),
            fs_size_bytes: 1024,
            igdb_id: None,
            summary: None,
            url_cover: None,
            igdb_metadata: None,
            screenshots: vec![],
        };
        
        let game = rom.into_game("https://romm.example.com");
        assert_eq!(game.file_path, "Game Name");
    }

    #[test]
    fn rom_into_game_prepends_server_url_to_relative_cover() {
        let rom = RomMRom {
            id: 1,
            platform_id: 1,
            platform_slug: "snes".into(),
            name: "Test".into(),
            fs_name: "test.sfc".into(),
            fs_size_bytes: 1024,
            igdb_id: None,
            summary: None,
            url_cover: Some("/media/covers/test.jpg".into()),
            igdb_metadata: None,
            screenshots: vec![],
        };
        
        let game = rom.into_game("https://romm.example.com/");
        assert_eq!(game.cover_path, Some("https://romm.example.com/media/covers/test.jpg".into()));
    }

    #[test]
    fn rom_into_game_preserves_absolute_cover_url() {
        let rom = RomMRom {
            id: 1,
            platform_id: 1,
            platform_slug: "snes".into(),
            name: "Test".into(),
            fs_name: "test.sfc".into(),
            fs_size_bytes: 1024,
            igdb_id: None,
            summary: None,
            url_cover: Some("https://cdn.example.com/cover.jpg".into()),
            igdb_metadata: None,
            screenshots: vec![],
        };
        
        let game = rom.into_game("https://romm.example.com");
        assert_eq!(game.cover_path, Some("https://cdn.example.com/cover.jpg".into()));
    }

    // RomMSave deserialization tests
    #[test]
    fn save_deserializes_with_standard_fields() {
        let json = r#"{
            "id": 1,
            "rom_id": 42,
            "file_name": "save.sav",
            "file_size_bytes": 8192,
            "emulator": "retroarch",
            "created_at": "2024-01-01",
            "updated_at": "2024-01-02"
        }"#;
        
        let save: RomMSave = serde_json::from_str(json).expect("Should parse");
        assert_eq!(save.id, 1);
        assert_eq!(save.rom_id, 42);
        assert_eq!(save.file_name, "save.sav");
        assert_eq!(save.file_size_bytes, 8192);
        assert_eq!(save.emulator, Some("retroarch".into()));
    }

    #[test]
    fn save_deserializes_with_alias_fields() {
        let json = r#"{
            "id": 1,
            "filename": "save.sav",
            "size": 4096,
            "createdAt": "2024-01-01",
            "updatedAt": "2024-01-02"
        }"#;
        
        let save: RomMSave = serde_json::from_str(json).expect("Should parse with aliases");
        assert_eq!(save.id, 1);
        assert_eq!(save.file_name, "save.sav");
        assert_eq!(save.file_size_bytes, 4096);
    }

    #[test]
    fn save_deserializes_with_minimal_fields() {
        let json = r#"{"id": 1}"#;
        
        let save: RomMSave = serde_json::from_str(json).expect("Should parse minimal");
        assert_eq!(save.id, 1);
        assert_eq!(save.rom_id, 0); // default
        assert_eq!(save.file_name, ""); // default
        assert_eq!(save.file_size_bytes, 0); // default
    }

    // ROM into Game sync state tests
    #[test]
    fn rom_into_game_sets_remote_only_sync_state() {
        let rom = RomMRom {
            id: 1,
            platform_id: 1,
            platform_slug: "snes".into(),
            name: "Test".into(),
            fs_name: "test.sfc".into(),
            fs_size_bytes: 1024,
            igdb_id: None,
            summary: None,
            url_cover: None,
            igdb_metadata: None,
            screenshots: vec![],
        };
        
        let game = rom.into_game("https://romm.example.com");
        assert_eq!(game.sync_state, crate::models::SyncState::RemoteOnly);
        assert!(game.local_file_path.is_none());
    }

    #[test]
    fn rom_into_game_maps_publisher_and_game_modes_from_igdb_metadata() {
        let rom = RomMRom {
            id: 9,
            platform_id: 1,
            platform_slug: "snes".into(),
            name: "RPG".into(),
            fs_name: "rpg.sfc".into(),
            fs_size_bytes: 1024,
            igdb_id: Some(1),
            summary: None,
            url_cover: None,
            igdb_metadata: Some(IgdbMetadata {
                genres: Some(vec!["Role-playing (RPG)".into()]),
                first_release_date: None,
                aggregated_rating: Some(88.0),
                total_rating: None,
                franchises: None,
                companies: Some(vec!["Dev Studio".into(), "Pub Co".into()]),
                game_modes: Some(vec!["Single player".into(), "Co-operative".into()]),
            }),
            screenshots: vec![],
        };
        let game = rom.into_game("https://romm.example.com");
        assert_eq!(game.developer.as_deref(), Some("Dev Studio"));
        assert_eq!(game.publisher.as_deref(), Some("Pub Co"));
        assert_eq!(game.player_count.as_deref(), Some("Single player, Co-operative"));
        assert_eq!(game.user_rating, Some(88.0));
        assert_eq!(game.genres, vec!["Role-playing (RPG)"]);
    }

    #[test]
    fn rom_into_game_sets_romm_source() {
        let rom = RomMRom {
            id: 123,
            platform_id: 1,
            platform_slug: "gba".into(),
            name: "Test".into(),
            fs_name: "test.gba".into(),
            fs_size_bytes: 1024,
            igdb_id: None,
            summary: None,
            url_cover: None,
            igdb_metadata: None,
            screenshots: vec![],
        };
        
        let game = rom.into_game("https://romm.example.com");
        assert_eq!(game.source, crate::models::GameSource::RomM);
        assert_eq!(game.romm_id, Some(123));
    }
}
