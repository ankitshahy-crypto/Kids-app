#!/usr/bin/env python3
"""
Listens to clips and prints what was heard, as a Markdown table, so a
generation run can be checked without playing every file: a letter sound
that came out as the letter's name ("bee" instead of "buh") shows up here.

Two listeners: faster-whisper writes words, and, with --phonemes, a
wav2vec2 phoneme model writes IPA, which tells "s" from "ɛs" (the name of
the letter) when the words are ambiguous. Isolated sounds are hard for
both, so treat a blank or odd result as "listen to this one".

    pip install faster-whisper                       # words
    pip install torch transformers                   # add --phonemes (CPU is fine)
    python3 scripts/hear-clips.py --phonemes public/audio/sounds samples/*/ > heard.md
"""

import subprocess
import sys
from pathlib import Path

PHONEME_MODEL = "bookbot/wav2vec2-ljspeech-gruut"


def clips(args: list[str]) -> list[Path]:
    found: list[Path] = []
    for arg in args:
        path = Path(arg)
        if path.is_dir():
            found.extend(sorted(path.rglob("*.mp3")))
        elif path.suffix == ".mp3" and path.exists():
            found.append(path)
    return found


def samples(path: Path):
    """16 kHz mono float32 samples, decoded by ffmpeg."""
    import numpy as np

    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", "16000", "-f", "f32le", "pipe:1"],
        capture_output=True,
        check=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32)


class Phonemes:
    """IPA from a wav2vec2 CTC model, or None when the model cannot be loaded."""

    def __init__(self) -> None:
        self.ready = False
        try:
            import torch
            from transformers import AutoModelForCTC, AutoProcessor

            self.torch = torch
            self.processor = AutoProcessor.from_pretrained(PHONEME_MODEL)
            self.model = AutoModelForCTC.from_pretrained(PHONEME_MODEL)
            self.model.eval()
            self.ready = True
        except Exception as error:  # noqa: BLE001 - a missing model is reported, not fatal
            print(f"phoneme listener unavailable: {error}", file=sys.stderr)

    def hear(self, path: Path) -> str:
        if not self.ready:
            return ""
        try:
            audio = samples(path)
            inputs = self.processor(audio, sampling_rate=16000, return_tensors="pt", padding=True)
            with self.torch.no_grad():
                logits = self.model(**inputs).logits
            ids = self.torch.argmax(logits, dim=-1)
            return self.processor.batch_decode(ids)[0].strip() or "(nothing)"
        except Exception as error:  # noqa: BLE001
            return f"(error: {error})"


def main() -> int:
    args = [arg for arg in sys.argv[1:] if not arg.startswith("--")]
    want_phonemes = "--phonemes" in sys.argv
    files = clips(args)
    if not files:
        print("No mp3 files given.", file=sys.stderr)
        return 1
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("pip install faster-whisper", file=sys.stderr)
        return 1
    words = WhisperModel("base.en", device="cpu", compute_type="int8")
    phonemes = Phonemes() if want_phonemes else None
    columns = "| clip | length | heard |" if not (phonemes and phonemes.ready) else "| clip | length | heard | sounds (IPA) |"
    print(columns)
    print("| --- | --- | --- |" if not (phonemes and phonemes.ready) else "| --- | --- | --- | --- |")
    for path in files:
        # Samples, not the file: a new release of the recognizer's own file reader (PyAV) broke it.
        segments, info = words.transcribe(samples(path), beam_size=5, language="en", condition_on_previous_text=False)
        text = " ".join(segment.text.strip() for segment in segments).strip() or "(nothing)"
        row = f"| {path.as_posix()} | {info.duration:.1f}s | {text.replace('|', '/')} |"
        if phonemes and phonemes.ready:
            row += f" {phonemes.hear(path).replace('|', '/')} |"
        print(row)
    return 0


if __name__ == "__main__":
    sys.exit(main())
