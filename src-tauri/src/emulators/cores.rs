use anyhow::{Context, Result};
use std::io::Read;
use std::path::{Path, PathBuf};

const BUILDBOT_BASE: &str = "https://buildbot.libretro.com/nightly/windows/x86_64/latest";

pub fn core_download_url(core_filename: &str) -> String {
    // The buildbot uses .dll.zip extension for Windows cores
    // Core filename is like "mgba_libretro.dll", URL is "mgba_libretro.dll.zip"
    format!("{}/{}.zip", BUILDBOT_BASE, core_filename)
}

fn validate_zip_file(path: &Path) -> Result<()> {
    let mut file = std::fs::File::open(path)?;
    let mut magic = [0u8; 4];
    file.read_exact(&mut magic)?;
    
    // ZIP files start with PK (0x50 0x4B)
    if magic[0] != 0x50 || magic[1] != 0x4B {
        // Check if it's HTML (error page)
        let file_start = String::from_utf8_lossy(&magic);
        if file_start.contains('<') || file_start.contains("<!") {
            anyhow::bail!("Server returned HTML instead of ZIP (likely 404 error page). The core may not be available.");
        }
        anyhow::bail!("Invalid ZIP file: missing PK signature (got: {:02x} {:02x})", magic[0], magic[1]);
    }
    
    // Verify it's a proper ZIP (03 04 for local file header, 05 06 for empty archive)
    if magic[2] != 0x03 && magic[2] != 0x05 {
        anyhow::bail!("Invalid ZIP file: unexpected header version");
    }
    
    Ok(())
}

pub async fn download_core(core_filename: &str, cores_dir: &Path) -> Result<PathBuf> {
    std::fs::create_dir_all(cores_dir).context("Failed to create cores directory")?;

    let core_path = cores_dir.join(core_filename);
    if core_path.exists() {
        tracing::info!("[Cores] Core already exists: {:?}", core_path);
        return Ok(core_path);
    }

    let url = core_download_url(core_filename);
    let zip_path = cores_dir.join(format!("{}.zip", core_filename));
    
    tracing::info!("[Cores] Downloading core from: {}", url);

    let dl = crate::api::download::DownloadManager::new();
    dl.download_file(&url, &zip_path, None, |_| {})
        .await
        .context(format!("Failed to download core from {}", url))?;

    // Validate the downloaded file is actually a ZIP
    if let Err(e) = validate_zip_file(&zip_path) {
        // Clean up invalid file
        std::fs::remove_file(&zip_path).ok();
        
        // Log file size for debugging
        if let Ok(metadata) = std::fs::metadata(&zip_path) {
            tracing::error!("[Cores] Invalid download (size: {} bytes): {}", metadata.len(), e);
        }
        
        return Err(e);
    }

    let file = std::fs::File::open(&zip_path).context("Failed to open downloaded ZIP")?;
    let mut zip = zip::ZipArchive::new(file).context(
        "Invalid ZIP archive: The downloaded file is corrupted or not a valid ZIP. \
         This can happen if the core is unavailable or the server returned an error page."
    )?;

    tracing::debug!("[Cores] ZIP contains {} entries", zip.len());
    
    let mut extracted_dll = None;
    for i in 0..zip.len() {
        let mut entry = zip.by_index(i).context("Failed to read ZIP entry")?;
        let entry_name = entry.name().to_string();
        
        if entry_name.ends_with(".dll") {
            let outpath = cores_dir.join(entry.mangled_name());
            tracing::debug!("[Cores] Extracting: {} -> {:?}", entry_name, outpath);
            
            let mut outfile = std::fs::File::create(&outpath)
                .context(format!("Failed to create output file: {:?}", outpath))?;
            std::io::copy(&mut entry, &mut outfile)
                .context("Failed to extract DLL from ZIP")?;
            
            extracted_dll = Some(outpath);
        }
    }

    std::fs::remove_file(&zip_path).ok();

    if let Some(dll_path) = extracted_dll {
        if core_path.exists() {
            tracing::info!("[Cores] Core installed: {:?}", core_path);
            Ok(core_path)
        } else if dll_path.exists() {
            tracing::info!("[Cores] Core installed (different name): {:?}", dll_path);
            Ok(dll_path)
        } else {
            anyhow::bail!("Core extraction failed: DLL not found after extraction")
        }
    } else {
        anyhow::bail!(
            "No DLL found in ZIP archive for core: {}. \
             The archive may be empty or contain unexpected files.",
            core_filename
        )
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
