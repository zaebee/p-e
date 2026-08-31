"""
A single-authority append store implementing SPEC.md as amended by AMENDMENT.md.

Scope, per CONTRACT.md §2: one authority; no deletion, no migration, no crash
recovery, no cross-authority operation. Standard library only.

On-disk layout under the store root:

    authority.json              authority_id, store_identity, g1_floor  (O_EXCL, once)
    history/<locator>           allocation marker, empty            (MUST 1)
    ledger/<locator>            binding entry, JSON, never rewritten (MUST 4, 10.1)
    objects/<sha256hex>         bound-content, content-addressed     (MAY: dedup)
    records/<locator>           hard link to the object              (MUST 8)
    tmp/                        staging for the durable-then-link write

Write order for one deposit, which is load-bearing (SPEC "Named failures", MUST 8):

    admission -> header checks -> marker(O_EXCL) -> declared-id check
              -> ledger entry(O_EXCL, fsync, fsync dir)     <-- the binding moment
              -> payload tmp(fsync) -> link objects/ -> link records/ (fsync dirs)
"""

from __future__ import annotations

import errno
import hashlib
import json
import os
import re
import uuid
from dataclasses import dataclass, field
from typing import Optional

MAGIC = b"@p-e/x0"  # AMD 9.2
FIELD_RE = re.compile(rb"^([A-Za-z][A-Za-z0-9-]*):(.*)$", re.DOTALL)  # AMD *Field*

# ---------------------------------------------------------------- vocabularies

# MUST 6 / AMD 10.3: visibility answers *where the content is*.
PRESENT = "PRESENT"
KNOWN_MISSING = "KNOWN_MISSING"
UNKNOWN = "UNKNOWN"

# AMD 10.3: integrity is a separate axis and is never reported through the
# visibility vocabulary.
VERIFIED = "VERIFIED"
MISMATCH = "MISMATCH"
ADMISSION_FAILED = "ADMISSION_FAILED"
UNRECORDED = "UNRECORDED"  # AMD 10.5: bound without a recorded content identity
NO_CONTENT = "NO_CONTENT"  # nothing held to verify

# MUST 7: absence of a witness is reported as absence, in its own word.
WITNESS_ABSENT = "ABSENT"
WITNESS_PRESENT = "PRESENT"


class Refused(Exception):
    """AMD *Refuse*: a decline the offering party can distinguish from acceptance."""

    def __init__(self, code: str, detail: str = ""):
        super().__init__(f"{code}: {detail}" if detail else code)
        self.code = code
        self.detail = detail


class StoreFailure(Exception):
    """A failure of this store. MUST 6: never reported as absence."""


@dataclass(frozen=True)
class Candidate:
    """AMD *Candidate*: octets offered as a record, together with its extent."""

    octets: bytes
    extent: int


@dataclass(frozen=True)
class Citation:
    """SPEC *Citing a record*: always the full triple; the locator is shorthand only."""

    store_identity: str
    locator: str
    content_digest: str

    def as_pair(self) -> tuple:
        return (self.locator, self.content_digest)


@dataclass(frozen=True)
class Binding:
    locator: str
    authority_id: str
    seq: int
    content_identity: str
    extent: int


@dataclass
class ReadResult:
    """Two facts, reported side by side. AMD 10.3: 'Neither alone is the full truth.'"""

    locator: str
    visibility: str
    integrity: str
    content: Optional[bytes] = None
    extent: Optional[int] = None
    recorded_content_identity: Optional[str] = None
    computed_content_identity: Optional[str] = None
    admission_detail: Optional[str] = None

    @property
    def verified(self) -> bool:
        return self.integrity == VERIFIED


@dataclass
class WitnessReport:
    """MUST 7 and MUST NOT #2."""

    locator: str
    status: str  # WITNESS_ABSENT / WITNESS_PRESENT
    attestations: list = field(default_factory=list)
    # A witness records a cut. Printed so no caller mistakes it for an ordering.
    orders_records: bool = False
    independence_asserted: bool = False


@dataclass
class References:
    """MUST 5: in-chain parent vs cross-authority observation, kept apart by name."""

    locator: str
    parent: Optional[str]  # same authority, or None (UNSTATED predecessor)
    observations: list = field(default_factory=list)


# ---------------------------------------------------------------- octet helpers


def utf8_wellformed(octets: bytes) -> bool:
    """AMD 9.2, Unicode 15.0 Table 3-7.

    CPython's strict UTF-8 decoder implements exactly Table 3-7: it rejects
    overlong forms, encoded surrogates D800-DFFF, truncated sequences and
    anything above U+10FFFF. The decoded string is discarded immediately --
    AMD 9.4 requires digesting octets, never a decoded string.
    """
    try:
        octets.decode("utf-8", "strict")
    except UnicodeDecodeError:
        return False
    return True


def header_block(octets: bytes) -> bytes:
    """AMD *Header block*: the octets above the first blank line.

    A line is delimited by LF. A blank line contains no octets, so b"\\r" or
    b" " is not blank (AMD *Blank line*). If there is no blank line the whole
    bound-content is the header block.
    """
    idx = octets.find(b"\n\n")
    if idx == -1:
        if octets.startswith(b"\n"):
            return b""
        return octets
    return octets[:idx]


def fields(octets: bytes) -> list:
    """Every field of the header block, in order, as (name, value) with the value
    stripped of ASCII space/tab at both ends. Non-field lines are skipped: AMD
    *Field*, 'A line that is not a field is not one, wherever it appears'."""
    out = []
    for line in header_block(octets).split(b"\n"):
        m = FIELD_RE.match(line)
        if m:
            out.append((m.group(1).decode("ascii"), m.group(2).strip(b" \t")))
    return out


def field_value(octets: bytes, name: str) -> Optional[bytes]:
    lowered = name.lower()
    for k, v in fields(octets):
        if k.lower() == lowered:
            return v
    return None


def content_identity(octets: bytes) -> str:
    """AMD *Content identity*: sha256(bound-content). K3 names the function."""
    return hashlib.sha256(octets).hexdigest()


# ---------------------------------------------------------------- fs primitives


def _fsync_dir(path: str) -> None:
    fd = os.open(path, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def _create_exclusive(path: str, payload: bytes) -> bool:
    """O_EXCL create + write + fsync + fsync(dir). False iff the name already existed.

    This is MUST 8's pair for a file small enough to be written in one call: the
    create fails rather than replaces, and the fsyncs make it durable.
    """
    try:
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o644)
    except FileExistsError:
        return False
    try:
        if payload:
            os.write(fd, payload)
        os.fsync(fd)
    finally:
        os.close(fd)
    _fsync_dir(os.path.dirname(path))
    return True


def _durable_then_link(tmp_dir: str, dest: str, octets: bytes) -> bool:
    """MUST 8, both halves.

    Bytes are made durable in a staging file first; only then does a name that
    points at them appear, via link() -- atomic, and EEXIST rather than a silent
    replace. Returns False iff dest already existed.
    """
    tmp = os.path.join(tmp_dir, f".stage-{uuid.uuid4().hex}")
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o644)
    try:
        written = 0
        while written < len(octets):
            written += os.write(fd, octets[written:])
        os.fsync(fd)
    finally:
        os.close(fd)
    _fsync_dir(tmp_dir)
    try:
        os.link(tmp, dest)
        created = True
    except FileExistsError:
        created = False
    _fsync_dir(os.path.dirname(dest))
    os.unlink(tmp)
    _fsync_dir(tmp_dir)
    return created


# ---------------------------------------------------------------------- store


class Store:
    """One authority. See module docstring for layout and write order."""

    def __init__(self, root: str):
        self.root = os.path.abspath(root)
        cfg_path = os.path.join(self.root, "authority.json")
        if not os.path.exists(cfg_path):
            raise StoreFailure(f"no authority at {self.root}")
        with open(cfg_path, "rb") as fh:
            cfg = json.loads(fh.read().decode("utf-8"))
        self.authority_id = cfg["authority_id"]
        self.store_identity = cfg["store_identity"]
        self.g1_floor = int(cfg["g1_floor"])
        self.locator_width = int(cfg.get("locator_width", 4))
        # Fault injection for the crash-window test only; never set in normal use.
        self.fault = None
        self._assert_extent_recoverable()

    # -- construction ----------------------------------------------------

    @classmethod
    def create(
        cls,
        root: str,
        authority_id: str = "relay",
        store_identity: Optional[str] = None,
        g1_floor: int = 1,
        locator_width: int = 4,
    ) -> "Store":
        """MUST 2: the authority declares the seq from which it claims G1, at the
        moment it comes into existence, because 'every authority acquires [a
        history] the moment it starts'."""
        if g1_floor < 1:
            raise StoreFailure("g1_floor must be >= 1")
        os.makedirs(root, exist_ok=True)
        for sub in ("history", "ledger", "objects", "records", "tmp", "witness"):
            os.makedirs(os.path.join(root, sub), exist_ok=True)
        cfg = {
            "authority_id": authority_id,
            "store_identity": store_identity or f"{authority_id}-store",
            "g1_floor": g1_floor,
            "locator_width": locator_width,
            "spec_version": "p-e/core 0.1",  # K6/K-terminus name, recorded not derived
        }
        blob = json.dumps(cfg, sort_keys=True).encode("utf-8")
        if not _create_exclusive(os.path.join(root, "authority.json"), blob):
            raise StoreFailure("authority already declared at this root")
        _fsync_dir(root)
        return cls(root)

    def _assert_extent_recoverable(self) -> None:
        """AMD 9.1 last sentence. The stored form is a plain file plus a ledger
        entry carrying the extent, so extent is recoverable two independent ways.
        Checked once, at open, so that a store that could not do it would refuse
        candidates at admission rather than bind them."""
        self._extent_recoverable = os.path.isdir(os.path.join(self.root, "ledger"))
        if not self._extent_recoverable:
            raise StoreFailure("stored form cannot recover extent")

    # -- naming ----------------------------------------------------------

    def locator(self, seq: int) -> str:
        return f"{self.authority_id}-{seq:0{self.locator_width}d}"

    def seq_of(self, locator: str) -> int:
        prefix = self.authority_id + "-"
        if not locator.startswith(prefix):
            raise StoreFailure(f"{locator!r} is not a locator of {self.authority_id}")
        return int(locator[len(prefix) :])

    def _p(self, *parts: str) -> str:
        return os.path.join(self.root, *parts)

    # -- G1 ---------------------------------------------------------------

    def claims_g1(self, seq: int) -> bool:
        """MUST 2: the authority MUST NOT claim G1 below its declared floor."""
        return seq >= self.g1_floor

    # -- allocation (MUST 1) ---------------------------------------------

    def _allocate(self) -> int:
        """Walk from the floor and claim the first marker that does not yet exist.
        The claim is one O_EXCL create; there is no shared race point and no read
        of a current maximum."""
        seq = self.g1_floor
        while True:
            marker = self._p("history", self.locator(seq))
            if _create_exclusive(marker, b""):
                return seq
            seq += 1

    def allocated(self, seq: int) -> bool:
        return os.path.exists(self._p("history", self.locator(seq)))

    # -- admission (AMD 9.2) ---------------------------------------------

    @staticmethod
    def _admit(octets: bytes) -> Optional[str]:
        """Returns None if admissible, else a refusal detail. Tested on the octets
        as delivered, before any framing the store may add."""
        if not octets.startswith(MAGIC):
            return "candidate does not begin with @p-e/x0"
        if not utf8_wellformed(octets):
            return "candidate is not well-formed UTF-8 (Unicode 15.0 Table 3-7)"
        return None

    # -- deposit -----------------------------------------------------------

    def deposit(self, candidate: Candidate) -> Binding:
        octets = candidate.octets

        # (0) the offer itself. AMD *Candidate*: extent is a property of the offer.
        if not isinstance(octets, (bytes, bytearray)):
            raise Refused("NOT_OCTETS", "a candidate is an octet sequence")
        octets = bytes(octets)
        if candidate.extent != len(octets):
            raise Refused(
                "EXTENT_MISMATCH",
                f"offer declares extent {candidate.extent}, delivered {len(octets)}",
            )

        # (1) admission, on the candidate as delivered (AMD 9.2)
        why = self._admit(octets)
        if why:
            raise Refused("NOT_ADMISSIBLE", why)

        # (2) header-block checks that do not need an id yet
        parent = field_value(octets, "parent")
        if parent is not None:
            self._check_parent_scope(parent)  # MUST 5

        # (3) content identity and extent, over the octets exactly as they arrived
        digest = content_identity(octets)  # AMD 9.4: octets, not a decoded string
        extent = len(octets)  # of the delivered candidate, not derived from content

        # (4) allocation. The marker is the persistent, never-removed G1 guard.
        seq = self._allocate()
        loc = self.locator(seq)

        # (5) envelope convention: optional, and when present checked.
        declared = field_value(octets, "id")
        if declared is not None and declared.decode("utf-8") != loc:
            # The id stays allocated: SPEC line 321, "ids being abandoned once taken".
            raise Refused(
                "DECLARED_ID_DISAGREES",
                f"declared id {declared.decode('utf-8')!r} != assigned {loc!r}"
                f" (id {loc} is abandoned and never reused)",
            )

        if self.fault == "after_marker":
            raise StoreFailure("injected fault: after marker, before ledger")

        # (6) THE BINDING. One O_EXCL create associates identity, content identity
        #     and extent at a single moment (AMD *Binding*, MUST 10.1).
        entry = {
            "authority_id": self.authority_id,
            "seq": seq,
            "locator": loc,
            "content_identity": digest,
            "extent": extent,
        }
        blob = json.dumps(entry, sort_keys=True).encode("utf-8")
        if not _create_exclusive(self._p("ledger", loc), blob):
            # Unreachable while the marker guards allocation; kept because MUST 8's
            # create-or-fail must hold of the binding write on its own terms.
            raise Refused("ALREADY_BOUND", f"{loc} is already bound")

        if self.fault == "after_binding":
            raise StoreFailure("injected fault: after ledger, before payload")

        # (7) the record. Bytes durable first, then the names that point at them.
        obj = self._p("objects", digest)
        if not os.path.exists(obj):
            _durable_then_link(self._p("tmp"), obj, octets)  # MAY: dedup, uniform
        rec = self._p("records", loc)
        try:
            os.link(obj, rec)
        except FileExistsError:
            raise Refused("ALREADY_HELD", f"{loc} already holds a record")
        _fsync_dir(self._p("records"))

        return Binding(loc, self.authority_id, seq, digest, extent)

    def _check_parent_scope(self, value: bytes) -> None:
        """MUST 5: `parent` is scoped to the same authority; a cross-authority
        reference is an observation and must be labelled as one, so it may not
        travel in `parent:`."""
        text = value.decode("utf-8")
        if not re.fullmatch(rf"{re.escape(self.authority_id)}-\d+", text):
            raise Refused(
                "PARENT_OUT_OF_SCOPE",
                f"parent {text!r} is not a locator of authority "
                f"{self.authority_id!r}; cross-authority references travel in "
                f"`observes:` and are reported as observations",
            )
        # Deliberately NOT checked: whether the parent exists or is readable.
        # SPEC MUST NOT: "MUST NOT make deposit depend on the parent being
        # present and readable."

    # -- ledger ------------------------------------------------------------

    def _ledger(self, loc: str) -> Optional[dict]:
        path = self._p("ledger", loc)
        try:
            with open(path, "rb") as fh:
                return json.loads(fh.read().decode("utf-8"))
        except FileNotFoundError:
            return None
        except OSError as exc:  # MUST 6: a failure is not absence
            raise StoreFailure(f"ledger read failed for {loc}: {exc}") from exc

    def is_bound(self, loc: str) -> bool:
        return self._ledger(loc) is not None

    # -- visibility (MUST 6) ----------------------------------------------

    def visibility(self, loc: str) -> str:
        entry = self._ledger(loc)
        path = self._p("records", loc)
        try:
            os.stat(path)
            held = True
        except FileNotFoundError:
            held = False
        except OSError as exc:
            # MUST 6: "a failure MUST NOT be reported as absence".
            raise StoreFailure(f"stat failed for {loc}: {exc} ({errno.errorcode.get(exc.errno)})") from exc

        if entry is not None:
            # Bound. Either the octets are here, or the binding and digest are
            # known and the content is not: the two cases MUST 6 enumerates.
            return PRESENT if held else KNOWN_MISSING
        if held:
            raise StoreFailure(f"{loc}: octets held with no binding")
        # Not bound. An id another held record names in a `parent:`/`ref:` header
        # is KNOWN_MISSING; an id nothing names is UNKNOWN. A prose mention in a
        # body establishes nothing (the PROSE_ONLY distinction).
        return KNOWN_MISSING if self._header_referenced(loc) else UNKNOWN

    def _header_referenced(self, loc: str) -> bool:
        for other in self.locators():
            if other == loc:
                continue
            res = self._raw_octets(other)
            if res is None:
                continue
            for name, value in fields(res):
                if name.lower() in ("parent", "ref"):
                    if value.decode("utf-8", "replace").split()[0:1] == [loc]:
                        return True
        return False

    def _raw_octets(self, loc: str) -> Optional[bytes]:
        try:
            with open(self._p("records", loc), "rb") as fh:
                return fh.read()
        except FileNotFoundError:
            return None
        except OSError as exc:
            raise StoreFailure(f"read failed for {loc}: {exc}") from exc

    # -- read (MUST 10.1, 10.3, 10.4, 10.5) -------------------------------

    def read(self, loc: str) -> ReadResult:
        """AMD *Read*. Returns bound-content together with both axes.

        Order is fixed by AMD 10.4: admission before verification, and where both
        would fail the admission failure is what is reported.
        """
        vis = self.visibility(loc)
        entry = self._ledger(loc)
        recorded = entry.get("content_identity") if entry else None
        extent = entry.get("extent") if entry else None

        if vis != PRESENT:
            return ReadResult(loc, vis, NO_CONTENT, None, extent, recorded, None)

        octets = self._raw_octets(loc)
        assert octets is not None  # visibility() just stat'd it

        # 10.4: admission first.
        why = self._admit(octets)
        if why:
            return ReadResult(loc, vis, ADMISSION_FAILED, octets, extent, recorded,
                              content_identity(octets), why)

        # 10.5: a record bound with no recorded content identity is never
        # reported as verified, and 10.1's obligation does not extend to it.
        if recorded is None:
            return ReadResult(loc, vis, UNRECORDED, octets, extent, None, None)

        computed = content_identity(octets)
        integrity = VERIFIED if computed == recorded else MISMATCH
        # 10.3: visibility is unchanged by an integrity disagreement.
        return ReadResult(loc, vis, integrity, octets, extent, recorded, computed)

    def recorded_extent(self, loc: str) -> Optional[int]:
        """Metadata, not a read (AMD *Read*): returns the extent recorded at
        binding, without returning any bound-content."""
        entry = self._ledger(loc)
        return None if entry is None else entry["extent"]

    def stored_extent(self, loc: str) -> Optional[int]:
        """AMD 9.1: extent recovered from the store's own stored form."""
        try:
            return os.stat(self._p("records", loc)).st_size
        except FileNotFoundError:
            return None

    # -- enumeration -------------------------------------------------------

    def locators(self) -> list:
        """Every bound locator, in (authority_id, seq) order.

        SPEC MAY: that order is a convention, never a guarantee, and with one
        authority it says nothing about time.
        """
        out = []
        for name in os.listdir(self._p("ledger")):
            try:
                out.append((self.seq_of(name), name))
            except (StoreFailure, ValueError):
                continue
        return [n for _, n in sorted(out)]

    def allocated_locators(self) -> list:
        out = []
        for name in os.listdir(self._p("history")):
            try:
                out.append((self.seq_of(name), name))
            except (StoreFailure, ValueError):
                continue
        return [n for _, n in sorted(out)]

    def highest_seq_from_this_vantage(self) -> Optional[int]:
        """SPEC MUST NOT: a vantage-limited verdict must not be presented as a
        property of the record. The name carries the vantage; there is no
        `latest()` and no `unreferenced()` in this API."""
        locs = self.locators()
        return self.seq_of(locs[-1]) if locs else None

    # -- references (MUST 5) ----------------------------------------------

    def references(self, loc: str) -> References:
        octets = self._raw_octets(loc)
        if octets is None:
            return References(loc, None, [])
        parent = field_value(octets, "parent")
        observations = []
        for name, value in fields(octets):
            if name.lower() == "observes":
                observations.append(
                    {"reference": value.decode("utf-8"), "kind": "OBSERVATION",
                     "in_chain": False}
                )
        return References(
            loc,
            parent.decode("utf-8") if parent is not None else None,
            observations,
        )

    # -- citation ----------------------------------------------------------

    def cite(self, loc: str) -> Citation:
        """SPEC *Citing a record*: a citation is a (locator, digest) pair within
        one store, and (store identity, locator, digest) across a boundary. This
        returns the triple always; `as_pair()` is the in-store shorthand."""
        entry = self._ledger(loc)
        if entry is None:
            raise StoreFailure(f"{loc} is not bound; nothing to cite")
        return Citation(self.store_identity, loc, entry["content_identity"])

    def resolve(self, citation: Citation) -> ReadResult:
        """Refuses a bare locator, and detects rebinding by comparing digests."""
        if not isinstance(citation, Citation):
            raise Refused("BARE_LOCATOR", "a citation is a (locator, digest) pair")
        if citation.store_identity != self.store_identity:
            raise Refused(
                "FOREIGN_STORE",
                f"citation names store {citation.store_identity!r}, this store is "
                f"{self.store_identity!r}",
            )
        entry = self._ledger(citation.locator)
        if entry is None:
            return ReadResult(citation.locator, self.visibility(citation.locator),
                              NO_CONTENT)
        if entry["content_identity"] != citation.content_digest:
            raise Refused(
                "REBOUND",
                f"{citation.locator} is bound to {entry['content_identity']}, "
                f"citation names {citation.content_digest}",
            )
        return self.read(citation.locator)

    # -- witnessing (MAY, MUST 7, MUST NOT #2) ----------------------------

    def attest(self, witness_name: str, covers: list, kind: str = "b") -> Binding:
        """A witness attestation is itself a record, deposited like any other.
        `kind` is (a), (b) or (c) of SPEC *What a witness does, exactly*; the
        model names which, and the store never upgrades one to another.

        The attestation lists every covered leaf, not proof paths -- SPEC's
        recommendation, on the ground that the author must not be able to
        withhold what verification needs.
        """
        if kind not in ("a", "b", "c"):
            raise Refused("BAD_WITNESS_KIND", "kind is one of a, b, c")
        lines = [b"@p-e/x0", b"kind: witness", f"witness: {witness_name}".encode(),
                 f"witness-kind: {kind}".encode()]
        for c in covers:
            entry = self._ledger(c.locator if isinstance(c, Citation) else c)
            if entry is None:
                raise Refused("WITNESS_OF_UNBOUND", f"{c} is not bound")
            lines.append(f"covers: {entry['locator']} {entry['content_identity']}".encode())
        body = b"\n".join(lines) + b"\n\nleaves published in full; no proof paths\n"
        return self.deposit(Candidate(body, len(body)))

    def witnesses(self, loc: str) -> WitnessReport:
        """MUST 7: absence is reported as absence, in a field whose value says so,
        never as 'no evidence found'."""
        found = []
        for other in self.locators():
            octets = self._raw_octets(other)
            if octets is None:
                continue
            if field_value(octets, "kind") != b"witness":
                continue
            for name, value in fields(octets):
                if name.lower() == "covers" and value.split()[0:1] == [loc.encode()]:
                    found.append(
                        {
                            "attestation": other,
                            "witness": (field_value(octets, "witness") or b"").decode(),
                            "kind": (field_value(octets, "witness-kind") or b"").decode(),
                            "digest_attested": value.split()[1].decode(),
                        }
                    )
        return WitnessReport(
            locator=loc,
            status=WITNESS_PRESENT if found else WITNESS_ABSENT,
            attestations=found,
            orders_records=False,       # MUST NOT: a witness records a cut
            independence_asserted=False,  # the protocol records, never asserts
        )

    # -- 10.5 support ------------------------------------------------------

    def bind_without_recorded_identity(self, octets: bytes) -> Binding:
        """Creates a record bound WITHOUT a recorded content identity, so that the
        store's ability to distinguish those (AMD 10.5) can be exercised. Not part
        of the deposit path: nothing a caller offers can reach this, and it exists
        because 10.5 legislates about records this store's normal path cannot make.
        """
        seq = self._allocate()
        loc = self.locator(seq)
        entry = {"authority_id": self.authority_id, "seq": seq, "locator": loc,
                 "extent": len(octets)}
        _create_exclusive(self._p("ledger", loc), json.dumps(entry, sort_keys=True).encode())
        obj = self._p("objects", content_identity(octets))
        if not os.path.exists(obj):
            _durable_then_link(self._p("tmp"), obj, octets)
        os.link(obj, self._p("records", loc))
        _fsync_dir(self._p("records"))
        return Binding(loc, self.authority_id, seq, "", len(octets))
