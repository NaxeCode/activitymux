#!/usr/bin/env python3
"""Build the Tauri updater manifest from signed release bundles."""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote


def signed_bundle(path: Path) -> tuple[Path, str] | None:
    signature = Path(f"{path}.sig")
    if not signature.is_file():
        return None
    return path, signature.read_text(encoding="utf-8").strip()


def choose_bundle(paths: list[Path], label: str) -> tuple[Path, str]:
    signed = [item for path in paths if (item := signed_bundle(path))]
    if len(signed) != 1:
        found = ", ".join(path.name for path in paths) or "none"
        raise SystemExit(f"expected one signed {label} bundle, found {len(signed)} ({found})")
    return signed[0]


def build_manifest(artifacts: Path, version: str, tag: str, repo: str, notes: str) -> dict:
    windows = choose_bundle(sorted(artifacts.rglob("*setup.exe")), "Windows NSIS")
    linux = choose_bundle(sorted(artifacts.rglob("*.AppImage")), "Linux AppImage")
    published = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    def platform(bundle: tuple[Path, str]) -> dict[str, str]:
        path, signature = bundle
        return {
            "signature": signature,
            "url": f"https://github.com/{repo}/releases/download/{quote(tag)}/{quote(path.name)}",
        }

    return {
        "version": version,
        "notes": notes,
        "pub_date": published,
        "platforms": {
            "windows-x86_64": platform(windows),
            "linux-x86_64": platform(linux),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifacts", type=Path, required=True)
    parser.add_argument("--version", required=True)
    parser.add_argument("--tag", required=True)
    parser.add_argument("--repo", required=True)
    parser.add_argument("--notes-file", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    manifest = build_manifest(
        args.artifacts,
        args.version,
        args.tag,
        args.repo,
        args.notes_file.read_text(encoding="utf-8").strip(),
    )
    args.output.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {args.output}")


if __name__ == "__main__":
    main()
