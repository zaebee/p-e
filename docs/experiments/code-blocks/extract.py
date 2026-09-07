#!/usr/bin/env python3
"""Every non-empty line of v0.12 INSIDE fenced code blocks, with its line number.

The complement of `reverse-full/extract.py`, which took everything outside the
fences. Between them the two populations partition the draft's non-empty lines,
which is the property that makes this run the residual of that one rather than
a second look at the same thing.

The fence markers themselves belong to neither: they open and close a region and
state nothing.
"""

import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]


def units(path: Path) -> list[str]:
    """Yield `<line number>|<text>` for every non-empty line inside a fence."""
    out: list[str] = []
    fence = False
    with path.open(encoding="utf-8") as handle:
        for n, raw in enumerate(handle, 1):
            line = raw.rstrip("\n")
            if line.lstrip().startswith("```"):
                fence = not fence
                continue
            if not fence or not line.strip():
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
