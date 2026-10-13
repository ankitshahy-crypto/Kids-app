"""The cream bunny's idle loop, built from the cut-out still with code (no video model).
Breathing (1.5% squash/stretch from the feet), a +-1 degree sway, the ears a beat behind, and one blink
with both eyes together near the middle. Everything is a whole number of cycles over the 143 frames,
so frame 143 would be frame 0 again: the loop is seamless."""
import json, math
from pathlib import Path
import cv2, numpy as np
from PIL import Image

FPS, N, OUT = 24, 143, 512
src = np.asarray(Image.open("bare-cut.png").convert("RGBA")).astype(np.float32) / 255.0
H, W = src.shape[:2]
x0, y0, x1, y1 = 186, 216, 1361, 1440
cx, foot = (x0 + x1) / 2, y1
# The two eye beads, found as the two dark blobs of the face (x, y, half-width, half-height), source px.
EYES = [(663.7, 620.3, 36.5, 38.5), (968.2, 599.8, 32.0, 38.5)]
BEAD = np.array([29, 23, 15], np.float32) / 255.0

def smooth(e0, e1, v):
    t = np.clip((v - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
# Where the ears are: the figure's sides beyond the head, from the crown down to the ear tips.
ear = smooth(300, 420, np.abs(xx - cx)) * smooth(230, 330, yy) * (1 - smooth(820, 900, yy))
ear = cv2.GaussianBlur(ear, (0, 0), 25)
# How much a point sways: nothing at the feet, all of it from the shoulders up.
height = smooth(foot, foot - 700, yy)

# The lid's fur, per eye: the colour of the fur ring round that bead (a top-to-bottom gradient, as the
# face is lit), with the grain of real fur from just above it (its fine detail only, not its colour).
# Only the lid uses it: no other fur moves.
_base = cv2.GaussianBlur(src[..., :3], (0, 0), 6.0)
_detail = src[..., :3] - _base


def lid_fur(ex, ey, rx, ry):
    # row by row, the fur just left and just right of the bead, blended across it: its own tone there
    colour = np.zeros_like(src[..., :3])
    y0, y1 = int(ey - 1.6 * ry), int(ey + 1.6 * ry)
    xl0, xl1 = int(ex - 1.75 * rx), int(ex - 1.3 * rx)
    xr0, xr1 = int(ex + 1.3 * rx), int(ex + 1.75 * rx)
    blur = cv2.GaussianBlur(src[..., :3], (0, 0), 4.0)
    left = blur[y0:y1, xl0:xl1].mean(1)
    right = blur[y0:y1, xr0:xr1].mean(1)
    left = cv2.GaussianBlur(left[:, None, :], (0, 0), 6.0)[:, 0]
    right = cv2.GaussianBlur(right[:, None, :], (0, 0), 6.0)[:, 0]
    k = smooth(xl1, xr0, xx[y0:y1, :])[..., None]
    colour[y0:y1] = left[:, None, :] * (1 - k) + right[:, None, :] * k
    grain = cv2.remap(_detail, xx, yy - 2.6 * ry, cv2.INTER_LINEAR)
    return (colour + 1.5 * grain).clip(0, 1)


FURS = [lid_fur(*eye) for eye in EYES]


def lid_layer(cover):
    """Both upper lids at `cover` (0 open, 1 shut), the same for each eye: a fur shape whose curved
    lower edge slides down over the bead and back up. The bead itself is never moved or bent."""
    out = src.copy()
    if cover <= 0:
        return out
    for (ex, ey, rx, ry), FUR in zip(EYES, FURS):
        LX, LY = rx * 1.3, ry * 1.3
        u = ((xx - ex) / LX).clip(-1, 1)
        top = ey - LY
        # the lid's edge: curved like the top of the eye, lower in the middle; at 1 it is past the bead
        edge = top + cover * 2 * LY + 0.22 * LY * (1 - u ** 2)
        # the lid shows only over the bead (and a hair round it): above the bead it is the face's fur
        socket = (((xx - ex) / (rx * 1.28)) ** 2 + ((yy - ey) / (ry * 1.28)) ** 2) <= 1
        socket = cv2.GaussianBlur(socket.astype(np.float32), (0, 0), 3.2)
        lid = socket * (1 - smooth(edge - 1.2, edge + 1.2, yy))
        # a soft shade just under the lid's edge while it moves, so it reads as a lid over the bead
        shade = socket * np.exp(-((yy - edge - 2.5) / 3.0) ** 2) * (1 - smooth(0.8, 1.0, cover)) * 0.25
        m = lid[..., None]
        out[..., :3] = out[..., :3] * (1 - m) + FUR * m
        out[..., :3] *= 1 - shade[..., None]
        # shut: a short, soft, curved line in the bead's own dark brown
        w = (xx - ex) / (rx * 0.95)
        line_y = ey + 0.12 * ry + 0.28 * ry * (1 - w ** 2)
        ends = 1 - smooth(0.7, 1.0, np.abs(w))
        line = np.exp(-((yy - line_y) / 2.6) ** 2) * ends * smooth(0.7, 1.0, cover) * 0.78
        out[..., :3] = out[..., :3] * (1 - line[..., None]) + BEAD * line[..., None]
    return out

# The blink: both eyes, at the middle of the loop; shut for about 150 ms (3-4 frames), eased.
BLINK = {69: 0.25, 70: 0.55, 71: 1.0, 72: 1.0, 73: 0.5, 74: 0.25, 75: 0.08}

S = 0.84 * OUT / (y1 - y0)
ox = OUT / 2 - cx * S
oy = 0.935 * OUT - foot * S

def main():
    heads = []
    Path("frames").mkdir(exist_ok=True)
    for f in range(N):
        t = f / N
        breath = 0.5 - 0.5 * math.cos(2 * math.pi * 2 * t)         # two breaths a loop
        sway = math.radians(1.0) * math.sin(2 * math.pi * t)          # one slow sway a loop
        sway_late = math.radians(1.0) * math.sin(2 * math.pi * (t - 0.06))  # the ears, a beat behind
        sy, sx = 1 + 0.015 * breath, 1 - 0.006 * breath
        theta = sway * height + ear * (1.5 * sway_late - sway) * height
        # output pixel (in source units) -> where it comes from: undo the rotation, then the squash
        dx, dy = xx - cx, yy - foot
        c, s = np.cos(-theta), np.sin(-theta)
        rx, ry = c * dx - s * dy, s * dx + c * dy
        mapx = (rx / sx + cx).astype(np.float32)
        mapy = (ry / sy + foot).astype(np.float32)
        layer = lid_layer(BLINK.get(f, 0.0))
        # premultiplied, so the warp does not pull a light rim in from the transparent outside
        pm = layer.copy(); pm[..., :3] *= pm[..., 3:4]
        warped = cv2.remap(pm, mapx, mapy, cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        # into the 512 frame: area downscale keeps the fur crisp
        M = np.float32([[S, 0, ox], [0, S, oy]])
        small = cv2.warpAffine(cv2.resize(warped, None, fx=S * 2, fy=S * 2, interpolation=cv2.INTER_AREA),
                               np.float32([[0.5, 0, ox], [0, 0.5, oy]]), (OUT, OUT), flags=cv2.INTER_LINEAR)
        small = np.clip(small, 0, 1)
        a = small[..., 3:4]
        rgb = np.where(a > 1e-4, small[..., :3] / np.maximum(a, 1e-4), 0)
        rgba = np.dstack([rgb, a]).clip(0, 1)
        Image.fromarray((rgba * 255 + 0.5).astype(np.uint8)).save(f"frames/f{f:04d}.png")
        al = rgba[..., 3]
        ys, xs = np.where(al > 0.5)
        hy1 = ys.min() + (ys.max() - ys.min()) * 0.8
        heads.append([round(xs.min() / OUT, 4), round(ys.min() / OUT, 4), round((xs.max() - xs.min()) / OUT, 4), round((hy1 - ys.min()) / OUT, 4)])

    json.dump({"fps": FPS, "frames": N, "seconds": round(N / FPS, 3), "loops": True, "head": heads}, open("idle.json", "w"), separators=(", ", ": "))
    print("done")


if __name__ == "__main__":
    main()
