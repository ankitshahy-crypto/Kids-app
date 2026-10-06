"""
Make the painted scenes behind the games from their renders.

Usage: python3 scripts/backdrop-art.py <folder of source images>

The sources are wide watercolour paintings with no one in them, one for each scene the game kit
knows (src/game/kit.tsx, `SceneKind`). A scene's newest painting is used: `...scene-<kind>-v<N>...`
with the highest N, or else the first one, `...bg-<kind>...`. This writes:

  public/backdrops/<kind>.webp   the painting, 1500 x 1000
  src/data/backdropArt.json      for each painted scene, how the app is to show it:
                                   hold   where it is held when the scene is narrower than the
                                          painting, as a share across from the left (50 is the middle)
                                   still  true for a scene that does not drift (indoors)
                                   floor  the line in it that things stand on (a counter's edge, the
                                          floor), as a share down from the top, when a game needs one

A game's scene is as tall as its painting and narrower (a phone shows the middle two thirds of the
width, a tablet a little more), so what a game looks for has to be in the middle, or the painting
held to one side (`hold`). The measures in SCENES below were taken with each painting behind its
games; change them here, not in the JSON.

`night` has no painting: it is only ever a small picture (the Day and night choices), and those
stay drawn, since at that size the sun and moon are what tell the three apart.

Needs: pip install pillow numpy
"""
import json
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "backdrops"
MANIFEST = ROOT / "src" / "data" / "backdropArt.json"
SIZE = (1500, 1000)
QUALITY = 80

# kind: what the app needs to know of its painting. `part` is the stretch of the render to use,
# as shares of its width (a render that came wider than three by two).
SCENES = {
    "field": {},
    "garden": {},
    "morning": {},
    # Three times as wide as it is tall: the right half, where the sun is, held so the sun is in view.
    "afternoon": {"part": (0.5, 1.0), "hold": 75},
    "pond": {},
    "sky": {},
    "rainy": {},
    "snowy": {},
    "windy": {},
    # Indoors nothing drifts. The floor is where a thing for sale stands (the front of the counter's
    # top), where the coins earned lie (the stall's counter, at its right), and where the wall meets
    # the floor.
    "shop": {"still": True, "floor": 0.775},
    "stand": {"still": True, "hold": 100, "floor": 0.76},
    "room": {"still": True, "floor": 0.833},
    "table": {"still": True},
}


def newest(folder: Path, kind: str) -> Path:
    """The scene's newest render: the highest `scene-<kind>-v<N>`, or else `bg-<kind>`."""
    versions = []
    for path in sorted(folder.glob("*.webp")):
        found = re.search(rf"scene-{kind}-v(\d+)", path.name)
        if found:
            versions.append((int(found.group(1)), path))
    if versions:
        return max(versions)[1]
    first = [path for path in sorted(folder.glob("*.webp")) if f"bg-{kind}" in path.name]
    if not first:
        sys.exit(f"No render named ...scene-{kind}-v<N>... or ...bg-{kind}... in {folder}")
    return first[0]


def main(folder: Path):
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for kind, how in SCENES.items():
        source = newest(folder, kind)
        img = Image.open(source).convert("RGB")
        left, right = how.get("part", (0.0, 1.0))
        img = img.crop((round(img.width * left), 0, round(img.width * right), img.height))
        shape = img.width / img.height
        if abs(shape - SIZE[0] / SIZE[1]) > 0.02:
            sys.exit(f"{kind}: {source.name} is {shape:.2f} wide for its height once cut, not three by two. Set its `part` in SCENES.")
        img.resize(SIZE, Image.LANCZOS).save(OUT / f"{kind}.webp", quality=QUALITY, method=6)
        entry = {"hold": how.get("hold", 50), "still": how.get("still", False)}
        if "floor" in how:
            entry["floor"] = how["floor"]
        manifest[kind] = entry
        print(f"{kind}: {source.name.replace('media-generation-', '')[:34]} -> {(OUT / f'{kind}.webp').stat().st_size // 1024} KB")
    # Nothing is left in the folder that the list does not know (a scene dropped from SCENES).
    for path in OUT.glob("*.webp"):
        if path.stem not in manifest:
            path.unlink()
            print(f"removed {path.name}")
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"{len(manifest)} scenes, {sum(path.stat().st_size for path in OUT.glob('*.webp')) // 1024} KB")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
