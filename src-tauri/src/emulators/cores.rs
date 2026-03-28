use anyhow::{Context, Result};
use std::path::{Path, PathBuf};

const BUILDBOT_BASE: &str = "https://buildbot.libretro.com/nightly/windows/x86_64/latest";

pub fn core_download_url(core_filename: &str) -> String {
    format!("{}/{}.zip", BUILDBOT_BASE, core_filename)
}

pub async fn download_core(core_filename: &str, cores_dir: &Path) -> Result<PathBuf> {
    std::fs::create_dir_all(cores_dir).context("Failed to create cores directory")?;

    let core_path = cores_dir.join(core_filename);
    if core_path.exists() {
        return Ok(core_path);
    }

    let url = core_download_url(core_filename);
    let zip_path = cores_dir.join(format!("{}.zip", core_filename));

    let dl = crate::api::download::DownloadManager::new();
    dl.download_file(&url, &zip_path, None, |_| {})
        .await
        .context(format!("Failed to download core from {}", url))?;

    let file = std::fs::File::open(&zip_path)?;
    let mut zip = zip::ZipArchive::new(file)?;

    for i in 0..zip.len() {
        let mut entry = zip.by_index(i)?;
        if entry.name().ends_with(".dll") {
            let outpath = cores_dir.join(entry.mangled_name());
            let mut outfile = std::fs::File::create(&outpath)?;
            std::io::copy(&mut entry, &mut outfile)?;
        }
    }

    std::fs::remove_file(&zip_path).ok();

    if core_path.exists() {
        Ok(core_path)
    } else {
        anyhow::bail!("Core file not found after extraction: {}", core_filename)
    }
}

pub fn get_cores_dir(retroarch_path: &Path) -> PathBuf {
    retroarch_path
        .parent()
        .map(|p| p.join("cores"))
        .unwrap_or_else(|| PathBuf::from("cores"))
}

pub fn is_core_installed(retroarch_path: &Path, core_filename: &str) -> bool {
    let cores_dir = get_cores_dir(retroarch_path);
    cores_dir.join(core_filename).exists()
}
