#!/usr/bin/env python3
"""Pack rendered animation frames into one Phaser sprite sheet.

Input is a directory of PNG frames named `<animation>_<number>.png`, which is
what a Blender render outputs. Output is a single grid PNG plus the TypeScript
animation table to paste into src/animation/WardenAnimations.ts.

The grid is one animation per row, frames left to right, which is the layout the
game already expects. See ART_PIPELINE.md for the render specification.

Usage:
    python3 tools/pack_sheet.py <frames_dir> <output.png> [--fps 15]
"""

from __future__ import annotations

import argparse
import re
import sys
from collections import defaultdict
from pathlib import Path

from PIL import Image

# Row order is fixed by src/animation/CharacterAnimation.ts. Renaming or
# reordering here silently breaks every animation in the game.
ROW_ORDER = [
    "idle",
    "run",
    "dash",
    "light-1",
    "light-2",
    "light-3",
    "heavy",
    "shoot",
    "hurt",
    "death",
]

FRAME_PATTERN = re.compile(r"^(?P<name>.+)_(?P<index>\d+)$")


def collect_frames(source: Path) -> dict[str, list[Path]]:
    """Group PNG files by animation name, ordered by their frame number."""
    grouped: dict[str, list[tuple[int, Path]]] = defaultdict(list)

    for path in sorted(source.glob("*.png")):
        match = FRAME_PATTERN.match(path.stem)
        if not match:
            print(f"  skipped (unrecognised name): {path.name}", file=sys.stderr)
            continue
        grouped[match.group("name")].append((int(match.group("index")), path))

    return {
        name: [path for _, path in sorted(entries)]
        for name, entries in grouped.items()
    }


def validate(frames: dict[str, list[Path]]) -> tuple[int, int]:
    """Check every frame shares one size, and report animations that are missing."""
    if not frames:
        raise SystemExit("No frames found. Expected files named like idle_0001.png")

    sizes = set()
    for paths in frames.values():
        for path in paths:
            with Image.open(path) as image:
                sizes.add(image.size)

    if len(sizes) > 1:
        raise SystemExit(f"Frames have mixed sizes: {sorted(sizes)}. They must all match.")

    missing = [name for name in ROW_ORDER if name not in frames]
    if missing:
        print(f"  warning: no frames for {', '.join(missing)}", file=sys.stderr)

    unexpected = [name for name in frames if name not in ROW_ORDER]
    if unexpected:
        print(f"  warning: ignoring unknown animations {', '.join(unexpected)}", file=sys.stderr)

    return sizes.pop()


def build_sheet(
    frames: dict[str, list[Path]],
    frame_size: tuple[int, int],
    destination: Path,
) -> tuple[int, int]:
    """Compose the grid and write it. Returns (columns, rows)."""
    frame_width, frame_height = frame_size
    columns = max(len(frames.get(name, [])) for name in ROW_ORDER)
    rows = len(ROW_ORDER)

    sheet = Image.new("RGBA", (columns * frame_width, rows * frame_height), (0, 0, 0, 0))

    for row, name in enumerate(ROW_ORDER):
        for column, path in enumerate(frames.get(name, [])):
            with Image.open(path) as image:
                sheet.paste(image.convert("RGBA"), (column * frame_width, row * frame_height))

    destination.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(destination)
    return columns, rows


def emit_typescript(
    frames: dict[str, list[Path]],
    frame_size: tuple[int, int],
    columns: int,
    texture_key: str,
    fps: int,
) -> str:
    """Produce the animation table so frame counts are never transcribed by hand."""
    frame_width, frame_height = frame_size

    lines = [
        "export const WARDEN_SHEET: CharacterSheetLayout = {",
        f"  textureKey: '{texture_key}',",
        f"  frameWidth: {frame_width},",
        f"  frameHeight: {frame_height},",
        f"  columns: {columns},",
        "}",
        "",
        "export const WARDEN_ANIMATIONS: readonly AnimationDefinition[] = [",
    ]

    key_names = {
        "idle": "Idle",
        "run": "Run",
        "dash": "Dash",
        "light-1": "Light1",
        "light-2": "Light2",
        "light-3": "Light3",
        "heavy": "Heavy",
        "shoot": "Shoot",
        "hurt": "Hurt",
        "death": "Death",
    }
    looping = {"idle", "run"}

    for row, name in enumerate(ROW_ORDER):
        count = len(frames.get(name, []))
        if count == 0:
            continue
        repeat = -1 if name in looping else 0
        lines.append(
            f"  {{ key: CharacterAnimation.{key_names[name]}, row: {row}, "
            f"frames: {count}, frameRate: {fps}, repeat: {repeat} }},"
        )

    lines.append("]")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Pack rendered frames into a sprite sheet")
    parser.add_argument("source", type=Path, help="directory holding the PNG frames")
    parser.add_argument("output", type=Path, help="path of the sheet PNG to write")
    parser.add_argument("--fps", type=int, default=15, help="frame rate to emit (default 15)")
    parser.add_argument("--texture-key", default="warden", help="Phaser texture key")
    args = parser.parse_args()

    if not args.source.is_dir():
        raise SystemExit(f"Not a directory: {args.source}")

    frames = collect_frames(args.source)
    frame_size = validate(frames)
    columns, rows = build_sheet(frames, frame_size, args.output)

    total = sum(len(paths) for paths in frames.values())
    print(f"Packed {total} frames into {columns} x {rows} grid -> {args.output}")
    print(f"Sheet size: {columns * frame_size[0]} x {rows * frame_size[1]}")
    print()
    print("Paste into src/animation/WardenAnimations.ts:")
    print()
    print(emit_typescript(frames, frame_size, columns, args.texture_key, args.fps))


if __name__ == "__main__":
    main()
