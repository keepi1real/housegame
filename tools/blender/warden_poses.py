"""Per-frame poses for every animation in the sheet.

Poses are computed in Python rather than keyframed in Blender. Each frame is an
explicit dictionary of joint angles, so what gets rendered is exactly what is
written here with no interpolation to reason about.

Angles are degrees. Positive means forward, the direction the character faces.
"""

from __future__ import annotations

import math

Pose = dict[str, float]


def lerp(start: float, end: float, t: float) -> float:
    return start + (end - start) * t


def ease_out(t: float) -> float:
    """Fast start, slow finish. Used for swings, which should feel like a snap."""
    return 1.0 - (1.0 - t) ** 3


def ease_in(t: float) -> float:
    return t * t


class PoseLibrary:
    """Builds the frame list for each named animation."""

    # Frame counts must match src/animation/WardenAnimations.ts.
    FRAME_COUNTS = {
        "idle": 6,
        "run": 8,
        "dash": 4,
        "light-1": 6,
        "light-2": 6,
        "light-3": 8,
        "heavy": 8,
        "shoot": 5,
        "hurt": 3,
        "death": 8,
    }

    @classmethod
    def frames_for(cls, name: str) -> list[Pose]:
        count = cls.FRAME_COUNTS[name]
        builder = getattr(cls, f"_{name.replace('-', '_')}")
        return [builder(index, count) for index in range(count)]

    # -- locomotion ------------------------------------------------------

    @staticmethod
    def _idle(index: int, count: int) -> Pose:
        breathe = math.sin(2.0 * math.pi * index / count)
        return {
            "torso": 2.0 + breathe * 1.6,
            "head": -3.0,
            "arm_r_upper": -8.0,
            "arm_r_lower": -18.0,
            "arm_l_upper": 8.0 + breathe * 2.0,
            "arm_l_lower": 142.0,
            "offset_z": breathe * 0.012,
        }

    @staticmethod
    def _run(index: int, count: int) -> Pose:
        swing = math.sin(2.0 * math.pi * index / count)
        return {
            "torso": 9.0,
            "head": -8.0,
            "leg_r_upper": 26.0 * swing,
            "leg_l_upper": -26.0 * swing,
            # The knee only folds on the trailing leg, which is what stops a
            # two-segment leg from reading as a stiff pendulum.
            "leg_r_lower": -44.0 * max(0.0, -swing),
            "leg_l_lower": -44.0 * max(0.0, swing),
            "arm_r_upper": -22.0 * swing - 10.0,
            "arm_r_lower": -28.0,
            "arm_l_upper": 14.0 * swing + 10.0,
            "arm_l_lower": 132.0,
            "offset_z": abs(swing) * 0.028,
        }

    @staticmethod
    def _dash(index: int, count: int) -> Pose:
        t = index / max(1, count - 1)
        return {
            "torso": 17.0,
            "head": -9.0,
            "arm_r_upper": -48.0 - t * 12.0,
            "arm_r_lower": -42.0,
            "arm_l_upper": 16.0,
            "arm_l_lower": 138.0,
            "leg_r_upper": -26.0 - t * 8.0,
            "leg_r_lower": -38.0,
            "leg_l_upper": 24.0 - t * 6.0,
            "leg_l_lower": -22.0,
            "offset_x": t * 0.03,
            "offset_z": 0.02,
        }

    # -- sword -----------------------------------------------------------

    @staticmethod
    def _swing(t: float, start: float, end: float, torso: tuple[float, float]) -> Pose:
        eased = ease_out(t)
        return {
            "torso": lerp(torso[0], torso[1], eased),
            "head": lerp(-6.0, 8.0, eased),
            "arm_r_upper": lerp(start, end, eased),
            "arm_r_lower": lerp(-38.0, 14.0, eased),
            "arm_l_upper": 10.0,
            "arm_l_lower": 140.0,
            "leg_r_upper": 12.0,
            "leg_l_upper": -14.0,
            "leg_l_lower": -18.0,
            "offset_x": eased * 0.04,
        }

    @classmethod
    def _light_1(cls, index: int, count: int) -> Pose:
        return cls._swing(index / max(1, count - 1), -108.0, 54.0, (-8.0, 16.0))

    @classmethod
    def _light_2(cls, index: int, count: int) -> Pose:
        # A rising slash, so the arc runs the other way and the torso uncoils.
        t = ease_out(index / max(1, count - 1))
        return {
            "torso": lerp(18.0, -6.0, t),
            "head": lerp(6.0, -8.0, t),
            "arm_r_upper": lerp(72.0, -78.0, t),
            "arm_r_lower": lerp(22.0, -34.0, t),
            "arm_l_upper": 10.0,
            "arm_l_lower": 138.0,
            "leg_r_upper": 10.0,
            "leg_l_upper": -12.0,
            "offset_x": t * 0.03,
        }

    @classmethod
    def _light_3(cls, index: int, count: int) -> Pose:
        return cls._swing(index / max(1, count - 1), -132.0, 74.0, (-13.0, 22.0))

    @classmethod
    def _heavy(cls, index: int, count: int) -> Pose:
        t = index / max(1, count - 1)
        if t < 0.5:
            # Wind up slowly. The player is vulnerable here and it should show.
            local = ease_in(t / 0.5)
            return {
                "torso": lerp(0.0, -24.0, local),
                "head": lerp(0.0, -12.0, local),
                "arm_r_upper": lerp(-10.0, -146.0, local),
                "arm_r_lower": lerp(-20.0, -52.0, local),
                "arm_l_upper": lerp(14.0, -8.0, local),
                "arm_l_lower": 58.0,
                "leg_r_upper": lerp(0.0, -14.0, local),
                "leg_l_upper": lerp(0.0, 10.0, local),
                "offset_x": -local * 0.05,
            }

        local = ease_out((t - 0.5) / 0.5)
        return {
            "torso": lerp(-24.0, 34.0, local),
            "head": lerp(-12.0, 14.0, local),
            "arm_r_upper": lerp(-146.0, 78.0, local),
            "arm_r_lower": lerp(-52.0, 20.0, local),
            "arm_l_upper": lerp(-6.0, 18.0, local),
            "arm_l_lower": 136.0,
            "leg_r_upper": lerp(-14.0, 26.0, local),
            "leg_l_upper": lerp(10.0, -22.0, local),
            "leg_l_lower": -24.0,
            "offset_x": lerp(-0.05, 0.09, local),
        }

    # -- pistol ----------------------------------------------------------

    @staticmethod
    def _shoot(index: int, count: int) -> Pose:
        del count
        # Raise, fire, kick, settle. Explicit frames because a recoil curve read
        # from a formula never lands as sharply as one placed by hand.
        arm = [(58.0, 32.0), (88.0, 2.0), (99.0, -8.0), (91.0, 2.0), (80.0, 14.0)]
        torso = [-2.0, -7.0, -11.0, -8.0, -4.0]
        upper, lower = arm[index]
        return {
            "torso": torso[index],
            "head": 4.0,
            "arm_l_upper": upper,
            "arm_l_lower": lower,
            "arm_r_upper": -16.0,
            "arm_r_lower": -26.0,
            "leg_r_upper": 8.0,
            "leg_l_upper": -10.0,
            "offset_x": -0.012 * (1 if index in (1, 2) else 0),
        }

    # -- reactions -------------------------------------------------------

    @staticmethod
    def _hurt(index: int, count: int) -> Pose:
        t = index / max(1, count - 1)
        return {
            "torso": lerp(-22.0, -7.0, t),
            "head": lerp(-18.0, -6.0, t),
            "arm_r_upper": lerp(-38.0, -18.0, t),
            "arm_r_lower": -30.0,
            "arm_l_upper": lerp(-24.0, 6.0, t),
            "arm_l_lower": 120.0,
            "leg_r_upper": lerp(-16.0, -4.0, t),
            "leg_l_upper": lerp(14.0, 4.0, t),
            "offset_x": lerp(-0.035, -0.008, t),
        }

    @staticmethod
    def _death(index: int, count: int) -> Pose:
        t = index / max(1, count - 1)
        fall = ease_in(t)
        # The Warden crumples where he stands rather than pitching over flat.
        # A prone body is as long lying down as it is tall standing up, and
        # fitting both into one square frame would shrink every other animation.
        # Folding down also reads better from a camera this high.
        return {
            "root": fall * 26.0,
            "torso": lerp(0.0, 42.0, fall),
            "head": lerp(0.0, 34.0, fall),
            "arm_r_upper": lerp(-12.0, 32.0, t),
            "arm_r_lower": lerp(-24.0, -8.0, t),
            "arm_l_upper": lerp(10.0, 24.0, t),
            "arm_l_lower": lerp(138.0, 40.0, t),
            "leg_r_upper": lerp(0.0, 74.0, fall),
            "leg_r_lower": lerp(0.0, -118.0, fall),
            "leg_l_upper": lerp(0.0, 58.0, fall),
            "leg_l_lower": lerp(0.0, -106.0, fall),
            "offset_x": fall * 0.02,
            "offset_z": -fall * 0.42,
        }
