# Testing

## Overview

| Type | Count | Location | Run Command |
|------|-------|----------|-------------|
| Unit Tests | ~150 | Inline `#[cfg(test)]` | `cargo test` |
| Integration | 14 | `src-tauri/tests/` | `cargo test --test '*' -- --ignored` |
| E2E | 155 | `e2e-webdriver/` | `npm run test:e2e` |

## Unit Tests (Rust)

Fast, no network. Test pure functions and data structures.

```bash
cd src-tauri && cargo test
```

| Module | What it Tests |
|--------|---------------|
| `api/download.rs` | Progress formatting, size calculations |
| `config/mod.rs` | Config serialization, defaults |
| `emulators/cores.rs` | Core URLs, ZIP validation |
| `emulators/detection.rs` | Emulator patterns, install types |
| `models/game.rs` | Game creation, play time, filters |
| `scanner/mod.rs` | ROM name cleaning, multi-disc |

## Integration Tests (Rust)

Test real downloads and API calls. Marked `#[ignore]` by default.

```bash
cd src-tauri

# Emulator downloads (no credentials needed)
cargo test --test emulator_integration -- --ignored

# RomM API (requires .env with credentials)
cargo test --test romm_integration -- --ignored
```

| Test | What it Tests |
|------|---------------|
| `test_core_download_returns_valid_zip` | Core download returns ZIP, not HTML |
| `test_github_release_download` | Full emulator download workflow |
| `test_rom_download_url_format` | ROM URL construction |

## E2E Tests (WebDriver)

Test full app with Rust backend.

### Prerequisites

1. Install tauri-driver: `cargo install tauri-driver`
2. Download [Edge WebDriver](https://developer.microsoft.com/en-us/microsoft-edge/tools/webdriver/) matching your Edge version
3. Build app: `npm run tauri build`

### Running

```bash
npm run test:e2e              # All tests
npm run test:e2e:app          # Core navigation
npm run test:e2e:settings     # Settings page
npm run test:e2e:download     # Emulator downloads
npm run test:e2e:cores        # RetroArch cores
npm run test:e2e:games        # Game launching
```

### Test Files

| File | What it Tests |
|------|---------------|
| `setup-wizard.spec.js` | First-run wizard |
| `app.spec.js` | Navigation, sidebar |
| `settings.spec.js` | RomM config, emulators |
| `emulator-download.spec.js` | Emulator installation |
| `retroarch-cores.spec.js` | Core management |
| `rom-download.spec.js` | ROM downloads |
| `game-launch.spec.js` | Game launching |

## When to Add Tests

| Adding... | Unit | Integration | E2E |
|-----------|------|-------------|-----|
| Pure function (parsing, formatting) | ✅ | - | - |
| API client method | - | ✅ | - |
| File operation (download, extract) | - | ✅ | - |
| New React component | - | - | ✅ |
| New Tauri command | ✅ struct | ⚠️ if external | ✅ if UI |
