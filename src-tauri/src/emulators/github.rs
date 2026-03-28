use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubRelease {
    pub tag_name: String,
    pub name: Option<String>,
    pub assets: Vec<GitHubAsset>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubAsset {
    pub name: String,
    pub browser_download_url: String,
    pub size: i64,
    pub content_type: Option<String>,
}

pub async fn fetch_latest_release(repo: &str) -> Result<GitHubRelease> {
    let client = reqwest::Client::builder()
        .user_agent("wingosy-launcher/0.1")
        .build()?;
    let url = format!("https://api.github.com/repos/{}/releases/latest", repo);
    let resp = client.get(&url).send().await.context("Failed to reach GitHub")?;
    let status = resp.status();
    if !status.is_success() {
        let text = resp.text().await.unwrap_or_default();
        anyhow::bail!("GitHub API returned {}: {}", status, &text[..text.len().min(200)]);
    }
    resp.json().await.context("Failed to parse GitHub release")
}

pub fn find_matching_asset<'a>(release: &'a GitHubRelease, pattern: &str) -> Option<&'a GitHubAsset> {
    let re = regex_lite::Regex::new(pattern).ok()?;
    release.assets.iter().find(|a| re.is_match(&a.name))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn mock_release() -> GitHubRelease {
        GitHubRelease {
            tag_name: "v1.0.0".into(),
            name: Some("Release 1.0".into()),
            assets: vec![
                GitHubAsset { name: "ppsspp-v1.17-windows-x64.zip".into(), browser_download_url: "https://example.com/ppsspp.zip".into(), size: 50000000, content_type: None },
                GitHubAsset { name: "ppsspp-v1.17-linux-x64.tar.gz".into(), browser_download_url: "https://example.com/ppsspp.tar.gz".into(), size: 45000000, content_type: None },
                GitHubAsset { name: "ppsspp-v1.17-macos-arm64.dmg".into(), browser_download_url: "https://example.com/ppsspp.dmg".into(), size: 48000000, content_type: None },
                GitHubAsset { name: "Source.zip".into(), browser_download_url: "https://example.com/source.zip".into(), size: 1000000, content_type: None },
            ],
        }
    }

    #[test]
    fn matches_windows_asset() {
        let release = mock_release();
        let asset = find_matching_asset(&release, "(?i)ppsspp.*windows.*x64.*\\.zip$");
        assert!(asset.is_some());
        assert!(asset.unwrap().name.contains("windows"));
    }

    #[test]
    fn skips_non_matching_assets() {
        let release = mock_release();
        let asset = find_matching_asset(&release, "(?i)ppsspp.*android.*\\.apk$");
        assert!(asset.is_none());
    }

    #[test]
    fn pattern_is_case_insensitive() {
        let release = GitHubRelease {
            tag_name: "v1.0".into(),
            name: None,
            assets: vec![
                GitHubAsset { name: "Dolphin-x64-Setup.7z".into(), browser_download_url: "https://example.com/d.7z".into(), size: 100, content_type: None },
            ],
        };
        let asset = find_matching_asset(&release, "(?i)dolphin.*x64.*\\.7z$");
        assert!(asset.is_some());
    }
}
