"""
Make the app's animal art from the painted plush figures.

Usage: python3 scripts/animal-art.py <folder of source images> [--body] [--round]

`--round` is for the round-plush renders (docs/round-plush/README.md): one marshmallow body that is
nearly all head, on a flat green. The face crop is then the whole figure, and a mood frame keeps its
own crop (its ears may lift above where the idle ones hang; cut to the idle's frame they would be
clipped) and is lined up with the idle frame by its body instead: the widest part and the floor,
which every mood keeps. The manifest records, per mood frame, where the idle frame sits inside it
(`places`: x, y, side, fractions of the mood frame), and the app draws the mood face that much
larger than its box and shifted, so the body stays put while the ears rise past the box's edge.

Each source is a WebP (or PNG) of one plush animal on a plain light studio backdrop, named
`...animal-<id>[-<frame>]...` (`<id>` from src/data/animals.ts; no frame, or `mockup`, is the
idle frame; `cheer`, `think`, `wait`, `blink`, `sleepy`, `wave`, `silly` are the mood frames). For each
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
app falls back to a missing mood frame's idle frame, so frames can land one at a time: a folder
without an animal's idle source lines its frames up with the idle face already shipped.

The renders of one animal are made one at a time, so the animal is never quite the same twice.
Two things keep a change of frame from showing as a jump:
  every mood frame's face is lined up with the idle face (its outline fitted to the idle one's);
  the blink frame, which flashes over a still face, is only the closed eyes of the blink render,
  see-through everywhere else: the app lays it over the idle face, so nothing but the eyes changes.
A frame that cannot be lined up, or a blink whose eyes cannot be found, is not shipped: it is taken
out of the folder and the manifest, and the script ends with an error naming it. (Whole figures,
with --body, are not lined up; no view shows them yet.)
Give the script only the frames that are fit to ship (look at them first: a "think" that frowns is
a sad animal on a child's wrong answer).

The cut-out is classical (OpenCV GrabCut seeded by distance from the backdrop colour), since the
sources come without transparency: it holds up on these figures, cream paws and floor shadow
included. Needs: pip install opencv-python-headless pillow numpy
"""
import json, re, sys
from itertools import combinations
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "animals"
MANIFEST = ROOT / "src" / "data" / "animalArt.json"
ANIMALS = ["cat", "dog", "fox", "bear", "bunny", "owl", "frog", "duck", "pig", "penguin", "lion", "koala"]
FRAMES = ["idle", "cheer", "think", "wait", "blink", "sleepy", "wave", "silly"]
# A wave lifts a paw and a silly face tips the head: their outlines are their own, not the idle one's.
OWN_OUTLINE = ("wave", "silly")
FACE_PX = 512
BODY_PX = 800
FACE_PAD = 0.06
# Round plush: air round the figure for ears that lift (cheer, wait) and a body that tips (think).
ROUND_PAD = 0.12
# Ears that lift make a taller figure and so a wider crop: the body in it is smaller by a quarter.
ROUND_FIT = ((0.6, 1.5), FACE_PX * 0.3)
ROUND = "--round" in sys.argv
# How far one animal differs from itself between two renders, with room to spare. Measured on the
# twelve: stretch 0.95 to 1.03, the middle of the face carried up to 11px, match 0.73 (the frog, whose
# eyes are a third of its face) to 0.96. Two different animals: match 0.19 to 0.70, or a stretch
# well outside. A fit beyond these is two pictures that do not match, not a small move.
FIT_STRETCH = (0.92, 1.08)
FIT_SHIFT = 30
FIT_MATCH = 0.7
# A think face tips the head (the puzzled look): its outline is not the idle one's, so its fit is a
# bigger move with a worse match, and is taken as long as it is still one animal (measured: stretch
# 0.89 to 1.38 — the koala's head is drawn smaller — shift up to 93, match 0.72 to 0.95). Look at
# the contact sheet: the fit is right when the eyes and nose sit where the idle ones do.
# A sleepy face slumps to one side the same way.
FIT_LOOSE = {"think": ((0.85, 1.4), 100, 0.7), "sleepy": ((0.85, 1.4), 100, 0.7)}


def cut_out(path: Path):
    """The figure on a transparent background: BGRA, full source size."""
    img = cv2.imread(str(path))
    h, w = img.shape[:2]
    # GrabCut draws on OpenCV's random numbers: from the same start every time, a source gives the
    # same cut whatever was cut before it.
    cv2.setRNGSeed(0)
    border = np.concatenate([img[:20].reshape(-1, 3), img[-20:].reshape(-1, 3), img[:, :20].reshape(-1, 3), img[:, -20:].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
    bglab = cv2.cvtColor(np.uint8([[bg]]), cv2.COLOR_BGR2LAB).astype(np.float32)[0, 0]
    dist = np.linalg.norm(lab - bglab, axis=2)
    L = lab[:, :, 0]
    sat = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)[:, :, 1].astype(np.float32)
    mask = np.full((h, w), cv2.GC_PR_BGD, np.uint8)
    mask[dist < 6] = cv2.GC_BGD
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    bghsv = cv2.cvtColor(np.uint8([[bg]]), cv2.COLOR_BGR2HSV)[0, 0].astype(np.float32)
    foot = np.zeros((h, w), bool)
    foot[int(h * 0.78) :] = True
    if bghsv[1] > 60:
        # A coloured backdrop (the round-plush renders: green). Its shadow is the same hue, darker
        # and greyer, anywhere in the picture: backdrop. Nothing of an animal is that colour.
        hue_off = np.abs(((hsv[:, :, 0].astype(np.float32) - bghsv[0]) + 90) % 180 - 90)
        shadow = (hue_off < 14) & (sat > 40) & (L < bglab[0] + 4)
        mask[shadow] = cv2.GC_BGD
        sure = cv2.erode(((dist > 40) & ~shadow).astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
        mask[sure] = cv2.GC_FGD
        mask[(dist >= 20) & ~sure & ~shadow] = cv2.GC_PR_FGD
    else:
        # The floor shadow, at the bottom of the picture, is grey and a little darker than the backdrop.
        # (Only there: a grey animal, the koala, is grey all over.)
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
        if bghsv[1] <= 60:
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


def round_box(alpha, box):
    """A round plush is nearly all head: the whole figure, in a square centred on it."""
    x0, y0, x1, y1 = box
    size = max(x1 - x0, y1 - y0)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    return int(cx - size / 2), int(cy - size / 2), int(cx + size / 2), int(cy + size / 2)


def body_marks(face):
    """Where a round plush's body is in a face crop: the size of its lower body (the root of the area
    below its widest row, which the ears, up or down, never reach), that row's middle, and its
    floor (the last row with figure on it). Two renders of one animal draw the body a little bigger
    or smaller; the lower body is the part no mood changes."""
    alpha = face[:, :, 3] > 96
    rows = np.where(alpha.any(axis=1))[0]
    top, floor = rows.min(), rows.max()
    best = None
    for y in range(int(top + (floor - top) * 0.4), floor + 1):
        on = np.where(alpha[y])[0]
        if on.size and (best is None or on.max() - on.min() > best[0]):
            best = (on.max() - on.min(), (on.max() + on.min()) / 2, y)
    width, middle, widest = best
    lower = float(alpha[widest:].sum())
    return np.sqrt(lower), middle, floor


def fit_body(face, idle):
    """The move (uniform scale and shift, as an affine) that puts a mood frame's body on the idle
    frame's: same size, same middle, same floor. None when the move is more than one animal
    differs from itself between two renders."""
    (lo, hi), far = ROUND_FIT
    fw, fx, ff = body_marks(face)
    iw, ix, i_floor = body_marks(idle)
    scale = fw / iw
    # From a place on the idle face to the place on the mood face that belongs there.
    warp = np.array([[scale, 0, fx - scale * ix], [0, scale, ff - scale * i_floor]], np.float32)
    shift = float(np.hypot(warp[0, 2] + (scale - 1) * FACE_PX / 2, warp[1, 2] + (scale - 1) * FACE_PX / 2))
    told = f"scale {scale:.3f}, shift {shift:.1f}"
    if scale < lo or scale > hi or shift > far:
        return None, f"fit ran wild ({told})"
    return warp, f"lined up by the body ({told})"


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


def face_pad():
    return ROUND_PAD if ROUND else FACE_PAD


def face_image(rgba, head):
    """The face crop at its shipped size, as an RGBA array."""
    face = Image.fromarray(cv2.cvtColor(crop(rgba, head, face_pad()), cv2.COLOR_BGRA2RGBA)).resize((FACE_PX, FACE_PX), Image.LANCZOS)
    return np.array(face)


def on_grey(face):
    """A face on mid grey, blurred: its outline and big shapes, not its fur or its expression."""
    a = face[:, :, 3:4].astype(np.float32) / 255
    grey = cv2.cvtColor(face[:, :, :3], cv2.COLOR_RGB2GRAY).astype(np.float32)[:, :, None]
    return cv2.GaussianBlur((grey * a + 128 * (1 - a))[:, :, 0], (0, 0), 6)


def fit(face, idle, frame="cheer"):
    """
    The small affine move that puts a mood face where the idle face sits (from a place on the idle
    face to the place on the mood face that belongs there, in face pixels), or None when there is
    no such small move: the two do not match, or matching them would stretch, flip or carry the
    face further than one animal differs from itself (further for a frame that tips the head).
    """
    (lo, hi), far, close = FIT_LOOSE.get(frame, (FIT_STRETCH, FIT_SHIFT, FIT_MATCH))
    warp = np.eye(2, 3, dtype=np.float32)
    try:
        match, warp = cv2.findTransformECC(on_grey(idle), on_grey(face), warp, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-5), None, 5)
    except cv2.error:
        return None, "no fit"
    stretch = np.linalg.svd(warp[:, :2], compute_uv=False)
    centre = np.array([FACE_PX / 2, FACE_PX / 2, 1], np.float32)
    shift = float(np.linalg.norm(warp @ centre - centre[:2]))
    told = f"stretch {stretch.min():.3f} to {stretch.max():.3f}, shift {shift:.1f}, match {match:.3f}"
    if np.linalg.det(warp[:, :2]) <= 0 or stretch.min() < lo or stretch.max() > hi or shift > far or match < close:
        return None, f"fit ran wild ({told})"
    return warp, f"lined up ({told})"


def moved(rgba, head, warp):
    """
    The whole cut-out moved by a face's fit, so that its face crop is the lined-up face, whole to
    its edges (the same move made on the crop would pull empty border in where the face shifts).
    """
    x0, y0, x1, y1 = head
    w, h = x1 - x0, y1 - y0
    pad = face_pad()
    origin = np.array([x0 - int(w * pad), y0 - int(h * pad)], np.float64)
    size = np.diag([(w + 2 * int(w * pad)) / FACE_PX, (h + 2 * int(h * pad)) / FACE_PX])
    turn = size @ warp[:, :2].astype(np.float64) @ np.linalg.inv(size)
    full = np.hstack([turn, (origin - turn @ origin + size @ warp[:, 2].astype(np.float64))[:, None]])
    return cv2.warpAffine(rgba, full, (rgba.shape[1], rgba.shape[0]), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))


def eyes_only(blink, idle):
    """
    The blink render's eyes and nothing else, on a see-through picture the size of the face: the two
    places, in the upper middle of the face, where the blink and the idle face differ most (an open
    eye is dark; a closed one is fur and a line), widened to take in the whole closed eye and eased
    out into nothing, so over the idle face they sit in its fur without an edge. None if two eyes
    cannot be found.
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
    level = lambda i, j: abs(centres[i][1] - centres[j][1]) < FACE_PX * 0.08
    either_side = lambda i, j: (centres[i][0] - FACE_PX / 2) * (centres[j][0] - FACE_PX / 2) < 0
    pair = next(((i, j) for i, j in combinations(blobs[:4], 2) if level(i, j) and either_side(i, j)), None)
    if pair is None:
        return None, "no two eyes found"
    mask = np.zeros(diff.shape, np.uint8)
    for i in pair:
        x, y, w, h = stats[i, :4]
        grow = int(max(w, h) * 0.38)
        cv2.ellipse(mask, (int(x + w / 2), int(y + h / 2)), (w // 2 + grow, h // 2 + grow), 0, 0, 360, 1, -1)
    soft = cv2.GaussianBlur(mask.astype(np.float32), (0, 0), 7)
    soft[soft < 0.004] = 0
    out = blink.copy()
    out[:, :, 3] = np.round(soft * idle[:, :, 3]).astype(np.uint8)
    out[out[:, :, 3] == 0] = 0
    return out, f"eyes at {[tuple(int(v) for v in centres[i]) for i in pair]}"


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
    left_out = []

    def leave_out(animal, frame, why):
        """Not fit to ship: neither the file nor its line in the manifest stays behind from an earlier run."""
        print(animal, frame, "LEFT OUT:", why)
        left_out.append(f"{animal} {frame}: {why}")
        for name in (f"{frame}-face.webp", f"{frame}.webp"):
            (OUT / animal / name).unlink(missing_ok=True)
        if animal in manifest:
            manifest[animal]["frames"] = [f for f in manifest[animal]["frames"] if f != frame]
            manifest[animal].get("places", {}).pop(frame, None)

    for animal in ANIMALS:
        have = sources.get(animal, {})
        # The idle frame first: the others are fitted to it. Without an idle source, to the one shipped.
        idle_face = None
        shipped = OUT / animal / "idle-face.webp"
        if "idle" not in have and shipped.exists():
            idle_face = np.array(Image.open(shipped).convert("RGBA"))
        for frame in [f for f in FRAMES if f in have]:
            rgba = cut_out(have[frame])
            box = figure_box(rgba[:, :, 3])
            head = round_box(rgba[:, :, 3], box) if ROUND else head_box(rgba[:, :, 3], box)
            body = crop(rgba, box, 0.03)
            bw, bh = body.shape[1], body.shape[0]
            face = face_image(rgba, head)
            note = ""
            place = None
            if frame == "idle":
                idle_face = face
            elif frame not in OWN_OUTLINE:
                if idle_face is None:
                    leave_out(animal, frame, "no idle face to line it up with")
                    continue
                # A blink is the idle render with the eyes shut: the exact fit of its outline (as for
                # the painted portraits) lines it up to the pixel, which the eyes need. The other
                # moods change the outline (ears, a tilt): fitted by the body instead.
                warp, note = fit_body(face, idle_face) if ROUND and frame != "blink" else fit(face, idle_face, frame)
                if warp is None:
                    leave_out(animal, frame, note)
                    continue
                if ROUND and frame != "blink":
                    # Kept as cut; the app places it (see `places` below).
                    scale = float(warp[0, 0])
                    place = [round(float(warp[0, 2]) / FACE_PX, 4), round(float(warp[1, 2]) / FACE_PX, 4), round(scale, 4)]
                else:
                    face = face_image(moved(rgba, head, warp), head)
                if frame == "blink":
                    face, found = eyes_only(face, idle_face)
                    note = f"{note}; {found}"
                    if face is None:
                        leave_out(animal, frame, note)
                        continue
            if with_body:
                save_webp(body, OUT / animal / f"{frame}.webp", (round(BODY_PX * bw / bh), BODY_PX))
            path = OUT / animal / f"{frame}-face.webp"
            path.parent.mkdir(parents=True, exist_ok=True)
            Image.fromarray(face).save(path, "WEBP", quality=88, method=6)
            entry = manifest.setdefault(animal, {"frames": [], "body": False, "head": {}, "sky": ""})
            if frame not in entry["frames"]:
                entry["frames"].append(frame)
            if place:
                entry.setdefault("places", {})[frame] = place
            elif "places" in entry:
                entry["places"].pop(frame, None)
            if frame == "idle":
                entry["body"] = with_body
                entry["sky"] = sky_filter(crop(rgba, head, FACE_PAD))
                # The head in the whole figure's image, as fractions of it, for the outfit pieces.
                # (A round plush is all head: the figure itself.)
                fx0, fy0 = box[0] - int((box[2] - box[0]) * 0.03), box[1] - int((box[3] - box[1]) * 0.03)
                hx0, hy0, hx1, hy1 = box if ROUND else head
                entry["head"] = {
                    "x": round((hx0 - fx0) / bw, 4),
                    "y": round((hy0 - fy0) / bh, 4),
                    "w": round((hx1 - hx0) / bw, 4),
                    "h": round((hy1 - hy0) / bh, 4),
                }
            entry["frames"] = [f for f in FRAMES if f in entry["frames"]]
            print(animal, frame, note)
    MANIFEST.write_text(json.dumps({k: manifest[k] for k in ANIMALS if k in manifest}, indent=2) + "\n")
    if left_out:
        sys.exit("Left out, not shipped:\n  " + "\n  ".join(left_out))


if __name__ == "__main__":
    main(Path(sys.argv[1]), "--body" in sys.argv[2:])
