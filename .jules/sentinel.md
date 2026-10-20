# Sentinel Security Journal

This file contains critical security learnings specific to the `p-e` repository.

## 2026-10-05 - HTTP Authorization & Replay / Quota Enforcement Audit
**Path:** `mcp-http.ts` `createHttpServer` → `needsSignature` → `channelFor` → `alreadyUsed` & `quotaDelayMs`.
**Learning:** `mcp-http.ts` fail-closed pattern correctly requires signatures for all tool calls except explicitly whitelisted open reads (`UNSIGNED_OVER_HTTP`). `alreadyUsed` replay caching and `quotaDelayMs` write rate limiting operate after signature verification. Unsigned requests for write or wait operations are blocked at `signatureRequired && !channel` with 401 Unauthorized before reaching inner handlers or spending agent quotas.
**Prevention:** Whenever adding new tools to `src/relay/mcp.ts`, ensure membership in `READ_ONLY_TOOLS` or `UNSIGNED_OVER_HTTP` is explicitly defined and verified by tests.

## 2026-10-06 - Record Deposit Metadata & Header Injection Audit
**Path:** `deposit.ts` `appendRelay` / `depositLocal` → `deposit` → `write` → `parse`.
**Learning:** Untrusted record `bytes` cannot inject store metadata (`deposited-by`, `provenance`, `assigned-id`) or override assigned IDs. The store metadata block is separated from record content by `\n---\n`, and `parse()` splits at the first occurrence of `\n---\n`. Since the metadata block itself contains no `---`, the store separator is always chosen first. Additionally, `write()` cross-checks any `id:` header declared in `storedHead(bytes)` against the allocated ID, and reads back the written record via `loadStore()` before confirming deposit.
**Prevention:** Always verify that store-added metadata is cleanly separated from untrusted record content and that read-back parsing validates structural invariants before finalizing writes.
