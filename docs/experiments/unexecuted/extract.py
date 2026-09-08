#!/usr/bin/env python3
"""Every resolution heading in the review rounds of the issue-5 thread.

A resolution item is a line matching `### <n>. <text>` that falls AFTER the
v0.1 specification body. Thread lines 1-149 are that body — the artifact the
rounds were convened to review — and its own subsection headings (`### 2.1.`,
`### 2.2.`) match the same shape without being anything a round resolved.

The cut is stated rather than inferred: line 150 is the first line after v0.1's
conformance checklist, which ends at 149.
"""

import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
V01_BODY_ENDS = 149
HEADING = re.compile(r"^### (\d+)\. (.+)$")


def items(path: Path) -> list[str]:
    out: list[str] = []
    with path.open(encoding="utf-8") as handle:
        for n, raw in enumerate(handle, 1):
            if n <= V01_BODY_ENDS:
                continue
            m = HEADING.match(raw.rstrip("\n"))
            if m:
                out.append(f"{n}|{m.group(1)}|{m.group(2)}")
    return out


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(f"usage: {Path(argv[0]).name} <path-to-thread>", file=sys.stderr)
        return 2
    path = Path(argv[1]).resolve()
    if not path.is_relative_to(REPO) or not path.is_file():
        print(f"refusing {path}", file=sys.stderr)
        return 2
    print("\n".join(items(path)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
