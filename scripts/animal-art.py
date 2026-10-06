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

The renders of one animal are made one at a time, so the animal is never quite the same twice.
Two things keep a change of frame from showing as a jump:
  every mood frame's face is lined up with the idle face (its outline fitted to the idle one's);
  the blink frame, which flashes on a still face, is the idle face itself with only the eyes
  taken from the blink render, so nothing but the eyes changes.
Give the script only the frames that are fit to ship (look at them first: a "think" that frowns is
a sad animal on a child's wrong answer).

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


def face_image(rgba, head):
    """The face crop at its shipped size, as an RGBA array."""
    face = Image.fromarray(cv2.cvtColor(crop(rgba, head, 0.06), cv2.COLOR_BGRA2RGBA)).resize((FACE_PX, FACE_PX), Image.LANCZOS)
    return np.array(face)


def on_grey(face):
    """A face on mid grey, blurred: its outline and big shapes, not its fur or its expression."""
    a = face[:, :, 3:4].astype(np.float32) / 255
    grey = cv2.cvtColor(face[:, :, :3], cv2.COLOR_RGB2GRAY).astype(np.float32)[:, :, None]
    return cv2.GaussianBlur((grey * a + 128 * (1 - a))[:, :, 0], (0, 0), 6)


def lined_up(face, idle):
    """The mood face moved and sized to sit where the idle face sits (a small affine fit, or as it is if the fit runs wild)."""
    warp = np.eye(2, 3, dtype=np.float32)
    try:
        _, warp = cv2.findTransformECC(on_grey(idle), on_grey(face), warp, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-5), None, 5)
    except cv2.error:
        return face, "not lined up (no fit)"
    scale = float(np.sqrt(abs(np.linalg.det(warp[:, :2]))))
    shift = float(np.hypot(warp[0, 2], warp[1, 2]))
    if not (0.85 < scale < 1.18) or shift > 80:
        return face, f"not lined up (fit ran wild: scale {scale:.2f}, shift {shift:.0f})"
    moved = cv2.warpAffine(face, warp, (FACE_PX, FACE_PX), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    return moved, f"lined up (scale {scale:.3f}, shift {shift:.1f})"


def eyes_only(blink, idle):
    """
    The idle face with the blink render's eyes: the two places, in the upper middle of the face, where
    the two differ most (an open eye is dark; a closed one is fur and a line), widened to take in the
    whole closed eye and eased into the fur around. None if two eyes cannot be found.
    """
    lab = lambda face: cv2.cvtColor(face[:, :, :3], cv2.COLOR_RGB2LAB).astype(np.float32)
    inside = cv2.erode((np.minimum(blink[:, :, 3], idle[:, :, 3]) > 200).astype(np.uint8), np.ones((25, 25), np.uint8))
    diff = cv2.GaussianBlur(np.linalg.norm(lab(blink) - lab(idle), axis=2), (0, 0), 3) * inside
    band = np.zeros_like(diff)
    band[int(FACE_PX * 0.12) : int(FACE_PX * 0.72)] = 1
    hot = cv2.morphologyEx(((diff * band) > 42).astype(np.uint8), cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    n, labels, stats, centres = cv2.connectedComponentsWithStats(hot)
    blobs = sorted(range(1, n), key=lambda i: -stats[i, cv2.CC_STAT_AREA])
    blobs = [i for i in blobs if stats[i, cv2.CC_STAT_AREA] > 180]
    # Two eyes: the two biggest that sit side by side, one each side of the middle.
    pair = next(((i, j) for i in blobs[:4] for j in blobs[:4] if i < j and abs(centres[i][1] - centres[j][1]) < FACE_PX * 0.08 and (centres[i][0] - FACE_PX / 2) * (centres[j][0] - FACE_PX / 2) < 0), None)
    if pair is None:
        return None, "no two eyes found"
    mask = np.zeros(diff.shape, np.uint8)
    for i in pair:
        x, y, w, h = stats[i, :4]
        grow = int(max(w, h) * 0.38)
        cv2.ellipse(mask, (int(x + w / 2), int(y + h / 2)), (w // 2 + grow, h // 2 + grow), 0, 0, 360, 1, -1)
    soft = cv2.GaussianBlur(mask.astype(np.float32), (0, 0), 7)[:, :, None]
    out = idle.astype(np.float32) * (1 - soft) + blink.astype(np.float32) * soft
    out[:, :, 3] = idle[:, :, 3]
    return out.astype(np.uint8), f"eyes at {[tuple(int(v) for v in centres[i]) for i in pair]}"


def main(folder: Path, with_body: bool):
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    sources = {}
    for path in sorted(folder.glob("*")):
        if path.suffix.lower() not in (".webp", ".png", ".jpg"):
            continue
        m = re.search(r"animal-(" + "|".join(ANIMALS) + r")(?:-(" + "|".join(FRAMES + ["mockup"]) + r"))?", path.name)
        if not m:
            print("skip", path.name)
            continue
        frame = m.group(2) or "idle"
        sources.setdefault(m.group(1), {})["idle" if frame == "mockup" else frame] = path
    for animal in ANIMALS:
        idle_face = None
        # The idle frame first: the others are fitted to it.
        for frame in [f for f in FRAMES if f in sources.get(animal, {})]:
            rgba = cut_out(sources[animal][frame])
            box = figure_box(rgba[:, :, 3])
            head = head_box(rgba[:, :, 3], box)
            body = crop(rgba, box, 0.03)
            bw, bh = body.shape[1], body.shape[0]
            if with_body:
                save_webp(body, OUT / animal / f"{frame}.webp", (round(BODY_PX * bw / bh), BODY_PX))
            face = face_image(rgba, head)
            note = ""
            if frame == "idle":
                idle_face = face
            elif idle_face is not None and frame not in ("wave", "silly"):
                # (A wave lifts a paw and a silly face tips the head: their outlines are their own.)
                face, note = lined_up(face, idle_face)
                if frame == "blink":
                    blended, found = eyes_only(face, idle_face)
                    note = f"{note}; {found}"
                    if blended is None:
                        print(animal, frame, "LEFT OUT:", note)
                        continue
                    face = blended
            path = OUT / animal / f"{frame}-face.webp"
            path.parent.mkdir(parents=True, exist_ok=True)
            Image.fromarray(face).save(path, "WEBP", quality=88, method=6)
            entry = manifest.setdefault(animal, {"frames": [], "body": False, "head": {}, "sky": ""})
            if frame not in entry["frames"]:
                entry["frames"].append(frame)
            if frame == "idle":
                entry["body"] = with_body
                entry["sky"] = sky_filter(crop(rgba, head, 0.06))
                # The head in the whole figure's image, as fractions of it, for the outfit pieces.
                fx0, fy0 = box[0] - int((box[2] - box[0]) * 0.03), box[1] - int((box[3] - box[1]) * 0.03)
                entry["head"] = {
                    "x": round((head[0] - fx0) / bw, 4),
                    "y": round((head[1] - fy0) / bh, 4),
                    "w": round((head[2] - head[0]) / bw, 4),
                    "h": round((head[3] - head[1]) / bh, 4),
                }
            entry["frames"] = [f for f in FRAMES if f in entry["frames"]]
            print(animal, frame, note)
    MANIFEST.write_text(json.dumps({k: manifest[k] for k in ANIMALS if k in manifest}, indent=2) + "\n")


if __name__ == "__main__":
    main(Path(sys.argv[1]), "--body" in sys.argv[2:])
