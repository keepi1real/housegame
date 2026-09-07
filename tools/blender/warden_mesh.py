"""Primitive builder for the greybox puppet.

Every body part is a tapered box whose origin sits at its joint, so rotating the
object rotates it around the joint like a limb. That is the whole trick behind a
segmented puppet: no armature, no skinning, no weight painting.
"""

from __future__ import annotations

import bpy


class MeshBuilder:
    """Creates tapered boxes with the origin placed at a chosen end."""

    @staticmethod
    def tapered_box(
        name: str,
        length: float,
        top: tuple[float, float],
        bottom: tuple[float, float],
        pivot: str = "top",
    ) -> bpy.types.Object:
        """Build a box tapering from `top` to `bottom` cross-section.

        Args:
            length: distance between the two faces.
            top: (x, y) size of the face at the pivot end.
            bottom: (x, y) size of the far face.
            pivot: "top" makes the box hang down the -Z axis from its origin,
                "bottom" makes it stand up the +Z axis. Limbs hang, torsos stand.
        """
        direction = -1.0 if pivot == "top" else 1.0
        near_x, near_y = top[0] / 2, top[1] / 2
        far_x, far_y = bottom[0] / 2, bottom[1] / 2
        far_z = direction * length

        verts = [
            (-near_x, -near_y, 0.0),
            (near_x, -near_y, 0.0),
            (near_x, near_y, 0.0),
            (-near_x, near_y, 0.0),
            (-far_x, -far_y, far_z),
            (far_x, -far_y, far_z),
            (far_x, far_y, far_z),
            (-far_x, far_y, far_z),
        ]
        faces = [
            (0, 1, 2, 3),
            (7, 6, 5, 4),
            (0, 4, 5, 1),
            (1, 5, 6, 2),
            (2, 6, 7, 3),
            (3, 7, 4, 0),
        ]

        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(verts, [], faces)
        mesh.update()
        mesh.shade_flat()

        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        return obj

    @staticmethod
    def empty(name: str) -> bpy.types.Object:
        """A joint with no geometry, used where only a pivot is needed."""
        obj = bpy.data.objects.new(name, None)
        obj.empty_display_size = 0.05
        bpy.context.collection.objects.link(obj)
        return obj

    @staticmethod
    def attach(child: bpy.types.Object, parent: bpy.types.Object, offset) -> None:
        """Parent `child` to `parent` at a local offset.

        Assigning `.parent` directly leaves the parent inverse matrix at identity,
        which is what makes the offset behave as a plain local translation.
        """
        child.parent = parent
        child.location = offset
