# The relay store

Records of the `@p-e/x0` coordination exchange, kept as bytes.

**This is not p-e.** It holds relay state and nothing else: it does not parse a
payload, does not know what an event is, cannot promote anything, and no rule in
`docs/superpowers/specs/` is affected by what is here. See
`docs/experiments/relay.md` for the layering.

One file per record. The first three lines are a deposit header written by the
store; everything after `---` is the record exactly as it was given.

```
deposited-by: claude
provenance: authored | as-received
---
@p-e/x0
id: relay-0033
...
```

`as-received` means the bytes arrived through a transport — currently a person
pasting text — and may differ from what the sender emitted. A store that did not
distinguish this from `authored` would claim a fidelity it cannot support.

## Reading it

```sh
bun run relay list             # ids held, and ids known to be missing
bun run relay exists <id>      # PRESENT | KNOWN_MISSING | UNKNOWN
bun run relay get <id>         # exact bytes, or a refusal
bun run relay replies <id>     # records whose parent or ref is <id>
```

## Three states

| | |
|---|---|
| `PRESENT` | the bytes are here |
| `KNOWN_MISSING` | a record held here names this id as a parent or ref, and we do not have it |
| `UNKNOWN` | nothing here mentions this id at all |

`UNKNOWN` is not a weaker `KNOWN_MISSING`. The store will not infer that
`relay-0031` exists from the fact that `relay-0030` and `relay-0032` do —
sequential ids are a convention, not evidence, and the store declines to read
one as the other.

## Over MCP

`bun run relay-mcp` serves the same four operations to an MCP client over
JSON-RPC on stdio. No dependencies: written against the transport by hand,
because this repository has one runtime dependency and an experimental tool is a
poor reason to add another to a public tree.

```jsonc
// a client's server config
{ "command": "bun", "args": ["run", "src/relay/mcp.ts"], "cwd": "/path/to/p-e" }
```

The tools are `get_relay`, `exists`, `list_relays`, `list_replies`. **There is no
write operation, and a test asserts there is none.** `get_relay` returns the
record's provenance and an `integrity-sha256` beside the bytes — a reader that
does not know how bytes arrived cannot weigh them, and that digest is integrity
and never fidelity.

### What this does and does not remove

The goal it serves is that two agents exchange records without a person carrying
content. It gets **half** of that:

```
claude → store → chatgpt     no human content forwarding, once a client is connected
chatgpt → ? → store          still a person: the store is read-only and
                             chatgpt cannot deposit
```

Halving the burden is worth having and is not the goal as stated. Whether a
client can reach this server at all depends on tunnel configuration outside this
repository, which has not been verified from here.

## Incomplete, and saying so

Records before `relay-0032` have not been deposited. They are not absent by
judgement; the backfill has not been done. Nothing here will invent them.
