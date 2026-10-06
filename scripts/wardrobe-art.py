"""
Make the dress-up pieces from the painted fox wearing each one.

Usage: python3 scripts/wardrobe-art.py <folder with the wardrobe renders> <the fox's own render>

The renders (`...wardrobe-<item>...webp`) show the same fox wearing a piece; the pieces are lifted
off and written to public/wardrobe/<item>.webp (transparent WebP), with src/data/wardrobeArt.json
saying where each sits on a face (fractions of the face box that scripts/animal-art.py makes, so
one set of pieces fits every animal, give or take a forehead).

How each is lifted depends on what it shares with the fox:
  leaf hat, crown, dot scarf: their own colour (green, gold, teal), so a colour seed and GrabCut;
  glasses: the dark frames, where the picture differs strongly from the fox without them (the
           renders line up pixel for pixel);
  stripe scarf: orange and cream, like the fox; not lifted (it needs a render of its own).
Needs: pip install opencv-python-headless pillow numpy
"""
import json, sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "wardrobe"
MANIFEST = ROOT / "src" / "data" / "wardrobeArt.json"
MAX_PX = 512

# The fox's face box in its render, as animal-art.py crops it (the head box, padded 6%).
def face_box(fox):
    lab = cv2.cvtColor(fox, cv2.COLOR_BGR2LAB).astype(np.float32)
    bg = np.median(np.concatenate([fox[:20].reshape(-1, 3), fox[-20:].reshape(-1, 3)]), axis=0)
    bgl = cv2.cvtColor(np.uint8([[bg]]), cv2.COLOR_BGR2LAB).astype(np.float32)[0, 0]
    on = np.linalg.norm(lab - bgl, axis=2) > 25
    ys, xs = np.where(on)
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    rows = []
    for y in range(y0, y0 + int((y1 - y0) * 0.45)):
        row = np.where(on[y])[0]
        if row.size:
            rows.append((row.max() - row.min(), y, row.min(), row.max() + 1))
    width, cheeks, left, right = max(rows)
    bottom = min(y1, cheeks + int(width * 0.55))
    size = max(bottom - y0, width)
    cx = (left + right) / 2
    hx0, hy0, hx1, hy1 = int(cx - size / 2), y0, int(cx + size / 2), y0 + size
    pad = int(size * 0.06)
    return hx0 - pad, hy0 - pad, hx1 + pad, hy1 + pad


def finish(fg, small_holes=0):
    contours, _ = cv2.findContours(fg, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if small_holes == 0:
        filled = np.zeros_like(fg)
        cv2.drawContours(filled, contours, -1, 1, -1)
        return filled
    inv = (1 - fg).astype(np.uint8)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(inv)
    out = fg.copy()
    h, w = fg.shape
    for i in range(1, n):
        x, y, ww, hh, area = stats[i]
        if area < small_holes and not (x == 0 or y == 0 or x + ww >= w or y + hh >= h):
            out[labels == i] = 1
    return out


def by_colour(img, hue_lo, hue_hi, sat_min, val_min, box):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    h, s, v = hsv[:, :, 0].astype(int) * 2, hsv[:, :, 1], hsv[:, :, 2]
    seed = (h >= hue_lo) & (h <= hue_hi) & (s >= sat_min) & (v >= val_min)
    region = np.zeros_like(seed)
    x0, y0, x1, y1 = box
    region[y0:y1, x0:x1] = True
    seed = cv2.morphologyEx((seed & region).astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    mask = np.full(img.shape[:2], cv2.GC_BGD, np.uint8)
    mask[cv2.dilate(seed, np.ones((25, 25), np.uint8)) > 0] = cv2.GC_PR_BGD
    mask[cv2.erode(seed, np.ones((7, 7), np.uint8)) > 0] = cv2.GC_FGD
    mask[(seed > 0) & (mask != cv2.GC_FGD)] = cv2.GC_PR_FGD
    cv2.grabCut(img, mask, None, np.zeros((1, 65)), np.zeros((1, 65)), 6, cv2.GC_INIT_WITH_MASK)
    fg = ((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)).astype(np.uint8)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(fg)
    if n > 1:
        keep = [i for i in range(1, n) if stats[i, cv2.CC_STAT_AREA] > 0.05 * stats[1:, cv2.CC_STAT_AREA].max()]
        fg = np.isin(labels, keep).astype(np.uint8)
    return finish(fg)


def glasses(img, fox, box):
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
    d = cv2.GaussianBlur(np.linalg.norm(lab - cv2.cvtColor(fox, cv2.COLOR_BGR2LAB).astype(np.float32), axis=2), (0, 0), 1.2)
    region = np.zeros(d.shape, bool)
    x0, y0, x1, y1 = box
    region[y0:y1, x0:x1] = True
    L, b = lab[:, :, 0], lab[:, :, 2] - 128
    # dark, and not the orange of the fur where a frame shades it
    fg = (region & (d > 42) & (L < 125) & ((b < 30) | (L < 75))).astype(np.uint8)
    fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    n, labels, stats, _ = cv2.connectedComponentsWithStats(fg)
    fg = np.isin(labels, [i for i in range(1, n) if stats[i, cv2.CC_STAT_AREA] > 2000]).astype(np.uint8)
    return finish(fg, small_holes=900)


def save(img, fg, name, face, pad=10, keep_top=1.0):
    alpha = np.clip(cv2.GaussianBlur(fg.astype(np.float32) * 255, (0, 0), 1.0), 0, 255).astype(np.uint8)
    ys, xs = np.where(alpha > 40)
    x0, x1, y0, y1 = xs.min() - pad, xs.max() + pad, ys.min() - pad, ys.max() + pad
    if keep_top < 1.0:
        # Only the top of the piece (a scarf's band and knot, not its tails, which would hang
        # under the cut edge of a face), fading out over the last bit so there is no hard line.
        y1 = y0 + int((y1 - y0) * keep_top)
        fade = int((y1 - y0) * 0.12)
        ramp = np.linspace(1, 0, fade)[:, None]
        alpha = alpha.astype(np.float32)
        alpha[y1 - fade : y1] *= ramp
        alpha[y1:] = 0
        alpha = alpha.astype(np.uint8)
    rgba = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    rgba[:, :, 3] = alpha
    piece = Image.fromarray(cv2.cvtColor(rgba[y0:y1, x0:x1], cv2.COLOR_BGRA2RGBA))
    scale = min(1.0, MAX_PX / piece.width)
    piece = piece.resize((round(piece.width * scale), round(piece.height * scale)), Image.LANCZOS)
    OUT.mkdir(parents=True, exist_ok=True)
    piece.save(OUT / f"{name}.webp", "WEBP", quality=90, method=6)
    fx0, fy0, fx1, fy1 = face
    fw, fh = fx1 - fx0, fy1 - fy0
    place = {"x": round((x0 - fx0) / fw, 4), "y": round((y0 - fy0) / fh, 4), "w": round((x1 - x0) / fw, 4), "h": round((y1 - y0) / fh, 4)}
    print(name, piece.size, place)
    return place


def main(folder: Path, fox_path: Path):
    fox = cv2.imread(str(fox_path))
    face = face_box(fox)
    load = lambda key: cv2.imread(str(next(p for p in folder.glob("*.webp") if key in p.name)))
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    img = load("leaf-hat")
    manifest["hat-leaf"] = save(img, by_colour(img, 60, 160, 50, 40, (300, 150, 900, 500)), "hat-leaf", face)
    img = load("crown")
    manifest["hat-crown"] = save(img, by_colour(img, 34, 70, 60, 90, (430, 170, 760, 460)), "hat-crown", face)
    img = load("dot-scarf")
    manifest["scarf-dots"] = save(img, by_colour(img, 160, 215, 60, 40, (200, 600, 950, 1500)), "scarf-dots", face, keep_top=0.62)
    img = load("glasses")
    manifest["glasses-round"] = save(img, glasses(img, fox, (250, 520, 900, 820)), "glasses-round", face, pad=8)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
