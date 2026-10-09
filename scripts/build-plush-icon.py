"""The LittleNest app icon from the round-plush dog: the dog from its idle
still, sitting in a simple nest, on the plush green (#5aa85a).

No eggs, no second bird, no gloss, no text: the wordmark stays in the app.
Writes the home-screen icons, the favicon, the website's icon, the iOS icon
set and the splash. (The chick-and-eggs icon these replace was cropped from
the mockups in logos/ by a script that went with it.)

    python3 scripts/build-plush-icon.py
"""

from base64 import b64encode
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
DOG = ROOT / "public/animals/dog/idle-face.webp"
GREEN = (0x5A, 0xA8, 0x5A)
# The nest's twigs: a dark back, a warm body, a lighter front rim, and a few strokes across it.
NEST_BACK = (0x8D, 0x5A, 0x3B)
NEST_BODY = (0xA8, 0x6F, 0x45)
NEST_RIM = (0xC4, 0x8B, 0x58)
TWIG_LIGHT = (0xD7, 0xA8, 0x7A)
TWIG_DARK = (0x7E, 0x4E, 0x30)

SIDE = 1024
SCALE = 2  # drawn at twice the size, then halved: smooth edges on the nest


def ellipse(draw, cx, cy, rx, ry, fill):
    draw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=fill)


def arc_stroke(draw, cx, cy, rx, ry, start, end, fill, width):
    draw.arc([cx - rx, cy - ry, cx + rx, cy + ry], start=start, end=end, fill=fill, width=width)


def bowl_points(cx, rim_y, rx, ry, depth, steps=120):
    """The front of a bowl: along the rim's front edge (the lower half of its ellipse), then back
    along a deeper curve below it."""
    import math

    front = []
    for i in range(steps + 1):
        t = math.pi * i / steps  # 0 at the right end of the rim, pi at the left
        front.append((cx + rx * math.cos(t), rim_y + ry * math.sin(t)))
    outer = []
    for i in range(steps + 1):
        t = math.pi * (steps - i) / steps
        outer.append((cx + rx * 1.02 * math.cos(t), rim_y + (ry + depth) * math.sin(t)))
    return front + outer


def compose(side=SIDE):
    import math

    s = side * SCALE
    icon = Image.new("RGBA", (s, s), GREEN + (255,))
    draw = ImageDraw.Draw(icon)
    cx = s / 2
    # The nest sits low in the square; its rim is wide enough for a round dog to sit in.
    rim_y = s * 0.66
    rx, ry = s * 0.36, s * 0.085
    depth = s * 0.13
    # The back of the nest: the whole rim ellipse, seen behind the dog.
    ellipse(draw, cx, rim_y, rx, ry, NEST_BACK)
    # Twig ends poking out at the back, either side.
    w = max(2, round(s * 0.011))
    for sign in (-1, 1):
        x0 = cx + sign * rx * 0.9
        draw.line([(x0, rim_y - ry * 0.1), (x0 + sign * s * 0.045, rim_y - ry * 0.75)], fill=NEST_BACK, width=w)
        draw.line([(x0 - sign * s * 0.04, rim_y), (x0 + sign * s * 0.02, rim_y - ry * 0.6)], fill=TWIG_LIGHT, width=round(w * 0.7))
    # The dog, scaled so it fills the middle of the square and sits in the nest: its bottom is just
    # under the front edge of the rim.
    dog = Image.open(DOG).convert("RGBA")
    box = dog.getchannel("A").getbbox()
    dog = dog.crop(box)
    target_w = s * 0.62
    ratio = target_w / dog.width
    dog = dog.resize((round(dog.width * ratio), round(dog.height * ratio)), Image.Resampling.LANCZOS)
    dog_x = round(cx - dog.width / 2)
    dog_y = round(rim_y + ry * 1.3 - dog.height)
    icon.alpha_composite(dog, (dog_x, dog_y))
    draw = ImageDraw.Draw(icon)
    # The front of the nest: the bowl under the rim's front edge, over the dog's paws.
    draw.polygon(bowl_points(cx, rim_y, rx, ry, depth), fill=NEST_BODY)
    # Twigs woven across the front: arcs in two browns, offset from the rim.
    for k, (color, inset, width) in enumerate(
        [
            (TWIG_DARK, 0.22, 1.0),
            (TWIG_LIGHT, 0.45, 0.8),
            (TWIG_DARK, 0.68, 0.9),
            (TWIG_LIGHT, 0.88, 0.7),
        ]
    ):
        pts = []
        for i in range(0, 121):
            t = math.pi * i / 120
            pts.append((cx + rx * (1 - 0.04 * inset) * math.cos(t), rim_y + (ry + depth * inset) * math.sin(t)))
        draw.line(pts, fill=color, width=round(w * width), joint="curve")
    # Short crossing twigs for the weave.
    for i in range(-3, 4):
        x = cx + i * rx * 0.28
        y = rim_y + ry * 0.75 + depth * 0.5 * (1 - (i / 3.5) ** 2)
        draw.line([(x - s * 0.03, y - s * 0.035), (x + s * 0.02, y + s * 0.035)], fill=TWIG_LIGHT if i % 2 else TWIG_DARK, width=round(w * 0.75))
    # The front edge of the rim, lighter, so the dog reads as sitting in the nest.
    pts = [(cx + rx * math.cos(math.pi * i / 120), rim_y + ry * math.sin(math.pi * i / 120)) for i in range(121)]
    draw.line(pts, fill=NEST_RIM, width=round(w * 1.6), joint="curve")
    return icon.resize((side, side), Image.Resampling.LANCZOS).convert("RGB")


def save_png(im, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.convert("RGB").save(path, "PNG", optimize=True)


def resize(im, size):
    return im.resize((size, size), Image.Resampling.LANCZOS)


def main():
    icon = compose()
    public = ROOT / "public"
    save_png(resize(icon, 192), public / "icons/icon-192.png")
    save_png(resize(icon, 512), public / "icons/icon-512.png")
    # Maskable: the same picture inside the safe area, the green out to the edge.
    maskable = Image.new("RGB", (512, 512), GREEN)
    inner = resize(icon, 392)
    maskable.paste(inner, ((512 - 392) // 2, (512 - 392) // 2))
    save_png(maskable, public / "icons/icon-maskable-512.png")
    save_png(resize(icon, 180), public / "icons/apple-touch-icon.png")
    save_png(resize(icon, 256), ROOT / "website/assets/app-icon.png")

    buf = BytesIO()
    resize(icon, 64).save(buf, "PNG", optimize=True)
    encoded = b64encode(buf.getvalue()).decode()
    (public / "favicon.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
        f'<image width="64" height="64" href="data:image/png;base64,{encoded}"/></svg>\n'
    )

    sizes = {
        "Icon-20.png": 20,
        "Icon-20@2x.png": 40,
        "Icon-20@3x.png": 60,
        "Icon-29.png": 29,
        "Icon-29@2x.png": 58,
        "Icon-29@3x.png": 87,
        "Icon-40.png": 40,
        "Icon-40@2x.png": 80,
        "Icon-40@3x.png": 120,
        "Icon-60@2x.png": 120,
        "Icon-60@3x.png": 180,
        "Icon-76.png": 76,
        "Icon-76@2x.png": 152,
        "Icon-83.5@2x.png": 167,
        "AppIcon-512@2x.png": 1024,
    }
    iconset = ROOT / "ios/App/App/Assets.xcassets/AppIcon.appiconset"
    for filename, size in sizes.items():
        save_png(resize(icon, size), iconset / filename)

    splash = Image.new("RGB", (2732, 2732), (251, 246, 238))
    art = resize(icon, 1100)
    # Rounded corners on the splash's icon, as the home screen shows it.
    mask = Image.new("L", (1100, 1100), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, 1099, 1099], radius=int(1100 * 0.22), fill=255)
    splash.paste(art, ((2732 - 1100) // 2, (2732 - 1100) // 2), mask)
    splash = splash.quantize(colors=128, method=Image.Quantize.FASTOCTREE)
    splash_dir = ROOT / "ios/App/App/Assets.xcassets/Splash.imageset"
    for name in ("splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"):
        splash.save(splash_dir / name, optimize=True)


if __name__ == "__main__":
    main()
