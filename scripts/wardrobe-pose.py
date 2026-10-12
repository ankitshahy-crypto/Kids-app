#!/usr/bin/env python3
"""
Where each mood face's head is, against the idle face's, so the dress-up pieces (glasses, hat,
scarf) go with the head when a mood comes: a cheer tips it a little, a think turns it, a wait
lifts it. The pieces sit on the idle face (wardrobe-art.py); without this they stayed where the idle
eyes were while the mood face moved under them.

For each animal and each mood frame it has a `places` entry for (animal-art.py), the eyes are
found in the idle face and in the mood face: the two dark marks side by side in the upper part of
the face (open eyes, or the shut eyes' arcs). The pair in the mood face against the pair in the
idle face gives one similarity (shift, turn and scale) in the face box's own units, and that goes
into animalArt.json as `pose[frame]`: the transform the app puts on the head layer while that
frame shows (components/Hero.tsx). The mood face is drawn through its `places` offset, which is
folded in here, so the pose is in the same box the pieces are placed in.

A pair that does not look like the same two eyes (too near, too far, far from where the idle eyes
were, or a wild turn) is left out, and the frame keeps no pose: the pieces then stay where the
idle face put them, as before. Prints what it found; `--check` writes nothing.

Needs: pip install opencv-python-headless pillow numpy
Usage: scripts/wardrobe-pose.py [--check] [animal ...]
"""
import json
import math
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "src" / "data" / "animalArt.json"


def load(animal: str, frame: str) -> np.ndarray:
    path = ROOT / "public" / "animals" / animal / f"{frame}-face.webp"
    return np.array(Image.open(path).convert("RGBA"))


def dark_marks(rgba: np.ndarray):
    """The dark, unsaturated marks in the face: (area, centre) each, largest first."""
    n = rgba.shape[0]
    rgb = rgba[:, :, :3].astype(int)
    lum = rgb.mean(axis=2)
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    dark = (lum < 70) & (sat < 60) & (rgba[:, :, 3] > 200)
    keep = np.zeros_like(dark)
    keep[int(n * 0.12) : int(n * 0.78), int(n * 0.08) : int(n * 0.92)] = True
    dark &= keep
    # Shut eyes are thin arcs that break into pieces: close the gaps so each eye is one mark.
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (max(3, n // 60) | 1,) * 2)
    dark = cv2.morphologyEx(dark.astype(np.uint8), cv2.MORPH_CLOSE, kernel)
    count, _, stats, centres = cv2.connectedComponentsWithStats(dark, 8)
    marks = [(stats[i, cv2.CC_STAT_AREA], centres[i]) for i in range(1, count) if stats[i, cv2.CC_STAT_AREA] > n * n * 0.0003]
    marks.sort(key=lambda m: -m[0])
    return marks[:12]


def eye_pair(rgba: np.ndarray, like=None):
    """The two eyes: a pair of marks side by side. With `like` (the idle pair), the pair most like it."""
    n = rgba.shape[0]
    marks = dark_marks(rgba)
    best = None
    for i in range(len(marks)):
        for j in range(i + 1, len(marks)):
            (ai, ci), (aj, cj) = marks[i], marks[j]
            dx, dy = abs(ci[0] - cj[0]), abs(ci[1] - cj[1])
            if dx < n * 0.1 or dx > n * 0.55 or dy > dx * 0.65:
                continue
            if max(ai, aj) > 5 * min(ai, aj) + n * n * 0.002:
                continue
            left, right = (ci, cj) if ci[0] < cj[0] else (cj, ci)
            if like is None:
                score = ai + aj - dy * 4
            else:
                l0, r0 = like
                apart = np.linalg.norm(right - left) / np.linalg.norm(r0 - l0)
                shift = np.linalg.norm((left + right) / 2 - (l0 + r0) / 2) / n
                if not 0.7 <= apart <= 1.35 or shift > 0.28:
                    continue
                score = ai + aj - dy * 2 - shift * n * n * 0.01
            if best is None or score > best[0]:
                best = (score, np.array(left, float), np.array(right, float))
    return None if best is None else (best[1], best[2])


def similarity(l0, r0, l1, r1):
    """The shift, turn and scale that take the idle pair to the mood pair, as a 2x3 matrix (px)."""
    v0, v1 = r0 - l0, r1 - l1
    scale = np.linalg.norm(v1) / np.linalg.norm(v0)
    turn = math.atan2(v1[1], v1[0]) - math.atan2(v0[1], v0[0])
    rot = scale * np.array([[math.cos(turn), -math.sin(turn)], [math.sin(turn), math.cos(turn)]])
    shift = (l1 + r1) / 2 - rot @ ((l0 + r0) / 2)
    return np.hstack([rot, shift[:, None]]), scale, math.degrees(turn)


def pose_of(animal: str, frame: str, place, idle_eyes, n: int):
    mood = load(animal, frame)
    eyes = eye_pair(mood, idle_eyes)
    if eyes is None:
        return None, "no eye pair"
    matrix, _, turn = similarity(idle_eyes[0], idle_eyes[1], eyes[0], eyes[1])
    # Idle px -> mood px, then mood fractions -> box fractions through the frame's place (x, y, side).
    x, y, side = place
    box = matrix.copy()
    box[:, 2] /= n
    box[:, 2] -= [x, y]
    box /= side
    scale = math.hypot(box[0, 0], box[1, 0])
    dx, dy = float(box[0, 2]), float(box[1, 2])
    if not (0.8 <= scale <= 1.3 and abs(turn) <= 35 and abs(dx) <= 0.35 and abs(dy) <= 0.35):
        return None, f"unlikely: scale {scale:.2f} turn {turn:.0f} shift {dx:.2f},{dy:.2f}"
    return {"dx": round(dx, 4), "dy": round(dy, 4), "rotate": round(turn, 2), "scale": round(scale, 4)}, f"scale {scale:.2f} turn {turn:+.0f} shift {dx:+.2f},{dy:+.2f}"


def main(argv):
    check = "--check" in argv
    wanted = [a for a in argv if not a.startswith("--")]
    art = json.loads(ART.read_text())
    for animal, entry in art.items():
        if wanted and animal not in wanted:
            continue
        places = entry.get("places") or {}
        if not places:
            continue
        idle = load(animal, "idle")
        n = idle.shape[0]
        idle_eyes = eye_pair(idle)
        if idle_eyes is None:
            print(f"{animal}: no eyes in the idle face; left as it is")
            continue
        pose = {}
        for frame, place in places.items():
            found, why = pose_of(animal, frame, place, idle_eyes, n)
            print(f"{animal} {frame}: {why}")
            if found:
                pose[frame] = found
        if pose:
            entry["pose"] = pose
        else:
            entry.pop("pose", None)
    if not check:
        ART.write_text(json.dumps(art, indent=2) + "\n")
        print(f"wrote {ART.relative_to(ROOT)}")


if __name__ == "__main__":
    main(sys.argv[1:])
