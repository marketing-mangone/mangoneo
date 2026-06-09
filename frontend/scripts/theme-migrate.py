#!/usr/bin/env python3
"""
Theme migration: replace hardcoded hex colors (neutral + brand palette only)
with role-split CSS variable tokens so dark mode works while light mode stays
pixel-identical.

- Tailwind arbitrary utilities:  bg-[#fff] -> bg-[var(--s-ffffff)]
                                 text-[#111827] -> text-[var(--t-111827)]
- Exact `bg-white`            -> bg-[var(--surface)]
- Inline styles (prop-aware): color:'#111827' -> color:'var(--t-111827)'
                              background:'#fff' -> background:'var(--s-ffffff)'

Status / chart colors (green/red/blue/purple/cyan/etc.) are intentionally NOT
in the maps, so they are left untouched.

Light token value == original hex (no visual change in light mode).
Dark token value  == bucketed dark-mode equivalent.
"""
import re
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / "src"

# ── Dark-mode value buckets ─────────────────────────────────────────────────
# TEXT family: original hex -> dark text value
TEXT_DARK = {
    # inks (dark headings)
    "111827": "#eef1f8", "1a1a2e": "#eef1f8", "1a1a3e": "#eef1f8",
    "0c2054": "#e7ebf6", "0a1a3e": "#eef1f8", "0a1a44": "#eef1f8",
    "0f2960": "#e7ebf6", "0f2860": "#e7ebf6", "3b3537": "#eef1f8",
    # body
    "374151": "#c3c9d6", "4a4a6a": "#c3c9d6", "4b5563": "#c3c9d6",
    # muted
    "6b7280": "#9097a8", "8888a8": "#9097a8", "9898bb": "#9097a8", "8888aa": "#9097a8",
    # faint
    "9ca3af": "#6f7283",
    "c0c0d0": "#6f7283", "c0c0d8": "#6f7283", "d0d0e0": "#6f7283",
    "c4c8d4": "#6f7283", "cdd0de": "#6f7283", "d1d5db": "#6f7283",
    # orange / amber text -> keep readable on dark (slightly lifted)
    "f79c31": "#f79c31", "e08a20": "#f79c31", "e58d20": "#f79c31",
    "b97a00": "#f0a94a", "b8720f": "#f0a94a", "b45309": "#f0a94a", "92400e": "#f0a94a",
}

# SURFACE / BORDER family: original hex -> dark surface value
SURF_DARK = {
    # white / near-white -> card surface
    "ffffff": "#161d2e", "fafafe": "#161d2e", "fafafa": "#161d2e",
    "f9fafb": "#1a2233", "f8f9fb": "#1a2233", "f8f8f8": "#1a2233", "f3f4f6": "#1a2233",
    # page grays -> raised
    "f0f2f8": "#1e2638", "eef0f6": "#1e2638", "eef0f7": "#1e2638", "f4f6fb": "#1e2638",
    "f0f2ff": "#1e2638", "edeef5": "#1e2638", "eeeef5": "#1e2638", "f4f4f8": "#1e2638",
    "f7f8fc": "#1e2638", "f0f0f8": "#1e2638",
    # fills / light borders
    "f0f0f0": "#232c40", "e8e8f0": "#232c40", "e8eaf0": "#232c40", "e4e8f5": "#232c40",
    "e0e4f0": "#232c40", "ebebeb": "#232c40", "e5e7eb": "#2a3344", "dde0ea": "#2a3344",
    # stronger borders / faint surfaces
    "d1d5db": "#38435a", "d0d0e0": "#38435a", "c0c0d0": "#38435a", "c0c0d8": "#38435a",
    "cdd0de": "#38435a", "c4c8d4": "#38435a",
    # brand blues (chips / accents) -> lifted brand
    "0c2054": "#28386e", "0f2960": "#28386e", "0f2860": "#28386e",
    "0a1a3e": "#28386e", "0a1a44": "#28386e", "1a3a7a": "#2f4e94",
    "1a1a2e": "#222a3c", "1a1a3e": "#222a3c",
    # warm / orange tints -> dark warm
    "fef5e7": "#3a2c17", "fef6e7": "#3a2c17", "fff7ed": "#3a2c17", "fffbf0": "#3a2c17",
    "fef3c7": "#3a2c17",
    # light purple tints
    "faf0ff": "#2a2440", "fdf5ff": "#2a2440",
    # orange accents as fills -> keep orange
    "f79c31": "#f79c31", "e08a20": "#e08a20", "e58d20": "#e58d20", "f0a94a": "#f0a94a",
}
SURF_DARK["9ca3af"] = "#38435a"  # used as border/icon-ish sometimes

USED_TEXT = set()
USED_SURF = set()

UTIL_RE = re.compile(r'(?<![\w-])((?:bg|text|border|placeholder|ring|divide))-\[#([0-9a-fA-F]{3,8})\](?!/)')
INLINE_RE = re.compile(
    r"(background|backgroundColor|borderColor|outlineColor|borderTopColor|borderBottomColor|color|fill|stroke)(\s*:\s*)(['\"])#([0-9a-fA-F]{3,8})\3"
)

TEXT_PREFIXES = {"text", "placeholder"}


def util_sub(m):
    prefix, hexv = m.group(1), m.group(2).lower()
    if prefix in TEXT_PREFIXES:
        if hexv in TEXT_DARK:
            USED_TEXT.add(hexv)
            return f"{prefix}-[var(--t-{hexv})]"
        return m.group(0)
    else:  # bg/border/ring/divide -> surface family
        if hexv in SURF_DARK:
            USED_SURF.add(hexv)
            return f"{prefix}-[var(--s-{hexv})]"
        return m.group(0)


def inline_sub(m):
    prop, colon, q, hexv = m.group(1), m.group(2), m.group(3), m.group(4).lower()
    if prop == "color":
        if hexv in TEXT_DARK:
            USED_TEXT.add(hexv)
            return f"{prop}{colon}{q}var(--t-{hexv}){q}"
        return m.group(0)
    else:
        if hexv in SURF_DARK:
            USED_SURF.add(hexv)
            return f"{prop}{colon}{q}var(--s-{hexv}){q}"
        return m.group(0)


def main():
    files = sorted(SRC.rglob("*.tsx"))
    skip_inline = {"Sidebar.tsx"}  # keep sidebar's dark gradient untouched
    changed = 0
    for f in files:
        text = f.read_text()
        orig = text
        text = UTIL_RE.sub(util_sub, text)
        # exact bg-white (not bg-white/opacity)
        text = re.sub(r'(?<![\w-])bg-white(?![\w/-])', 'bg-[var(--surface)]', text)
        if f.name not in skip_inline:
            text = INLINE_RE.sub(inline_sub, text)
        if text != orig:
            f.write_text(text)
            changed += 1
            print(f"  modified {f.relative_to(SRC.parent)}")
    print(f"\n{changed} files modified")
    print(f"text tokens used: {len(USED_TEXT)} | surface tokens used: {len(USED_SURF)}")

    # ── emit token CSS block ──
    lines_light, lines_dark = [], []
    for hexv in sorted(USED_TEXT):
        lines_light.append(f"  --t-{hexv}: #{hexv};")
        lines_dark.append(f"  --t-{hexv}: {TEXT_DARK[hexv]};")
    for hexv in sorted(USED_SURF):
        lines_light.append(f"  --s-{hexv}: #{hexv};")
        lines_dark.append(f"  --s-{hexv}: {SURF_DARK[hexv]};")
    block = (
        "/* ===== GENERATED THEME TOKENS (theme-migrate.py) ===== */\n"
        ":root {\n" + "\n".join(lines_light) + "\n}\n\n"
        ".dark {\n" + "\n".join(lines_dark) + "\n}\n"
    )
    out = Path(__file__).resolve().parent / "generated-tokens.css"
    out.write_text(block)
    print(f"tokens written to {out}")


if __name__ == "__main__":
    main()
