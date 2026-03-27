use anyhow::{Context, Result};
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
        Self {
            client: Client::new(),
            base_url: base_url.into().trim_end_matches('/').to_string(),
            token: None,
        }
    }

    pub fn with_token(mut self, token: String) -> Self {
        self.token = Some(token);
        self
    }

    pub async fn authenticate(&mut self, username: &str, password: &str) -> Result<TokenResponse> {
        let response = self
            .client
            .post(format!("{}/api/token", self.base_url))
            .form(&[("username", username), ("password", password)])
            .send()
            .await
            .context("Failed to connect to RomM server")?;

        let token: TokenResponse = response
            .json()
            .await
            .context("Failed to parse authentication response")?;

        self.token = Some(token.access_token.clone());
        Ok(token)
    }

    fn auth_header(&self) -> Option<String> {
        self.token.as_ref().map(|t| format!("Bearer {}", t))
    }

    pub async fn get_platforms(&self) -> Result<Vec<RomMPlatform>> {
        let mut request = self.client.get(format!("{}/api/platforms", self.base_url));

        if let Some(auth) = self.auth_header() {
            request = request.header("Authorization", auth);
        }

        let response = request.send().await.context("Failed to fetch platforms")?;

        response
            .json()
            .await
            .context("Failed to parse platforms response")
    }

    pub async fn get_roms(
        &self,
        platform_id: Option<i32>,
        limit: i32,
        offset: i32,
    ) -> Result<PaginatedResponse<RomMRom>> {
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

        response
            .json()
            .await
            .context("Failed to parse ROMs response")
    }

    pub async fn get_rom(&self, rom_id: i32) -> Result<RomMRom> {
        let mut request = self
            .client
            .get(format!("{}/api/roms/{}", self.base_url, rom_id));

        if let Some(auth) = self.auth_header() {
            request = request.header("Authorization", auth);
        }

        let response = request.send().await.context("Failed to fetch ROM")?;

        response
            .json()
            .await
            .context("Failed to parse ROM response")
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
        let mut request = self
            .client
            .get(format!("{}/api/roms/{}/saves", self.base_url, rom_id));

        if let Some(auth) = self.auth_header() {
            request = request.header("Authorization", auth);
        }

        let response = request.send().await.context("Failed to fetch saves")?;

        response
            .json()
            .await
            .context("Failed to parse saves response")
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
    pub page: i32,
    pub size: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RomMPlatform {
    pub id: i32,
    pub slug: String,
    pub name: String,
    pub rom_count: i32,
    pub igdb_id: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RomMRom {
    pub id: i32,
    pub platform_id: i32,
    pub platform_slug: String,
    pub name: String,
    pub file_name: String,
    pub file_size_bytes: i64,

    pub igdb_id: Option<i32>,
    pub summary: Option<String>,
    pub genres: Option<Vec<String>>,
    pub first_release_date: Option<i64>,
    pub aggregated_rating: Option<f32>,

    pub has_cover: bool,
    pub url_cover: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RomMSave {
    pub id: i32,
    pub rom_id: i32,
    pub file_name: String,
    pub file_size_bytes: i64,
    pub emulator: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}
