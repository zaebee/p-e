# Sentinel Security Journal

This file contains critical security learnings specific to the `p-e` repository.

## 2026-08-31 - Header Block Isolation across CRLF Line Endings
**Vulnerability:** Records using CRLF line endings (`\r\n\r\n`) failed string matching on `\n\n`, causing `headerBlock`, `prose`, and `strandedHeaders` to treat the entire record body as part of the header block. This allowed header spoofing by placing header-like lines in body text.
**Learning:** `indexOf("\n\n")` does not match `\r\n\r\n` because `\r` sits between the newline characters. Using `/(?:\r?\n){2}/` correctly identifies double-newline boundaries for both LF and CRLF.
**Prevention:** Use line-ending agnostic regexes when separating envelope headers from body text in protocol records.
