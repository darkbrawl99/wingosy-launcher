# Wingosy Launcher

[![Build](https://img.shields.io/github/actions/workflow/status/yash-1o1/wingosy-launcher/nightly.yml?branch=main&label=build&logo=github)](https://github.com/yash-1o1/wingosy-launcher/actions/workflows/nightly.yml?query=branch%3Amain)
[![Release](https://img.shields.io/github/v/release/yash-1o1/wingosy-launcher?label=release)](https://github.com/yash-1o1/wingosy-launcher/releases/latest)
[![Windows](https://img.shields.io/badge/Windows-10%2F11-0078D6?logo=windows&logoColor=white)](README.md#requirements)

A Windows game launcher with RomM integration. Inspired by [Argosy Launcher](https://github.com/rommapp/argosy-launcher), with the goal of closely following Argosy's feature implementations.

## Features

- **RomM Integration** — Sync library, covers, saves from [RomM](https://github.com/rommapp/romm)
- **20+ Platforms** — NES, SNES, N64, GameCube, Wii, PlayStation 1-3, PSP, and more
- **Emulator Management** — Auto-detect, download, and configure emulators
- **ROM Downloads** — Download ROMs directly from RomM
- **Game Launching** — Launch with preferred emulator, per-game overrides

## Quick Start

1. Download from [Releases](https://github.com/yash-1o1/wingosy-launcher/releases)
2. Run setup wizard
3. Connect to RomM or scan local ROMs
4. Play!

## Requirements

- Windows 10/11
- [RomM](https://github.com/rommapp/romm) v4.x (for sync features)

## Supported Emulators

| Emulator | Platform(s) | Download | Launch Intent | Save Sync |
| --- | --- | :---: | :---: | :---: |
| mGBA | Game Boy / GBC / GBA | ✅ | ✅ | ⬜ |
| RetroArch | Multi-system | ⬜ | ⬜ | ⬜ |
| Dolphin | GameCube / Wii | ⬜ | ⬜ | ⬜ |
| PCSX2 | PlayStation 2 | ⬜ | ⬜ | ⬜ |
| RPCS3 | PlayStation 3 | ⬜ | ⬜ | ⬜ |
| PPSSPP | PSP | ⬜ | ⬜ | ⬜ |
| DuckStation | PlayStation 1 | ⬜ | ⬜ | ⬜ |
| Cemu | Wii U | ⬜ | ⬜ | ⬜ |
| Eden | Switch | ⬜ | ⬜ | ⬜ |
| melonDS | Nintendo DS | ⬜ | ⬜ | ⬜ |
| Lime3DS | Nintendo 3DS | ⬜ | ⬜ | ⬜ |
| Flycast | Dreamcast | ⬜ | ⬜ | ⬜ |
| xemu | Xbox | ⬜ | ⬜ | ⬜ |
| Xenia | Xbox 360 | ⬜ | ⬜ | ⬜ |
| MAME | Arcade | ⬜ | ⬜ | ⬜ |

✅ = implemented · ⬜ = planned

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup.
