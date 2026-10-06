"""
Make the app's animal art from the painted plush figures.

Usage: python3 scripts/animal-art.py <folder of source images> [--body]

Each source is a WebP (or PNG) of one plush animal on a plain light studio backdrop, named
`...animal-<id>[-<frame>]...` (`<id>` from src/data/animals.ts; no frame, or `mockup`, is the
idle frame; `cheer`, `think`, `wait`, `blink`, `wave`, `silly` are the mood frames). For each
one this writes, under public/animals/<id>/:

  <frame>-face.webp   the head, square, 512px, on a transparent background: what the app shows
                      (a face reads at tile size; a whole figure does not)
  <frame>.webp        with --body: the whole figure, 800px tall, transparent, for a view that wants
                      the animal standing (none yet, so none is shipped: the files are part of the
                      app shell, and a megabyte nobody sees is a megabyte on every first visit)

and src/data/animalArt.json: which frames each animal has, whether its whole figure is there,
where its head sits in it (fractions of the figure's image), for the outfit pieces to sit on, and
the CSS filter that turns its fur powder blue (the "sky" colour of the dress-up closet: one filter
per animal, from its fur's own hue, so it works on every frame without a blue copy of each). The
app falls back to a missing mood frame's idle frame, so frames can land one at a time.

The cut-out is classical (OpenCV GrabCut seeded by distance from the backdrop colour), since the
sources come without transparency: it holds up on these figures, cream paws and floor shadow
included. Needs: pip install opencv-python-headless pillow numpy
"""
import json, re, sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "animals"
MANIFEST = ROOT / "src" / "data" / "animalArt.json"
ANIMALS = ["cat", "dog", "fox", "bear", "bunny", "owl", "frog", "duck", "pig", "penguin", "lion", "koala"]
FRAMES = ["idle", "cheer", "think", "wait", "blink", "wave", "silly"]
FACE_PX = 512
BODY_PX = 800


def cut_out(path: Path):
    """The figure on a transparent background: BGRA, full source size."""
    img = cv2.imread(str(path))
    h, w = img.shape[:2]
    border = np.concatenate([img[:20].reshape(-1, 3), img[-20:].reshape(-1, 3), img[:, :20].reshape(-1, 3), img[:, -20:].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
    bglab = cv2.cvtColor(np.uint8([[bg]]), cv2.COLOR_BGR2LAB).astype(np.float32)[0, 0]
    dist = np.linalg.norm(lab - bglab, axis=2)
    L = lab[:, :, 0]
    sat = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)[:, :, 1].astype(np.float32)
    mask = np.full((h, w), cv2.GC_PR_BGD, np.uint8)
    mask[dist < 6] = cv2.GC_BGD
    # The floor shadow, at the bottom of the picture, is grey and a little darker than the backdrop.
    # (Only there: a grey animal, the koala, is grey all over.)
    foot = np.zeros((h, w), bool)
    foot[int(h * 0.78) :] = True
    mask[foot & (sat < 16) & (dist < 48) & (L < bglab[0] + 4)] = cv2.GC_BGD
    sure = cv2.erode((dist > 40).astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
    sure &= ~(foot & (sat < 16) & (L > bglab[0] - 30))
    mask[sure] = cv2.GC_FGD
    mask[(dist >= 20) & ~sure & ~(foot & (sat < 16))] = cv2.GC_PR_FGD
    cv2.grabCut(img, mask, None, np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64), 8, cv2.GC_INIT_WITH_MASK)
    fg = ((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)).astype(np.uint8)
    # Under the feet only what is darker or coloured is the figure: the paws are cream, the shadow is not.
    rows = np.where(fg.any(axis=1))[0]
    if len(rows):
        floor = int(rows.max() - 0.12 * (rows.max() - rows.min()))
        zone = np.zeros_like(fg, bool)
        zone[floor:] = True
        fg[zone & (L > 208) & (sat < 30) & (dist < 40)] = 0
        fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    # The biggest blob is the figure; holes in it are its own light parts.
    n, labels, stats, _ = cv2.connectedComponentsWithStats(fg)
    if n > 1:
        fg = (labels == 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])).astype(np.uint8)
    contours, _ = cv2.findContours(fg, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    filled = np.zeros_like(fg)
    cv2.drawContours(filled, contours, -1, 1, -1)
    # The last backdrop-coloured pixel comes off the edge, then the edge is feathered.
    tight = cv2.erode(filled, np.ones((3, 3), np.uint8))
    alpha = np.clip(cv2.GaussianBlur(tight.astype(np.float32) * 255, (0, 0), 1.4), 0, 255).astype(np.uint8)
    rgba = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    rgba[:, :, 3] = alpha
    return rgba


def figure_box(alpha):
    ys, xs = np.where(alpha > 96)
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def head_box(alpha, box):
    """
    Where the head is, a square: from the top of the figure (ear tips in) down to the chin, which is
    about half a head's width below the cheeks (the widest row of the figure's top part); as wide as
    that is tall, centred on the cheeks, so a tall-eared bunny gets its ears and its chin both.
    """
    x0, y0, x1, y1 = box
    rows = []
    for y in range(y0, y0 + int((y1 - y0) * 0.45)):
        on = np.where(alpha[y] > 96)[0]
        if on.size:
            rows.append((on.max() - on.min(), y, on.min(), on.max() + 1))
    width, cheeks, left, right = max(rows)
    bottom = min(y1, cheeks + int(width * 0.55))
    size = max(bottom - y0, width)
    cx = (left + right) / 2
    return int(cx - size / 2), y0, int(cx + size / 2), y0 + size


def sky_filter(rgba):
    """
    The CSS filter that makes this animal's fur powder blue (hue 207, a fifth of the fur's
    saturation), from the fur's own colour: the most saturated third of the face's pixels, which
    is the fur and not the cream muzzle or the dark eyes. Turning a warm hue to blue darkens it, so
    the end of the chain lifts the mid-tones back toward the mockup's light powder blue without
    blowing out the cream. A grey or black-and-white animal has no hue to turn, so sepia gives it
    one first.
    """
    lift = "contrast(0.85) brightness(1.12)"
    on = rgba[:, :, 3] > 200
    hsv = cv2.cvtColor(rgba[:, :, :3], cv2.COLOR_BGR2HSV)
    h, s, v = hsv[:, :, 0][on].astype(float) * 2, hsv[:, :, 1][on].astype(float) / 255, hsv[:, :, 2][on].astype(float) / 255
    bright = v > 0.35
    h, s = h[bright], s[bright]
    # A grey or black-and-white animal (most of its face has little colour; a beak does not count).
    if float(np.median(s)) < 0.25:
        return f"sepia(0.55) hue-rotate(167deg) saturate(0.9) {lift}"
    top = s >= np.percentile(s, 67)
    hue, sat = float(np.median(h[top])), float(np.median(s[top]))
    turn = round((207 - hue) % 360)
    return f"hue-rotate({turn}deg) saturate({round(min(0.9, 0.2 / sat), 2)}) {lift}"


def save_webp(rgba, path, size):
    im = Image.fromarray(cv2.cvtColor(rgba, cv2.COLOR_BGRA2RGBA))
    im = im.resize(size, Image.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "WEBP", quality=88, method=6)


def crop(rgba, box, pad):
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    px, py = int(w * pad), int(h * pad)
    H, W = rgba.shape[:2]
    X0, Y0, X1, Y1 = x0 - px, y0 - py, x1 + px, y1 + py
    out = np.zeros((Y1 - Y0, X1 - X0, 4), np.uint8)
    sx0, sy0, sx1, sy1 = max(X0, 0), max(Y0, 0), min(X1, W), min(Y1, H)
    out[sy0 - Y0 : sy1 - Y0, sx0 - X0 : sx1 - X0] = rgba[sy0:sy1, sx0:sx1]
    return out


def main(folder: Path, with_body: bool):
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    for path in sorted(folder.glob("*")):
        if path.suffix.lower() not in (".webp", ".png", ".jpg"):
            continue
        m = re.search(r"animal-(" + "|".join(ANIMALS) + r")(?:-(" + "|".join(FRAMES + ["mockup"]) + r"))?", path.name)
        if not m:
            print("skip", path.name)
            continue
        animal, frame = m.group(1), m.group(2) or "idle"
        frame = "idle" if frame == "mockup" else frame
        rgba = cut_out(path)
        box = figure_box(rgba[:, :, 3])
        head = head_box(rgba[:, :, 3], box)
        body = crop(rgba, box, 0.03)
        bw, bh = body.shape[1], body.shape[0]
        if with_body:
            save_webp(body, OUT / animal / f"{frame}.webp", (round(BODY_PX * bw / bh), BODY_PX))
        face = crop(rgba, head, 0.06)
        save_webp(face, OUT / animal / f"{frame}-face.webp", (FACE_PX, FACE_PX))
        entry = manifest.setdefault(animal, {"frames": [], "body": False, "head": {}, "sky": ""})
        if frame not in entry["frames"]:
            entry["frames"].append(frame)
        if frame == "idle":
            entry["body"] = with_body
            entry["sky"] = sky_filter(face)
            # The head in the whole figure's image, as fractions of it, for the outfit pieces.
            fx0, fy0 = box[0] - int((box[2] - box[0]) * 0.03), box[1] - int((box[3] - box[1]) * 0.03)
            entry["head"] = {
                "x": round((head[0] - fx0) / bw, 4),
                "y": round((head[1] - fy0) / bh, 4),
                "w": round((head[2] - head[0]) / bw, 4),
                "h": round((head[3] - head[1]) / bh, 4),
            }
        entry["frames"] = [f for f in FRAMES if f in entry["frames"]]
        print(animal, frame, "figure", box, "head", head)
    MANIFEST.write_text(json.dumps({k: manifest[k] for k in ANIMALS if k in manifest}, indent=2) + "\n")


if __name__ == "__main__":
    main(Path(sys.argv[1]), "--body" in sys.argv[2:])
