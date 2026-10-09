"""
Make the paper grain the chrome is drawn on: src/assets/textures/paper-grain.png.

Usage: python3 scripts/paper-grain.py

The tooth of watercolour paper, warm and very faint, as a 256px tile that repeats with no seam
(periodic noise, shaped in the frequency domain: a fine grain of a pixel or two, a tooth of a few
pixels, and a soft unevenness as in a wash). Warm specks where the paper is darker, white ones
where it catches the light, each up to about a tenth of full strength. The CSS draws it at 128px
(two device pixels to one of its own on a 2x screen) over the page, the washes and every surface
(`--grain` in src/index.css). Deterministic: the same picture every run.

Needs: pip install pillow numpy
"""
from pathlib import Path

import numpy as np
from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "src" / "assets" / "textures" / "paper-grain.png"
N = 256
rng = np.random.default_rng(7)


def band(lo: float, hi: float) -> np.ndarray:
    """White noise kept between two spatial frequencies (cycles a pixel), at unit spread."""
    white = rng.standard_normal((N, N))
    f = np.fft.fft2(white)
    fy = np.fft.fftfreq(N)[:, None]
    fx = np.fft.fftfreq(N)[None, :]
    r = np.sqrt(fx * fx + fy * fy)
    out = np.real(np.fft.ifft2(f * ((r >= lo) & (r <= hi))))
    return out / out.std()


fine = band(0.2, 0.5)
tooth = band(0.05, 0.14)
mottle = band(0.012, 0.03)
v = 0.55 * fine + 0.35 * tooth + 0.25 * mottle
v = v / v.std()
dark = np.clip(v - 0.35, 0, None)
light = np.clip(-v - 0.35, 0, None)
# Alpha in steps of two: it packs smaller, and no one sees the steps at a tenth of full strength.
alpha_dark = np.round(dark / dark.max() * 26 / 2) * 2
alpha_light = np.round(light / light.max() * 34 / 2) * 2
use_dark = alpha_dark >= alpha_light
rgba = np.zeros((N, N, 4), dtype=np.uint8)
rgba[..., 0] = np.where(use_dark, 120, 255)
rgba[..., 1] = np.where(use_dark, 92, 255)
rgba[..., 2] = np.where(use_dark, 62, 255)
rgba[..., 3] = np.where(use_dark, alpha_dark, alpha_light).astype(np.uint8)
OUT.parent.mkdir(parents=True, exist_ok=True)
Image.fromarray(rgba, "RGBA").save(OUT, optimize=True)
print(OUT, OUT.stat().st_size, "bytes")
