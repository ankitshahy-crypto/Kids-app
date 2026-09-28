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


def find(x: np.ndarray, mode: str):
    """Sample range of the consonant, or None."""
    a = analyze(x)
    if len(a) == 0:
        return None
    rms, cen, voi = a[:, 0], a[:, 1], a[:, 2]
    loud = rms > max(rms.max() * 0.04, 0.003)
    voiced = (voi > 0.55) & loud
    vowel_runs = [r for r in runs(voiced) if r[1] - r[0] >= 8]  # >= 40 ms of voicing
    if mode == "whole":
        active = runs(loud)
        if not active:
            return None
        return active[0][0] * HOP, min(len(x), active[-1][1] * HOP + WIN)
    if not vowel_runs:
        return None
    if mode == "coda-noise":
        after = np.arange(len(a)) >= vowel_runs[-1][1]
        noise = loud & ~(voi > 0.55) & after & (cen > 2500)
        cand = [r for r in runs(noise) if r[1] - r[0] >= 8]
        if not cand:
            return None
        start, end = max(cand, key=lambda r: r[1] - r[0])
        return start * HOP, min(len(x), end * HOP + WIN)
    if mode == "coda-burst":
        # The vowel is where it is loud; then a closure (quiet), then the k burst and the s hiss.
        strong = rms > rms.max() * 0.3
        vowel_end = int(np.where(strong)[0][-1]) if strong.any() else 0
        quiet = rms < rms.max() * 0.04
        gaps = [r for r in runs(quiet) if r[0] >= vowel_end and r[1] - r[0] >= 6]
        if not gaps:
            return None
        start = gaps[0][1]
        tail = [r for r in runs(loud) if r[0] >= start]
        if not tail:
            return None
        end = tail[-1][1]
        return start * HOP, min(len(x), end * HOP + WIN)
    if mode == "mid":
        # Between two vowels: the dip in loudness between the two loudest voiced stretches.
        if len(vowel_runs) < 2:
            vowel = max(vowel_runs, key=lambda r: rms[r[0] : r[1]].sum())
            vs, ve = vowel
            # One long voiced stretch: the consonant is the quiet valley inside it.
            inner = rms[vs:ve]
            peak = inner.max()
            valley = inner < peak * 0.45
            cand = [r for r in runs(valley) if r[1] - r[0] >= 6 and r[0] > 4 and r[1] < len(inner) - 4]
            if not cand:
                return None
            r = max(cand, key=lambda r: r[1] - r[0])
            return (vs + r[0]) * HOP, min(len(x), (vs + r[1]) * HOP + WIN)
        v1, v2 = sorted(sorted(vowel_runs, key=lambda r: rms[r[0] : r[1]].sum())[-2:])
        left = rms[v1[0] : v1[1]].max()
        right = rms[v2[0] : v2[1]].max()
        between = np.arange(len(a))
        dip = (between >= v1[0]) & (between < v2[1]) & (rms < min(left, right) * 0.45)
        cand = [r for r in runs(dip) if r[1] - r[0] >= 6]
        if not cand:
            return None
        r = max(cand, key=lambda r: r[1] - r[0])
        return r[0] * HOP, min(len(x), r[1] * HOP + WIN)
    if mode == "coda-voiced":
        # The vowel is the loudest voiced stretch; the murmur is the quieter,
        # darker voiced tail after it. Split where the centroid drops.
        vowel = max(vowel_runs, key=lambda r: rms[r[0] : r[1]].sum())
        vs, ve = vowel
        peak_cen = np.median(cen[vs:ve][rms[vs:ve] > rms[vs:ve].max() * 0.5])
        tail = np.arange(len(a)) >= vs
        dark = voiced & tail & (cen < peak_cen * 0.72)
        cand = [r for r in runs(dark) if r[1] - r[0] >= 8 and r[0] >= vs + 8]
        if not cand:
            return None
        start, end = cand[-1]
        return start * HOP, min(len(x), end * HOP + WIN)
    if mode == "onset":
        # The consonant is what sounds before the vowel gets loud.
        vowel = max(vowel_runs, key=lambda r: rms[r[0] : r[1]].sum())
        vs, ve = vowel
        peak = rms[vs:ve].max()
        # Vowel onset: first frame in the vowel run above 55% of its peak.
        onset = vs + int(np.argmax(rms[vs:ve] > peak * 0.55))
        first = int(np.argmax(loud)) if loud.any() else 0
        if onset - first < 8:
            return None
        return first * HOP, onset * HOP
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
        print(f"{args.src}: no {args.mode} sound found", file=sys.stderr)
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
