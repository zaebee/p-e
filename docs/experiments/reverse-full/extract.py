#!/usr/bin/env python3
"""Every non-empty line of v0.12 outside fenced code blocks, with its line number.

Line-based because every other artifact that addresses this draft is: the
deletion log, the [MUST] census and the reverse pass all cite draft lines.
A sentence spanning two lines yields two units; the sealed counting rule keys
an obligation to the first line of its statement and marks the rest.
"""
import sys, re
path = sys.argv[1]
out = []
fence = False
for n, raw in enumerate(open(path, encoding="utf-8"), 1):
    line = raw.rstrip("\n")
    if line.lstrip().startswith("```"):
        fence = not fence
        continue
    if fence or not line.strip():
        continue
    out.append(f"{n}|{line}")
print("\n".join(out))
