# Development readme

Informal backlog and QA checklist — not shipped in the installer; for contributors tracking what to verify next.

## Todo list

1. **Emulators:** Test and support **all available platform emulators** and **RetroArch** (detection, install, cores, launches, per-platform defaults). Cover the platforms and emulators surfaced in Settings and docs. For **RetroArch buildbot coverage** of every core listed in `retroarch_cores()` (11 distinct DLLs), run:

   `npm run test:rust:cores`

   (Network; includes large archives such as MAME — see `TESTING.md`.)
2. **Save sync:** Test **save sync** against RomM (listing saves, upload, download, and local integration with launches).

3. **Immersive fullscreen (Big Picture), controller‑native UX:** Extend `useGamepadKeyboardMapper` with view‑aware shortcuts (beyond D‑pad → arrows / A→Enter / B→Escape / LB‑RB→sections / Start→settings / Back→hints). Target behavior when implemented:
   - **Library:** face **X** → Downloads; emulate **`d`**/`D` on the library root for keyboards; **`S`/Menu** still opens Settings (ensure non‑library views route Start to Settings the same way).
   - **Game details:** **Y** → toggle favorite; **X** → download / re‑download when RomM allows; **`S`** opens Settings.
   - **Global in immersive:** **L3** (left‑stick click) toggles OS fullscreen (same intent as **F11**); respect open dialogs/menus before favoriting or downloading.
   - Prefer a small **`CustomEvent`** (e.g. `wingosy-immersive-gamepad` with `{ action }`) for actions that are not literal key spoofing; keep `ImmersiveHintBar` in sync.

_Add sub-bullets, dates, or PR links below as items are completed._
