#!/usr/bin/env python3
"""Put the chosen Jessa phonemes together with Jessa's 'as in X', letter names and pair lines."""
import json, os, re, subprocess, sys, numpy as np
sys.argv = [sys.argv[0], "a"]  # import helpers from make.py without running it
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "takes.py")).read().split("arg = sys.argv")[0]
exec(src)
B = f"{OUT}/build"; CACHE = f"{B}/tts"; os.makedirs(CACHE, exist_ok=True)
man = json.load(open(f"{REPO}/src/data/audioManifest.json"))
SAME = {"ck": "c", "ay": "ai", "a-e": "ai", "i-e": "igh", "o-e": "oa", "ir": "er", "ea": "ee"}
def say(text, prev=None, nxt=None):
    key = re.sub(r"[^a-z0-9]+", "-", f"{prev or ''}_{text}_{nxt or ''}".lower())[:90]
    p = f"{CACHE}/{key}.wav"
    if os.path.exists(p): return read(p)
    extra = {"seed": 4220}
    if prev: extra["previous_text"] = prev
    if nxt: extra["next_text"] = nxt
    x = trim(tts(text, "eleven_multilingual_v2", extra)); wav(p, x); return x
def phon(k): return read(f"{OUT}/{SAME.get(k, k)}.mp3")
gap = lambda s: np.zeros(int(s * 24000), np.float32)
def save(rel, x):
    x = level(x); os.makedirs(os.path.dirname(f"{B}/{rel}"), exist_ok=True); wav("/tmp/b.wav", np.concatenate([gap(0.08), x, gap(0.12)]))
    subprocess.run(["ffmpeg", "-y", "-v", "quiet", "-i", "/tmp/b.wav", "-ar", "24000", "-ac", "1", "-b:a", "64k", f"{B}/{rel}"], check=True)
done = set()
for kind in ["sounds", "letters"]:
    for k, cue in man[kind].items():
        if cue["file"] in done: continue
        done.add(cue["file"]); key = cue["file"].split("/")[1][:-4]
        if kind == "sounds": save(cue["file"], phon(key)); continue
        word = cue["say"].split("as in ")[1]
        save(cue["file"], np.concatenate([phon(key), gap(0.35), say(f"as in {word}.", prev=f"{key},")]))
for k, cue in man["spell"].items():
    save(cue["file"], say(f"{cue['say']}.", prev="The letter"))
for k, cue in man["prompts"].items():
    if not k.startswith("pair-"): continue
    m = re.match(r"(Big \w and little \w both say) (\S+), as in (.+)$", cue["say"]); assert m, cue
    lead, key, word = m.groups()
    save(cue["file"], np.concatenate([say(lead, nxt=f"{key}, as in {word}"), gap(0.15), phon(key), gap(0.3), say(f"as in {word}.", prev=f"{key},")]))
print("built", len(done) + len(man["spell"]) + 26)
