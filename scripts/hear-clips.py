#!/usr/bin/env python3
"""
Listens to clips with a speech recognizer and prints what it heard, as a
Markdown table, so a generation run can be checked without playing every
file: a letter sound that came out as the letter's name ("bee" instead of
"buh") shows up here. Isolated sounds are hard for a recognizer, so treat a
blank or odd result as "listen to this one", not as a failure.

    pip install faster-whisper
    python3 scripts/hear-clips.py public/audio/sounds public/audio/letters/m.mp3 samples/*/ > heard.md
"""

import sys
from pathlib import Path

try:
    from faster_whisper import WhisperModel
except ImportError:  # pragma: no cover - a plain message beats a traceback
    print("pip install faster-whisper", file=sys.stderr)
    sys.exit(1)


def clips(args: list[str]) -> list[Path]:
    found: list[Path] = []
    for arg in args:
        path = Path(arg)
        if path.is_dir():
            found.extend(sorted(path.rglob("*.mp3")))
        elif path.suffix == ".mp3" and path.exists():
            found.append(path)
    return found


def main() -> int:
    files = clips(sys.argv[1:])
    if not files:
        print("No mp3 files given.", file=sys.stderr)
        return 1
    model = WhisperModel("base.en", device="cpu", compute_type="int8")
    print("| clip | length | heard |")
    print("| --- | --- | --- |")
    for path in files:
        segments, info = model.transcribe(str(path), beam_size=5, language="en", condition_on_previous_text=False)
        text = " ".join(segment.text.strip() for segment in segments).strip() or "(nothing)"
        print(f"| {path.as_posix()} | {info.duration:.1f}s | {text.replace('|', '/')} |")
    return 0


if __name__ == "__main__":
    sys.exit(main())
