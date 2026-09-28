#!/usr/bin/env python3
"""
Cuts a bare letter sound out of a carrier syllable and sustains it.

Google's voices cannot say a consonant on its own: a pronunciation without
a vowel is rejected, and text such as "sss" is read as letter names. They
can say "ahs", "un" or "vuh", though. This script finds the consonant in
such a carrier (WAV in, 24 kHz mono), keeps just that part, loops it to a
steady length, fades the edges, and writes a WAV.

    python3 scripts/carve-sound.py in.wav out.wav --mode coda-noise   # s, f: hiss after the vowel
    python3 scripts/carve-sound.py in.wav out.wav --mode coda-burst   # x: the k burst and hiss after the vowel
    python3 scripts/carve-sound.py in.wav out.wav --mode coda-voiced  # n, l, m: the murmur after the vowel
    python3 scripts/carve-sound.py in.wav out.wav --mode onset        # v, z, r, l: the consonant before the vowel
    python3 scripts/carve-sound.py in.wav out.wav --mode mid          # v, z, n, l, r: the consonant between two vowels
    python3 scripts/carve-sound.py in.wav out.wav --mode whole        # mmm: trim only
    options: --length 0.35 (seconds), --gain-peak 0.35 (peak after normalizing), --report

Needs numpy. Exit code 2 means the consonant could not be found; the caller
should keep the whole carrier or fall back to another spelling.
"""

import argparse
import sys
import wave

import numpy as np

SR = 24000
WIN = int(SR * 0.025)
HOP = int(SR * 0.005)


def read(path: str) -> np.ndarray:
    with wave.open(path) as w:
        if w.getframerate() != SR or w.getnchannels() != 1:
            raise SystemExit(f"{path}: expected {SR} Hz mono WAV")
        raw = w.readframes(w.getnframes())
        width = w.getsampwidth()
    if width == 2:
        return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768
    if width == 4:
        return np.frombuffer(raw, dtype=np.int32).astype(np.float32) / 2147483648
    raise SystemExit(f"{path}: unsupported sample width {width}")


def write(path: str, x: np.ndarray) -> None:
    pcm = np.clip(x, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((pcm * 32767).astype(np.int16).tobytes())


def analyze(x: np.ndarray):
    """Per 5 ms frame: rms, spectral centroid, voicing (autocorrelation peak in 80-400 Hz)."""
    freqs = np.fft.rfftfreq(WIN, 1 / SR)
    window = np.hanning(WIN)
    rows = []
    lo, hi = int(SR / 400), int(SR / 80)
    for i in range(0, max(0, len(x) - WIN), HOP):
        fr = x[i : i + WIN]
        rms = float(np.sqrt(np.mean(fr**2)))
        if rms < 1e-4:
            rows.append((rms, 0.0, 0.0))
            continue
        spec = np.abs(np.fft.rfft(fr * window))
        centroid = float((spec * freqs).sum() / (spec.sum() + 1e-9))
        ac = np.correlate(fr, fr, "full")[WIN - 1 :]
        ac = ac / (ac[0] + 1e-9)
        voicing = float(ac[lo:hi].max())
        rows.append((rms, centroid, voicing))
    return np.array(rows) if rows else np.zeros((0, 3))


def runs(mask: np.ndarray):
    """Contiguous True runs as (start, end) frame indexes."""
    out = []
    start = None
    for i, v in enumerate(mask):
        if v and start is None:
            start = i
        if not v and start is not None:
            out.append((start, i))
            start = None
    if start is not None:
        out.append((start, len(mask)))
    return out


def closed(mask: np.ndarray, gap: int = 3) -> np.ndarray:
    """The mask with short gaps (up to `gap` frames) filled in."""
    out = mask.copy()
    for a, b in runs(~mask):
        if b - a <= gap and a > 0 and b < len(mask):
            out[a:b] = True
    return out


def longest(mask: np.ndarray, least: int):
    cand = [r for r in runs(mask) if r[1] - r[0] >= least]
    return max(cand, key=lambda r: r[1] - r[0]) if cand else None


def find(x: np.ndarray, mode: str):
    """Sample range of the consonant, or None."""
    a = analyze(x)
    if len(a) == 0:
        return None
    rms, cen, voi = a[:, 0], a[:, 1], a[:, 2]
    top = rms.max()
    idx = np.arange(len(a))
    loud = rms > max(top * 0.04, 0.003)
    voiced = (voi > 0.55) & (rms > top * 0.02)
    strong = rms > top * 0.3
    if mode == "whole":
        active = runs(loud)
        if not active:
            return None
        return active[0][0] * HOP, min(len(x), active[-1][1] * HOP + WIN)
    loud_vowel = strong & (voi > 0.5)
    if not loud_vowel.any():
        return None
    if mode == "coda-noise":
        # After the vowel (its last loud voiced frame), the hiss: high centroid, any level above the floor.
        vowel_end = int(np.where(loud_vowel)[0][-1])
        hiss = (idx > vowel_end) & (cen > 2500) & (rms > max(top * 0.003, 0.0015))
        r = longest(closed(hiss), 8)
        if r is None:
            return None
        return r[0] * HOP, min(len(x), r[1] * HOP + WIN)
    if mode == "coda-burst":
        # Vowel, then a closure (quiet), then the k burst and the s hiss.
        vowel_end = int(np.where(loud_vowel)[0][-1])
        quiet = rms < top * 0.04
        gaps = [r for r in runs(quiet) if r[0] >= vowel_end and r[1] - r[0] >= 6]
        if not gaps:
            return None
        start = gaps[0][1]
        tail = [r for r in runs(closed(loud, 4)) if r[1] > start]
        if not tail:
            return None
        return max(start, tail[0][0]) * HOP, min(len(x), tail[-1][1] * HOP + WIN)
    if mode == "coda-voiced":
        # The vowel is the loud voiced stretch; the murmur is the quieter, darker
        # voiced tail after it. Split where the centroid drops well below the vowel's.
        vowel = longest(closed(voiced & strong), 6)
        if vowel is None:
            return None
        vs, ve = vowel
        vowel_cen = float(np.median(cen[vs:ve]))
        dark = (idx >= ve - 2) & voiced & (cen < vowel_cen * 0.72)
        r = longest(closed(dark), 8)
        if r is None:
            return None
        return max(r[0], ve - 2) * HOP, min(len(x), r[1] * HOP + WIN)
    if mode == "onset":
        # The consonant is what sounds before the vowel gets loud.
        first = int(np.argmax(loud))
        onset = int(np.argmax(strong))
        if onset - first < 8:
            return None
        return first * HOP, onset * HOP
    if mode == "mid":
        # Between two vowels: the quiet valley between the two loudest stretches.
        peaks = runs(closed(strong, 2))
        if len(peaks) >= 2:
            left, right = sorted(sorted(peaks, key=lambda r: rms[r[0] : r[1]].sum())[-2:])
            valley = (idx >= left[1]) & (idx < right[0]) & (rms > top * 0.02)
            r = longest(closed(valley), 6)
            if r is None:
                # No sound between them: take the middle 70% of the dip anyway.
                span = right[0] - left[1]
                if span < 6:
                    return None
                r = (left[1] + span * 15 // 100, right[0] - span * 15 // 100)
            return r[0] * HOP, min(len(x), r[1] * HOP + WIN)
        # One long loud stretch: the consonant is the quietest valley inside it.
        vs, ve = peaks[0]
        inner = rms[vs:ve]
        valley = inner < inner.max() * 0.45
        r = longest(valley, 6)
        if r is None or r[0] < 4 or r[1] > len(inner) - 4:
            return None
        return (vs + r[0]) * HOP, min(len(x), (vs + r[1]) * HOP + WIN)
    raise SystemExit(f"unknown mode {mode}")


def period(x: np.ndarray) -> int:
    """Pitch period in samples for a voiced stretch, or 0."""
    seg = x[: min(len(x), int(SR * 0.06))]
    if len(seg) < int(SR / 80) * 2:
        return 0
    ac = np.correlate(seg, seg, "full")[len(seg) - 1 :]
    ac = ac / (ac[0] + 1e-9)
    lo, hi = int(SR / 400), int(SR / 80)
    k = lo + int(np.argmax(ac[lo:hi]))
    return k if ac[k] > 0.4 else 0


def sustain(seg: np.ndarray, length: int, voiced: bool) -> np.ndarray:
    """Loop the steady middle of a short sound out to `length` samples with crossfades."""
    if len(seg) >= length:
        return seg[:length]
    # Loop body: the middle 60%, cut to whole pitch periods when voiced.
    lo, hi = int(len(seg) * 0.2), int(len(seg) * 0.8)
    body = seg[lo:hi]
    p = period(body) if voiced else 0
    if p and len(body) >= 2 * p:
        body = body[: (len(body) // p) * p]
    fade = min(int(SR * 0.012), len(body) // 4)
    if fade < 8:
        return np.resize(seg, length)
    out = list(seg[:hi])
    ramp = np.linspace(0, 1, fade)
    while len(out) < length + len(body):
        tail = np.array(out[-fade:])
        head = body[:fade]
        out[-fade:] = list(tail * (1 - ramp) + head * ramp)
        out.extend(body[fade:])
    out = np.array(out[:length])
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dest")
    ap.add_argument("--mode", default="whole", choices=["coda-noise", "coda-burst", "coda-voiced", "onset", "mid", "whole"])
    ap.add_argument("--length", type=float, default=0.35, help="target length in seconds (not applied to coda-burst or whole)")
    ap.add_argument("--gain-peak", type=float, default=0.35)
    ap.add_argument("--report", action="store_true")
    args = ap.parse_args()

    x = read(args.src)
    found = find(x, args.mode)
    if found is None:
        a = analyze(x)
        shape = "".join("V" if v > 0.55 and r > 0.01 else "S" if c > 2500 and r > 0.003 else "x" if r > 0.003 else "." for r, c, v in a[::4])
        print(f"{args.src}: no {args.mode} sound found in {len(x) / SR:.2f}s ({shape})", file=sys.stderr)
        return 2
    start, end = found
    seg = x[start:end].astype(np.float32)
    a = analyze(seg)
    voiced = bool(len(a) and np.median(a[:, 2]) > 0.55)
    if args.mode not in ("coda-burst", "whole"):
        seg = sustain(seg, int(SR * args.length), voiced)
    # Edges: 15 ms in, 40 ms out, then a fixed peak so every sound sits at one level.
    fi, fo = min(int(SR * 0.015), len(seg) // 3), min(int(SR * 0.04), len(seg) // 3)
    seg[:fi] *= np.linspace(0, 1, fi)
    seg[-fo:] *= np.linspace(1, 0, fo)
    peak = float(np.abs(seg).max()) or 1.0
    seg = seg * (args.gain_peak / peak)
    lead = np.zeros(int(SR * 0.03), dtype=np.float32)
    write(args.dest, np.concatenate([lead, seg, np.zeros(int(SR * 0.08), dtype=np.float32)]))
    if args.report:
        print(f"{args.src}: {args.mode} {start / SR:.3f}-{end / SR:.3f}s ({(end - start) / SR:.3f}s, {'voiced' if voiced else 'unvoiced'}) -> {len(seg) / SR:.2f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
