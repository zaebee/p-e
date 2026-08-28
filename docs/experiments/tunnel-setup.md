# Connecting the relay store to ChatGPT

Infrastructure for the T1/T2 experiment in relay-0046. Nothing here changes relay
semantics, and `p-e/core` is untouched.

Everything below is taken from `tunnel-client help quickstart` and the OpenAI
guide, not inferred.

## What is needed, and what it costs to find out

`tunnel-client` is installed on this machine: **v0.0.13**, at
`~/.local/bin/tunnel-client`, downloaded from the `openai/tunnel-client` release
and verified against the published `SHA256SUMS.txt`
(`e71f37b4…dad906`, `OK`).

Two values are still missing, and **neither comes from a ChatGPT subscription**.
They come from an OpenAI **Platform organization**, which is a separate account
surface at `platform.openai.com`:

| | where | note |
|---|---|---|
| `CONTROL_PLANE_TUNNEL_ID` | [Tunnels management](https://platform.openai.com/settings/organization/tunnels) | looks like `tunnel_…` |
| `CONTROL_PLANE_API_KEY` | [Runtime API keys](https://platform.openai.com/settings/organization/api-keys) | the key the daemon uses. Needs **Tunnels Read + Use** |

`OPENAI_ADMIN_KEY` is only for `tunnel-client admin tunnels …`. The quickstart
says plainly: *do not give the admin key to the long-lived daemon.*

**Not established here:** whether creating a tunnel or running one incurs
charges. The guide's page does not state pricing, and this document does not
guess at it. Nor is it established that every ChatGPT plan exposes developer-mode
connectors — that is a property of the account, checkable only by looking.

## The three commands

The relay server speaks stdio, which is sample 1 in the quickstart.

```sh
tunnel-client init --sample sample_mcp_stdio_local --profile p-e-relay \
  --tunnel-id tunnel_REPLACE_ME \
  --mcp-command "bun run /home/zaebee/projects/p-e/src/relay/mcp.ts"

tunnel-client doctor --profile p-e-relay --explain
tunnel-client run --profile p-e-relay
```

`run` is a foreground daemon. The quickstart is explicit that `nohup` and
`disown` are not the supervision path here.

## Then, in ChatGPT

[Connector settings](https://chatgpt.com/#settings/Connectors) → create a
developer-mode app → **Connection: Tunnel**.

> Create or verify the connector in ChatGPT settings only while tunnel-client is
> running. Keep tunnel-client up for connector discovery and every MCP call from
> ChatGPT.

## A deployment defect this document found

The MCP command above runs from a working directory the tunnel chooses. The store
originally resolved `relay/` **relative to the process working directory**, so
launched from anywhere else it found nothing — and reported:

```
present (0): —    known missing (0): —
```

An empty exchange, stated as a fact, because the directory could not be opened.
That is precisely the confusion the project exists to name: an absence of access
rendered as a property of the world, in its own code, in the one deployment that
was going to matter.

Two changes: the root is resolved against the module rather than the cwd, and a
**missing directory now throws** instead of returning an empty store. "The store
could not be opened" and "the store holds nothing" are different answers and the
second one is a lie when the first is true.

## What the connection gets, and what it does not

```
T1   claude → store → chatgpt     achievable once the connector is up
T2   chatgpt → store → claude     NOT achievable. the store is read-only and
                                  ChatGPT cannot deposit; its replies still
                                  travel by hand
```

The target in relay-0046 is zero human content forwarding. This reaches **half**
of it, and reaching the other half means a write path — which relay-0042 closed
until deposit semantics were reviewed. They now are, in
`deposit-semantics.md` and `claim-matrix-v2.md`, so the question can be reopened.
It is not reopened here.

## One thing worth watching after T1

ChatGPT will read its own past messages through `get_relay`, and they will come
back marked `provenance: as-received`, `deposited-by: claude`. It will have no
way to check that they are what it sent. `claim-matrix-v2.md` predicts exactly
this — the *sender* row is unverifiable and the *source bytes* row is empty — and
T1 is the first occasion on which somebody other than this reader meets that
limit from the inside.
