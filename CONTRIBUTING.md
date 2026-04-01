# Contributing

## Setup

```bash
# Prerequisites: Windows 10/11, Rust 1.70+, Node.js 18+, VS Build Tools (C++)

git clone https://github.com/yash-1o1/wingosy-launcher.git
cd wingosy-launcher
npm install
npm run tauri dev
```

## Project Structure

```
src/                    # React frontend (MUI)
src-tauri/src/          # Rust backend
  ├── commands.rs       # Tauri commands (frontend ↔ backend)
  ├── api/              # RomM client, downloads
  ├── database/         # SQLite operations
  ├── emulators/        # Detection, launching, cores
  └── models/           # Data structures
e2e-webdriver/          # E2E tests
```

## Testing

See [TESTING.md](TESTING.md) for full details.

```bash
cargo test              # Unit tests
npm run test:e2e        # E2E tests
```

## Adding Features

### New Tauri Command

1. Add function in `commands.rs` with `#[tauri::command]`
2. Register in `main.rs` → `invoke_handler`
3. Call from React: `invoke("command_name", { args })`

### New Emulator

1. Add to `models/emulator.rs` → `default_emulators()`
2. Add detection in `emulators/detection.rs`
3. Add path in `config/mod.rs` → `EmulatorPaths`
4. Map in `emulators/launcher.rs` → `get_emulator_path()`

## Code Style

- Rust: `cargo fmt && cargo clippy`
- JS: Functional components, MUI

## Data Locations

| Data | Path |
|------|------|
| Config | `%APPDATA%/wingosy/launcher/config/config.toml` |
| Database | `%APPDATA%/wingosy/launcher/data/wingosy.db` |
| Logs | `%APPDATA%/wingosy/launcher/data/logs/` |
