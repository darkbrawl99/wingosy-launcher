# E2E Test Coverage Report

## Test Suite Overview

| Spec File | Tests | Coverage Area |
|-----------|-------|---------------|
| `setup-wizard.spec.js` | 10 | Initial app setup, wizard flow |
| `app.spec.js` | 15 | Core app UI, navigation, sidebar |
| `settings.spec.js` | 15 | Settings page, emulator config |
| `emulator-sensing.spec.js` | 15 | Emulator detection, install types |
| `emulator-download.spec.js` | 16 | Emulator downloads, GitHub releases |
| `retroarch-cores.spec.js` | 17 | RetroArch core management (unified with emulators) |
| `rom-download.spec.js` | 10 | ROM download from RomM server |
| `game-launch.spec.js` | 17 | Game library, launching, favorites |
| `game-launch-gba.spec.js` | 14 | GBA-specific game launch |
| `coverage-analysis.spec.js` | 26 | Additional coverage areas |
| **Total** | **155** | |

## Frontend Coverage (React Components)

### ✅ Fully Covered
- **Sidebar.jsx**: Navigation, platform list, favorites link, settings link
- **Settings.jsx**: RomM config, emulators, cores, ROM paths
- **SetupWizard.jsx**: Initial setup flow, step navigation
- **Library.jsx**: Game grid, search, filtering
- **GameCard.jsx**: Game display, favorites, launch button
- **GameDetails.jsx**: Game info, play button, favorites toggle

## Backend Coverage (Rust Commands)

### ✅ Tested via E2E
- `is_first_run` - Setup wizard detection
- `complete_setup` - Setup completion
- `get_all_games` - Game library loading
- `get_games_filtered` - Search and filtering
- `get_all_platforms` - Platform listing
- `get_platforms_with_games` - Platform counts
- `toggle_favorite` - Favorites functionality
- `launch_game` - Game launching
- `get_launch_command` - Launch command generation
- `get_config` / `save_config` - Configuration
- `connect_romm` - RomM authentication
- `sync_romm_library` - Library sync
- `detect_emulators` - Emulator detection
- `download_emulator` - Emulator installation
- `download_retroarch_core` - Core downloads
- `get_missing_cores` - Missing core detection
- `launch_emulator` - Direct emulator launch
- `open_emulator_location` - File explorer

### ⚠️ Partially Covered
- `download_rom` - ROM downloading (requires RomM connection)
- `get_game_saves` - Save file management
- `download_game_save` / `upload_game_save` - Save sync
- `scan_directory` - Local ROM scanning

### ❌ Not Directly Tested (Backend-only)
- `get_game_details` - Covered by UI interaction
- `get_collections` - Collections feature
- `search_games` - Covered by search UI
- `apply_detected_paths` - Auto-configuration

## Feature Coverage

### Setup & Configuration
- [x] First-run detection
- [x] Setup wizard completion
- [x] Skip steps functionality
- [x] Settings persistence
- [x] Navigation back/forth

### Game Library
- [x] Game loading from database
- [x] Game card display
- [x] Cover image loading
- [x] Search functionality
- [x] Case-insensitive search
- [x] Empty search results
- [x] Platform filtering
- [x] Favorites filtering
- [x] Game count display

### Game Details
- [x] Game selection
- [x] Game metadata display
- [x] Platform badge
- [x] Play button
- [x] Favorite toggle
- [x] Navigation back to library

### Game Launching
- [x] Launch command generation
- [x] Error handling (no emulator)
- [x] Error handling (ROM not found)
- [x] Debug mode dry-run
- [x] Platform-specific emulator selection

### Emulator Management
- [x] Emulator detection (all types)
  - [x] Steam installations
  - [x] System installations
  - [x] Portable installations
  - [x] Managed installations
- [x] Install type labels
- [x] Version display
- [x] Path display
- [x] Launch button
- [x] Open folder button
- [x] Context menu
- [x] Refresh/re-scan
- [x] Emulator downloads
  - [x] Direct URL downloads
  - [x] GitHub release downloads
  - [x] Progress tracking
  - [x] Error handling

### RetroArch Cores (Unified with Emulators)
- [x] Cores integrated into Emulators section (like Argosy)
- [x] Cores needed badge on RetroArch row
- [x] Expandable cores list within emulator entry
- [x] Platform-named chips for each core
- [x] Missing core detection
- [x] Core downloads via chip interaction
- [x] "Download All Cores" button
- [x] Progress indication
- [x] Error handling (invalid ZIP, HTML error pages)
- [x] Retry after error
- [x] Warning when RetroArch not installed but cores needed
- [x] Expand/collapse animation

### RomM Integration
- [x] Server section display
- [x] Connection status
- [x] URL input
- [x] Connect button

### Error Handling
- [x] Alert display
- [x] Error message quality
- [x] Navigation stability
- [x] Graceful failures

### Accessibility
- [x] Keyboard navigation
- [x] Escape key for dialogs

## Test Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run individual E2E test suites
npm run test:e2e:setup     # Setup wizard
npm run test:e2e:app       # Core app
npm run test:e2e:settings  # Settings page
npm run test:e2e:sensing   # Emulator detection
npm run test:e2e:download  # Emulator downloads
npm run test:e2e:cores     # RetroArch cores
npm run test:e2e:roms      # ROM downloads
npm run test:e2e:games     # Game launch
npm run test:e2e:gba       # GBA games
npm run test:e2e:coverage  # Additional coverage

# Run Rust tests
npm run test:rust          # All Rust tests (unit + integration)
npm run test:rust:unit     # Unit tests only
npm run test:rust:critical # Critical integration tests (network-dependent)
```

## Rust Unit Test Coverage

| Module | Tests | Coverage Area |
|--------|-------|---------------|
| `api::download` | 10 | Download progress formatting, status enums |
| `config` | 18 | Config serialization, defaults, path resolution |
| `emulators::cores` | 7 | Core URL construction, ZIP validation |
| `emulators::detection` | 11 | Emulator patterns, install types, struct tests |
| `emulators::github` | 3 | Asset pattern matching |
| `models::game` | 15 | Game creation, play time, filters, sources |
| `models::platform` | 6 | Platform detection, slug mapping |
| `models::sync` | 3 | Sync state serialization |
| `scanner` | 2 | ROM name cleaning, multi-disc detection |
| **Total** | **74** | |

## Known Limitations

1. **RomM Sync Tests**: Require an actual RomM server connection
2. **ROM Download Tests**: Require RomM authentication
3. **Save Sync Tests**: Require RomM with save data
4. **Real Game Launch**: Can't verify actual emulator window opens

## Recent Fixes

### RetroArch Core Download (ZIP validation)
- Added ZIP file signature validation
- Detects HTML error pages (404)
- Improved error messages for corrupted downloads
- Better logging for debugging

### UI Redesign: Unified Emulators & Cores Section
- Removed separate "RetroArch Cores" section
- Cores now displayed within RetroArch emulator entry (like Argosy)
- Expandable/collapsible UI for missing cores
- Chip-based core display with one-click download
- "Download All Cores" batch option
- Warning alert when cores needed but RetroArch not installed
- Better integration following Argosy's design pattern

### Improved Test Coverage (Critical Fixes)
- **Added critical Rust integration tests** that verify core downloads return valid ZIPs (not HTML error pages)
- **Added ROM download E2E tests** covering download workflow, UI elements, and error handling
- **Stricter E2E assertions** - tests now FAIL when known error patterns are detected (404, invalid ZIP, etc.)
- **HTTP status validation** in download manager prevents downloading error pages
- Tests no longer silently pass when functionality is broken

### Unit Test Suite (74 tests)
- **Added comprehensive unit tests** covering all major Rust modules
- **Config module tests**: Serialization/deserialization, default values, path resolution
- **Download module tests**: Progress formatting, size calculations, status enums
- **Emulator detection tests**: Pattern matching, install types, struct validation
- **Core download tests**: URL construction, ZIP validation (magic bytes, HTML detection)
- **Game model tests**: Play time formatting, filters, source handling
- **Platform tests**: Extension detection, slug mapping

### File Logging (Production)
- **Added persistent file logging** for all builds (not just debug)
- Logs written to `%APPDATA%/wingosy/wingosy-launcher/wingosy.log`
- Rolling daily log files with 7-day retention
- Includes thread IDs, file locations, and line numbers for debugging
- Helps diagnose user-reported issues in production
