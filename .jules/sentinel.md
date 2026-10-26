# Sentinel Security Journal

This file contains critical security learnings specific to the `p-e` repository.

## 2026-10-05 - HTTP Authorization & Replay / Quota Enforcement Audit
**Path:** `mcp-http.ts` `createHttpServer` → `needsSignature` → `channelFor` → `alreadyUsed` & `quotaDelayMs`.
**Learning:** `mcp-http.ts` fail-closed pattern correctly requires signatures for all tool calls except explicitly whitelisted open reads (`UNSIGNED_OVER_HTTP`). `alreadyUsed` replay caching and `quotaDelayMs` write rate limiting operate after signature verification. Unsigned requests for write or wait operations are blocked at `signatureRequired && !channel` with 401 Unauthorized before reaching inner handlers or spending agent quotas.
**Prevention:** Whenever adding new tools to `src/relay/mcp.ts`, ensure membership in `READ_ONLY_TOOLS` or `UNSIGNED_OVER_HTTP` is explicitly defined and verified by tests.

## 2026-10-20 - Record Deposit Metadata & Header Injection Audit
**Path:** `deposit.ts` `appendRelay` / `depositLocal` → `deposit` → `write` → `parse`.
**Learning:** Untrusted record `bytes` cannot inject store metadata (`deposited-by`, `provenance`, `assigned-id`) or override assigned IDs. The store metadata block is separated from record content by `\n---\n`, and `parse()` splits at the first occurrence of `\n---\n`. The metadata block itself contains no `---` line because the one caller-supplied value in it, `deposited-by`, is refused if it contains whitespace or control characters (`deposit.ts` `deposit`); without that guard a newline in the depositor name would add a line above `---`. So the store separator is always chosen first. Additionally, `write()` cross-checks any `id:` header declared in `storedHead(bytes)` against the allocated ID, and reads back the written record via `loadStore()` before confirming deposit.
**Prevention:** Always verify that store-added metadata is cleanly separated from untrusted record content and that read-back parsing validates structural invariants before finalizing writes.

## 2026-10-25 - Local Deposit & Relayer Delivery Path Traversal Audit
**Path:** `scripts/put-relay.ts` → `checkParentDigest` → `ID.test(parent)` & `src/relay-lite/publish.ts` → `publish` → `target !== join(inDir, basename(target))`.
**Learning:** `scripts/put-relay.ts` validates `parent` headers against `ID.test(parent)` (`^relay-\d{4}$`) prior to `join(relayRoot, "${parent}.txt")` `readFile` lookups, preventing path traversal attacks via untrusted parent header declarations. Similarly, `src/relay-lite/publish.ts` validates that the constructed target path matches `join(inDir, basename(target))`, preventing CNS delivery targets from escaping the `in/` directory.
**Prevention:** Ensure all file system paths constructed from untrusted headers or identifiers validate string shapes or compare normalized path basenames prior to file system operations.
