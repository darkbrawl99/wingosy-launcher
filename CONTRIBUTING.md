# Contributing

## Setup

Prerequisites: **Windows 10/11**, **Node.js 20+** (22 LTS recommended; required for the `edgedriver` devDependency), **npm 11** (pinned in `package.json` as `packageManager`), **Rust 1.70+**, **VS Build Tools (C++)**.

### PATH on Windows

`node`, `npm`, and `cargo` must be on your `Path`. This repo’s `.vscode/settings.json` prepends **Node** (`C:\Program Files\nodejs`) and **Rust** (`%USERPROFILE%\.cargo\bin`) for Cursor/VS Code integrated terminals. If a shell still cannot find them, prepend manually for that session:

```powershell
$env:Path = "C:\Program Files\nodejs;$env:USERPROFILE\.cargo\bin;" + $env:Path
```

Verify in that same terminal:

```powershell
node -v
cargo -v
```

### Troubleshooting: `tauri dev` exits or “app isn’t running”

| What you see | What it usually means | What to do |
|----------------|----------------------|------------|
| `npm` / `node` is not recognized | Node.js is not on `Path` for this terminal | Use the `$env:Path = ...` line above, or open a **new** terminal after installing Node; confirm with `node -v`. |
| `failed to get cargo metadata: program not found` | **Cargo** is not on `Path` (Tauri needs Rust) | Add `%USERPROFILE%\.cargo\bin` (see line above), then `cargo -v`. Install Rust via `winget` / rustup if needed. |
| No window yet, only compile logs | First **debug** build of `src-tauri` can take **30–120+ seconds** | Wait until you see **`Finished` `dev` profile** and the log line **Starting Wingosy Launcher**; check the taskbar for the window. |
| Only the browser / `localhost:5173` | You ran **`npm run dev:web`** instead of the full app | Use **`npm run tauri dev`** (or **`npm run dev`**, which is the same) so the **native** window opens. |
| Can’t drag the frameless window / title bar feels “dead” | Vite **HMR** doesn’t reload **`tauri.conf.json`** or the **Rust** shell; `-webkit-app-region` can also lag until a full reload | **Stop** `tauri dev` (Ctrl+C), start it again. After changing **`src-tauri/tauri.conf.json`** (e.g. `startDragging`), you must restart so the native binary picks up the new allowlist. |

Install if missing:

```powershell
winget install OpenJS.NodeJS.LTS --accept-package-agreements
winget install Rustlang.Rustup --accept-package-agreements
rustup default stable
```

After installing, **close and reopen** terminals (or sign out) so `Path` updates apply.

Enable [Corepack](https://nodejs.org/api/corepack.html) once so installs use the pinned npm version:

```bash
corepack enable
```

```bash
git clone https://github.com/yash-1o1/wingosy-launcher.git
cd wingosy-launcher
npm install
npm run tauri dev
```

### Development vs release

**Development — `npm run tauri dev`**

- Runs a **debug** native shell and serves the React app from your **`src/`** tree with Vite.
- **Frontend:** Vite **hot module replacement** — many React/CSS changes show up while the window stays open.
- **Rust (`src-tauri/`):** Saving files **rebuilds** the native side; the dev app **restarts** (not the same instant refresh as the web UI).
- You are always tied to **whatever is on disk** in your clone when you run this command.

**Release — `npm run tauri build`**

- Produces an optimized **`Wingosy Launcher.exe`** under `src-tauri/target/release/` (and installers if configured).
- The UI and Rust code are **fixed at build time**. New commits do **not** change an `.exe` you already built until you **build again** and **open the new binary**.
- Use this when you care about **production-like** speed, installers, or **E2E** tests that target the release app.

For everyday UI work, use **`tauri dev`**. Use a **release** build when you need to match what users install.

### Release channels (stable / beta / nightly)

The in-app **Updates** settings use GitHub’s API to compare your build to the correct **track**:

| Channel | GitHub source | CI workflow |
|--------|----------------|-------------|
| **Stable** | Latest **non-prerelease** release (`/releases/latest`) | [`.github/workflows/release.yml`](.github/workflows/release.yml) — tag `v*` **without** `beta` or `nightly` (e.g. `v0.2.0`), **or** manual upload if Actions are off (below) |
| **Beta** | Newest **prerelease** whose tag contains `beta` and not `nightly` | [`.github/workflows/beta.yml`](.github/workflows/beta.yml) — manual dispatch; tags like `beta-<run_id>` |
| **Nightly** | Newest **prerelease** whose tag contains `nightly` | [`.github/workflows/nightly.yml`](.github/workflows/nightly.yml) — push a tag matching `nightly*` (e.g. `nightly-2026-04-11`), **or** weekday schedule / manual dispatch (`nightly-<run_id>`) |

Pre-release workflows set **`prerelease: true`** so they do not replace **stable** on `/releases/latest`.

### Manual GitHub release (Actions disabled)

If **GitHub Actions** is turned off, tags alone do not attach installers. Use an **existing tag** (for example you already pushed **`v0.0.1`** or **`nightly-v0.0.1`**) and publish the release by hand.

1. **Match the app version to the tag** (on the commit you are building, usually `main`):
   - Stable tag **`vX.Y.Z`** → run `npm run version:set -- X.Y.Z` so `package.json`, `Cargo.toml`, `tauri.conf.json`, and lockfiles agree with the binary.
2. **Build locally (Windows):**
   ```bash
   npm ci
   npm run tauri build
   ```
3. **Collect artifacts** (paths vary slightly by Tauri; look under):
   - `src-tauri/target/release/bundle/nsis/` — setup `.exe`
   - `src-tauri/target/release/bundle/msi/` — `.msi` if generated  
   The main binary is also under `src-tauri/target/release/` (e.g. `Wingosy Launcher.exe`).
4. **On GitHub:** **Releases** → **Draft a new release** → **Choose a tag** → pick the tag you already pushed (do not create a duplicate tag).
5. **Stable:** leave **“Set as a pre-release”** unchecked so `/releases/latest` and the in-app **Stable** channel see it.
6. **Nightly / Beta:** check **pre-release**, and use a tag that matches that channel (e.g. `nightly-*` or `beta-*`; see the table above).
7. **Upload** the installer(s), publish the release.

**GitHub CLI:** Install from [cli.github.com](https://cli.github.com/) and run `gh auth login` once. On Windows, if `gh` is not on your `PATH`, use `C:\Program Files\GitHub CLI\gh.exe`. Publish a release from an **existing** tag (example stable):

```bash
gh release create v0.0.1 --repo YOUR_USER/wingosy-launcher --title "Wingosy Launcher v0.0.1" --notes "…" --latest
# Attach installers after building:  gh release upload v0.0.1 path/to/setup.exe --repo YOUR_USER/wingosy-launcher
```

The in-app updater compares your running build to **GitHub Releases** metadata; it does not require Actions to have produced the assets, only that the **release + tag + files** exist.

### App versioning (automated in CI)

The app semver is **`MAJOR.MINOR.PATCH`** in **`package.json`**, mirrored to **`package-lock.json`**, **`src-tauri/Cargo.toml`**, **`src-tauri/tauri.conf.json`**, and **`src-tauri/Cargo.lock`** via:

```bash
npm run version:set -- 1.2.3    # node scripts/set-version.mjs — set all files to an exact version
npm run version:bump -- nightly # PATCH + 1
npm run version:bump -- beta    # MINOR + 1, PATCH = 0 (resets “nightly” counter)
npm run version:bump -- release # MAJOR + 1, MINOR = 0, PATCH = 0 (resets beta and nightly counters)
```

| Workflow | What happens to the version |
|----------|------------------------------|
| **Nightly** (cron or **Run workflow** on `main`) | Bump **PATCH**, build, then **commit** back to `main` with `[skip ci]`. |
| **Beta** (manual dispatch on `main`) | Bump **MINOR**, **PATCH → 0**, build, then commit to `main`. |
| **Stable** ([`release.yml`](.github/workflows/release.yml) on tag `vX.Y.Z`) | **No semver math in CI** — the tag defines the version; the workflow runs `version:set` so binaries match **`vX.Y.Z`**. Before tagging, run **`version:bump -- release`** on **`main`** so **`main`** reflects the stable line you are shipping. |

Pushing a **`nightly*`** tag builds that ref **without** running the bump script (uses whatever versions are in that snapshot). Prefer schedule / **Run workflow** on `main` for automatic PATCH bumps.

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

See [TESTING.md](TESTING.md) for the full matrix, **opt-in** (network) integration tests, and the E2E spec list.

**Default local loop** (fast, no live RomM / heavy downloads):

```bash
cargo test              # Rust unit tests + integration tests that are not #[ignore]
npm run test:unit       # Vitest: pure JS (`*.test.js`) + React (`*.test.jsx` with Testing Library)
```

See [TESTING.md](TESTING.md) → *Unit Tests (JavaScript)* for `MuiTestProvider` and file naming.

**Integration tests** that talk to the real network are marked `#[ignore]` in Rust so `cargo test` stays offline-friendly. **Do run them** when you change RomM, downloads, or emulator fetch code — see [TESTING.md](TESTING.md) → *Integration Tests (Rust)* for the exact `cargo test --test … -- --ignored` commands. That is “opt in with a flag,” not “pretend integration tests do not exist.”

**E2E** (`npm run test:e2e`) is optional and needs more than `npm install` + `tauri dev`:

1. **`tauri-driver` on your `PATH`** — WebDriver talks to the native app through it. Install with Rust’s toolchain:

   ```bash
   cargo install tauri-driver
   ```

   The binary is usually `%USERPROFILE%\.cargo\bin\tauri-driver.exe`. If you see `spawn tauri-driver ENOENT` or `ECONNREFUSED` on `localhost:4444`, the driver is missing or not on `PATH`.

2. **Edge WebDriver** — Pulled automatically on E2E runs via the `edgedriver` devDependency (into `e2e-webdriver/`). Microsoft Edge must be installed so the driver version can be matched.

3. **Release build** — `wdio.conf.js` expects `src-tauri/target/release/Wingosy Launcher.exe`:

   ```bash
   npm run tauri build
   ```

Step (1) was documented in [TESTING.md](TESTING.md) and in `wdio.conf.js` comments, but not in this file until now, so it was easy to miss when only reading **Contributing**.

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
