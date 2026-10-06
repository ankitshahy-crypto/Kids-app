"""
Make the painted props for the games from their renders.

Usage: python3 scripts/game-art.py <folder of source images>

The sources (`...coin-<copper|silver>-blank...`, `...planting-<bed-empty|seed|sprout|leafy|grown|sun|can>...`,
`...garden-<ground-brown|lifecycle-flower>...`, `...money-<jar|bill>...`) are watercolour props on a
plain paper backdrop. This writes transparent WebP files under public/games/:

  coin-copper.webp, coin-silver.webp   a blank coin face each (the star pressed into the middle is
                                       painted out: the app draws each coin's number there, and
                                       sizes the coin, so two faces make all four coins)
  bill.webp, bill-five.webp            a blank bill (the app writes the amount on it), and the same
                                       turned lavender for the five, so the two tell apart at a glance
  jar.webp                             an empty jar with its lid (the app puts the label on it and
                                       the coins in it)
  garden/bed.webp                      the empty planting bed
  garden/ground.webp                   the patch of dug earth the bed stands on
  garden/seed.webp, sun.webp, can.webp the three things to give
  garden/sprout.webp, plant.webp,      the plant at each size, lifted off the bed it was painted in,
  flower.webp                          to stand in the empty bed
  garden/bloom.webp                    a flower on its own: the last picture of the plant's life,
                                       put in order (its seed and sprout are the two above)

Needs: pip install opencv-python-headless pillow numpy
"""
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "games"


def backdrop(img):
    border = np.concatenate([img[:24].reshape(-1, 3), img[-24:].reshape(-1, 3), img[:, :24].reshape(-1, 3), img[:, -24:].reshape(-1, 3)])
    return np.median(border, axis=0)


def distance(img, colour):
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
    ref = cv2.cvtColor(np.uint8([[colour]]), cv2.COLOR_BGR2LAB).astype(np.float32)[0, 0]
    return np.linalg.norm(lab - ref, axis=2)


def biggest(mask):
    n, labels, stats, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8))
    if n <= 1:
        return mask.astype(np.uint8)
    return (labels == 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])).astype(np.uint8)


def filled(mask):
    contours, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    out = np.zeros(mask.shape, np.uint8)
    cv2.drawContours(out, contours, -1, 1, -1)
    return out


def save(img, alpha, name, size, pad=0.02):
    ys, xs = np.where(alpha > 24)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    px, py = int((x1 - x0) * pad), int((y1 - y0) * pad)
    x0, y0, x1, y1 = max(0, x0 - px), max(0, y0 - py), min(img.shape[1], x1 + px), min(img.shape[0], y1 + py)
    rgba = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    rgba[:, :, 3] = alpha
    piece = Image.fromarray(cv2.cvtColor(rgba[y0:y1, x0:x1], cv2.COLOR_BGRA2RGBA))
    scale = size / max(piece.width, piece.height)
    piece = piece.resize((round(piece.width * scale), round(piece.height * scale)), Image.LANCZOS)
    path = OUT / f"{name}.webp"
    path.parent.mkdir(parents=True, exist_ok=True)
    piece.save(path, "WEBP", quality=88, method=6)
    print(name, piece.size, f"{path.stat().st_size // 1024} KB", "box", (x0, y0, x1, y1))
    return x0, y0, x1, y1


def feather(mask, sigma=1.4):
    return np.clip(cv2.GaussianBlur(mask.astype(np.float32) * 255, (0, 0), sigma), 0, 255).astype(np.uint8)


def coin(path, name):
    """A coin on a pale backdrop (the silver one is nearly its colour): its outline, from its edges, filled."""
    img = cv2.imread(str(path))
    grey = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), (0, 0), 3)
    edges = cv2.dilate(cv2.Canny(grey, 12, 36), np.ones((9, 9), np.uint8))
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    hull = cv2.convexHull(max(contours, key=cv2.contourArea))
    mask = np.zeros(img.shape[:2], np.uint8)
    cv2.fillPoly(mask, [hull], 1)
    mask = cv2.erode(mask, np.ones((13, 13), np.uint8))  # the dilated edge, and the last backdrop pixel, come off
    # The star in the middle is painted out, from the face around it.
    (cx, cy), radius = cv2.minEnclosingCircle(hull)
    star = np.zeros(img.shape[:2], np.uint8)
    cv2.circle(star, (int(cx), int(cy)), int(radius * 0.36), 255, -1)
    img = cv2.inpaint(img, star, 5, cv2.INPAINT_NS)
    # The fill is smoothed (it keeps streaks toward the middle otherwise), and eased into the face.
    soft = cv2.GaussianBlur(img, (0, 0), 28)
    blend = cv2.GaussianBlur(star.astype(np.float32) / 255, (0, 0), 14)[:, :, None]
    img = (img * (1 - blend) + soft * blend).astype(np.uint8)
    save(img, feather(mask), name, 256, pad=0.0)


def prop(path, name, size, lo=9.0, hi=26.0, solid=False):
    """
    A painted prop on paper. By default how see-through each pixel is follows how far its colour is
    from the paper, near the prop (a watering can keeps the hole in its handle and its drops).
    `solid` is the prop's own outline, filled, and nothing else: a bed's pale wood and a seed's
    highlight are not holes, and a wash of shadow or glow on the paper is left behind (it shows as
    a dirty patch on anything but paper).
    """
    img = cv2.imread(str(path))
    d = distance(img, backdrop(img))
    alpha = np.clip((d - lo) / (hi - lo), 0, 1)
    body = biggest(cv2.morphologyEx((alpha > 0.5).astype(np.uint8), cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8)))
    if solid:
        out = feather(cv2.erode(filled(body), np.ones((3, 3), np.uint8)))
    else:
        out = (alpha * cv2.dilate(body, np.ones((61, 61), np.uint8)) * 255).astype(np.uint8)
    save(img, out, name, size)


def plant(path, name, size):
    """The plant lifted off the bed it was painted in: what is green or yellow (not soil, wood or paper)."""
    img = cv2.imread(str(path))
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    h, s, v = hsv[:, :, 0].astype(int) * 2, hsv[:, :, 1], hsv[:, :, 2]
    green = (h >= 62) & (h <= 170) & (s > 48)
    yellow = (h >= 40) & (h < 62) & (s > 120) & (v > 170)
    mask = cv2.morphologyEx((green | yellow).astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    mask = filled(biggest(cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8)))) & cv2.dilate(mask, np.ones((5, 5), np.uint8))
    return save(img, feather(filled(mask), 1.0), name, size)


def tinted(name, out, hue, saturation):
    """A finished prop turned about the hue circle (`hue` degrees) and saturated, for a second of it in another colour."""
    rgba = Image.open(OUT / f"{name}.webp").convert("RGBA")
    h, s, v = rgba.convert("RGB").convert("HSV").split()
    h = h.point(lambda value: (value + round(hue * 255 / 360)) % 256)
    s = s.point(lambda value: min(255, round(value * saturation)))
    turned = Image.merge("HSV", (h, s, v)).convert("RGB")
    turned.putalpha(rgba.getchannel("A"))
    path = OUT / f"{out}.webp"
    turned.save(path, "WEBP", quality=88, method=6)
    print(out, turned.size, f"{path.stat().st_size // 1024} KB", "tinted from", name)


def main(folder: Path):
    def find(key):
        found = [p for p in sorted(folder.glob("*.webp")) if key in p.name]
        if not found:
            sys.exit(f"No render named ...{key}... in {folder}")
        return found[0]

    coin(find("coin-copper-blank"), "coin-copper")
    coin(find("coin-silver-blank"), "coin-silver")
    prop(find("planting-bed-empty"), "garden/bed", 640, solid=True)
    prop(find("planting-seed"), "garden/seed", 256, lo=34.0, hi=54.0, solid=True)
    prop(find("planting-sun"), "garden/sun", 384, lo=20.0, hi=38.0, solid=True)
    prop(find("planting-can"), "garden/can", 384)
    plant(find("planting-sprout"), "garden/sprout", 256)
    plant(find("planting-leafy"), "garden/plant", 512)
    plant(find("planting-grown"), "garden/flower", 512)
    prop(find("garden-ground-brown"), "garden/ground", 640, solid=True)
    prop(find("garden-lifecycle-flower"), "garden/bloom", 384)
    # The jar is clear glass on white paper: its own outline, filled, so the glass stays (a wash of
    # white inside it is the jar, not paper); the soft shadow under it is fainter than its lines,
    # and falls below the threshold. The bill's pale wash is a bill too, so its outline as well.
    prop(find("money-jar"), "jar", 384, lo=20.0, hi=36.0, solid=True)
    prop(find("money-bill"), "bill", 512, lo=6.0, hi=18.0, solid=True)
    # The five is the same bill turned from green to lavender (done here, not by a CSS filter on the
    # page: Safari does not apply a filter to a picture inside an SVG).
    tinted("bill", "bill-five", 150, 1.25)


if __name__ == "__main__":
    main(Path(sys.argv[1]))
