"""Render the Warden greybox puppet to PNG frame sequences.

Run headless:
    blender --background --python tools/blender/render_warden.py -- --out <dir>

Output is named `<animation>_0001.png`, which is exactly what tools/pack_sheet.py
consumes. Nobody has to open Blender for any of this.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import bpy  # noqa: E402
from bpy_extras.object_utils import world_to_camera_view  # noqa: E402
from mathutils import Vector  # noqa: E402

from warden_materials import MaterialLibrary  # noqa: E402
from warden_poses import PoseLibrary  # noqa: E402
from warden_rig import WardenRig  # noqa: E402
from warden_stage import Stage  # noqa: E402

# Parts excluded when measuring the body, because a swinging blade would
# otherwise shrink the character to fit its own reach.
WEAPON_PARTS = {
    "guard",
    "blade_base",
    "blade_tip",
    "pistol_body",
    "pistol_barrel",
    "pistol_grip",
}

# Fraction of frame height the body should occupy. 0.62 of a 192px frame is
# about 120px, matching the render specification in ART_PIPELINE.md.
BODY_FILL = 0.62
# Hard limit before a swing would clip the edge of the frame.
SAFE_FILL = 0.97


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description="Render the Warden sprite frames")
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--size", type=int, default=192)
    parser.add_argument("--only", default=None, help="render a single animation")
    return parser.parse_args(argv)


def mesh_objects(include_weapons: bool) -> list[bpy.types.Object]:
    return [
        obj
        for obj in bpy.context.scene.objects
        if obj.type == "MESH"
        and (include_weapons or obj.name not in WEAPON_PARTS)
    ]


def projected_bounds(objects: list[bpy.types.Object]) -> tuple[float, float, float, float]:
    """Normalised camera-space bounds of every object's bounding box."""
    scene = bpy.context.scene
    camera = scene.camera
    min_x = min_y = float("inf")
    max_x = max_y = float("-inf")

    for obj in objects:
        for corner in obj.bound_box:
            world = obj.matrix_world @ Vector(corner)
            projected = world_to_camera_view(scene, camera, world)
            min_x = min(min_x, projected.x)
            max_x = max(max_x, projected.x)
            min_y = min(min_y, projected.y)
            max_y = max(max_y, projected.y)

    return min_x, max_x, min_y, max_y


def frame_character(rig: WardenRig, stage: Stage) -> float:
    """Centre on the resting pose, then size the frame so no pose ever clips.

    Centring happens once, on idle, and never per pose. The sprite origin is the
    frame centre, so a character re-centred per frame would slide around as the
    animation played.
    """
    stage.set_framing(1.0)

    rig.apply_pose(PoseLibrary.frames_for("idle")[0])
    bpy.context.view_layer.update()
    min_x, max_x, min_y, max_y = projected_bounds(mesh_objects(include_weapons=False))
    body_height = max_y - min_y

    # At an orthographic scale of 1, a normalised coordinate offset from 0.5 is
    # already a distance in world units, so the camera shift is that difference.
    orientation = stage.camera.matrix_world.to_quaternion()
    right = orientation @ Vector((1.0, 0.0, 0.0))
    up = orientation @ Vector((0.0, 1.0, 0.0))
    stage.camera.location = (
        stage.camera.location
        + right * ((min_x + max_x) / 2.0 - 0.5)
        + up * ((min_y + max_y) / 2.0 - 0.5)
    )
    bpy.context.view_layer.update()

    # Worst-case distance from the frame centre, over every frame of every
    # animation. Measuring span alone is not enough: a pose can be small yet sit
    # far off centre and still run off the edge.
    #
    # Only the body is fitted. Sizing to the blade as well would shrink the
    # character to roughly a third of the frame, and the blade does not need to
    # stay inside it: the engine draws its own swing arc over the sprite, so a
    # tip that leaves the frame for a frame or two costs nothing.
    worst_body = 0.0
    worst_all = 0.0
    driver = ""
    for name in PoseLibrary.FRAME_COUNTS:
        for index, pose in enumerate(PoseLibrary.frames_for(name), start=1):
            rig.apply_pose(pose)
            bpy.context.view_layer.update()
            body = projected_bounds(mesh_objects(include_weapons=False))
            everything = projected_bounds(mesh_objects(include_weapons=True))
            reach = max(abs(value - 0.5) for value in body)
            if reach > worst_body:
                worst_body = reach
                driver = f"{name} frame {index}"
            worst_all = max(worst_all, *(abs(value - 0.5) for value in everything))

    print(f"[warden] widest body pose: {driver}")

    scale = max(body_height / BODY_FILL, 2.0 * worst_body / SAFE_FILL)
    stage.set_framing(scale)

    overflow = (2.0 * worst_all / scale) - 1.0
    if overflow > 0.0:
        print(f"[warden] blade leaves the frame by up to {overflow * 100:.0f}%")

    return scale


def refine_centring(stage: Stage, rig: WardenRig, scale: float, size: int) -> None:
    """Re-centre using the rendered silhouette instead of bounding boxes.

    Projecting bounding-box corners over-estimates a rotated box, so the first
    pass can leave the character a few percent off centre. One throwaway render
    of the resting pose, measured in pixels, removes that error. Weapons are
    hidden for the measurement so a hanging blade cannot drag the centre sideways.
    """
    weapons = [obj for obj in bpy.context.scene.objects if obj.name in WEAPON_PARTS]
    for obj in weapons:
        obj.hide_render = True

    rig.apply_pose(PoseLibrary.frames_for("idle")[0])
    bpy.context.view_layer.update()

    probe = Path(bpy.app.tempdir) / "warden_centring"
    bpy.context.scene.render.filepath = str(probe)
    bpy.ops.render.render(write_still=True)

    for obj in weapons:
        obj.hide_render = False

    image = bpy.data.images.load(str(probe) + ".png")
    pixels = tuple(image.pixels)
    width, height = image.size

    min_x, max_x = width, -1
    min_y, max_y = height, -1
    for y in range(height):
        row = y * width
        for x in range(width):
            if pixels[(row + x) * 4 + 3] > 0.03:
                min_x = min(min_x, x)
                max_x = max(max_x, x)
                min_y = min(min_y, y)
                max_y = max(max_y, y)

    bpy.data.images.remove(image)
    if max_x < 0:
        return

    centre_x = (min_x + max_x + 1) / 2.0 / width
    centre_y = (min_y + max_y + 1) / 2.0 / height

    orientation = stage.camera.matrix_world.to_quaternion()
    stage.camera.location = (
        stage.camera.location
        + (orientation @ Vector((1.0, 0.0, 0.0))) * (centre_x - 0.5) * scale
        + (orientation @ Vector((0.0, 1.0, 0.0))) * (centre_y - 0.5) * scale
    )
    bpy.context.view_layer.update()

    body_pixels = max_y - min_y + 1
    print(
        f"[warden] centred on silhouette, body {body_pixels}px of {size} "
        f"({round(100 * body_pixels / size)}%)"
    )


def render_animation(rig: WardenRig, name: str, out_dir: Path) -> int:
    scene = bpy.context.scene
    frames = PoseLibrary.frames_for(name)

    for index, pose in enumerate(frames, start=1):
        rig.apply_pose(pose)
        bpy.context.view_layer.update()
        scene.render.filepath = str(out_dir / f"{name}_{index:04d}")
        bpy.ops.render.render(write_still=True)

    return len(frames)


def main() -> None:
    args = parse_args()
    args.out.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)

    materials = MaterialLibrary()
    rig = WardenRig(materials)
    stage = Stage(bpy.context.scene)
    stage.configure_render(args.size)

    scale = frame_character(rig, stage)
    refine_centring(stage, rig, scale, args.size)
    print(f"[warden] orthographic scale {scale:.3f}, frame {args.size}px")

    names = [args.only] if args.only else list(PoseLibrary.FRAME_COUNTS)
    total = 0
    for name in names:
        count = render_animation(rig, name, args.out)
        total += count
        print(f"[warden] {name}: {count} frames")

    print(f"[warden] done, {total} frames in {args.out}")


if __name__ == "__main__":
    main()
