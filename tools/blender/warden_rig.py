"""The Warden puppet: a hierarchy of tapered boxes with named joints.

The character faces +X. The camera looks along +Y from -Y, so +X is screen right
and the character's sword arm sits on the -Y side, nearest the camera and most
visible. Limbs rotate around Y, which sweeps them forward and back in the plane
the camera reads most clearly.
"""

from __future__ import annotations

import math

import bpy

from warden_materials import MaterialLibrary
from warden_mesh import MeshBuilder

# Vertical layout of the skeleton, in metres.
HIP_Z = 0.92
SHOULDER_Z = 1.44
TORSO_HEIGHT = 0.58
UPPER_ARM = 0.34
LOWER_ARM = 0.32
UPPER_LEG = 0.45
LOWER_LEG = 0.42
ARM_OFFSET_Y = 0.16
LEG_OFFSET_Y = 0.09


class WardenRig:
    """Builds the puppet and exposes its joints by name."""

    def __init__(self, materials: MaterialLibrary) -> None:
        self.materials = materials
        self.joints: dict[str, bpy.types.Object] = {}

        self.root = MeshBuilder.empty("warden_root")
        self.hips = MeshBuilder.empty("hips")
        MeshBuilder.attach(self.hips, self.root, (0.0, 0.0, HIP_Z))
        self.joints["root"] = self.root

        self._build_torso()
        self._build_head()
        self._build_arms()
        self._build_legs()

    # -- construction ----------------------------------------------------

    def _build_torso(self) -> None:
        torso = MeshBuilder.tapered_box(
            "torso", TORSO_HEIGHT, top=(0.20, 0.30), bottom=(0.22, 0.34), pivot="bottom"
        )
        MeshBuilder.attach(torso, self.hips, (0.0, 0.0, 0.0))
        MaterialLibrary.apply(torso, self.materials.coat)
        self.joints["torso"] = torso

        # The coat hangs from the hips, not the torso. Parented to the torso it
        # swung backwards whenever the character leaned, which made a 20 degree
        # lean read as a 60 degree one. Gravity keeps a coat vertical.
        coat = MeshBuilder.tapered_box(
            "coat", 0.54, top=(0.24, 0.33), bottom=(0.33, 0.41), pivot="top"
        )
        MeshBuilder.attach(coat, self.hips, (0.0, 0.0, 0.02))
        MaterialLibrary.apply(coat, self.materials.coat)

    def _build_head(self) -> None:
        head = MeshBuilder.tapered_box(
            "head", 0.17, top=(0.15, 0.16), bottom=(0.16, 0.17), pivot="bottom"
        )
        MeshBuilder.attach(head, self.joints["torso"], (0.0, 0.0, TORSO_HEIGHT))
        MaterialLibrary.apply(head, self.materials.coat)
        self.joints["head"] = head

        # Short and blunt. A tall cone reads as a wizard hat, not a hood.
        hood = MeshBuilder.tapered_box(
            "hood", 0.21, top=(0.25, 0.27), bottom=(0.13, 0.12), pivot="bottom"
        )
        MeshBuilder.attach(hood, head, (-0.02, 0.0, 0.01))
        MaterialLibrary.apply(hood, self.materials.coat)

        # The mask is the only bright thing on the body, so it carries the gaze.
        mask = MeshBuilder.tapered_box(
            "mask", 0.085, top=(0.018, 0.070), bottom=(0.018, 0.078), pivot="bottom"
        )
        MeshBuilder.attach(mask, head, (0.079, 0.0, 0.022))
        MaterialLibrary.apply(mask, self.materials.mask)

    def _build_arms(self) -> None:
        for side, sign in (("r", -1.0), ("l", 1.0)):
            upper = MeshBuilder.tapered_box(
                f"arm_{side}_upper", UPPER_ARM, top=(0.10, 0.11), bottom=(0.085, 0.09)
            )
            MeshBuilder.attach(
                upper,
                self.joints["torso"],
                (0.0, sign * ARM_OFFSET_Y, SHOULDER_Z - HIP_Z),
            )
            MaterialLibrary.apply(upper, self.materials.coat)
            self.joints[f"arm_{side}_upper"] = upper

            lower = MeshBuilder.tapered_box(
                f"arm_{side}_lower", LOWER_ARM, top=(0.085, 0.09), bottom=(0.065, 0.07)
            )
            MeshBuilder.attach(lower, upper, (0.0, 0.0, -UPPER_ARM))
            MaterialLibrary.apply(lower, self.materials.coat)
            self.joints[f"arm_{side}_lower"] = lower

            hand = MeshBuilder.empty(f"hand_{side}")
            MeshBuilder.attach(hand, lower, (0.0, 0.0, -LOWER_ARM))
            self.joints[f"hand_{side}"] = hand

        self._build_blade(self.joints["hand_r"])
        self._build_pistol(self.joints["hand_l"])

    def _build_legs(self) -> None:
        for side, sign in (("r", -1.0), ("l", 1.0)):
            upper = MeshBuilder.tapered_box(
                f"leg_{side}_upper", UPPER_LEG, top=(0.13, 0.14), bottom=(0.11, 0.12)
            )
            MeshBuilder.attach(upper, self.hips, (0.0, sign * LEG_OFFSET_Y, -0.02))
            MaterialLibrary.apply(upper, self.materials.coat)
            self.joints[f"leg_{side}_upper"] = upper

            lower = MeshBuilder.tapered_box(
                f"leg_{side}_lower", LOWER_LEG, top=(0.11, 0.12), bottom=(0.09, 0.10)
            )
            MeshBuilder.attach(lower, upper, (0.0, 0.0, -UPPER_LEG))
            MaterialLibrary.apply(lower, self.materials.coat)
            self.joints[f"leg_{side}_lower"] = lower

            foot = MeshBuilder.tapered_box(
                f"foot_{side}", 0.07, top=(0.20, 0.11), bottom=(0.18, 0.10), pivot="top"
            )
            MeshBuilder.attach(foot, lower, (0.045, 0.0, -LOWER_LEG))
            MaterialLibrary.apply(foot, self.materials.coat)

    def _build_blade(self, hand: bpy.types.Object) -> None:
        """The Clove of the House: rusted at the base, polished toward the tip."""
        guard = MeshBuilder.tapered_box(
            "guard", 0.04, top=(0.05, 0.20), bottom=(0.05, 0.18), pivot="top"
        )
        MeshBuilder.attach(guard, hand, (0.0, 0.0, -0.04))
        MaterialLibrary.apply(guard, self.materials.iron)

        base = MeshBuilder.tapered_box(
            "blade_base", 0.30, top=(0.035, 0.075), bottom=(0.030, 0.062), pivot="top"
        )
        MeshBuilder.attach(base, hand, (0.0, 0.0, -0.08))
        MaterialLibrary.apply(base, self.materials.rust)

        tip = MeshBuilder.tapered_box(
            "blade_tip", 0.52, top=(0.030, 0.062), bottom=(0.012, 0.014), pivot="top"
        )
        MeshBuilder.attach(tip, hand, (0.0, 0.0, -0.38))
        MaterialLibrary.apply(tip, self.materials.steel)

    def _build_pistol(self, hand: bpy.types.Object) -> None:
        """Fires Names, not bullets. Barrel runs along the forearm direction."""
        # Kept short on purpose: at this camera distance an extra few
        # centimetres of barrel turns a pistol into a rifle in silhouette.
        body = MeshBuilder.tapered_box(
            "pistol_body", 0.07, top=(0.050, 0.046), bottom=(0.045, 0.042), pivot="top"
        )
        MeshBuilder.attach(body, hand, (0.0, 0.0, -0.015))
        MaterialLibrary.apply(body, self.materials.iron)

        barrel = MeshBuilder.tapered_box(
            "pistol_barrel", 0.08, top=(0.028, 0.026), bottom=(0.023, 0.022), pivot="top"
        )
        MeshBuilder.attach(barrel, hand, (0.0, 0.0, -0.085))
        MaterialLibrary.apply(barrel, self.materials.iron)

        grip = MeshBuilder.tapered_box(
            "pistol_grip", 0.075, top=(0.040, 0.038), bottom=(0.034, 0.032), pivot="top"
        )
        MeshBuilder.attach(grip, hand, (-0.042, 0.0, -0.025))
        grip.rotation_euler = (0.0, math.radians(-25.0), 0.0)
        MaterialLibrary.apply(grip, self.materials.iron)

    # -- posing ----------------------------------------------------------

    def apply_pose(self, pose: dict[str, float]) -> None:
        """Set every joint from a pose.

        Angles are in degrees and positive means forward, toward +X, the way the
        character is facing. Rotating a downward-hanging limb around +Y swings it
        backward, hence the sign flip in one place here rather than in every pose.
        """
        for joint in self.joints.values():
            joint.rotation_euler = (0.0, 0.0, 0.0)
        self.root.location = (0.0, 0.0, 0.0)

        for name, angle in pose.items():
            if name in ("offset_x", "offset_z"):
                continue
            joint = self.joints.get(name)
            if joint is None:
                continue
            joint.rotation_euler = (0.0, math.radians(-angle), 0.0)

        self.root.location = (
            pose.get("offset_x", 0.0),
            0.0,
            pose.get("offset_z", 0.0),
        )
