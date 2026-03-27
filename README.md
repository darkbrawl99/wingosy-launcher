# Wingosy Launcher

A Windows-native game launcher with RomM integration for managing and launching emulated games. Inspired by [Argosy Launcher](https://github.com/rommapp/argosy-launcher) for Android.

## Features

- **RomM Integration** — Sync your game library, cover art, and saves from your self-hosted [RomM](https://github.com/rommapp/romm) server
- **ROM Scanning** — Scan local directories for ROMs, auto-detect platforms
- **Game Launching** — Launch directly with your preferred emulator
- **Save Sync** — Push and pull save files between devices via RomM
- **20+ Platforms** — NES, SNES, N64, GameCube, Wii, PlayStation 1-3, PSP, Xbox, Dreamcast, Arcade, and more
- **Emulator Auto-Detection** — Finds installed emulators (RetroArch, Dolphin, PCSX2, RPCS3, PPSSPP, DuckStation, Cemu, Ryujinx, and more)
- **Per-Game Overrides** — Choose specific emulators for individual games
- **Collections** — Smart collections (Recently Played, Favorites) and custom lists
- **Cover Art** — Downloaded automatically during RomM sync

## Installation

Download the latest installer from the [Releases](https://github.com/yash-1o1/wingosy-launcher/releases) page:

- **MSI installer** — standard Windows install/uninstall
- **NSIS setup** — portable installer

Requires Windows 10/11.

## Quick Start

1. Install and launch Wingosy
2. Follow the setup wizard
3. Scan a ROM folder or connect to your RomM server
4. Browse your library and start playing

## Supported Platforms

| Platform | Extensions | Recommended Emulator |
|----------|------------|---------------------|
| NES | `.nes` | RetroArch (FCEUmm) |
| SNES | `.sfc`, `.smc` | RetroArch (Snes9x) |
| Nintendo 64 | `.n64`, `.z64`, `.v64` | RetroArch (Mupen64Plus) |
| GameCube / Wii | `.iso`, `.rvz`, `.wbfs` | Dolphin |
| Wii U | `.wud`, `.wux`, `.rpx` | Cemu |
| Switch | `.nsp`, `.xci` | Ryujinx |
| Game Boy / Color / Advance | `.gb`, `.gbc`, `.gba` | mGBA / RetroArch |
| Nintendo DS / 3DS | `.nds`, `.3ds`, `.cia` | melonDS / Lime3DS |
| PlayStation | `.bin`, `.cue`, `.chd` | DuckStation |
| PlayStation 2 | `.iso`, `.chd` | PCSX2 |
| PlayStation 3 | `.iso`, `.pkg` | RPCS3 |
| PSP | `.iso`, `.cso` | PPSSPP |
| Genesis / Mega Drive | `.md`, `.gen` | RetroArch (Genesis Plus GX) |
| Dreamcast | `.gdi`, `.cdi`, `.chd` | Flycast |
| Xbox / Xbox 360 | `.iso`, `.xex` | xemu / Xenia Canary |
| Arcade | `.zip` | MAME |

## Roadmap

- [x] RomM library sync with cover art
- [x] First-run setup wizard
- [x] Save file sync (push/pull)
- [x] ROM download from RomM
- [x] Emulator auto-detection
- [ ] Download queue with progress tracking
- [ ] Archive extraction (.zip, .7z)
- [ ] Gamepad navigation
- [ ] Custom themes
- [ ] RetroAchievements display

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for build instructions, architecture, project structure, and testing.

## License

GPL-3.0 — see [LICENSE](LICENSE) for details.

## Credits

- Inspired by [Argosy Launcher](https://github.com/rommapp/argosy-launcher) for Android
- Built to complement [RomM](https://github.com/rommapp/romm) — the self-hosted ROM manager
