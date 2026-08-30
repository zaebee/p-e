"""A single-authority append store.

Implements SPEC.md as amended by AMENDMENT.md, for the scope named in CONTRACT.md §2:
accepting a record, allocating identity, binding, persisting, reading back.

Not implemented, and deliberately: deletion, migration, crash recovery, more than one
authority, cross-authority history, witnessing (MAY), content deduplication (MAY),
replication (MAY).

Every non-obvious reading is recorded in DECISIONS.md; comments below cite the entry.
"""

from __future__ import annotations

import errno
import hashlib
import json
import os
import re
import time
from dataclasses import dataclass, field
from typing import Optional

SPEC_VERSION = "p-e/core 0.1"          # S, "the version recursion terminates..." (K6)
MAGIC = b"@p-e/x0"                     # A, 9.2
SEQ_WIDTH = 4                          # DECISION 2
SEQ_CEILING = 10 ** SEQ_WIDTH - 1      # DECISION 2

AUTHORITY_RE = re.compile(r"^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$")
FIELD_RE = re.compile(rb"^([A-Za-z][A-Za-z0-9_-]*):[ \t]?(.*)$", re.S)


class Refused(Exception):
    """A candidate was declined, with an indication the offering party can
    distinguish from acceptance (A, *Refuse*)."""

    def __init__(self, reason: str, detail: str = ""):
        super().__init__(f"{reason}: {detail}" if detail else reason)
        self.reason = reason
        self.detail = detail


class Exhausted(Refused):
    pass


# --------------------------------------------------------------------------- #
# locators                                                                     #
# --------------------------------------------------------------------------- #

def locator_for(authority_id: str, seq: int) -> str:
    """DECISION 1: `<authority_id>-NNNN`; `relay` is a value, not a literal."""
    if seq < 0 or seq > SEQ_CEILING:
        raise ValueError(f"seq {seq} outside the four-digit locator space")
    return f"{authority_id}-{seq:0{SEQ_WIDTH}d}"


def split_locator(locator: str) -> tuple[str, int]:
    if "-" not in locator:
        raise ValueError(f"not a locator: {locator!r}")
    authority_id, _, tail = locator.rpartition("-")
    if len(tail) != SEQ_WIDTH or not tail.isdigit():
        raise ValueError(f"not a locator: {locator!r}")
    return authority_id, int(tail)


def is_locator(s: str) -> bool:
    try:
        split_locator(s)
        return True
    except ValueError:
        return False


# --------------------------------------------------------------------------- #
# durable primitives                                                           #
# --------------------------------------------------------------------------- #

def _fsync_dir(path: str) -> None:
    fd = os.open(path, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def create_marker(path: str) -> bool:
    """Atomic exclusive create of an empty file (S, MUST 1). True iff we won it."""
    try:
        fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o444)
    except FileExistsError:
        return False
    os.close(fd)
    _fsync_dir(os.path.dirname(path))
    return True


def write_crash_atomic_create_or_fail(tmp_dir: str, final_path: str, payload: bytes) -> None:
    """S, MUST 8: crash-atomic AND create-or-fail. DECISION 9 for the mechanism.

    The bytes are fully durable before the directory entry that names them appears,
    and the entry appears by `link`, which fails on an existing name rather than
    replacing it the way `rename` would.
    """
    tmp_path = os.path.join(tmp_dir, f"t{os.getpid()}-{time.time_ns()}")
    fd = os.open(tmp_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o444)
    try:
        written = 0
        while written < len(payload):
            written += os.write(fd, payload[written:])
        os.fsync(fd)
    finally:
        os.close(fd)
    try:
        os.link(tmp_path, final_path)          # atomic; EEXIST rather than replace
    except FileExistsError:
        os.unlink(tmp_path)
        raise Refused("id_already_bound", final_path)
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
    _fsync_dir(os.path.dirname(final_path))


# --------------------------------------------------------------------------- #
# the digest domain (A, MUST 9)                                                #
# --------------------------------------------------------------------------- #

def content_identity(bound_content: bytes) -> str:
    """A, *Content identity*: sha256(bound-content). K3 names SHA-256."""
    return hashlib.sha256(bound_content).hexdigest()


def utf8_well_formed(octets: bytes) -> bool:
    """A, 9.2: Unicode 15.0 Table 3-7 — no overlong forms, no encoded surrogates,
    no truncated sequences. CPython's strict UTF-8 decoder rejects exactly these."""
    try:
        octets.decode("utf-8", "strict")
    except UnicodeDecodeError:
        return False
    return True


def test_admission(octets: bytes) -> Optional[str]:
    """A, 9.2. Returns None if admissible, else the reason."""
    if not octets.startswith(MAGIC):
        return "not_x0"
    if not utf8_well_formed(octets):
        return "not_utf8"
    return None


def _is_blank(line: bytes) -> bool:
    return line == b"" or line == b"\r"           # DECISION 6


def header_block(bound_content: bytes) -> bytes:
    """A, *Header block*, under DECISION 6."""
    out = []
    for line in bound_content.split(b"\n"):
        if _is_blank(line):
            break
        out.append(line)
    return b"\n".join(out)


def header_fields(bound_content: bytes) -> dict[str, str]:
    """Fields of the header block. DECISION 6: the magic is stripped from the first
    line; a repeated field name is a refusal; body lines are never fields
    (S: 'a header-like line quoted in a record body is not a field')."""
    block = header_block(bound_content)
    lines = block.split(b"\n")
    if lines and lines[0].startswith(MAGIC):
        lines[0] = lines[0][len(MAGIC):]
    fields: dict[str, str] = {}
    for raw in lines:
        line = raw[:-1] if raw.endswith(b"\r") else raw
        if not line:
            continue
        m = FIELD_RE.match(line)
        if not m:
            continue                              # not a field; not an error
        name = m.group(1).decode("ascii").lower()
        if name in fields:
            raise Refused("duplicate_header_field", name)
        fields[name] = m.group(2).decode("utf-8")
    return fields


# --------------------------------------------------------------------------- #
# results                                                                      #
# --------------------------------------------------------------------------- #

@dataclass(frozen=True)
class Citation:
    """S, *Citing a record*: within one store the pair suffices; crossing a store
    boundary the citation MUST be (store identity, locator, content digest)."""
    store_identity: str
    locator: str
    digest: str

    def pair(self) -> tuple[str, str]:
        return (self.locator, self.digest)

    def __str__(self) -> str:
        return f"({self.store_identity}, {self.locator}, sha256:{self.digest})"


@dataclass(frozen=True)
class LedgerEntry:
    authority_id: str
    seq: int
    locator: str
    content_identity: str
    extent: int
    digest_recorded: bool          # A, 10.5
    bound_at: str
    framing: dict


@dataclass
class ReadResult:
    locator: str
    visibility: str                # PRESENT | KNOWN_MISSING | UNKNOWN  (S, MUST 6)
    verdict: str                   # see Store.read
    bound_content: Optional[bytes] = None
    citation: Optional[Citation] = None
    entry: Optional[LedgerEntry] = None
    witnesses: Optional[list] = None      # S, MUST 7: absence reported as absence
    detail: str = ""

    @property
    def witnesses_absent(self) -> bool:
        return not self.witnesses


# --------------------------------------------------------------------------- #
# the store                                                                    #
# --------------------------------------------------------------------------- #

class Store:
    def __init__(self, root: str):
        self.root = os.path.abspath(root)
        with open(os.path.join(self.root, "authority.json"), "rb") as fh:
            cfg = json.loads(fh.read().decode("utf-8"))
        self.store_identity: str = cfg["store_identity"]
        self.authority_id: str = cfg["authority_id"]
        self.g1_floor: int = cfg["g1_floor"]      # S, MUST 2 — required, no default
        self.history = os.path.join(self.root, "history")
        self.objects = os.path.join(self.root, "objects")
        self.tmp = os.path.join(self.root, "tmp")

    # -- creation ---------------------------------------------------------- #

    @staticmethod
    def create(root: str, store_identity: str, authority_id: str, g1_floor: int) -> "Store":
        if not AUTHORITY_RE.match(authority_id):
            raise ValueError(f"authority_id {authority_id!r} is not a namespace label")
        if not (0 <= g1_floor <= SEQ_CEILING):
            raise ValueError("g1_floor outside the locator space")
        root = os.path.abspath(root)
        for d in (root, os.path.join(root, "history"),
                  os.path.join(root, "objects"), os.path.join(root, "tmp")):
            os.makedirs(d, exist_ok=True)
        cfg = {
            "spec": SPEC_VERSION,
            "store_identity": store_identity,     # S: not a filesystem path
            "authority_id": authority_id,
            "g1_floor": g1_floor,                 # S, MUST 2
            "g1_claim": (
                f"authority {authority_id} claims G1 from seq {g1_floor} and makes no "
                f"claim below it; no exceptions are declared or declarable (S, MUST 1/2)"
            ),
        }
        path = os.path.join(root, "authority.json")
        if not os.path.exists(path):
            write_crash_atomic_create_or_fail(
                os.path.join(root, "tmp"), path,
                json.dumps(cfg, indent=2, sort_keys=True).encode("utf-8"))
        return Store(root)

    # -- paths -------------------------------------------------------------- #

    def marker_path(self, locator: str) -> str:
        return os.path.join(self.history, locator)

    def bind_path(self, locator: str) -> str:
        return os.path.join(self.history, locator + ".bind")

    def object_path(self, locator: str) -> str:
        return os.path.join(self.objects, locator + ".rec")

    # -- allocation (S, MUST 1; DECISION 2) --------------------------------- #

    def allocate(self) -> str:
        """Walk ids from the declared G1 floor and claim the first marker that does
        not yet exist. The claim is `O_EXCL`, so exactly one writer wins it. Never
        `max+1`; there is no shared race point."""
        seq = self.g1_floor
        while seq <= SEQ_CEILING:
            locator = locator_for(self.authority_id, seq)
            if create_marker(self.marker_path(locator)):
                return locator
            seq += 1
        raise Exhausted("seq_space_exhausted",
                        f"{self.authority_id} has no free seq at or below {SEQ_CEILING}")

    # -- deposit ------------------------------------------------------------ #

    def deposit(self, octets: bytes, extent: int, deposited_by: str = "unattributed") -> Citation:
        """Accept a candidate, allocate identity, bind, persist.

        Order of operations, and why: candidate-only checks first, so a refusable
        offer never consumes a seq; then allocation; then the ledger entry (S,
        *Named failures*: "the ledger MUST be written **before** the record"); then
        the object, crash-atomic and create-or-fail (S, MUST 8).
        """
        if not isinstance(octets, (bytes, bytearray)):
            raise Refused("not_octets", type(octets).__name__)
        octets = bytes(octets)

        # A, 9.1 — extent is a property of the offer (DECISION 5).
        if not isinstance(extent, int) or isinstance(extent, bool) or extent < 0:
            raise Refused("bad_extent", repr(extent))
        if extent != len(octets):
            raise Refused("extent_disagrees_with_offer",
                          f"declared {extent}, delivered {len(octets)}")

        # A, 9.2 — admission, on the candidate as delivered.
        reason = test_admission(octets)
        if reason is not None:
            raise Refused(reason)

        fields = header_fields(octets)            # may raise duplicate_header_field

        # S, MUST 5 (DECISION 8) — lexical only; presence is never tested.
        parent = fields.get("parent")
        if parent is not None:
            if not is_locator(parent):
                raise Refused("parent_not_a_locator", parent)
            if split_locator(parent)[0] != self.authority_id:
                raise Refused(
                    "parent_crosses_authority",
                    f"{parent} is not in {self.authority_id}; carry it as ref: "
                    f"(an observation), which MUST 5 requires it be labelled as")

        digest = content_identity(octets)         # A, *Content identity*

        locator = self.allocate()                 # S, MUST 1

        # S, *Envelope convention* (DECISION 7). The marker is not reclaimed.
        declared = fields.get("id")
        if declared is not None and declared != locator:
            raise Refused("declared_id_mismatch",
                          f"envelope id: {declared}, store-assigned {locator}; "
                          f"{locator} is now allocated and abandoned")

        entry = LedgerEntry(
            authority_id=self.authority_id,
            seq=split_locator(locator)[1],
            locator=locator,
            content_identity=digest,              # A, 10.1 — recorded at binding
            extent=extent,                        # A, 9.1 — recorded at binding
            digest_recorded=True,                 # A, 10.5
            bound_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            framing={"deposited-by": deposited_by},   # DECISION 4 — outside bound-content
        )
        write_crash_atomic_create_or_fail(
            self.tmp, self.bind_path(locator),
            (json.dumps(entry.__dict__, sort_keys=True) + "\n").encode("utf-8"))

        # Bytes durable before the directory entry that names them (S, MUST 8).
        write_crash_atomic_create_or_fail(self.tmp, self.object_path(locator), octets)

        return Citation(self.store_identity, locator, digest)

    # -- ledger ------------------------------------------------------------- #

    def ledger_entry(self, locator: str) -> Optional[LedgerEntry]:
        try:
            with open(self.bind_path(locator), "rb") as fh:
                raw = json.loads(fh.read().decode("utf-8"))
        except FileNotFoundError:
            return None
        return LedgerEntry(**raw)

    def is_allocated(self, locator: str) -> bool:
        return os.path.exists(self.marker_path(locator))

    def visibility(self, locator: str) -> str:
        """S, MUST 6, under DECISION 12. Three states, and no fourth."""
        if not self.is_allocated(locator):
            return "UNKNOWN"
        if self.ledger_entry(locator) is None:
            return "UNKNOWN"                       # allocated, never bound
        if not os.path.exists(self.object_path(locator)):
            return "KNOWN_MISSING"                 # bound; the bytes are not here
        return "PRESENT"

    # -- read --------------------------------------------------------------- #

    def read(self, locator: str) -> ReadResult:
        """Read a record back.

        verdict is one of:
          OK                  bound-content returned and verified against the ledger
          NOT_BOUND           no binding at this id (visibility UNKNOWN)
          CONTENT_UNREACHABLE binding known, bytes absent (visibility KNOWN_MISSING)
          ADMISSION_FAILED    stored octets fail A 9.2 (DECISION 10)
          EXTENT_MISMATCH     stored size disagrees with the recorded extent (A 9.1)
          DIGEST_MISMATCH     A 10.3, resolved by DECISION 11
          ENVELOPE_MISMATCH   header-block id: disagrees with the locator (S envelope)
          UNVERIFIABLE        bound without a recorded content identity (A 10.5)
        No verdict but OK returns bound-content.
        """
        try:
            authority_id, _ = split_locator(locator)
        except ValueError:
            raise Refused("not_a_locator", locator)
        if authority_id != self.authority_id:
            # S: guarantees are indexed by (authority_id, seq); this store is one
            # authority (CONTRACT §2) and answers for no other.
            raise Refused("foreign_authority", authority_id)

        vis = self.visibility(locator)
        entry = self.ledger_entry(locator)

        if entry is None:
            return ReadResult(locator, vis, "NOT_BOUND", witnesses=[],
                              detail="no ledger entry at this id")

        cite = Citation(self.store_identity, locator, entry.content_identity)

        if vis == "KNOWN_MISSING":
            # S, MUST 6: the ledger answers with (authority, seq, digest); the payload
            # reads KNOWN_MISSING. Not UNKNOWN, and not an error.
            return ReadResult(locator, vis, "CONTENT_UNREACHABLE", None, cite, entry,
                              witnesses=[], detail="binding known, bytes not here")

        with open(self.object_path(locator), "rb") as fh:
            octets = fh.read()

        # A, 10.4 — admission before verification, and admission is what is reported.
        reason = test_admission(octets)
        if reason is not None:
            return ReadResult(locator, vis, "ADMISSION_FAILED", None, cite, entry,
                              witnesses=[], detail=reason)

        if len(octets) != entry.extent:
            return ReadResult(locator, vis, "EXTENT_MISMATCH", None, cite, entry,
                              witnesses=[],
                              detail=f"recorded {entry.extent}, stored {len(octets)}")

        if not entry.digest_recorded:
            # A, 10.5 — distinguishable, and never reported as verified.
            return ReadResult(locator, vis, "UNVERIFIABLE", None, cite, entry,
                              witnesses=[], detail="bound without a recorded digest")

        # A, 10.1 — verify against the value recorded at binding.
        recomputed = content_identity(octets)
        if recomputed != entry.content_identity:
            return ReadResult(locator, vis, "DIGEST_MISMATCH", None, cite, entry,
                              witnesses=[],
                              detail=f"recorded {entry.content_identity}, "
                                     f"recomputed {recomputed}")

        declared = header_fields(octets).get("id")
        if declared is not None and declared != locator:
            return ReadResult(locator, vis, "ENVELOPE_MISMATCH", None, cite, entry,
                              witnesses=[], detail=f"envelope id: {declared}")

        # S, MUST 7: no witnesses is reported as absence, not as "no evidence found".
        return ReadResult(locator, vis, "OK", octets, cite, entry, witnesses=[])

    # -- listing (not a read: A, *Read*) ------------------------------------ #

    def bound_locators(self) -> list[str]:
        out = []
        for name in os.listdir(self.history):
            if name.endswith(".bind"):
                out.append(name[:-len(".bind")])
        # S, MAY: authority_id then seq is a convention, never a guarantee.
        return sorted(out, key=lambda loc: split_locator(loc))

    def allocated_seqs(self) -> list[int]:
        return sorted(split_locator(n)[1] for n in os.listdir(self.history)
                      if not n.endswith(".bind"))
