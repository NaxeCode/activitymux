# ActivityMux

ActivityMux is a Windows and Linux Discord Rich Presence controller. It publishes one activity selected from reusable presets, running-process rules, deterministic priorities, a default fallback, and an optional pinned override.

## Features

- Custom activity name, type, details, state, artwork, hover text, and buttons
- Session, persistent, fixed-date, or disabled timers
- Cross-platform running-process picker
- Any/all process matching and numeric priorities
- Manual override that wins over every automatic rule
- Live Discord-style preview and an explanation of why the current preset won
- Tray operation, launch at login, reconnect after Discord restarts
- Validated, versioned JSON import/export
- Windows NSIS/MSI and Linux AppImage/deb/rpm bundle configuration

ActivityMux controls only the Rich Presence it publishes. Discord's automatic game detection, Spotify, consoles, and other connected services remain under Discord's Activity Sharing and Registered Games settings.

## Windows test setup

1. Download the `activitymux-windows-x64` artifact from the **Build desktop installers** GitHub Actions workflow.
2. Extract the artifact and run the NSIS `.exe` installer. The unsigned development build may trigger Windows SmartScreen; inspect the GitHub Actions provenance and choose **More info → Run anyway** only if it came from this repository's workflow.
3. Keep the Discord desktop client running. Discord web and mobile clients do not expose local Rich Presence IPC.
4. In Discord, enable **User Settings → Activity Sharing → Share my activity**.
5. Create a Discord application at <https://discord.com/developers/applications>:
   - Choose **New Application** and name it `Thinking about Messmer`. Discord—not the local RPC payload—uses this Developer Portal name as the activity-card title.
   - Open **General Information**.
   - Copy the numeric **Application ID**.
   - Never copy or share a client secret or bot token; ActivityMux does not need either.
6. Open ActivityMux → **Settings**, paste the Application ID, and select **Save changes**.
   - To use different profile titles or uploaded asset libraries per preset, create one Discord application for each and paste its ID into that preset's **Application ID override**.
7. The bundled **Thinking about Messmer** preset should appear on the Discord profile within a few seconds.

### End-to-end Windows test

Verify these behaviors in order:

1. **Manual presence:** Pin `Thinking about Messmer`; Discord shows its name, details, state, and elapsed timer.
2. **Persistence:** Quit ActivityMux from its tray menu, reopen it, and confirm the persistent timer continues from the original timestamp.
3. **Process rule:** Open the target program, then create a rule from **Process rules → Add process rule**. Assign the preset and priority `900`; release the manual override. The Dashboard should report that rule under **Why this is active**.
4. **Priority:** Add a second matching rule with a lower priority. Confirm the `900` rule wins.
5. **Fallback:** Close the matched program. Confirm the configured default preset takes over.
6. **Reconnect:** Leave ActivityMux running, fully quit and reopen Discord, then confirm the presence returns automatically.
7. **Tray:** Close the ActivityMux window. Confirm the service remains present in the Windows notification area and continues publishing.
8. **Autostart:** Enable **Launch at login**, save, sign out/in, and confirm ActivityMux starts hidden and restores the presence.
9. **Transfer:** Export the configuration, change a preset, then import the exported file and confirm the earlier configuration is restored.

When reporting a problem, include the ActivityMux version, Windows version, Discord channel (Stable/PTB/Canary), the failed step, Dashboard connection message, and whether Discord itself came from the standard desktop installer.

## Linux notes

Native Discord packages and sandboxed paths recognized by the IPC library are supported. If Discord Flatpak does not expose Rich Presence, create the user-session bridge documented by ArchWiki:

```bash
ln -sf "$XDG_RUNTIME_DIR/app/com.discordapp.Discord/discord-ipc-0" "$XDG_RUNTIME_DIR/discord-ipc-0"
```

Process rules work on X11 and Wayland because they enumerate processes rather than reading the active window. Generic active-window rules are intentionally not implemented because Wayland does not expose a universal global foreground-window API.

## Development

Requirements:

- Node.js 22+
- Rust stable
- Tauri 2 system dependencies for the target platform

```bash
npm install
npm run tauri dev
```

Focused verification:

```bash
npm run build
cd src-tauri
cargo test --all-targets
cargo clippy --all-targets -- -D warnings
```

Build native installers:

```bash
npm run tauri build
```

The cross-platform workflow is in `.github/workflows/build.yml`. A manual workflow dispatch produces separate `activitymux-windows-x64` and `activitymux-linux-x64` artifacts.

## Configuration

Configuration is stored in the platform application-config directory as `config.json`. Writes use a recoverable temporary/backup sequence, imports are validated before replacement, and exported files contain no credentials.

- Windows: `%APPDATA%\com.naxecode.activitymux\config.json`
- Linux: `~/.config/com.naxecode.activitymux/config.json`

## License

MIT
