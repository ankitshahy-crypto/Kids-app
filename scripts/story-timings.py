#!/usr/bin/env python3
"""
When each word starts in every recorded story page, so the reader can light
the words up as the narrator reads them.

A speech recognizer (faster-whisper) listens to each clip with word
timestamps. We already know what the clip says, so the recognizer only has
to tell us *when*: its words are matched to the page's words in order, and a
word it missed or misheard gets a time between its neighbours, shared out by
letter count. Nothing is re-recorded, and the app never runs the recognizer.

    pip install faster-whisper
    python3 scripts/story-timings.py                 # every story page clip
    python3 scripts/story-timings.py --only w01-     # clips whose id starts with w01-
    python3 scripts/story-timings.py --self-test     # the matching, without audio
    python3 scripts/story-timings.py --shard 2/8 --out part-2.json   # every 8th clip, from the 3rd
    python3 scripts/story-timings.py --merge part-*.json             # join the parts into the timings file

Writes src/data/storyTimings.json:
    { "version": 1, "lines": { "<clip id>": [start ms of each word..., end ms] } }
One number per word on the page, plus the end of the last word, so the app
knows when to let the highlight go. Titles are not timed; only pages are read
along.
"""

from __future__ import annotations

import json
import re
import sys
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "src/data/audioManifest.json"
OUT = ROOT / "src/data/storyTimings.json"
AUDIO = ROOT / "public/audio"
MODEL = "base.en"

# The same words the reader turns into buttons (storyTokens in src/data/stories.ts).
WORD = re.compile(r"[A-Za-z']+")
PAGE_ID = re.compile(r"-p\d+(?:-[a-z]+)?$")


def words_of(text: str) -> list[str]:
    return WORD.findall(text)


def plain(word: str) -> str:
    return re.sub(r"[^a-z]", "", word.lower())


def align(expected: list[str], heard: list[tuple[str, float, float]], duration: float) -> list[int]:
    """
    Start times in ms for each expected word, plus the end of the last one.

    `heard` is the recognizer's (word, start s, end s) in order. Words that
    match (after lowercasing and dropping marks) take the recognizer's time;
    the rest are placed between the matched words around them, in proportion
    to their letters. The result never goes backwards.
    """
    n = len(expected)
    if n == 0:
        return [0]
    starts: list[float | None] = [None] * n
    ends: list[float | None] = [None] * n
    want = [plain(word) for word in expected]
    got = [plain(word) for word, _, _ in heard]
    for block in SequenceMatcher(a=want, b=got, autojunk=False).get_matching_blocks():
        for k in range(block.size):
            _, start, end = heard[block.b + k]
            starts[block.a + k] = start
            ends[block.a + k] = end

    # A recognizer word can hold two page words ("it's" for "it is"): an
    # unmatched run between two matched words shares that span by letters.
    first_heard = heard[0][1] if heard else 0.0
    last_heard = heard[-1][2] if heard else duration
    lead = min(first_heard, 0.4) if heard else 0.15
    tail = max(last_heard, lead) if heard else max(duration - 0.15, lead)

    index = 0
    while index < n:
        if starts[index] is not None:
            index += 1
            continue
        run_end = index
        while run_end < n and starts[run_end] is None:
            run_end += 1
        # The span the unmatched run can use: from the end of the word before
        # (or the lead-in) to the start of the word after (or the tail).
        left = ends[index - 1] if index > 0 and ends[index - 1] is not None else (starts[index - 1] if index > 0 else lead)
        right = starts[run_end] if run_end < n else tail
        if left is None:
            left = lead
        if right is None or right < left:
            right = left
        weights = [max(1, len(want[k])) + 1 for k in range(index, run_end)]
        total = sum(weights)
        at = left
        for k, weight in zip(range(index, run_end), weights):
            starts[k] = at
            at += (right - left) * weight / total
            ends[k] = at
        index = run_end

    out: list[int] = []
    previous = 0
    for start in starts:
        ms = max(previous, int(round((start or 0.0) * 1000)))
        out.append(ms)
        previous = ms
    last_end = ends[-1] if ends[-1] is not None else tail
    end_ms = max(previous + 120, int(round(max(last_end, tail) * 1000)))
    if duration > 0:
        end_ms = min(end_ms, int(round(duration * 1000)) + 200)
        end_ms = max(end_ms, previous + 120)
    out.append(end_ms)
    return out


def self_test() -> int:
    ok = True

    def check(name: str, got: list[int], want: list[int]) -> None:
        nonlocal ok
        if got != want:
            ok = False
            print(f"FAIL {name}: {got} != {want}")
        else:
            print(f"ok   {name}")

    # Everything heard: the recognizer's times, and the last word's end.
    check(
        "all heard",
        align(["Fox", "has", "a", "hat."], [("Fox", 0.1, 0.4), ("has", 0.45, 0.7), ("a", 0.72, 0.8), ("hat", 0.85, 1.2)], 1.4),
        [100, 450, 720, 850, 1200],
    )
    # A misheard word in the middle sits between its neighbours.
    got = align(["Pig", "can", "tap."], [("Big", 0.1, 0.4), ("can", 0.5, 0.8), ("tap", 0.9, 1.2)], 1.3)
    check("misheard first word keeps a start in the lead-in", got[1:], [500, 900, 1200])
    got = align(["I", "am", "Sam."], [("I", 0.1, 0.2), ("tap", 0.3, 0.55), ("Sam", 0.6, 1.0)], 1.1)
    check("misheard middle word fills the gap", got, [100, 200, 600, 1000])
    # Nothing heard: the whole clip is shared out by letters.
    got = align(["a", "big", "hat"], [], 1.0)
    check("nothing heard still moves forward", [got[0] <= got[1] <= got[2] < got[3]], [True])
    # Never backwards, even when the recognizer is.
    got = align(["up", "up"], [("up", 0.5, 0.7), ("up", 0.4, 0.6)], 1.0)
    check("never backwards", [got[0] <= got[1]], [True])
    check("one number per word plus the end", [len(align(["a", "b", "c"], [], 1.0))], [4])
    return 0 if ok else 1


def duration_of(path: Path) -> float:
    import subprocess

    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True,
        text=True,
    ).stdout.strip()
    try:
        return float(out)
    except ValueError:
        return 0.0


def option(name: str, fallback: str = "") -> str:
    if name not in sys.argv:
        return fallback
    at = sys.argv.index(name)
    return sys.argv[at + 1] if at + 1 < len(sys.argv) else fallback


def merge(paths: list[str]) -> int:
    """Join parts made with --shard into the timings file, keeping clips still in the manifest."""
    stories = json.loads(MANIFEST.read_text()).get("stories", {})
    lines: dict[str, list[int]] = json.loads(OUT.read_text()).get("lines", {}) if OUT.exists() else {}
    for path in paths:
        lines.update(json.loads(Path(path).read_text()).get("lines", {}))
    lines = {key: value for key, value in sorted(lines.items()) if key in stories}
    OUT.write_text(json.dumps({"version": 1, "lines": lines}, separators=(",", ":")) + "\n")
    pages = sum(1 for key in stories if PAGE_ID.search(key))
    print(f"Joined {len(paths)} parts: {len(lines)} of {pages} story pages timed.")
    return 0


def main() -> int:
    if "--self-test" in sys.argv:
        return self_test()
    if "--merge" in sys.argv:
        return merge([arg for arg in sys.argv[sys.argv.index("--merge") + 1 :] if not arg.startswith("--")])
    only = option("--only")
    shard, shards = 0, 1
    if "--shard" in sys.argv:
        shard, shards = (int(part) for part in option("--shard", "0/1").split("/"))
    out = Path(option("--out")) if "--out" in sys.argv else OUT

    from faster_whisper import WhisperModel

    manifest = json.loads(MANIFEST.read_text())
    stories = manifest.get("stories", {})
    existing = json.loads(out.read_text()).get("lines", {}) if out == OUT and out.exists() else {}
    model = WhisperModel(MODEL, device="cpu", compute_type="int8", cpu_threads=2)

    lines: dict[str, list[int]] = dict(existing)
    weak: list[tuple[str, float]] = []
    done = 0
    pages = [key for key in sorted(stories) if PAGE_ID.search(key) and key.startswith(only)]
    for clip_id in pages[shard::shards]:
        cue = stories[clip_id]
        path = AUDIO / cue["file"]
        if not path.exists():
            continue
        expected = words_of(cue["say"])
        segments, _ = model.transcribe(
            str(path),
            language="en",
            word_timestamps=True,
            # One beam: the page's text is already known, the recognizer only has to place it.
            beam_size=1,
            vad_filter=False,
            condition_on_previous_text=False,
            # The page's own words make the recognizer hear them as written.
            initial_prompt=cue["say"],
        )
        heard = [(word.word.strip(), word.start, word.end) for segment in segments for word in (segment.words or [])]
        lines[clip_id] = align(expected, heard, duration_of(path))
        matched = sum(1 for block in SequenceMatcher(a=[plain(w) for w in expected], b=[plain(w) for w, _, _ in heard], autojunk=False).get_matching_blocks() for _ in range(block.size))
        rate = matched / max(1, len(expected))
        if rate < 0.75:
            weak.append((clip_id, rate))
        done += 1
        if done % 50 == 0:
            print(f"timed {done} clips", file=sys.stderr, flush=True)
            # Save as it goes, so a run cut short still keeps what it timed.
            out.write_text(json.dumps({"version": 1, "lines": lines}, separators=(",", ":")) + "\n")

    # Keep only clips that are still in the manifest.
    lines = {key: value for key, value in sorted(lines.items()) if key in stories}
    out.write_text(json.dumps({"version": 1, "lines": lines}, separators=(",", ":")) + "\n")
    print(f"Timed {done} story clips; {len(lines)} in {out}.")
    if weak:
        print(f"{len(weak)} clips where fewer than 3 in 4 words were heard as written (their times are estimated in part):")
        for clip_id, rate in weak[:40]:
            print(f"- {clip_id}: {rate:.0%}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
