#!/usr/bin/env python3
"""
Listens to a clip and says whether it speaks its line.

Why this exists: the first phone test of the pilot found recorded clips that
did not say what the screen said. "up" stopped after "uh", "of" was silence,
"Pop the balloons with this letter" stopped after "Pop", and a letter line
read its slashes aloud ("per meter slash"). The voice model cuts a very short
line off about one time in four, and nothing checked. Now the generator asks
this script about every clip it makes, and makes the clip again when the
answer is no (scripts/generate-audio.mjs --verify). It can also go through
the clips already in public/audio (--audit).

How it listens: a Whisper speech recognizer, run with onnxruntime, so the
same check runs on a laptop and on GitHub. Two questions are asked of a clip:

  1. What does the recognizer write down on its own ("heard")?
  2. How likely does it find the line the clip is meant to say ("score")?

The second matters for one-word clips, where a recognizer cannot choose
between words that sound alike ("see" and "C", "for" and "four", "am" and
"M"). A clip passes when the words match, or when its own line is nearly as
likely as what was written down. It fails when it is silent, cut off while
still loud, or says something else.

    python3 scripts/check-clips.py --fetch                 # download the model once (about 300 MB)
    python3 scripts/check-clips.py --serve                 # {"file": ..., "text": ...} per line in, a verdict per line out
    python3 scripts/check-clips.py --audit --out audit.json [--kinds words,prompts] [--limit 50]
    python3 scripts/check-clips.py file.mp3 "the line"     # one clip

Needs ffmpeg, and python3 with numpy and onnxruntime.
"""

import base64
import difflib
import json
import os
import re
import subprocess
import sys
import tarfile
import urllib.request
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
MODEL_NAME = os.environ.get("CLIP_CHECK_MODEL", "small.en")
MODEL_DIR = Path(os.environ.get("CLIP_CHECK_DIR", ROOT / "scripts" / ".whisper" / f"sherpa-onnx-whisper-{MODEL_NAME}"))
MODEL_URL = f"https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-{MODEL_NAME}.tar.bz2"

SOT, NO_TIMESTAMPS, EOT = 50257, 50362, 50256

# How close a clip's own line must come to what the recognizer wrote down, in
# log-probability per token, to count as "this could well be the line". Set
# from the first test's clips: a whole word the recognizer spelled another way
# sits within about 0.3 of its guess ("for" heard as "or"), and a cut-off one
# falls 0.5 to 3 below it ("jump" without its p heard as "chum", "up" that
# stops at "uh" heard as "thumb").
NEAR = 0.45
# And however close, a line the recognizer finds this unlikely is not being said.
FLOOR = -2.5
# A sentence passes on its words: this share of them, in order.
WORDS_NEEDED = 0.8


# A pronouncing dictionary, to know that "see" and "C" are one sound: a
# recognizer hearing a single word often writes its sound-alike.
DICT_PATH = Path(os.environ.get("CLIP_CHECK_DICT", ROOT / "scripts" / ".whisper" / "cmudict" / "cmudict.dict"))
DICT_REPO = "https://github.com/cmusphinx/cmudict.git"


def fetch() -> None:
    if not (MODEL_DIR / f"{MODEL_NAME}-tokens.txt").exists():
        MODEL_DIR.parent.mkdir(parents=True, exist_ok=True)
        archive = MODEL_DIR.parent / f"{MODEL_NAME}.tar.bz2"
        print(f"Fetching {MODEL_URL}", file=sys.stderr)
        urllib.request.urlretrieve(MODEL_URL, archive)
        with tarfile.open(archive, "r:bz2") as tar:
            tar.extractall(MODEL_DIR.parent)
        archive.unlink()
    if not DICT_PATH.exists():
        DICT_PATH.parent.parent.mkdir(parents=True, exist_ok=True)
        print(f"Fetching {DICT_REPO}", file=sys.stderr)
        subprocess.run(["git", "clone", "-q", "--depth", "1", DICT_REPO, str(DICT_PATH.parent)], check=False)


def load_sounds() -> dict[str, set[str]]:
    """Each word's pronunciations, stress marks dropped. Empty when the dictionary is not there: the check is then stricter, never looser."""
    sounds: dict[str, set[str]] = {}
    if not DICT_PATH.exists():
        return sounds
    for line in open(DICT_PATH, encoding="utf-8", errors="replace"):
        parts = line.split("#")[0].split()
        if len(parts) < 2:
            continue
        word = re.sub(r"\(\d+\)$", "", parts[0])
        sounds.setdefault(word, set()).add(" ".join(re.sub(r"\d", "", phone) for phone in parts[1:]))
    return sounds


SOUNDS: dict[str, set[str]] = {}


def sound_alike(wanted: list[str], heard: list[str]) -> bool:
    """Do the two lines share a pronunciation, word for word run together? "see" and "c"; "yo-yo" and "yoyo"."""
    if not SOUNDS or not wanted or not heard:
        return False

    def ways(words: list[str]) -> set[str]:
        options = {""}
        for word in words:
            spoken = SOUNDS.get(word) or SOUNDS.get(word.replace("'", ""))
            if not spoken:
                return set()
            options = {f"{left} {right}".strip() for left in options for right in spoken}
            if len(options) > 64:
                return set()
        return options

    a, b = ways(wanted), ways(heard[: len(wanted) + 1])
    return bool(a and b and a & b)


class Listener:
    def __init__(self) -> None:
        import onnxruntime as ort

        options = ort.SessionOptions()
        options.intra_op_num_threads = int(os.environ.get("CLIP_CHECK_THREADS", "2"))
        options.inter_op_num_threads = 1
        name = MODEL_NAME
        # The 8-bit model is a third of the size and hears the same things; the full one is used if it is all there is.
        def model(part: str) -> str:
            small = MODEL_DIR / f"{name}-{part}.int8.onnx"
            return str(small if small.exists() else MODEL_DIR / f"{name}-{part}.onnx")

        self.encoder = ort.InferenceSession(model("encoder"), options, providers=["CPUExecutionProvider"])
        self.decoder = ort.InferenceSession(model("decoder"), options, providers=["CPUExecutionProvider"])
        self.tokens: dict[int, bytes] = {}
        for line in open(MODEL_DIR / f"{name}-tokens.txt", encoding="utf-8"):
            text, index = line.split()
            self.tokens[int(index)] = base64.b64decode(text)
        self.ranks = {value: key for key, value in self.tokens.items()}
        cache = next(item for item in self.decoder.get_inputs() if item.name == "in_n_layer_self_k_cache")
        self.cache_shape = [int(size) if isinstance(size, int) else 1 for size in cache.shape]
        self.cache_shape[1] = 1
        mel_input = self.encoder.get_inputs()[0]
        self.n_mels = int(mel_input.shape[1]) if isinstance(mel_input.shape[1], int) else 80
        self.filters = mel_filters(self.n_mels)
        self.window = np.hanning(401)[:-1].astype(np.float32)

    # ---- audio in

    def mel(self, audio: np.ndarray) -> np.ndarray:
        # Two seconds of quiet after the clip: the recognizer was trained on padded audio.
        audio = np.concatenate([audio, np.zeros(16000 * 2, dtype=np.float32)])
        padded = np.pad(audio, 200, mode="reflect")
        count = 1 + (len(padded) - 400) // 160
        index = np.arange(400)[None, :] + 160 * np.arange(count)[:, None]
        spectrum = np.abs(np.fft.rfft(padded[index] * self.window, axis=1)) ** 2
        spectrum = spectrum[:-1]
        mel = np.log10(np.maximum(self.filters @ spectrum.T, 1e-10))
        mel = np.maximum(mel, mel.max() - 8.0)
        return ((mel + 4.0) / 4.0).astype(np.float32)[None]

    def encode(self, audio: np.ndarray):
        return self.encoder.run(None, {"mel": self.mel(audio)})

    # ---- text in

    def bpe(self, text: str) -> list[int]:
        """The recognizer's own tokens for a line (GPT-2 byte pairs: a token's number is its merge rank)."""
        out: list[int] = []
        for piece in re.findall(r" ?[A-Za-z]+(?:'[a-z]+)?| ?[0-9]+| ?[^\sA-Za-z0-9]+|\s+", text):
            parts = [bytes([value]) for value in piece.encode("utf-8")]
            while len(parts) > 1:
                best, at = None, -1
                for i in range(len(parts) - 1):
                    rank = self.ranks.get(parts[i] + parts[i + 1])
                    if rank is not None and (best is None or rank < best):
                        best, at = rank, i
                if best is None:
                    break
                parts = parts[:at] + [parts[at] + parts[at + 1]] + parts[at + 2 :]
            out.extend(self.ranks[part] for part in parts if part in self.ranks)
        return out

    def text_of(self, ids: list[int]) -> str:
        return b"".join(self.tokens.get(i, b"") for i in ids).decode("utf-8", "replace").strip()

    # ---- the two questions

    def _step(self, tokens, cache_k, cache_v, cross_k, cross_v, offset):
        logits, cache_k, cache_v = self.decoder.run(
            None,
            {
                "tokens": tokens,
                "in_n_layer_self_k_cache": cache_k,
                "in_n_layer_self_v_cache": cache_v,
                "n_layer_cross_k": cross_k,
                "n_layer_cross_v": cross_v,
                "offset": np.array([offset], dtype=np.int64),
            },
        )
        return logits, cache_k, cache_v

    def _fresh(self):
        cache = np.zeros(self.cache_shape, dtype=np.float32)
        return cache, np.zeros_like(cache)

    def heard(self, cross, limit: int = 60) -> tuple[str, float]:
        """What the recognizer writes down, and how sure it is (log-probability per token)."""
        cross_k, cross_v = cross
        cache_k, cache_v = self._fresh()
        tokens = np.array([[SOT, NO_TIMESTAMPS]], dtype=np.int64)
        offset, out, total = 0, [], 0.0
        for _ in range(limit):
            logits, cache_k, cache_v = self._step(tokens, cache_k, cache_v, cross_k, cross_v, offset)
            offset += tokens.shape[1]
            row = log_softmax(logits[0, -1][: EOT + 1])
            best = int(row.argmax())
            total += float(row[best])
            if best == EOT:
                break
            out.append(best)
            # A short clip sends the recognizer round in circles ("cat cat cat", "C. C. C."): once is enough.
            unit = repeated(out)
            if unit:
                out = out[:unit]
                break
            tokens = np.array([[best]], dtype=np.int64)
        text = self.text_of(out)
        # How sure it is of what it wrote, measured the same way a line is scored, so the two compare.
        return text, (self.score(cross, f" {text}") if text else -99.0)

    def score(self, cross, text: str) -> float:
        """How likely the recognizer finds this line for this audio: log-probability per token, end included."""
        ids = self.bpe(text)
        if not ids:
            return -99.0
        cross_k, cross_v = cross
        cache_k, cache_v = self._fresh()
        sequence = [SOT, NO_TIMESTAMPS, *ids]
        logits, _, _ = self._step(np.array([sequence], dtype=np.int64), cache_k, cache_v, cross_k, cross_v, 0)
        total = 0.0
        # logits[0, i] predicts the token after sequence[i]; the first line token follows NO_TIMESTAMPS.
        for place, wanted in enumerate([*ids, EOT]):
            row = log_softmax(logits[0, place + 1][: EOT + 1])
            total += float(row[wanted])
        return total / (len(ids) + 1)

    def likely(self, cross, text: str) -> float:
        """The best score over the ways a line may be written down: with or without a capital and a full stop."""
        line = text.strip()
        bare = line.rstrip(".!?")
        forms = {f" {bare}", f" {bare}.", f" {bare[:1].upper()}{bare[1:]}", f" {bare[:1].upper()}{bare[1:]}.", f" {line}"}
        if bare.lower() != bare:
            forms.add(f" {bare.lower()}")
        return max(self.score(cross, form) for form in forms)


def repeated(ids: list[int]) -> int:
    """The length of the unit when the tokens so far are one unit said three times over, else 0."""
    for unit in range(1, 12):
        if len(ids) >= unit * 3 and ids[-unit:] == ids[-2 * unit : -unit] == ids[-3 * unit : -2 * unit] and len(ids) == unit * 3:
            return unit
    return 0


def log_softmax(row: np.ndarray) -> np.ndarray:
    row = row - row.max()
    return row - np.log(np.exp(row).sum())


def mel_filters(n_mels: int, rate: int = 16000, n_fft: int = 400) -> np.ndarray:
    """The mel filter bank Whisper was trained with (Slaney scale)."""
    step = 200.0 / 3
    log_start = 1000.0
    log_start_mel = log_start / step
    log_step = np.log(6.4) / 27.0

    def to_mel(hz):
        hz = np.asarray(hz, dtype=np.float64)
        return np.where(hz >= log_start, log_start_mel + np.log(np.maximum(hz, 1e-10) / log_start) / log_step, hz / step)

    def to_hz(mel):
        mel = np.asarray(mel, dtype=np.float64)
        return np.where(mel >= log_start_mel, log_start * np.exp(log_step * (mel - log_start_mel)), step * mel)

    bins = np.linspace(0, rate / 2, n_fft // 2 + 1)
    points = to_hz(np.linspace(to_mel(0), to_mel(rate / 2), n_mels + 2))
    gaps = np.diff(points)
    ramps = points[:, None] - bins[None, :]
    weights = np.zeros((n_mels, len(bins)))
    for i in range(n_mels):
        weights[i] = np.maximum(0, np.minimum(-ramps[i] / gaps[i], ramps[i + 2] / gaps[i + 1]))
    weights *= (2.0 / (points[2:] - points[:-2]))[:, None]
    return weights.astype(np.float32)


def load(path: str) -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", path, "-f", "f32le", "-ac", "1", "-ar", "16000", "-"], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


NUMBER_WORDS = {
    "zero": "0", "one": "1", "two": "2", "three": "3", "four": "4", "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9",
    "ten": "10", "eleven": "11", "twelve": "12", "thirteen": "13", "fourteen": "14", "fifteen": "15", "sixteen": "16",
    "seventeen": "17", "eighteen": "18", "nineteen": "19", "twenty": "20", "thirty": "30", "forty": "40", "fifty": "50",
}


def words_of(text: str) -> list[str]:
    """A line as plain words: lower case, no punctuation, numbers as digits, repeats of the whole line dropped."""
    text = text.lower().replace("’", "'").replace("o'clock", "oclock")
    words = [NUMBER_WORDS.get(word, word) for word in re.sub(r"[^a-z0-9' ]+", " ", text).split()]
    return words


def digits_of(words: list[str]) -> str:
    """Clock times and money are written down as digits ("one twenty-five" as 125): compare those by their digits."""
    out = ""
    for index, word in enumerate(words):
        if not word.isdigit():
            continue
        # "20" then "5" is 25; "1" then "10" is 110.
        if out and len(word) == 1 and words[index - 1].isdigit() and words[index - 1].endswith("0") and len(words[index - 1]) == 2:
            out = out[:-1] + word
        else:
            out += word
    return out


def same_words(wanted: list[str], heard: list[str]) -> float:
    """The share of the line's words the recognizer wrote down, in order. A line said twice over counts once."""
    if not wanted:
        return 1.0
    heard = heard[: len(wanted) + 3]
    match = difflib.SequenceMatcher(a=wanted, b=heard, autojunk=False)
    return sum(block.size for block in match.get_matching_blocks()) / len(wanted)


def shape(audio: np.ndarray) -> dict:
    """What can be told without a recognizer: is there sound, and does the clip stop while still loud?"""
    step = 160
    count = len(audio) // step
    if count == 0:
        return {"seconds": 0.0, "silent": True, "cut": False}
    level = np.sqrt(np.mean(audio[: count * step].reshape(count, step) ** 2, axis=1))
    db = 20 * np.log10(np.maximum(level, 1e-6))
    peak = float(db.max())
    if peak < -45:
        return {"seconds": round(len(audio) / 16000, 2), "silent": True, "cut": False}
    loud = np.where(db > peak - 40)[0]
    last = int(loud[-1])
    # The last 40 ms of sound, against the loudest moment: a whole word dies away, a cut one stops at full voice.
    tail = float(db[max(0, last - 3) : last + 1].mean()) - peak
    after = (count - 1 - last) * 0.01
    return {"seconds": round(len(audio) / 16000, 2), "silent": False, "cut": bool(tail > -9 and after < 0.05), "tail": round(tail, 1)}


def check(listener: Listener, path: str, text: str) -> dict:
    audio = load(path)
    facts = shape(audio)
    verdict = {"file": path, "text": text, **facts, "heard": "", "ok": False, "why": ""}
    if facts["seconds"] == 0 or facts["silent"]:
        verdict["why"] = "silent"
        return verdict
    cross = listener.encode(audio)
    heard, sure = listener.heard(cross)
    wanted, got = words_of(text), words_of(heard)
    share = same_words(wanted, got)
    verdict.update({"heard": heard, "share": round(share, 2)})
    if facts["cut"]:
        verdict["why"] = "stops while still loud"
        return verdict
    # Times and money: the same digits are the same line, however they were written.
    if digits_of(wanted) and digits_of(wanted) == digits_of(got) and [w for w in wanted if not w.isdigit()] == [w for w in got[: len(wanted) + 2] if not w.isdigit()][: len([w for w in wanted if not w.isdigit()])]:
        verdict["ok"] = True
        return verdict
    short = len(wanted) <= 3
    if short:
        # A short clip is often written down twice over ("C C", "cat cat"): once is what was heard.
        unit = got[: len(wanted)]
        if unit and len(got) % len(unit) == 0 and got == unit * (len(got) // len(unit)):
            got = unit
        # A short line has to be the whole of what was heard: "up" is not "up there".
        if got == wanted:
            verdict["ok"] = True
            return verdict
        if sound_alike(wanted, got):
            # One sound, two spellings: "see" written down as "C", "four" as "for".
            verdict["ok"] = True
            verdict["why"] = "sounds alike"
            return verdict
        line = listener.likely(cross, text)
        verdict.update({"score": round(line, 2), "sure": round(sure, 2)})
        if line >= sure - NEAR and line >= FLOOR:
            verdict["ok"] = True
            verdict["why"] = "as likely as what was heard"
            return verdict
        verdict["why"] = "says something else"
        return verdict
    if share >= WORDS_NEEDED:
        verdict["ok"] = True
        return verdict
    verdict["why"] = "says something else"
    return verdict


def manifest_jobs(kinds: list[str]) -> list[tuple[str, str, str, str]]:
    manifest = json.load(open(ROOT / "src/data/audioManifest.json", encoding="utf-8"))
    seen, jobs = set(), []
    for kind, entries in manifest.items():
        if kinds and kind not in kinds:
            continue
        # A bare letter sound is not a word a recognizer knows; scripts/hear-clips.py listens to those.
        if kind in ("sounds", "letters"):
            continue
        for clip_id, entry in entries.items():
            if entry["file"] in seen:
                continue
            seen.add(entry["file"])
            jobs.append((kind, clip_id, entry["file"], entry["say"]))
    return jobs


def option(name: str, fallback: str = "") -> str:
    if name in sys.argv:
        at = sys.argv.index(name)
        if at + 1 < len(sys.argv):
            return sys.argv[at + 1]
    return fallback


def main() -> int:
    if "--fetch" in sys.argv:
        fetch()
        return 0
    fetch()
    SOUNDS.update(load_sounds())
    listener = Listener()
    if "--serve" in sys.argv:
        print(json.dumps({"ready": True, "model": MODEL_NAME}), flush=True)
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                ask = json.loads(line)
                answer = check(listener, ask["file"], ask["text"])
            except Exception as error:  # noqa: BLE001 - one bad clip must not stop the run
                answer = {"ok": False, "why": f"could not check: {error}", "heard": ""}
            print(json.dumps(answer), flush=True)
        return 0
    if "--audit" in sys.argv:
        kinds = [kind for kind in option("--kinds").split(",") if kind]
        limit = int(option("--limit", "0") or 0)
        part, parts = (int(value) for value in (option("--part", "0/1").split("/")))
        out_path = option("--out", "clip-audit.json")
        jobs = [job for index, job in enumerate(manifest_jobs(kinds)) if index % parts == part]
        if limit:
            jobs = jobs[:limit]
        failed = []
        for index, (kind, clip_id, file, say) in enumerate(jobs):
            path = ROOT / "public/audio" / file
            if not path.exists():
                continue
            verdict = check(listener, str(path), say)
            if not verdict["ok"]:
                failed.append({"kind": kind, "id": clip_id, **{key: value for key, value in verdict.items() if key != "file"}, "file": file})
            if (index + 1) % 100 == 0:
                print(f"{index + 1}/{len(jobs)} checked, {len(failed)} to make again", file=sys.stderr, flush=True)
        json.dump({"model": MODEL_NAME, "checked": len(jobs), "failed": failed}, open(out_path, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
        print(f"{len(jobs)} clips checked, {len(failed)} do not say their line. Written to {out_path}.")
        return 0
    args = [arg for arg in sys.argv[1:] if not arg.startswith("--")]
    if len(args) >= 2:
        print(json.dumps(check(listener, args[0], args[1]), ensure_ascii=False))
        return 0
    print(__doc__)
    return 1


if __name__ == "__main__":
    sys.exit(main())
