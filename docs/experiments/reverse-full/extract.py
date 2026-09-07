#!/usr/bin/env python3
"""Every non-empty line of v0.12 outside fenced code blocks, with its line number.

Line-based because every other artifact that addresses this draft is: the
deletion log, the [MUST] census and the reverse pass all cite draft lines.
A sentence spanning two lines yields two units; the sealed counting rule keys
an obligation to the first line of its statement and marks the rest.

The argument is resolved and required to sit inside this repository. The script
reads a pinned specification and nothing else, so a path that escapes the tree
is a mistake rather than a use case, and refusing it here is cheaper than
noticing later that the population came from somewhere unrecorded.
"""

import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]


def units(path: Path) -> list[str]:
    """Yield `<line number>|<text>` for every non-empty line outside a fence."""
    out: list[str] = []
    fence = False
    with path.open(encoding="utf-8") as handle:
        for n, raw in enumerate(handle, 1):
            line = raw.rstrip("\n")
            if line.lstrip().startswith("```"):
                fence = not fence
                continue
            if fence or not line.strip():
                continue
            out.append(f"{n}|{line}")
    return out


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(f"usage: {Path(argv[0]).name} <path-to-draft>", file=sys.stderr)
        return 2
    path = Path(argv[1]).resolve()
    if not path.is_relative_to(REPO):
        print(f"refusing a path outside {REPO}: {path}", file=sys.stderr)
        return 2
    if not path.is_file():
        print(f"not a file: {path}", file=sys.stderr)
        return 2
    print("\n".join(units(path)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
