#!/usr/bin/env python3
"""Phoneme audition for Jessa: several takes per sound, scored objectively, best kept."""
import json, os, subprocess, sys, urllib.request, numpy as np, shutil
OUT = os.environ.get("PHONEME_DIR", "phoneme-takes"); REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
KEY = os.environ["ELEVENLABS_API_KEY"]; VOICE = "yj30vwTGJxSHezdAGsv9"
SET = {"stability": 0.6, "similarity_boost": 0.75, "style": 0.1, "use_speaker_boost": True, "speed": 0.8}
CONT_V = list("mnlrvz") + ["ng"]; CONT_U = ["s", "f", "sh", "th"]; VOWELS = list("aeiou") + ["ee", "oo", "ai", "oa", "igh", "u-e", "ar", "or", "er", "ou", "oi"]
TEXT = {
 "m": ["mmmm.", "Mmmmmm..."], "n": ["nnnn.", "Nnnnnn..."], "l": ["llll.", "Lllll..."], "r": ["rrrr.", "Rrrrr..."],
 "v": ["vvvv.", "Vvvvv..."], "z": ["zzzz.", "Zzzzz..."], "s": ["ssss.", "Sssss..."], "f": ["ffff.", "Fffff..."],
 "a": ["ah... as in apple", "aa."], "e": ["eh.", "eh... as in egg"], "i": ["ih.", "ih... as in igloo"], "o": ["aw.", "ah... as in octopus"], "u": ["uh.", "uh... as in up"],
 "b": ["buh."], "c": ["kuh."], "d": ["duh."], "g": ["guh."], "h": ["huh."], "j": ["juh."], "k": ["kuh."], "p": ["puh."], "q": ["kwuh."],
 "sh": ["shhhh.", "Shhhhh..."], "th": ["thhhh.", "Thhhh..."], "ng": ["nggg.", "ngngng."], "ch": ["chuh."], "wh": ["wuh."],
 "ee": ["ee.", "eee... as in bee"], "oo": ["oo.", "ooo... as in moon"], "ai": ["ay.", "ay... as in rain"], "oa": ["oh.", "oh... as in boat"],
 "igh": ["eye.", "eye... as in light"], "u-e": ["you.", "yoo... as in cube"], "ar": ["ar.", "arr... as in star"], "or": ["or.", "orr... as in fork"],
 "er": ["er.", "err... as in fern"], "ou": ["ow.", "ow... as in cloud"], "oi": ["oy.", "oy... as in coin"],
 "t": ["tuh."], "w": ["wuh."], "x": ["ks."], "y": ["yuh."],
}
V3TAG = {c: "[whispers] " for c in ["p", "t", "k", "c", "h", "ch"]}
CARVE = {"m": ("ahm.", "coda-voiced"), "n": ("ahn.", "coda-voiced"), "l": ("ahl.", "coda-voiced"), "s": ("ahs.", "coda-noise"),
         "f": ("ahf.", "coda-noise"), "v": ("ahvah.", "mid"), "z": ("ahzah.", "mid"), "x": ("ahks.", "coda-burst"), "ng": ("ahng.", "coda-voiced"), "sh": ("ahsh.", "coda-noise")}
log = open(f"{OUT}/usage.jsonl", "a")

def tts(text, model, extra=None):
    body = {"text": text, "model_id": model, "voice_settings": SET if model != "eleven_v3" else {"stability": 0.5, "similarity_boost": 0.75}}
    if extra: body.update(extra)
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=pcm_24000", json.dumps(body).encode(),
        {"xi-api-key": KEY, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=90) as r:
        pcm = r.read(); log.write(json.dumps({"text": text, "model": model, "cost": r.headers.get("character-cost")}) + "\n"); log.flush()
    return np.frombuffer(pcm[: len(pcm) // 2 * 2], dtype=np.int16).astype(np.float32) / 32768

def wav(path, x, rate=24000):
    import wave
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())

def read(path):
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", path, "-f", "f32le", "-ac", "1", "-ar", "24000", "-"], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)

def trim(x, db=-40):
    if len(x) < 480: return x
    f = np.array([np.sqrt(np.mean(x[i:i+240]**2)) for i in range(0, len(x)-240, 240)]) + 1e-9
    d = 20*np.log10(f); on = np.where(d > d.max() + db + 10)[0]
    if len(on) == 0: return x
    return x[max(0, on[0]*240 - 240): min(len(x), (on[-1]+2)*240)]

def frames(x):
    f = np.array([np.sqrt(np.mean(x[i:i+240]**2)) for i in range(0, max(1, len(x)-240), 240)]) + 1e-9
    return 20*np.log10(f)

def periodic(seg):
    seg = seg - seg.mean(); 
    if np.sum(seg**2) < 1e-8: return 0.0
    ac = np.correlate(seg, seg, "full")[len(seg)-1:]; ac /= ac[0]
    return float(ac[60:400].max()) if len(ac) > 400 else 0.0   # 60-400 Hz

def score(c, x):
    x = trim(x); dur = len(x)/24000; d = frames(x)
    if len(d) < 3: return -99, {"dur": dur}
    loud = d > d.max() - 20
    if c in CONT_V + CONT_U:
        steady = float(np.mean(np.abs(d[loud] - np.median(d[loud])) < 6)); s = steady*10 - abs(dur-0.7)*8
        # n/m/l should be voiced murmur, s/f noise; a flat pure hum (the N buzzer) scores low on spectral spread
        spec = np.abs(np.fft.rfft(x[: 4096] * np.hanning(min(4096, len(x)))[: len(x[:4096])]))
        hz = np.fft.rfftfreq(min(4096, len(x)), 1/24000); centroid = float((spec*hz).sum()/(spec.sum()+1e-9))
        if c in ("m", "n", "ng"): s -= 6 if centroid < 180 else 0          # pure low buzz
        if c in CONT_U: s += 2 if centroid > 2500 else -4
        return s, {"dur": round(dur, 2), "steady": round(steady, 2), "centroid": int(centroid)}
    if c in VOWELS:
        return -abs(dur-0.45)*10, {"dur": round(dur, 2)}
    # stops: short, little voiced tail (schwa)
    tail = x[int(0.06*24000):]; voiced = periodic(tail[:2400]) if len(tail) > 2400 else 0
    s = -abs(dur-0.2)*15 - (voiced*4 if c not in ("b", "d", "g", "j", "w", "y", "wh") else voiced*1.5)
    return s, {"dur": round(dur, 2), "voiced_tail": round(voiced, 2)}

def stopcut(x, sec=0.22):
    x = trim(x); n = int(sec*24000)
    if len(x) > n: x = x[:n].copy(); f = int(0.04*24000); x[-f:] *= np.linspace(1, 0, f)
    return x

def level(x):
    r = np.sqrt(np.mean(x[np.abs(x) > np.abs(x).max()*0.05]**2)) + 1e-9
    return np.clip(x * min(0.1/r, 0.89/np.abs(x).max()), -1, 1)

arg = sys.argv[1] if len(sys.argv) > 1 else "abcdefghijklmnopqrstuvwxyz"
letters = arg.split(",") if "," in arg else list(arg)
report = {}
for c in letters:
    d = f"{OUT}/{c}"; os.makedirs(d, exist_ok=True); cands = []
    for model in ["eleven_multilingual_v2", "eleven_v3"]:
        for k, t in enumerate(TEXT[c]):
            text = (V3TAG.get(c, "") + t) if model == "eleven_v3" else t
            try: x = tts(text, model)
            except Exception as e: print(c, model, e); continue
            x = stopcut(x) if c not in CONT_V + CONT_U + VOWELS else trim(x)
            if c in VOWELS and "as in" in t: x = x[: int(0.6*24000)]  # keep the vowel, drop "as in ..."
            cands.append((f"{model.split('_')[1]}-text{k}", x))
    if c in CARVE:
        carrier, mode = CARVE[c]
        for k in range(2):
            x = tts(carrier, "eleven_multilingual_v2", {"seed": 100+k}); src, dst = f"{d}/carrier{k}.wav", f"{d}/carved{k}.wav"; wav(src, x)
            r = subprocess.run(["python3", f"{REPO}/scripts/carve-sound.py", src, dst, "--mode", mode], capture_output=True, text=True)
            if r.returncode == 0: cands.append((f"carve{k}", read(dst)))
            else: print(c, "carve failed", r.stderr.strip()[:100])
    rows = []
    for name, x in cands:
        x = level(x); s, facts = score(c, x); p = f"{d}/{name}.mp3"; wav("/tmp/p.wav", x)
        subprocess.run(["ffmpeg", "-y", "-v", "quiet", "-i", "/tmp/p.wav", "-ar", "24000", "-b:a", "64k", p]); rows.append((s, name, facts))
    rows.sort(reverse=True)
    if rows: shutil.copy(f"{d}/{rows[0][1]}.mp3", f"{OUT}/{c}.mp3")
    shutil.copy(f"{REPO}/public/audio/sounds/{c}.mp3", f"{d}/old-google.mp3")
    report[c] = [{"take": n, "score": round(s, 2), **f} for s, n, f in rows]; print(c, rows[0][1] if rows else "-", rows[0][2] if rows else "")
json.dump(report, open(f"{OUT}/scores-{arg.replace(',', '_')}.json", "w"), indent=1)
