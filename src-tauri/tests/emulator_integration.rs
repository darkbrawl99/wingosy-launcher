/// Integration tests for emulator auto-download infrastructure.
/// Run with: cargo test --test emulator_integration -- --ignored --nocapture

#[cfg(test)]
mod github_api_tests {
    #[tokio::test]
    #[ignore]
    async fn fetch_mgba_latest_release() {
        let client = reqwest::Client::builder()
            .user_agent("wingosy-launcher-test/0.1")
            .build().unwrap();

        let resp = client
            .get("https://api.github.com/repos/mgba-emu/mgba/releases/latest")
            .send().await.unwrap();

        assert!(resp.status().is_success(), "GitHub API failed: {}", resp.status());

        let body: serde_json::Value = resp.json().await.unwrap();
        assert!(body["tag_name"].is_string(), "Missing tag_name");
        assert!(body["assets"].is_array(), "Missing assets");

        let assets = body["assets"].as_array().unwrap();
        assert!(!assets.is_empty(), "No assets in release");

        let win_asset = assets.iter().find(|a| {
            let name = a["name"].as_str().unwrap_or("");
            name.contains("win") && name.contains("64") && (name.ends_with(".7z") || name.ends_with(".zip"))
        });

        println!("mGBA release: {}", body["tag_name"].as_str().unwrap());
        println!("Assets: {}", assets.len());
        if let Some(asset) = win_asset {
            println!("Windows asset: {} ({} bytes)", asset["name"], asset["size"]);
        } else {
            println!("WARNING: No Windows x64 asset found in release");
        }
    }

    #[tokio::test]
    #[ignore]
    async fn fetch_ppsspp_latest_release() {
        let client = reqwest::Client::builder()
            .user_agent("wingosy-launcher-test/0.1")
            .build().unwrap();

        let resp = client
            .get("https://api.github.com/repos/hrydgard/ppsspp/releases/latest")
            .send().await.unwrap();

        let status = resp.status();
        if status.as_u16() == 403 {
            println!("SKIP: GitHub rate limited");
            return;
        }

        assert!(status.is_success(), "GitHub API failed: {}", status);
        let body: serde_json::Value = resp.json().await.unwrap();
        println!("PPSSPP release: {}", body["tag_name"].as_str().unwrap_or("?"));

        let empty = vec![];
        let assets = body["assets"].as_array().unwrap_or(&empty);
        let win_asset = assets.iter().find(|a| {
            let name = a["name"].as_str().unwrap_or("");
            let re = regex_lite::Regex::new("(?i)ppsspp.*windows.*64.*\\.zip$").unwrap();
            re.is_match(name)
        });

        if let Some(a) = win_asset {
            println!("Windows asset: {} ({} bytes)", a["name"], a["size"]);
        }
    }

    #[tokio::test]
    #[ignore]
    async fn asset_pattern_matches_real_releases() {
        let client = reqwest::Client::builder()
            .user_agent("wingosy-launcher-test/0.1")
            .build().unwrap();

        let test_cases = vec![
            ("mgba-emu/mgba", "(?i)mGBA.*win64.*\\.7z$"),
            ("flyinghead/flycast", "(?i)flycast.*win64.*\\.zip$"),
        ];

        for (repo, pattern) in test_cases {
            let resp = client
                .get(format!("https://api.github.com/repos/{}/releases/latest", repo))
                .send().await.unwrap();

            if !resp.status().is_success() {
                println!("SKIP {}: {}", repo, resp.status());
                continue;
            }

            let body: serde_json::Value = resp.json().await.unwrap();
            let assets = body["assets"].as_array().unwrap();

            let re = regex_lite::Regex::new(pattern).unwrap();
            let matched = assets.iter().find(|a| re.is_match(a["name"].as_str().unwrap_or("")));

            match matched {
                Some(a) => println!("{}: MATCHED '{}' ({} bytes)", repo, a["name"].as_str().unwrap(), a["size"]),
                None => {
                    println!("{}: NO MATCH for pattern '{}'", repo, pattern);
                    println!("  Available: {:?}", assets.iter().map(|a| a["name"].as_str().unwrap_or("")).collect::<Vec<_>>());
                }
            }
        }
    }
}

#[cfg(test)]
mod buildbot_tests {
    #[tokio::test]
    #[ignore]
    async fn retroarch_core_url_accessible() {
        let core = "snes9x_libretro.dll";
        let url = format!("https://buildbot.libretro.com/nightly/windows/x86_64/latest/{}.zip", core);

        let client = reqwest::Client::new();
        let resp = client.head(&url).send().await.unwrap();

        println!("Core URL: {}", url);
        println!("Status: {}", resp.status());

        if resp.status().is_success() {
            let size = resp.headers()
                .get("content-length")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| s.parse::<u64>().ok())
                .unwrap_or(0);
            println!("Size: {} bytes", size);
            assert!(size > 1000, "Core zip too small: {} bytes", size);
        } else {
            println!("WARNING: Core not accessible ({}). Buildbot might be down.", resp.status());
        }
    }

    #[tokio::test]
    #[ignore]
    async fn multiple_cores_accessible() {
        let cores = ["snes9x_libretro.dll", "mgba_libretro.dll", "fceumm_libretro.dll", "genesis_plus_gx_libretro.dll"];
        let client = reqwest::Client::new();

        for core in &cores {
            let url = format!("https://buildbot.libretro.com/nightly/windows/x86_64/latest/{}.zip", core);
            let resp = client.head(&url).send().await.unwrap();
            println!("{}: {}", core, resp.status());
        }
    }
}
