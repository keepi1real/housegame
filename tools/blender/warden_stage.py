"""Camera, lighting and render settings.

This is where the look lives. The rule from ART_PIPELINE.md is that the figure is
almost black and is read by a hard amber rim, so the rim light is the strongest
source and the front light is deliberately starved.
"""

from __future__ import annotations

import math

import bpy
from mathutils import Vector

# Elevation of the camera above the horizon. Halfway between top-down and
# side-on: the floor stays legible and the character still shows its face.
CAMERA_ELEVATION_DEGREES = 50.0
CAMERA_DISTANCE = 6.0
CAMERA_TARGET_Z = 0.95


class Stage:
    """Sets up everything around the puppet."""

    def __init__(self, scene: bpy.types.Scene) -> None:
        self.scene = scene
        self._build_world()
        self.camera = self._build_camera()
        self._build_lights()

    def _build_world(self) -> None:
        world = self.scene.world
        if world is None:
            world = bpy.data.worlds.new("World")
            self.scene.world = world

        world.use_nodes = True
        background = world.node_tree.nodes.get("Background")
        if background is not None:
            # Just enough ambient that shadows read as dark blue, not as holes.
            background.inputs["Color"].default_value = (0.035, 0.038, 0.055, 1.0)
            background.inputs["Strength"].default_value = 1.0

    def _build_camera(self) -> bpy.types.Object:
        data = bpy.data.cameras.new("Camera")
        data.type = "ORTHO"

        camera = bpy.data.objects.new("Camera", data)
        bpy.context.collection.objects.link(camera)

        # Looking along +Y and downward puts world +X on screen right, which is
        # the direction the character faces.
        tilt = math.radians(90.0 - CAMERA_ELEVATION_DEGREES)
        camera.rotation_euler = (tilt, 0.0, 0.0)

        direction = Vector((0.0, math.sin(tilt), -math.cos(tilt)))
        camera.location = Vector((0.0, 0.0, CAMERA_TARGET_Z)) - direction * CAMERA_DISTANCE

        self.scene.camera = camera
        return camera

    def set_framing(self, ortho_scale: float) -> None:
        self.camera.data.ortho_scale = ortho_scale

    def _build_lights(self) -> None:
        # The rim. Behind the character and high, so it catches the hood, the
        # shoulders and the top edge of the blade.
        self._add_sun(
            "rim",
            energy=9.0,
            colour=(1.0, 0.62, 0.30),
            direction=Vector((-0.35, -1.0, -0.55)),
            angle_degrees=2.0,
        )

        # A second, tighter rim from the far side keeps the silhouette from
        # dissolving where the first one falls off.
        self._add_sun(
            "rim_side",
            energy=3.2,
            colour=(1.0, 0.72, 0.42),
            direction=Vector((0.55, -0.75, -0.35)),
            angle_degrees=6.0,
        )

        # The front light is deliberately weak. It only has to stop the mask and
        # the near shoulder from going completely flat.
        self._add_sun(
            "key",
            energy=1.7,
            colour=(0.55, 0.66, 1.0),
            direction=Vector((-0.45, 0.9, -0.75)),
            angle_degrees=25.0,
        )

    def _add_sun(
        self,
        name: str,
        energy: float,
        colour: tuple[float, float, float],
        direction: Vector,
        angle_degrees: float,
    ) -> None:
        data = bpy.data.lights.new(name, type="SUN")
        data.energy = energy
        data.color = colour
        data.angle = math.radians(angle_degrees)

        light = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(light)
        light.location = -direction.normalized() * 8.0
        light.rotation_euler = direction.normalized().to_track_quat("-Z", "Y").to_euler()

    def configure_render(self, size: int) -> None:
        render = self.scene.render
        render.engine = "BLENDER_EEVEE"
        render.resolution_x = size
        render.resolution_y = size
        render.resolution_percentage = 100
        render.film_transparent = True
        render.image_settings.file_format = "PNG"
        render.image_settings.color_mode = "RGBA"
        render.image_settings.compression = 90

        eevee = getattr(self.scene, "eevee", None)
        if eevee is not None and hasattr(eevee, "taa_render_samples"):
            eevee.taa_render_samples = 64

        # Standard rather than AgX: the amber rim is a deliberate, saturated
        # accent and a filmic transform would wash it out.
        try:
            self.scene.view_settings.view_transform = "Standard"
            self.scene.view_settings.look = "None"
        except TypeError:
            pass
