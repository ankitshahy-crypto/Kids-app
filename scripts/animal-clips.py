"""
Make the app's animal clips from the generated videos: public/animals/<id>/clips/.

Usage: python3 scripts/animal-clips.py <folder of source videos> [--keep-frames]

Each source is a video (mp4/mov/webm) of one round-plush animal on a flat, even backdrop, camera
locked, named `...animal-<id>-<clip>...` (`<id>` from src/data/animals.ts; `<clip>` one of the
CLIPS below). The backdrop is a plain green, a colour in none of the animals: a shadow the animal
casts on it is then the same hue, darker, and is keyed out with it (on a grey backdrop a shadow
cannot be told from fur, and stays). The figure is whole and centered; the clip starts and ends in
the idle pose. For each one this writes:

  public/animals/<id>/clips/<clip>.webm   VP9 with alpha (yuva420p), 24 fps, for Chrome and Firefox
  public/animals/<id>/clips/<clip>.json   the clip's length, whether it loops, and the head's box
                                          per frame (fractions of the frame), for the outfit
                                          overlays to follow
  build/clips/<id>/<clip>/f%04d.png       the keyed frames (with --keep-frames): the HEVC-with-alpha
                                          file for the iPhone is made from these on a Mac:
                                            ffmpeg -framerate 24 -i f%04d.png -c:v hevc_videotoolbox
                                              -alpha_quality 0.75 -tag:v hvc1 -pix_fmt bgra <clip>.mov

and src/data/animalClips.json: which clips each animal has, with each one's length and loop, and
`still`: where the still's frame sits in the clip frame (x, y, side, as fractions of it).

The key is the same for every frame of a clip (the backdrop colour is taken from the frame edges of
the whole clip, and one threshold is used throughout), so the matte does not flicker.

The crop is one square for all of an animal's clips, so the animal never shifts between them, and
it is set from the shipped still: the idle clip's first frame (the idle pose) is fitted to
public/animals/<id>/idle-face.webp, so that the pose in the video lies exactly where the still's
does. The square is then as wide as every clip needs (a jump leaves a tight frame), and the
manifest records where the still's frame sits inside it (`still`, fractions of the clip frame);
the app sizes the video from that, so the still underneath and the video over it are one animal.
Needs: pip install opencv-python-headless pillow numpy; ffmpeg with libvpx-vp9 on PATH.
"""
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "animals"
BUILD = ROOT / "build" / "clips"
MANIFEST = ROOT / "src" / "data" / "animalClips.json"
ANIMALS = ["cat", "dog", "fox", "bear", "bunny", "owl", "frog", "duck", "pig", "penguin", "lion", "koala"]
# clip: loops (a held pose), and the length the app plays it at (seconds); a source longer or shorter
# than that is resampled to it, so a move always fits its step.
CLIPS = {
    "idle": (True, 8.0),
    "think-idle": (True, 4.0),
    "wait-idle": (True, 4.0),
    "cheer": (False, 1.0),
    "hello": (False, 0.7),
    "walk": (False, 0.7),
    "jump": (False, 0.7),
    "spin": (False, 0.7),
    "dance": (False, 0.7),
    "sing": (False, 0.7),
}
FPS = 24
SIZE = 512
AIR = 0.05
# How far a pixel is from the backdrop (Lab distance) before it is figure, and the band over which
# the matte goes from backdrop to figure (a soft edge, two or three pixels of fur).
KEY_AT = 14.0
KEY_BAND = 10.0


def read_frames(path: Path) -> tuple[list[np.ndarray], float]:
    cap = cv2.VideoCapture(str(path))
    fps = cap.get(cv2.CAP_PROP_FPS) or FPS
    frames = []
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        frames.append(frame)
    cap.release()
    if not frames:
        raise SystemExit(f"{path.name}: no frames")
    return frames, fps


def resample(frames: list[np.ndarray], fps: float, seconds: float, loops: bool) -> list[np.ndarray]:
    """The frames the app plays: `seconds` at FPS. A move is fitted to its length (a source a little
    long or short plays a little quick or slow); a loop keeps its own pace, picked to FPS, and a
    short loop is played round until the length is reached (it starts and ends on the same pose)."""
    want = max(2, round(seconds * FPS))
    if loops:
        own = max(2, round(len(frames) * FPS / fps))
        paced = [frames[int(round(p))] for p in np.linspace(0, len(frames) - 1, own)]
        return [paced[i % len(paced)] for i in range(want)] if len(paced) < want else paced[:want]
    picks = np.linspace(0, len(frames) - 1, want)
    return [frames[int(round(p))] for p in picks]


def backdrop_colour(frames: list[np.ndarray]) -> np.ndarray:
    """The backdrop, in Lab: the median of a border of every frame."""
    border = []
    for frame in frames[:: max(1, len(frames) // 12)]:
        lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB).astype(np.float32)
        b = 12
        border.append(np.concatenate([lab[:b].reshape(-1, 3), lab[-b:].reshape(-1, 3), lab[:, :b].reshape(-1, 3), lab[:, -b:].reshape(-1, 3)]))
    return np.median(np.concatenate(border), axis=0)


def matte(frame: np.ndarray, bg: np.ndarray) -> np.ndarray:
    """Alpha 0..1 per pixel: how far from the backdrop colour, over a soft band."""
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB).astype(np.float32)
    # The backdrop's own lighting varies a little (a gradient, a soft shadow): only chroma and a
    # strong lightness difference count, so a shadow on the backdrop stays backdrop.
    d_chroma = np.sqrt(((lab[..., 1:] - bg[1:]) ** 2).sum(-1))
    d_light = np.abs(lab[..., 0] - bg[0])
    dist = np.maximum(d_chroma, np.maximum(0, d_light - 18))
    bg_chroma = float(np.hypot(bg[1] - 128, bg[2] - 128))
    if bg_chroma > 20:
        # A coloured backdrop (green): a shadow on it is the same hue, darker and greyer. A pixel
        # whose colour points the backdrop's way, with a good part of its chroma, is backdrop whatever
        # its lightness; the figure, which is never that colour, keeps its distance.
        ab = lab[..., 1:] - 128
        along = (ab[..., 0] * (bg[1] - 128) + ab[..., 1] * (bg[2] - 128)) / bg_chroma
        across = np.abs(ab[..., 0] * (bg[2] - 128) - ab[..., 1] * (bg[1] - 128)) / bg_chroma
        shadowed = (along > 0.35 * bg_chroma) & (across < 0.45 * np.maximum(along, 1))
        dist = np.where(shadowed, 0.0, dist)
    alpha = np.clip((dist - KEY_AT) / KEY_BAND, 0, 1)
    # The figure is one solid body: fill holes inside it, and drop specks outside it.
    solid = (alpha > 0.5).astype(np.uint8)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(solid, connectivity=8)
    if n > 1:
        biggest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        body = (labels == biggest).astype(np.uint8)
        filled = body.copy()
        contours, _ = cv2.findContours(body, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(filled, contours, -1, 1, thickness=cv2.FILLED)
        alpha = np.where(filled == 1, np.maximum(alpha, 0.0), 0.0)
        alpha = np.where((filled == 1) & (solid == 0) & (body == 0), 1.0, alpha)
    # Un-premultiply the colour at the edge: the backdrop colour is pulled out of the fringe.
    return alpha.astype(np.float32)


def despill(frame: np.ndarray, alpha: np.ndarray, bg_bgr: np.ndarray) -> np.ndarray:
    """The colour at the soft edge with the backdrop's share taken out."""
    f = frame.astype(np.float32)
    a = alpha[..., None]
    out = np.where(a > 0, (f - (1 - a) * bg_bgr) / np.maximum(a, 1e-3), f)
    return np.clip(out, 0, 255).astype(np.uint8)


def figure_box(alphas: list[np.ndarray]) -> tuple[int, int, int, int]:
    """The union of the figure over every frame: x, y, w, h."""
    union = np.zeros_like(alphas[0], dtype=np.uint8)
    for a in alphas:
        union |= (a > 0.5).astype(np.uint8)
    ys, xs = np.where(union)
    return int(xs.min()), int(ys.min()), int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)


def square(box: tuple[int, int, int, int], shape: tuple[int, int]) -> tuple[int, int, int]:
    """A square crop around the box with a little air: x, y, side (can run past the frame; padded)."""
    x, y, w, h = box
    side = int(round(max(w, h) * (1 + 2 * AIR)))
    cx, cy = x + w / 2, y + h / 2
    return int(round(cx - side / 2)), int(round(cy - side / 2)), side


def still_box(animal: str) -> tuple[float, float, float, float] | None:
    """Where the figure is in the shipped idle still, as fractions of its frame: x, y, w, h."""
    path = OUT / animal / "idle-face.webp"
    if not path.exists():
        return None
    still = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if still is None or still.shape[2] < 4:
        return None
    ys, xs = np.where(still[..., 3] > 127)
    if len(xs) == 0:
        return None
    h, w = still.shape[:2]
    return xs.min() / w, ys.min() / h, (xs.max() - xs.min() + 1) / w, (ys.max() - ys.min() + 1) / h


def frame_of_still(pose: np.ndarray, still: tuple[float, float, float, float]) -> tuple[float, float, float]:
    """The still's frame laid over the clip, so the idle pose lies where the still's figure does: the
    frame's x, y and side in clip pixels. Fitted by width (the still and the clip are two renders:
    the same animal, not quite the same shape) and centred on the figure."""
    ys, xs = np.where(pose > 0.5)
    pw, ph = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
    side = pw / still[2]
    cx, cy = xs.min() + pw / 2, ys.min() + ph / 2
    fx = cx - (still[0] + still[2] / 2) * side
    fy = cy - (still[1] + still[3] / 2) * side
    return fx, fy, side


def crop(image: np.ndarray, x: int, y: int, side: int) -> np.ndarray:
    """The square from the image, padded with transparent where it runs past the frame."""
    h, w = image.shape[:2]
    out = np.zeros((side, side, image.shape[2]), dtype=image.dtype)
    sx, sy = max(0, x), max(0, y)
    ex, ey = min(w, x + side), min(h, y + side)
    out[sy - y : ey - y, sx - x : ex - x] = image[sy:ey, sx:ex]
    return out


def head_box(alpha: np.ndarray) -> list[float]:
    """Where the head is in a keyed frame: the top part of the figure, as fractions of the frame.
    A round plush is nearly all head, so this is the figure's box, its lower fifth left off."""
    ys, xs = np.where(alpha > 0.5)
    if len(xs) == 0:
        return [0.0, 0.0, 1.0, 1.0]
    h, w = alpha.shape
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    y1 = y0 + (y1 - y0) * 0.8
    return [round(float(x0 / w), 4), round(float(y0 / h), 4), round(float((x1 - x0) / w), 4), round(float((y1 - y0) / h), 4)]


def encode_webm(frames_dir: Path, out: Path) -> None:
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-i", str(frames_dir / "f%04d.png"), "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "30", "-row-mt", "1", "-an", str(out)],
        check=True,
    )


def main(folder: Path, keep_frames: bool) -> None:
    sources = sorted(p for p in folder.iterdir() if p.suffix.lower() in (".mp4", ".mov", ".webm", ".m4v"))
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    by_animal: dict[str, dict[str, Path]] = {}
    for path in sources:
        m = re.search(r"animal-(" + "|".join(ANIMALS) + r")-(" + "|".join(re.escape(c) for c in CLIPS) + r")(?![a-z-])", path.stem)
        if not m:
            print(f"skipped {path.name}: not animal-<id>-<clip>")
            continue
        by_animal.setdefault(m.group(1), {})[m.group(2)] = path
    for animal, clips in by_animal.items():
        keyed: dict[str, tuple[list[np.ndarray], list[np.ndarray]]] = {}
        box_union = None
        for clip, path in clips.items():
            frames, fps = read_frames(path)
            frames = resample(frames, fps, CLIPS[clip][1], CLIPS[clip][0])
            bg = backdrop_colour(frames)
            bg_bgr = cv2.cvtColor(np.array([[bg]], dtype=np.uint8), cv2.COLOR_LAB2BGR)[0, 0].astype(np.float32)
            alphas = [matte(f, bg) for f in frames]
            colours = [despill(f, a, bg_bgr) for f, a in zip(frames, alphas)]
            keyed[clip] = (colours, alphas)
            x, y, w, h = figure_box(alphas)
            box_union = (x, y, w, h) if box_union is None else (min(box_union[0], x), min(box_union[1], y), max(box_union[0] + box_union[2], x + w) - min(box_union[0], x), max(box_union[1] + box_union[3], y + h) - min(box_union[1], y))
            print(f"{animal} {clip}: {len(frames)} frames from {path.name}, figure {w}x{h} at {x},{y}")
        assert box_union is not None
        still = still_box(animal)
        pose = keyed["idle"][1][0] if "idle" in keyed else keyed[next(iter(keyed))][1][0]
        if still:
            fx, fy, fside = frame_of_still(pose, still)
            # The crop holds the still's frame and every move: the union of both, square, with air.
            ux, uy = min(box_union[0], fx), min(box_union[1], fy)
            ux2, uy2 = max(box_union[0] + box_union[2], fx + fside), max(box_union[1] + box_union[3], fy + fside)
            sx, sy, side = square((int(ux), int(uy), int(ux2 - ux), int(uy2 - uy)), pose.shape)
            still_in_clip = [round((fx - sx) / side, 4), round((fy - sy) / side, 4), round(fside / side, 4)]
        else:
            sx, sy, side = square(box_union, pose.shape)
            still_in_clip = [0.0, 0.0, 1.0]
            print(f"{animal}: no idle-face.webp to fit to; the clip frame is the still's frame")
        entry = manifest.setdefault(animal, {"clips": {}})
        entry["still"] = still_in_clip
        for clip, (colours, alphas) in keyed.items():
            frames_dir = (BUILD / animal / clip) if keep_frames else Path(tempfile.mkdtemp(prefix=f"clip-{animal}-{clip}-"))
            frames_dir.mkdir(parents=True, exist_ok=True)
            for old in frames_dir.glob("f*.png"):
                old.unlink()
            heads = []
            for i, (colour, alpha) in enumerate(zip(colours, alphas)):
                bgra = np.dstack([colour, (alpha * 255).astype(np.uint8)])
                square_frame = crop(bgra, sx, sy, side)
                small = cv2.resize(square_frame, (SIZE, SIZE), interpolation=cv2.INTER_AREA)
                cv2.imwrite(str(frames_dir / f"f{i:04d}.png"), small)
                heads.append(head_box(small[..., 3] / 255.0))
            out_dir = OUT / animal / "clips"
            out_dir.mkdir(parents=True, exist_ok=True)
            encode_webm(frames_dir, out_dir / f"{clip}.webm")
            loops, seconds = CLIPS[clip]
            (out_dir / f"{clip}.json").write_text(json.dumps({"fps": FPS, "frames": len(colours), "seconds": seconds, "loops": loops, "head": heads}) + "\n")
            entry["clips"][clip] = {"seconds": seconds, "loops": loops}
            print(f"  {clip}.webm {(out_dir / f'{clip}.webm').stat().st_size // 1024} KB")
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        raise SystemExit(__doc__)
    main(Path(args[0]), "--keep-frames" in sys.argv)
