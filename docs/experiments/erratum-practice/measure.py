#!/usr/bin/env python3
"""What sixty errata in this store actually carry, against the #81 candidate.

The candidate at `relay-lite-v0.13-independent-recommendations.md:43` makes
`target_id`, `target_digest` and `reason` obligatory. This counts how many
records of `kind: erratum` carry each, and how many name their target in prose
instead. Run from the repository root.
"""

import re
import sys
from collections import Counter
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
FIELDS = ("target_id", "target-id", "target_digest", "target-sha256", "reason", "superseded_by")
DIGEST = re.compile(r"\b[0-9a-f]{64}\b")


def body_of(text: str) -> str:
    """The record below the store's own provenance block."""
    return text.split("\n---\n", 1)[1] if "\n---\n" in text else text


def main() -> int:
    relay = REPO / "relay"
    if not relay.is_dir():
        print(f"no store at {relay}", file=sys.stderr)
        return 2
    counts: Counter[str] = Counter()
    errata = 0
    for path in sorted(relay.glob("relay-*.txt")):
        body = body_of(path.read_text(encoding="utf-8", errors="replace"))
        if not re.search(r"^kind:\s*erratum\s*$", body[:1500], re.M):
            continue
        errata += 1
        for field in FIELDS:
            if re.search(rf"^{field}:", body[:1500], re.M):
                counts[field] += 1
        parent = re.search(r"^parent-sha256:\s*([0-9a-f]{64})", body, re.M)
        if parent:
            counts["parent-sha256"] += 1
        if {d for d in DIGEST.findall(body)} - ({parent.group(1)} if parent else set()):
            counts["other digest, in prose"] += 1
        if set(re.findall(r"relay-\d{4}", body)) - {path.stem}:
            counts["another record named in prose"] += 1
    print(f"errata: {errata}")
    for field in FIELDS:
        print(f"  {field:<28} {counts[field]}")
    for key in ("parent-sha256", "other digest, in prose", "another record named in prose"):
        print(f"  {key:<28} {counts[key]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
