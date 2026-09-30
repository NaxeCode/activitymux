# AGENTS.md

ActivityMux is a Tauri 2 desktop app for Windows and Linux. A Rust backend (`src-tauri/src`) polls running processes (`sysinfo`), resolves one preset (manual pin, then the highest-priority rule, then the default) in `resolver.rs`, and publishes it over Discord IPC in `discord.rs`. The React + Mantine UI (`src/`) calls Tauri commands through `src/api.ts`. Config is versioned JSON persisted by `config.rs`.

Build: `npm install`, `npm run tauri dev`, `npm run build` (tsc + vite), `cd src-tauri && cargo test`. Releases are built by tagging `vX.Y.Z` (`.github/workflows/build.yml`).

## Code Review Rules

Focus on the Tauri security boundary, update integrity, config durability, and the resolver/presence loop. Formatting (rustfmt, prettier) and lint are not review concerns.

### Always flag (P0/P1)

- **Tauri capability widening.** `src-tauri/capabilities/default.json` is scoped to the `main` window with narrow permissions. Flag broad grants (`fs:default`, `shell:*`, `process:allow-exit`, `http:*`, wildcard window scopes) or new plugins without a concrete need. Flag loosening the CSP in `tauri.conf.json`, such as adding `unsafe-eval`, remote `script-src`, or widening `connect-src`.
- **Unchecked paths in commands.** `import_config` and `export_config` take a `path: String` from the webview. The path must come from the dialog plugin, and file access must stay limited to config JSON. Flag new `#[tauri::command]` functions that read, write, execute, or open arbitrary paths or URLs from webview input without validation.
- **Updater integrity.** Keep `plugins.updater.pubkey`, `requireSignedVersion: true`, and the single GitHub Releases `latest.json` endpoint. Flag endpoint changes to non-GitHub or HTTP URLs, removal of signature checks, or a committed `TAURI_SIGNING_PRIVATE_KEY` or `*.key`. A changed pubkey breaks updates for every installed copy.
- **Release version drift.** The version must match across `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`, because the workflow rejects tags that don't match. Flag PRs that bump only some of them.
- **Config data loss.**
  - `write_recoverable` must keep the temp-file, backup, and rename sequence with restore on failure.
  - `AppConfig::validate` must run before every save, import, and export.
  - `validate` rejects any `schema_version` other than `CONFIG_SCHEMA_VERSION`, so bumping it without a migration from the previous version will reject every user's existing config. Flag that.
- **Service loop crashes.** The poll thread in `service.rs` must not panic on Discord IPC errors, a missing Discord, or process enumeration failures. It should reconnect and keep going. Flag new `unwrap()`/`expect()` on fallible I/O in the loop. Existing `expect("... lock poisoned")` is accepted. Flag holding the config `RwLock` across Discord IPC calls or sleeps.

### Flag when relevant

- Resolver semantics: manual pin wins, then the highest `priority` among enabled rules, with `Any`/`All` match modes over names normalized by `normalize_process_name` (case-insensitive, `.exe` stripped). Changes need matching tests in `resolver.rs`.
- Discord presence rules: at most 2 buttons, and button URLs must be http(s). Invalid Application IDs must fail validation rather than reach IPC. Keep the 15s `PRESENCE_HEARTBEAT` re-send and clear presence on disconnect or exit.
- `poll_interval_ms` must stay clamped to 500ms–60s. Flag unbounded values that could spin the CPU.
- New `invoke()` calls in `src/api.ts` with no matching Rust command, or with argument names that don't match.

### Don't flag

- Unsigned Windows installers. This is a known, documented limitation.
- `src/demo.ts` fake data, `site/` marketing page content, and UI styling.
