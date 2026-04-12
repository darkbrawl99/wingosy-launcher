import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function parseSemverStrict(s) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(s).trim());
  if (!m) throw new Error(`Invalid semver (expected MAJOR.MINOR.PATCH): ${s}`);
  return `${m[1]}.${m[2]}.${m[3]}`;
}

export function writeAppVersion(version) {
  const v = parseSemverStrict(version);

  const pkgPath = join(root, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.version = v;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  const lockPath = join(root, "package-lock.json");
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  lock.version = v;
  if (lock.packages?.[""]) {
    lock.packages[""].version = v;
  }
  writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n");

  const cargoPath = join(root, "src-tauri", "Cargo.toml");
  let cargo = readFileSync(cargoPath, "utf8");
  cargo = cargo.replace(/^version = "[^"]+"/m, `version = "${v}"`);
  writeFileSync(cargoPath, cargo);

  syncCargoLockWorkspaceVersion(v);

  const tauriPath = join(root, "src-tauri", "tauri.conf.json");
  const tauri = JSON.parse(readFileSync(tauriPath, "utf8"));
  tauri.package = tauri.package || {};
  tauri.package.version = v;
  writeFileSync(tauriPath, JSON.stringify(tauri, null, 2) + "\n");

  return v;
}

/** Keep Cargo.lock in sync with `[package].version` (no `cargo` CLI required). */
function syncCargoLockWorkspaceVersion(version) {
  const lockPath = join(root, "src-tauri", "Cargo.lock");
  let text = readFileSync(lockPath, "utf8");
  const needle = '\nname = "wingosy-launcher"\nversion = "';
  const i = text.indexOf(needle);
  if (i === -1) {
    throw new Error('Could not find wingosy-launcher package block in src-tauri/Cargo.lock');
  }
  const start = i + needle.length;
  const end = text.indexOf('"', start);
  if (end === -1) throw new Error("Malformed Cargo.lock");
  text = text.slice(0, start) + version + text.slice(end);
  writeFileSync(lockPath, text);
}
