"""
Make a scene's near layer from its own painting: public/backdrops/<kind>-front.webp.

Usage: python3 scripts/backdrop-front.py <kind> [seed]

A painting is one flat sheet: the hills, the meadow and the clover at the front all move
together when it drifts. A near layer gives it depth. The clumps of clover and the small
flowers are cut from the painting's own foreground (where they are darker or brighter than
the meadow round them), drawn larger, as things nearer the eye are, and set along the bottom
edge. In the app the layer lies over the scene's bottom edge, in front of the animal, and
drifts a little further than the painting does as it moves (parallax). It never takes a tap.

Everything in it is the painting's own brushwork, so it is in the painting's style. The cut is
soft (its edge follows the paint, feathered by a pixel or two).

Needs: pip install pillow numpy scipy
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
BACKDROPS = ROOT / "public" / "backdrops"
MANIFEST = ROOT / "src" / "data" / "backdropArt.json"

# kind: where the foreground is in the painting (a share of its height, from the top), how much
# larger the near things are drawn, and how many clumps go along the edge.
SCENES = {
    "field": {"band": (0.62, 1.0), "scale": (1.9, 2.6), "clumps": 9},
}

WIDTH, HEIGHT = 1500, 260


def clumps(painting: np.ndarray, top: int) -> list[tuple[np.ndarray, np.ndarray]]:
    """Clover and flowers in the painting's foreground: (colour, alpha), each cut to its box."""
    region = painting[top:].astype(np.float32)
    # The meadow round each pixel: a wide median, so the clover's own colour does not count.
    meadow = np.stack([ndimage.median_filter(region[..., c], size=41) for c in range(3)], axis=-1)
    diff = region - meadow
    # Clover is darker and greener than the meadow; a flower is brighter (white or pink).
    darker = np.clip(-diff.mean(axis=-1), 0, None)
    brighter = np.clip(diff.mean(axis=-1), 0, None)
    strength = np.maximum(darker * 1.0, brighter * 1.2)
    alpha = np.clip((strength - 9) / 16, 0, 1)
    alpha = ndimage.gaussian_filter(alpha, 0.8)
    found, count = ndimage.label(ndimage.binary_dilation(alpha > 0.25, iterations=6))
    pieces = []
    for index, box in enumerate(ndimage.find_objects(found), start=1):
        h = box[0].stop - box[0].start
        w = box[1].stop - box[1].start
        if h < 22 or w < 22 or h > 220 or w > 260:
            continue
        mask = (found[box] == index).astype(np.float32) * alpha[box]
        if mask.sum() < 260:
            continue
        pieces.append((region[box], mask))
    # The biggest first: they read best when drawn large.
    pieces.sort(key=lambda piece: -piece[1].sum())
    return pieces


def main(kind: str, seed: int) -> None:
    spec = SCENES[kind]
    painting = np.asarray(Image.open(BACKDROPS / f"{kind}.webp").convert("RGB"))
    top = int(painting.shape[0] * spec["band"][0])
    pieces = clumps(painting, top)[:24]
    if not pieces:
        sys.exit(f"No clumps found in {kind}")
    rng = np.random.default_rng(seed)
    layer = np.zeros((HEIGHT, WIDTH, 4), dtype=np.float32)
    # Evenly along the edge, each a little off its place, so they never line up.
    slots = np.linspace(0.04, 0.96, spec["clumps"]) + rng.uniform(-0.03, 0.03, spec["clumps"])
    for at, x in enumerate(slots):
        colour, alpha = pieces[at % len(pieces)]
        scale = rng.uniform(*spec["scale"])
        h, w = alpha.shape
        size = (max(1, int(w * scale)), max(1, int(h * scale)))
        big = np.asarray(Image.fromarray(colour.astype(np.uint8)).resize(size, Image.LANCZOS)).astype(np.float32)
        a = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).resize(size, Image.LANCZOS)).astype(np.float32) / 255
        if rng.random() < 0.5:
            big, a = big[:, ::-1], a[:, ::-1]
        # Nearer, so a touch deeper in colour.
        big = big * 0.94
        left = int(x * WIDTH - size[0] / 2)
        # Its foot below the edge: a clump is cut by the frame, as near things are.
        bottom = HEIGHT + int(size[1] * rng.uniform(0.18, 0.34))
        y0 = bottom - size[1]
        for row in range(size[1]):
            y = y0 + row
            if y < 0 or y >= HEIGHT:
                continue
            x0 = max(0, left)
            x1 = min(WIDTH, left + size[0])
            if x1 <= x0:
                continue
            src = slice(x0 - left, x1 - left)
            over = a[row, src][:, None]
            under = layer[y, x0:x1, 3:4]
            out_a = over + under * (1 - over)
            layer[y, x0:x1, :3] = np.where(out_a > 0, (big[row, src] * over + layer[y, x0:x1, :3] * under * (1 - over)) / np.maximum(out_a, 1e-6), 0)
            layer[y, x0:x1, 3:4] = out_a
    out = Image.fromarray(np.clip(np.dstack([layer[..., :3], layer[..., 3:] * 255]), 0, 255).astype(np.uint8), "RGBA")
    path = BACKDROPS / f"{kind}-front.webp"
    out.save(path, "WEBP", quality=82, method=6)
    manifest = json.loads(MANIFEST.read_text())
    manifest[kind]["front"] = True
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"{path.relative_to(ROOT)}: {len(pieces)} clumps found, {spec['clumps']} placed")


if __name__ == "__main__":
    main(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 3)
