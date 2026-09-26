"""Build LittleNest app and module icons.

The app icon is the square master in logos/app-icon-1024.png (drawn from
logos/app-icon.svg). It is already opaque and full-bleed. iOS rounds the
corners itself, so this script must not add a rounded mask.

Words, Numbers, and Colors stay text-free. Their wide frames in logos/ are
cropped to the inner mark. The Words inner field is recolored from mint to
pastel pink.
"""

from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
MODULE_SOURCES = {
    "words": ROOT / "logos/words.png",
    "numbers": ROOT / "logos/numbers.png",
    "colors": ROOT / "logos/colors.png",
}
APP_ICON = ROOT / "logos/app-icon-1024.png"
APP_ICON_SVG = ROOT / "logos/app-icon.svg"
# Soft pink field. The maskable icon is inset on this color so a circular
# home-screen mask does not clip the LittleNest wordmark.
FIELD = (247, 213, 227)
# Pastel pink for the Words tile. The approved frame was already this pink;
# only the inner square was still mint.
PINK = (253, 216, 222)


def manh(a, b):
    return abs(int(a[0]) - int(b[0])) + abs(int(a[1]) - int(b[1])) + abs(int(a[2]) - int(b[2]))


def crop_square(im):
    rgb = im.convert("RGB")
    w, h = rgb.size
    px = rgb.load()
    page = px[12, 12]

    def is_page(c, tol=30):
        return manh(c, page) < tol

    top = next(y for y in range(h) if not is_page(px[w // 2, y], 20))
    lefts, rights = [], []
    for y in range(top + 140, min(h - 2, top + 460)):
        row = [x for x in range(w) if not is_page(px[x, y])]
        if len(row) < 200:
            continue
        lefts.append(row[0])
        rights.append(row[-1])
    lefts.sort()
    rights.sort()
    left = lefts[len(lefts) // 12]
    right = rights[-1 - len(rights) // 12]
    side = right - left + 1
    radius = int(side * 0.22)
    for y in range(top, top + side // 2):
        row = [x for x in range(w) if not is_page(px[x, y])]
        if row and row[0] <= left + 5:
            radius = max(12, y - top)
            break
    src = rgb.crop((left, top, left + side, top + side))
    samples = []
    sw, sh = src.size
    sp = src.load()
    for y in range(int(sh * 0.055), int(sh * 0.10)):
        for x in range(int(sw * 0.40), int(sw * 0.60)):
            r, g, b = sp[x, y]
            if min(r, g, b) > 160 and max(r, g, b) - min(r, g, b) < 100:
                samples.append((r, g, b))
    samples.sort()
    fill = samples[len(samples) // 2]
    base = Image.new("RGB", (side, side), fill)
    mask = Image.new("L", (side, side), 0)
    ImageDraw.Draw(mask).rounded_rectangle([1, 1, side - 2, side - 2], radius=max(12, radius - 4), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(0.55))
    return Image.composite(src, base, mask)


def recolor_words(im, target):
    """Paint the connected mint field pink, then the thin green fringe around it."""
    im = im.copy()
    px = im.load()
    w, h = im.size
    seed = px[int(w * 0.12), int(h * 0.20)]

    def is_bg(c):
        if manh(c, seed) > 46:
            return False
        r, g, b = (int(c[0]), int(c[1]), int(c[2]))
        if r > int(seed[0]) + 14 and r + 4 >= g:
            return False
        if b < int(seed[2]) - 30 and r > 200:
            return False
        return True

    visited = bytearray(w * h)
    queue = deque()
    for y in range(int(h * 0.05), int(h * 0.95), 5):
        for x in range(int(w * 0.05), int(w * 0.95), 5):
            if is_bg(px[x, y]):
                queue.append((x, y))
    while queue:
        x, y = queue.popleft()
        i = y * w + x
        if visited[i]:
            continue
        visited[i] = 1
        if not is_bg(px[x, y]):
            continue
        px[x, y] = target
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny * w + nx]:
                queue.append((nx, ny))

    def is_halo(c):
        r, g, b = (int(c[0]), int(c[1]), int(c[2]))
        if min(r, g, b) < 170 or r > g + 6:
            return False
        if b + 40 < g and r > 220:
            return False
        return g + 6 >= r and g + 10 >= b

    pink = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            if px[x, y] == target:
                pink[y * w + x] = 1
    for _ in range(4):
        grow = []
        for y in range(1, h - 1):
            for x in range(1, w - 1):
                i = y * w + x
                if pink[i]:
                    continue
                if (pink[i - 1] or pink[i + 1] or pink[i - w] or pink[i + w]) and is_halo(px[x, y]):
                    grow.append((x, y))
        if not grow:
            break
        for x, y in grow:
            px[x, y] = target
            pink[y * w + x] = 1
    return im


def save_png(im, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.convert("RGB").save(path, "PNG", optimize=True)


def resize(im, size):
    return im.resize((size, size), Image.Resampling.LANCZOS)


def load_app_icon():
    icon = Image.open(APP_ICON).convert("RGB")
    if icon.size != (1024, 1024):
        raise SystemExit(f"{APP_ICON.name} must be 1024x1024, got {icon.size}")
    return icon


def maskable_icon(master, size=512, scale=0.72):
    """Inset the whole mark so the wordmark stays inside a circular mask."""
    inner = int(round(size * scale))
    canvas = Image.new("RGB", (size, size), FIELD)
    canvas.paste(resize(master, inner), ((size - inner) // 2, (size - inner) // 2))
    return canvas


def main():
    icons = {}
    for name, path in MODULE_SOURCES.items():
        icon = crop_square(Image.open(path))
        if name == "words":
            icon = recolor_words(icon, PINK)
        icons[name] = icon

    main_icon = load_app_icon()
    public = ROOT / "public"
    save_png(resize(main_icon, 192), public / "icons/icon-192.png")
    save_png(resize(main_icon, 512), public / "icons/icon-512.png")
    save_png(maskable_icon(main_icon), public / "icons/icon-maskable-512.png")
    save_png(resize(main_icon, 180), public / "icons/apple-touch-icon.png")
    for name in ("words", "numbers", "colors"):
        save_png(resize(icons[name], 512), public / f"icons/module-{name}.png")

    (public / "favicon.svg").write_text(APP_ICON_SVG.read_text())

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
        save_png(resize(main_icon, size), iconset / filename)

    splash = Image.new("RGB", (2732, 2732), (251, 246, 238))
    art = resize(main_icon, 1100)
    splash.paste(art, ((2732 - 1100) // 2, (2732 - 1100) // 2))
    # A flat cream field plus one icon quantizes cleanly and stays small.
    splash = splash.quantize(colors=128, method=Image.Quantize.FASTOCTREE)
    splash_dir = ROOT / "ios/App/App/Assets.xcassets/Splash.imageset"
    for name in ("splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"):
        splash.save(splash_dir / name, optimize=True)


if __name__ == "__main__":
    main()
