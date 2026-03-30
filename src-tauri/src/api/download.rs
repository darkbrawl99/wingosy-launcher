use anyhow::{Context, Result};
use reqwest::Client;
use std::path::Path;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;
use tokio_stream::StreamExt;

#[derive(Debug, Clone)]
pub struct DownloadManager {
    client: Client,
}

impl DownloadManager {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
        }
    }

    pub async fn download_file<F>(
        &self,
        url: &str,
        dest_path: &Path,
        auth_token: Option<&str>,
        progress_callback: F,
    ) -> Result<()>
    where
        F: Fn(DownloadProgress) + Send + 'static,
    {
        let mut request = self.client.get(url);

        if let Some(token) = auth_token {
            request = request.header("Authorization", format!("Bearer {}", token));
        }

        let response = request.send().await.context("Failed to start download")?;

        // Check for HTTP errors
        let status = response.status();
        if !status.is_success() {
            anyhow::bail!("HTTP error {}: {}", status.as_u16(), status.canonical_reason().unwrap_or("Unknown"));
        }

        let total_size = response.content_length();

        if let Some(parent) = dest_path.parent() {
            tokio::fs::create_dir_all(parent)
                .await
                .context("Failed to create destination directory")?;
        }

        let mut file = File::create(dest_path)
            .await
            .context("Failed to create destination file")?;

        let mut downloaded: u64 = 0;
        let mut stream = response.bytes_stream();

        while let Some(chunk) = stream.next().await {
            let chunk = chunk.context("Error reading download chunk")?;
            file.write_all(&chunk)
                .await
                .context("Error writing to file")?;

            downloaded += chunk.len() as u64;

            let progress = DownloadProgress {
                downloaded,
                total: total_size,
                percent: total_size.map(|t| (downloaded as f64 / t as f64 * 100.0) as u8),
            };

            progress_callback(progress);
        }

        file.flush().await.context("Failed to flush file")?;

        Ok(())
    }

    pub async fn download_bytes(&self, url: &str, auth_token: Option<&str>) -> Result<Vec<u8>> {
        let mut request = self.client.get(url);

        if let Some(token) = auth_token {
            request = request.header("Authorization", format!("Bearer {}", token));
        }

        let response = request.send().await.context("Failed to download")?;

        response
            .bytes()
            .await
            .map(|b| b.to_vec())
            .context("Failed to read response bytes")
    }
}

impl Default for DownloadManager {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, Copy)]
pub struct DownloadProgress {
    pub downloaded: u64,
    pub total: Option<u64>,
    pub percent: Option<u8>,
}

impl DownloadProgress {
    pub fn format_size(bytes: u64) -> String {
        const KB: u64 = 1024;
        const MB: u64 = KB * 1024;
        const GB: u64 = MB * 1024;

        if bytes >= GB {
            format!("{:.2} GB", bytes as f64 / GB as f64)
        } else if bytes >= MB {
            format!("{:.2} MB", bytes as f64 / MB as f64)
        } else if bytes >= KB {
            format!("{:.2} KB", bytes as f64 / KB as f64)
        } else {
            format!("{} B", bytes)
        }
    }

    pub fn status_text(&self) -> String {
        let downloaded_str = Self::format_size(self.downloaded);

        match self.total {
            Some(total) => {
                let total_str = Self::format_size(total);
                let percent = self.percent.unwrap_or(0);
                format!("{} / {} ({}%)", downloaded_str, total_str, percent)
            }
            None => downloaded_str,
        }
    }
}

#[derive(Debug, Clone)]
pub struct DownloadTask {
    pub id: i64,
    pub name: String,
    pub url: String,
    pub dest_path: String,
    pub status: DownloadStatus,
    pub progress: Option<DownloadProgress>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DownloadStatus {
    Queued,
    Downloading,
    Extracting,
    Completed,
    Failed,
    Cancelled,
}
