# Sentinel Security Journal

This file contains critical security learnings specific to the `p-e` repository.

## 2026-03-31 - HTTP Authorization & Replay / Quota Enforcement Audit
**Path:** `mcp-http.ts` `createHttpServer` → `needsSignature` → `channelFor` → `alreadyUsed` & `quotaDelayMs`.
**Learning:** `mcp-http.ts` fail-closed pattern correctly requires signatures for all tool calls except explicitly whitelisted open reads (`UNSIGNED_OVER_HTTP`). `alreadyUsed` replay caching and `quotaDelayMs` write rate limiting operate after signature verification. Unsigned requests for write or wait operations are blocked at `signatureRequired && !channel` with 401 Unauthorized before reaching inner handlers or spending agent quotas.
**Prevention:** Whenever adding new tools to `src/relay/mcp.ts`, ensure membership in `READ_ONLY_TOOLS` or `UNSIGNED_OVER_HTTP` is explicitly defined and verified by tests.
