# ActivityMux

Set one Discord Rich Presence from presets, process rules, or a manual pin.

## Download

Get the latest installers from [Releases](https://github.com/NaxeCode/activitymux/releases/latest).

- Windows: use the `.exe` installer
- Linux: use the `.AppImage` or `.deb`

Windows builds are currently unsigned, so SmartScreen may show a warning.

## Setup

1. Create an app in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Name it as you want the activity title to appear.
3. Copy its Application ID from **General Information**.
4. Paste the ID into ActivityMux settings and save.

Discord takes the activity title and uploaded artwork from that application. A preset can use its own Application ID when it needs a different title or asset set. No bot token or client secret is needed.

## What it does

- Custom presence presets and timers
- Running-process rules with priorities
- Manual pin and default fallback
- Discord reconnect, tray mode, and autostart
- JSON import and export
- Windows and Linux support

ActivityMux controls only the presence it publishes. Discord game detection, Spotify, consoles, and other connected services remain separate.

## Build

Requires Node.js 22, Rust stable, and the [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/).

```bash
npm install
npm run tauri build
```

## License

MIT
