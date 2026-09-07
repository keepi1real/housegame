"""Materials for the Warden.

The palette is the one fixed in ART_PIPELINE.md: a near-black figure read by a
hard amber rim, a bone mask as the only bright spot on the body, and steel that
is polished only near the tip of the blade.
"""

from __future__ import annotations

import bpy


class MaterialLibrary:
    """Builds and caches the handful of materials the puppet needs."""

    def __init__(self) -> None:
        self.coat = self._make("Coat", (0.020, 0.018, 0.026), roughness=0.88)
        # Faint emission guarantees the mask reads even when the key light does
        # not reach it. It is the one place the eye lands on a near-black figure.
        self.mask = self._make(
            "Mask", (0.820, 0.780, 0.700), roughness=0.55, emission=0.40
        )
        self.steel = self._make(
            "Steel", (0.560, 0.610, 0.700), roughness=0.22, metallic=0.92
        )
        self.rust = self._make(
            "Rust", (0.105, 0.068, 0.042), roughness=0.94, metallic=0.35
        )
        self.iron = self._make(
            "Iron", (0.055, 0.048, 0.044), roughness=0.62, metallic=0.65
        )

    @staticmethod
    def _make(
        name: str,
        colour: tuple[float, float, float],
        roughness: float,
        metallic: float = 0.0,
        emission: float = 0.0,
    ) -> bpy.types.Material:
        material = bpy.data.materials.new(name)
        material.use_nodes = True

        bsdf = material.node_tree.nodes.get("Principled BSDF")
        if bsdf is None:
            return material

        bsdf.inputs["Base Color"].default_value = (*colour, 1.0)
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic

        if emission > 0.0 and "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*colour, 1.0)
            bsdf.inputs["Emission Strength"].default_value = emission

        return material

    @staticmethod
    def apply(obj: bpy.types.Object, material: bpy.types.Material) -> None:
        obj.data.materials.append(material)
