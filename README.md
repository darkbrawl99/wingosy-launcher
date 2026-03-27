# Wingosy Launcher

A Windows-native game launcher with RomM integration for managing and launching emulated games. Inspired by [Argosy Launcher](https://github.com/rommapp/argosy-launcher) for Android.

## Features

### Core Functionality
- **RomM Integration**: Connect to your self-hosted [RomM](https://github.com/rommapp/romm) server to sync your game library
- **ROM Scanning**: Automatically scan local directories for ROMs and organize by platform
- **Game Launching**: Launch games directly with your preferred emulator
- **Save Sync**: Bidirectional save synchronization with your RomM server

### Library Management
- **Multi-Platform Support**: NES, SNES, N64, GameCube, Wii, PlayStation 1-3, PSP, Xbox, and more
- **Collections**: Create custom collections or use smart collections (Recently Played, Favorites, etc.)
- **Search & Filter**: Find games quickly with search and platform filters
- **Metadata**: View game information, cover art, and play statistics

### Emulator Support
- **Auto-Detection**: Automatically detects installed emulators
- **Per-Game Overrides**: Set specific emulators for individual games
- **RetroArch Integration**: Full RetroArch core support with automatic core selection
- **Standalone Emulators**: Dolphin, PCSX2, RPCS3, PPSSPP, DuckStation, Cemu, Ryujinx, and more

## Installation

### Prerequisites
- Windows 10/11
- [Rust](https://rustup.rs/) (for building from source)
- Visual Studio Build Tools with C++ workload

### Building from Source

```bash
# Clone the repository
git clone https://github.com/your-username/wingosy-launcher.git
cd wingosy-launcher

# Build release version
cargo build --release

# Run
cargo run --release
```

The release executable will be located at:
```
target/release/wingosy-launcher.exe
```

## Configuration

Configuration is stored in:
- **Config**: `%APPDATA%/wingosy/launcher/config.toml`
- **Database**: `%APPDATA%/wingosy/launcher/wingosy.db`
- **Cache**: `%LOCALAPPDATA%/wingosy/launcher/cache/`

### RomM Server Setup

1. Open Settings in Wingosy
2. Enter your RomM server URL (e.g., `https://romm.example.com`)
3. Enter your credentials
4. Click "Connect"

### Adding Emulators

Wingosy will attempt to auto-detect installed emulators. To manually configure:

1. Open Settings > Emulators
2. Browse to your emulator executable
3. Select the platforms it should handle

## Supported Platforms

| Platform | Extensions | Recommended Emulator |
|----------|------------|---------------------|
| NES | `.nes`, `.unf` | RetroArch (FCEUmm) |
| SNES | `.sfc`, `.smc` | RetroArch (Snes9x) |
| Nintendo 64 | `.n64`, `.z64`, `.v64` | RetroArch (Mupen64Plus) |
| GameCube | `.iso`, `.gcm`, `.rvz` | Dolphin |
| Wii | `.iso`, `.wbfs`, `.rvz` | Dolphin |
| Wii U | `.wud`, `.wux`, `.rpx` | Cemu |
| Switch | `.nsp`, `.xci` | Ryujinx / Yuzu |
| Game Boy | `.gb` | RetroArch (Gambatte) |
| Game Boy Color | `.gbc` | RetroArch (Gambatte) |
| Game Boy Advance | `.gba` | mGBA / RetroArch |
| Nintendo DS | `.nds` | melonDS |
| Nintendo 3DS | `.3ds`, `.cia` | Lime3DS / Citra |
| PlayStation | `.bin`, `.cue`, `.chd` | DuckStation |
| PlayStation 2 | `.iso`, `.chd` | PCSX2 |
| PlayStation 3 | `.iso`, `.pkg` | RPCS3 |
| PSP | `.iso`, `.cso` | PPSSPP |
| Genesis | `.md`, `.gen` | RetroArch (Genesis Plus GX) |
| Dreamcast | `.gdi`, `.cdi`, `.chd` | Flycast |
| Xbox | `.iso`, `.xiso` | xemu |
| Xbox 360 | `.iso`, `.xex` | Xenia Canary |
| Arcade | `.zip` | MAME |

## Project Structure

```
wingosy-launcher/
├── Cargo.toml              # Rust dependencies
├── src/
│   ├── main.rs             # Entry point
│   ├── api/                # RomM API client
│   │   ├── mod.rs
│   │   ├── romm.rs         # RomM API implementation
│   │   └── download.rs     # Download manager
│   ├── config/             # Configuration management
│   │   └── mod.rs
│   ├── database/           # SQLite database layer
│   │   ├── mod.rs
│   │   ├── connection.rs
│   │   ├── games.rs
│   │   ├── platforms.rs
│   │   ├── collections.rs
│   │   └── emulators.rs
│   ├── emulators/          # Emulator launching
│   │   ├── mod.rs
│   │   ├── launcher.rs
│   │   └── detection.rs
│   ├── models/             # Data models
│   │   ├── mod.rs
│   │   ├── game.rs
│   │   ├── platform.rs
│   │   ├── collection.rs
│   │   ├── emulator.rs
│   │   └── sync.rs
│   ├── scanner/            # ROM scanning
│   │   └── mod.rs
│   └── ui/                 # Iced GUI
│       ├── mod.rs
│       ├── app.rs
│       ├── theme.rs
│       ├── views/
│       └── components/
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Language | Rust |
| GUI | Iced |
| Database | SQLite (rusqlite) |
| HTTP | reqwest |
| Async | Tokio |
| Serialization | Serde |

## Roadmap

### Current (v0.1.0)
- [x] Project structure and architecture
- [x] Local database with SQLite
- [x] ROM scanning with platform detection
- [x] Basic GUI with game library
- [x] Emulator launching
- [x] RomM API client

### Planned
- [ ] Full RomM sync implementation
- [ ] Save file synchronization
- [ ] Cover art downloading and caching
- [ ] Download queue with progress tracking
- [ ] Archive extraction (.zip, .7z)
- [ ] Settings UI
- [ ] First-run setup wizard
- [ ] Gamepad navigation support
- [ ] Custom themes
- [ ] RetroAchievements display

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run `cargo fmt` and `cargo clippy`
5. Submit a pull request

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Credits

- Inspired by [Argosy Launcher](https://github.com/rommapp/argosy-launcher) for Android
- Built to complement [RomM](https://github.com/rommapp/romm) - the self-hosted ROM manager
