#!/usr/bin/env python3
"""
The Today screen's nest hero from two supplied renders (2026-10-12): a sitting bunny and a woven
basket, as the approved mockup has them. Makes:

  public/animals/bunny/idle.webp       the bunny's whole figure, 800px tall, transparent: the body
                                       view (animalArt.json `body`), shown on Today only
  public/nest/basket-back.webp         the basket: the far rim and the inside, behind the animal
  public/nest/basket-front.webp        the near rim and the bowl, in front of the animal's feet
  src/data/animalArt.json              bunny: `body` true and `head`, the box the dress-up pieces sit in

Why not scripts/animal-art.py --body: its cut-out is seeded by distance from the backdrop, which
works for the green-backdrop renders and for coloured animals on grey, and lost half of this cream
bunny on light grey. This cuts by warmth and pink against the grey (the fur and the ears' insides),
or darkness (the eyes and nose), then lets GrabCut tidy the edge a little either way. The basket
came as a JPEG with a drawn checkerboard, so it is cut by saturation (rope against grey and white)
and split at its opening's lower rim, an ellipse read off the render, into the two layers.

The head box is not animal-art.py's either: that one runs from the ear tips to the chin, and lop
ears beside the head make it as wide as the whole figure. The pieces were drawn for a box that spans
the round plush's face with its ears in it, so here the box is sized from the eyes: as wide as puts
the glasses' lenses on them, placed so the glasses' row is the eyes' row. That starts a little above
the head, which is fine (the crown's own fit for the figure is in wardrobeArt.json `bodyFits`).

Usage: python3 scripts/today-hero.py <folder with animal-bunny-sit.jpg and nest-raw.jpg>
Needs: pip install opencv-python-headless pillow numpy
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
BODY_PX = 800

# Measured on animal-bunny-sit.jpg (400 x 736): the eyes, the face's middle, the top of the head.
EYE_GAP, EYE_Y, FACE_X = 85, 332, 198
# The glasses picture's lenses are this share of its width apart, the piece this share of the box wide,
# and its row this far down the box (wardrobeArt.json: y + the bunny's dy + half its height).
LENS_GAP, GLASSES_W, GLASSES_ROW = 0.53, 0.5415, 0.5127
# Measured on nest-raw.jpg (448 x 672): the opening's ellipse, and the crop that holds the basket.
OPENING = (225, 295, 152, 100)
BASKET_CROP = (8, 140, 440, 525)


def feather(mask):
    tight = cv2.erode(mask, np.ones((3, 3), np.uint8))
    return np.clip(cv2.GaussianBlur(tight.astype(np.float32) * 255, (0, 0), 1.2), 0, 255).astype(np.uint8)


def largest_filled(mask):
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask)
    if count > 1:
        mask = (labels == 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])).astype(np.uint8)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    filled = np.zeros_like(mask)
    cv2.drawContours(filled, contours, -1, 1, -1)
    return filled


def cut_bunny(path: Path):
    img = cv2.imread(str(path))
    h, w = img.shape[:2]
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
    lab[:, :, 1:] -= 128
    light, a, b = lab[:, :, 0], lab[:, :, 1], lab[:, :, 2]
    border = np.concatenate([lab[:20].reshape(-1, 3), lab[-20:].reshape(-1, 3), lab[:, :20].reshape(-1, 3), lab[:, -20:].reshape(-1, 3)])
    bg_light, bg_a, bg_b = np.median(border, axis=0)
    score = (b - bg_b) + 1.5 * (a - bg_a)
    rough = ((score > 3.5) | (light < bg_light - 40)).astype(np.uint8)
    rough = cv2.morphologyEx(rough, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17)))
    rough = cv2.morphologyEx(rough, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    rough = largest_filled(rough)
    mask = np.full((h, w), cv2.GC_PR_BGD, np.uint8)
    mask[cv2.dilate(rough, np.ones((13, 13), np.uint8)) == 0] = cv2.GC_BGD
    mask[cv2.erode(rough, np.ones((9, 9), np.uint8)) > 0] = cv2.GC_FGD
    mask[(rough > 0) & (mask != cv2.GC_FGD)] = cv2.GC_PR_FGD
    cv2.setRNGSeed(0)
    cv2.grabCut(img, mask, None, np.zeros((1, 65)), np.zeros((1, 65)), 4, cv2.GC_INIT_WITH_MASK)
    cut = largest_filled(((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)).astype(np.uint8))
    rgba = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    rgba[:, :, 3] = feather(cut)
    return rgba


def figure(rgba):
    """The figure with 3% of air round it (as animal-art.py keeps a whole figure), and its box."""
    ys, xs = np.where(rgba[:, :, 3] > 128)
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
    px, py = int((x1 - x0) * 0.03), int((y1 - y0) * 0.03)
    X0, Y0, X1, Y1 = x0 - px, y0 - py, x1 + px, y1 + py
    out = np.zeros((Y1 - Y0, X1 - X0, 4), np.uint8)
    H, W = rgba.shape[:2]
    sx0, sy0, sx1, sy1 = max(X0, 0), max(Y0, 0), min(X1, W), min(Y1, H)
    out[sy0 - Y0 : sy1 - Y0, sx0 - X0 : sx1 - X0] = rgba[sy0:sy1, sx0:sx1]
    return out, (X0, Y0)


def save_webp(bgra, path: Path, size):
    im = Image.fromarray(cv2.cvtColor(bgra, cv2.COLOR_BGRA2RGBA)).resize(size, Image.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "WEBP", quality=88, method=6)


def cut_basket(path: Path):
    img = cv2.imread(str(path))
    h, w = img.shape[:2]
    sat = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)[:, :, 1].astype(int)
    mask = np.full((h, w), cv2.GC_PR_BGD, np.uint8)
    mask[sat < 25] = cv2.GC_BGD
    sure = cv2.erode((sat > 70).astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
    mask[sure] = cv2.GC_FGD
    mask[(sat >= 40) & ~sure] = cv2.GC_PR_FGD
    cv2.setRNGSeed(0)
    cv2.grabCut(img, mask, None, np.zeros((1, 65)), np.zeros((1, 65)), 8, cv2.GC_INIT_WITH_MASK)
    cut = largest_filled(((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)).astype(np.uint8))
    rgba = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    rgba[:, :, 3] = feather(cut)
    return rgba


def main(folder: Path):
    bunny = cut_bunny(folder / "animal-bunny-sit.jpg")
    body, (fx0, fy0) = figure(bunny)
    bh, bw = body.shape[:2]
    save_webp(body, ROOT / "public/animals/bunny/idle.webp", (round(BODY_PX * bw / bh), BODY_PX))
    side = round(EYE_GAP / (LENS_GAP * GLASSES_W))
    top = EYE_Y - GLASSES_ROW * side
    head = {"x": round((FACE_X - side / 2 - fx0) / bw, 4), "y": round((top - fy0) / bh, 4), "w": round(side / bw, 4), "h": round(side / bh, 4)}
    manifest_path = ROOT / "src/data/animalArt.json"
    manifest = json.loads(manifest_path.read_text())
    manifest["bunny"]["body"] = True
    manifest["bunny"]["head"] = head
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print("bunny figure", (round(BODY_PX * bw / bh), BODY_PX), "head", head)

    basket = cut_basket(folder / "nest-raw.jpg")
    h, w = basket.shape[:2]
    cx, cy, rx, ry = OPENING
    yy, xx = np.mgrid[0:h, 0:w]
    dx = (xx - cx) / rx
    lower_arc = np.where(np.abs(dx) < 1, cy + ry * np.sqrt(np.clip(1 - dx * dx, 0, 1)), cy)
    front = cv2.GaussianBlur((yy > lower_arc).astype(np.float32), (0, 0), 1.0)
    x0, y0, x1, y1 = BASKET_CROP
    back = basket[y0:y1, x0:x1]
    front_layer = basket.copy()
    front_layer[:, :, 3] = (basket[:, :, 3].astype(np.float32) * front).astype(np.uint8)
    front_layer = front_layer[y0:y1, x0:x1]
    size = (x1 - x0, y1 - y0)
    save_webp(back, ROOT / "public/nest/basket-back.webp", size)
    save_webp(front_layer, ROOT / "public/nest/basket-front.webp", size)
    print("basket layers", size)


if __name__ == "__main__":
    main(Path(sys.argv[1]))
