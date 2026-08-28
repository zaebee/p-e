/**
 * Deposit a record from a file or stdin, through the guard.
 *
 * Exists so that writing a record locally cannot be done with `>`. On
 * 2026-08-28 a shell redirect destroyed another participant's deposit while the
 * guard that forbids it sat one function away, unused because the local path
 * did not go through it.
 *
 *   bun run relay-put <file> [id]
 *   … | bun run relay-put - [id]
 */
import { readFile } from "node:fs/promises";
import { depositLocal } from "../src/relay/deposit.js";

const [source, id] = process.argv.slice(2);
if (!source) {
  console.error("usage: relay-put <file|-> [id]");
  process.exit(1);
}

const bytes = source === "-" ? await Bun.stdin.text() : await readFile(source, "utf8");
const r = await depositLocal(bytes, "claude", id);
console.log(`stored ${r.id}  id chosen by ${r.idSource}  sha256 ${r.sha256}`);
