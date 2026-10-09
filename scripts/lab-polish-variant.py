"""
The measuring bench (branch lab/**, never merged): src/index.css with one piece of the polish pass
taken out, so a WebKit run can say which piece costs the time.

Usage: python3 scripts/lab-polish-variant.py <variant>

  full          as committed
  nograin       no paper grain anywhere (--grain: none)
  nolight       no light-from-above gradient on the surfaces (--light: none)
  noblob        the washes behind the page as before: no gradient, no pooled edge
  noshadow      the old single shadows: no two-part shadows, no edge
  notransition  no eased press (the global button transition)
  nofade        no screen fade
  nofront       no near layer drift (the field's clover stands still)
  none          all of the above
"""
import re
import sys
from pathlib import Path

CSS = Path(__file__).resolve().parent.parent / "src" / "index.css"
variant = sys.argv[1]
css = CSS.read_text()
start = css.index("   Polish: the chrome is made of the same paper as the paintings.")
head, polish = css[:start], css[start:]


def drop_rule(text: str, selector_start: str) -> str:
    """Remove the first rule whose text begins with selector_start (up to its closing brace)."""
    at = text.index(selector_start)
    end = text.index("\n}\n", at) + 3
    return text[:at] + text[end:]


pieces = {
    "nograin": lambda t: t.replace('--grain: url("./assets/textures/paper-grain.png");', "--grain: none;"),
    "nolight": lambda t: re.sub(r"--light: linear-gradient\([^;]*\);", "--light: none;", t),
    "noblob": lambda t: drop_rule(drop_rule(drop_rule(drop_rule(t, ".blob {"), ".blob-mint {"), ".blob-peach {"), ".blob-sky {"),
    "noshadow": lambda t: re.sub(
        r"--edge: [^;]*;\n  --shadow-rest: [^;]*;\n  --shadow-raised: [^;]*;\n  --shadow-float: [^;]*;",
        "--edge: 0 0 0 0 transparent;\n  --shadow-rest: 0 8px 20px rgba(90, 70, 50, 0.08);\n  --shadow-raised: 0 16px 40px rgba(120, 90, 60, 0.08);\n  --shadow-float: 0 16px 40px rgba(120, 90, 60, 0.08);",
        t,
    ),
    "notransition": lambda t: drop_rule(t, 'button,\n[role="button"] {\n  transition:'),
    "nofade": lambda t: drop_rule(t, ".stage > [data-screen],"),
    "nofront": lambda t: drop_rule(t, '.game-backdrop-front[data-drift="true"] {'),
}
wanted = list(pieces) if variant == "none" else [] if variant == "full" else [variant]
for name in wanted:
    before = polish
    polish = pieces[name](polish)
    assert polish != before, name
CSS.write_text(head + polish)
print(variant, "applied:", ", ".join(wanted) or "nothing")
