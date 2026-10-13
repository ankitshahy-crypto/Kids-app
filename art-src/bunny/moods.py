"""The cream bunny's face stills, made from the same cut-out and in the same 512 frame as its idle
clip (animate.py), so a still and the clip lie exactly on each other: idle, the blink overlay, and
the mood faces (cheer, think, wait, sleepy) drawn with code, never painted over by a model."""
import cv2, numpy as np
from PIL import Image
from animate import src, EYES, BEAD, FURS, smooth, xx, yy, S, ox, oy, OUT

def to512(layer, tilt=0.0):
    pm = layer.copy(); pm[..., :3] *= pm[..., 3:4]
    small = cv2.warpAffine(cv2.resize(pm, None, fx=S * 2, fy=S * 2, interpolation=cv2.INTER_AREA),
                           np.float32([[0.5, 0, ox], [0, 0.5, oy]]), (OUT, OUT), flags=cv2.INTER_LINEAR)
    if tilt:
        M = cv2.getRotationMatrix2D((OUT / 2, OUT / 2), -tilt, 1.0)
        small = cv2.warpAffine(small, M, (OUT, OUT), flags=cv2.INTER_CUBIC, borderValue=0)
    small = np.clip(small, 0, 1)
    a = small[..., 3:4]
    rgb = np.where(a > 1e-4, small[..., :3] / np.maximum(a, 1e-4), 0)
    return np.dstack([rgb, a]).clip(0, 1)

def socket(ex, ey, rx, ry, k=1.28, blur=3.2):
    m = (((xx - ex) / (rx * k)) ** 2 + ((yy - ey) / (ry * k)) ** 2) <= 1
    return cv2.GaussianBlur(m.astype(np.float32), (0, 0), blur)

def cover_eyes(img):
    """The beads painted out with each eye's own lid fur (the shut lid of the blink, without its line)."""
    out = img.copy()
    for (ex, ey, rx, ry), fur in zip(EYES, FURS):
        m = socket(ex, ey, rx, ry)[..., None]
        out[..., :3] = out[..., :3] * (1 - m) + fur * m
    return out

def arcs(img, bend, width=0.95, lift=0.0, thick=3.6):
    """A closed eye's soft line in the bead's brown on each eye. bend > 0: lowest in the middle (asleep,
    shut); bend < 0: highest in the middle (a happy, squeezed shut eye)."""
    out = img.copy()
    for ex, ey, rx, ry in EYES:
        w = (xx - ex) / (rx * width)
        base = ey + (0.12 - lift) * ry
        line_y = base + bend * ry * (1 - w ** 2)
        ends = 1 - smooth(0.72, 1.0, np.abs(w))
        line = np.exp(-((yy - line_y) / thick) ** 2) * ends * 0.82
        out[..., :3] = out[..., :3] * (1 - line[..., None]) + BEAD * line[..., None]
    return out

def look(img, dx, dy):
    """The beads turned to look: each painted out, then set back moved by (dx, dy) of its own size,
    kept inside its socket so it never runs onto the face."""
    out = cover_eyes(img)
    for ex, ey, rx, ry in EYES:
        bead = (((xx - ex) / (rx * 1.06)) ** 2 + ((yy - ey) / (ry * 1.06)) ** 2) <= 1
        bead = cv2.GaussianBlur(bead.astype(np.float32), (0, 0), 1.2)
        sx, sy = dx * rx, dy * ry
        moved = cv2.remap(img, xx - sx, yy - sy, cv2.INTER_CUBIC)
        mm = cv2.remap(bead, xx - sx, yy - sy, cv2.INTER_LINEAR)
        mm = mm * socket(ex, ey, rx, ry, k=1.25, blur=1.5)
        out[..., :3] = out[..., :3] * (1 - mm[..., None]) + moved[..., :3] * mm[..., None]
    return out

def save(rgba, path):
    Image.fromarray((rgba * 255 + 0.5).astype(np.uint8)).save(path, "WEBP", quality=92, method=6)

if __name__ == "__main__":
    import json, os
    os.makedirs("faces", exist_ok=True)
    idle = to512(src)
    save(idle, "faces/idle-face.webp")
    # The blink overlay: the shut lids and their lines only, see-through everywhere else.
    shut = to512(arcs(cover_eyes(src), bend=0.28))
    eyes = np.zeros(src.shape[:2], np.float32)
    for e in EYES:
        eyes = np.maximum(eyes, socket(*e, k=1.45, blur=4.0))
    em = to512(np.dstack([np.ones_like(src[..., :3]), eyes[..., None]]))[..., 3]
    blink = np.dstack([shut[..., :3], shut[..., 3] * em])
    save(blink, "faces/blink-face.webp")
    TILT = {"cheer": -4.0, "think": -6.0, "wait": 5.0, "sleepy": 8.0}
    save(to512(arcs(cover_eyes(src), bend=-0.34, lift=0.18, thick=4.0), TILT["cheer"]), "faces/cheer-face.webp")
    save(to512(look(src, -0.22, -0.3), TILT["think"]), "faces/think-face.webp")
    save(to512(look(src, 0.26, 0.04), TILT["wait"]), "faces/wait-face.webp")
    save(to512(arcs(cover_eyes(src), bend=0.22, lift=-0.1), TILT["sleepy"]), "faces/sleepy-face.webp")
    # the dress-up pieces turn with the head: a turn about the frame's centre, as CSS turns the head layer
    json.dump({k: {"dx": 0, "dy": 0, "rotate": v, "scale": 1} for k, v in TILT.items()}, open("faces/pose.json", "w"), indent=1)
    print("done")
