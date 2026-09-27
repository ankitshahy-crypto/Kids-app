#!/usr/bin/env python3
"""
Offline voice generator. Makes every "neural" clip in src/data/audioManifest.json
with Kokoro, an open-source voice model (Apache 2.0, free for commercial use),
and writes src/data/audioAvailable.json so the app knows which files exist.

The installed app never runs this and never calls any voice service. It plays
the files this script made; the phone's own voice is only a fallback for a
line that has no file yet.

    pip install kokoro soundfile numpy
    python3 scripts/generate-audio-kokoro.py            # only missing clips
    python3 scripts/generate-audio-kokoro.py --force    # every clip again
    python3 scripts/generate-audio-kokoro.py --voice af_heart --speed 0.9

Kokoro's American female voices: af_heart (default, calm and clear), af_bella,
af_nicole, af_sarah, af_sky. ffmpeg must be on PATH for the MP3 step.
"""

import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "src/data/audioManifest.json"
INDEX = ROOT / "src/data/audioAvailable.json"
AUDIO = ROOT / "public/audio"
SAFE = re.compile(r"^[a-z0-9]+(?:/[a-z0-9-]+)*\.mp3$")

# Letter phrases sound better when the letter is read as its sound-word, not a
# bare character: "b, as in ball" is spoken as "buh, as in ball" by the model.
LETTER_SOUNDS = {
    "a": "ah", "b": "buh", "c": "kuh", "d": "duh", "e": "eh", "f": "ff", "g": "guh", "h": "huh",
    "i": "ih", "j": "juh", "k": "kuh", "l": "ll", "m": "mm", "n": "nn", "o": "aw", "p": "puh",
    "q": "kwuh", "r": "rr", "s": "ss", "t": "tuh", "u": "uh", "v": "vv", "w": "wuh", "x": "ks",
    "y": "yuh", "z": "zz",
}

# --letter-style name reads the letter's name instead: "bee, as in ball".
LETTER_NAMES = {
    "a": "ay", "b": "bee", "c": "see", "d": "dee", "e": "ee", "f": "eff", "g": "jee", "h": "aitch",
    "i": "eye", "j": "jay", "k": "kay", "l": "ell", "m": "em", "n": "en", "o": "oh", "p": "pee",
    "q": "cue", "r": "ar", "s": "ess", "t": "tee", "u": "you", "v": "vee", "w": "double you",
    "x": "ex", "y": "why", "z": "zee",
}

LETTER_STYLE = "sound"


def spoken(kind: str, cue_id: str, say: str) -> str:
    """What the model reads. The manifest line stays the app's own text."""
    if kind == "letters":
        match = re.match(r"^([a-z]), as in (.+)$", say, re.IGNORECASE)
        if match:
            char = match.group(1).lower()
            table = LETTER_NAMES if LETTER_STYLE == "name" else LETTER_SOUNDS
            return f"{table.get(char, char)}, as in {match.group(2)}."
    if kind == "words" and say == "I":
        return "I."
    if kind == "words" and say == "a":
        return "a."
    text = say.strip()
    if text and text[-1] not in ".!?":
        text += "."
    return text


def scan() -> list[str]:
    files = []
    if AUDIO.exists():
        for path in AUDIO.rglob("*.mp3"):
            files.append(path.relative_to(AUDIO).as_posix())
    return sorted(files)


def write_index(files: list[str]) -> None:
    INDEX.write_text(json.dumps({"files": files}, indent=2) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="remake clips that already exist")
    parser.add_argument("--index-only", action="store_true", help="only rewrite audioAvailable.json")
    parser.add_argument("--voice", default="af_heart")
    parser.add_argument("--speed", type=float, default=0.92)
    parser.add_argument("--only", default="", help="comma-separated kinds, e.g. words,letters")
    parser.add_argument("--letter-style", choices=["sound", "name"], default="sound", help="letter phrases say the sound (buh) or the name (bee)")
    args = parser.parse_args()
    global LETTER_STYLE  # noqa: PLW0603
    LETTER_STYLE = args.letter_style

    if args.index_only:
        files = scan()
        write_index(files)
        print(f"Indexed {len(files)} audio files.")
        return 0

    manifest = json.loads(MANIFEST.read_text())
    kinds = [k for k in args.only.split(",") if k] or list(manifest.keys())
    jobs: dict[str, tuple[str, str, str]] = {}
    for kind in kinds:
        for cue_id, cue in manifest[kind].items():
            if cue.get("source") != "neural":
                continue
            if not SAFE.match(cue["file"]):
                raise SystemExit(f"Refusing unsafe audio path {cue['file']!r}")
            # Several ids share one file (a and ae). One clip per file.
            jobs.setdefault(cue["file"], (kind, cue_id, cue["say"]))

    todo = {f: j for f, j in jobs.items() if args.force or not (AUDIO / f).exists()}
    print(f"{len(jobs)} clips in the manifest, {len(todo)} to make with voice {args.voice}.")
    if not todo:
        write_index(scan())
        return 0

    import numpy as np  # noqa: WPS433
    import soundfile as sf  # noqa: WPS433
    from kokoro import KPipeline  # noqa: WPS433

    pipeline = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
    made = 0
    with tempfile.TemporaryDirectory() as tmp:
        for file, (kind, cue_id, say) in todo.items():
            text = spoken(kind, cue_id, say)
            chunks = [audio for _, _, audio in pipeline(text, voice=args.voice, speed=args.speed)]
            if not chunks:
                raise SystemExit(f"No audio for {kind} {cue_id}: {text!r}")
            samples = np.concatenate([np.asarray(c, dtype=np.float32) for c in chunks])
            # Trim silence at the ends and leave a short, even pad.
            loud = np.flatnonzero(np.abs(samples) > 0.01)
            if loud.size:
                samples = samples[max(0, loud[0] - 1200) : min(samples.size, loud[-1] + 3600)]
            peak = float(np.max(np.abs(samples))) or 1.0
            samples = samples * (0.85 / peak)
            wav = Path(tmp) / "clip.wav"
            sf.write(wav, samples, 24000)
            dest = AUDIO / file
            dest.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-ac", "1", "-ar", "24000", "-b:a", "48k", str(dest)],
                check=True,
            )
            made += 1
            print(f"Wrote public/audio/{file}  ({text})")

    files = scan()
    write_index(files)
    print(f"Made {made} clips. Indexed {len(files)} audio files.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
