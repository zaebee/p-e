# Who deposited this? — research on identity for the relay

**2026-09-04.** Prompted by a question about `from` and `deposited-by`: we cannot show that a
sender is who it says it is. Everything below is checked against a source, and the sources are
named inline.

## What this project already decided, and had forgotten it decided

Before looking outward. `src/relay/deposit.ts` says it plainly:

> **`deposited-by: mcp`.** A fact about the channel, not a claim about identity. Writing `chatgpt`
> would assert something no part of this system observed; writing `claude` would be false. The
> store records that a call arrived over this transport, which is what it saw.

And beside it:

> **`provenance: as-received`, always.** A caller reaching it through MCP is unauthenticated, so
> `authored` — which asserts depositor and sender are one — cannot be established here.

So the shape is already right. `from` is a **claim**; `deposited-by` is an **observation about the
transport**; `authored` is the assertion we cannot make. `relay-0263` deferred attribution to
"layer 3", `relay-0265` recorded that `authority` is a claim rather than a verified fact, and
[#51](https://github.com/zaebee/p-e/issues/51) records that `signature` was in the v0.1 envelope
and left v0.12 with nothing saying why.

**What is missing is not the model. It is the one mechanism that would make `authored`
establishable.**

## What is already running in `~/projects/aura`

Not hypothetical, and not mine to design from scratch:

- **Ed25519-signed HTTP.** `X-Agent-ID`, `X-Timestamp`, `X-Signature`.
- **Signature covers `METHOD + PATH + TIMESTAMP + BodyHash`** — so the body is bound in without
  the signature living inside it.
- **`did:key:public_key_hex`** as the identity form.
- **ERC-8004 work in progress** in `proto/aura/core/v1/metabolism.proto`.

The second point is the one that matters here, and it is the same instinct as gRPC's: **the
credential travels beside the payload, and commits to it by hash.**

## The field, as of now

### ERC-8004 — Trustless Agents

Three on-chain registries: **Identity** (ERC-721 agent identities), **Reputation** (a standard
interface for feedback signals), **Validation** (hooks for validator contracts). Proposed August
2025, on Ethereum mainnet **29 January 2026**, with deployments on Avalanche, BNB Chain, Base
Sepolia, Linea Sepolia and Hedera.

**What it gives us:** portable identity across systems, and reputation that outlives one relay.
**What it costs:** a chain in the loop, and an answer to "who pays gas" for every identity.
**Where it fits:** the outer ring — who an agent *is* across the world — not the inner question of
whether this particular deposit came from that agent.

### Attenuating Agent Tokens — IETF draft, expires December 2026

`draft-niyikiza-oauth-attenuating-agent-tokens-01`. Signed JWTs carrying `cnf.jwk` (the holder's
public key), `del_depth`, `par_hash`, and `authorization_details`. Each derivation must **narrow**
authority, formalised as a **subsumption relation** with typed constraint rules; anything not
explicitly permitted **MUST be rejected**. Presentation requires a **proof of possession**: the
presenter signs a PoP JWT with the leaf token's private key.

And the line that matters most to us:

> Verification requires only the token chain and the trust anchor public key. **No network calls
> or authorization server availability are required.**

Offline, chain-verifiable delegation. That is the right shape for a store that must be readable
years later.

But also:

> **How token chains are carried to enforcement points is deployment-specific; this document does
> not define a transport binding.**

**The transport binding is exactly what was proposed in the question, and it is exactly what no
standard defines.**

### AIP — Agent Identity Protocol, March 2026

`draft-prakash-aip-00`, and arXiv 2603.24775. Its finding first:

> A scan of approximately **2,000 MCP servers found all lacked authentication.**

Ours included, and last night's work on `webmcp#288` is the same hole seen from the browser.

AIP's primitive is the **Invocation-Bound Capability Token** — identity, attenuated authorization
and **provenance binding** fused into one **append-only token chain**. Two modes: JWT + Ed25519
for one hop, **Biscuit with append-only blocks** and Datalog for multi-hop. **Protocol bindings for
MCP and A2A.** Compact-mode verification measured at 0.049 ms in Rust, 0.22 ms overhead over
no-auth in MCP-over-HTTP.

A single token is meant to answer: *who authorized this, through which agents, with what scope at
each hop, and what was the outcome.*

That is our question, in our transport, with numbers.

### The attenuation lineage — macaroons, Biscuit, UCAN

**Macaroons** — chained caveats narrowing authority, HMAC-based, cheap; but authority is rooted in
the *originating server*. **Biscuit** — public-key signatures, offline attenuation, signed blocks,
a small Datalog for facts and checks carried in the token. **UCAN** — each delegation must restate
or diminish; rooted in the *user* rather than a server.

For us the relevant axis is where authority is rooted. A relay whose parties are peers wants
Biscuit or UCAN rooting, not macaroon rooting.

## The finding I did not expect

**Sigstore exists to solve the problem a badge would create here, and we already have its answer.**

Fulcio issues a certificate valid for about **ten minutes**, binding an ephemeral key to an OIDC
identity. The artifact is signed with that key. Then the signature and the certificate go into
**Rekor** — an append-only, Merkle-tree transparency log.

> **The inclusion in the log is what enables later verification without the original certificate
> still being valid** — by the time you verify, the ten-minute certificate is expired, but the
> Rekor entry proves the certificate was valid at signing time.

That is the whole problem with a badge in an immutable store, and it is solved by a log that is
append-only, hash-chained and digest-verified.

**We are that log.** 820 records, `parent-sha256` on every one, `check-continuity` over the whole
chain, and a store that refuses deletion by capability. We do not need Rekor. **We need to notice
that we already built one and never used it for this.**

## What follows, stated as a design and not as a decision

Nothing here is adopted. This is what the sources make available.

**1. `from` stays a claim.** It is already documented as one. No mechanism should pretend otherwise,
and the corpus already refuses to.

**2. `deposited-by` stays a fact about the channel — and becomes a checkable one.** Today it holds
`local`, `mcp`, `proxy`: what the store saw. With a handshake it holds *what the store saw, plus
the thumbprint of the key that presented itself on that channel*. Still an observation, still not a
claim about identity — but now one a later reader can test.

**3. The badge lives outside the hashed body.** §7.1 stage 1 hashes wire octets. A credential
inside the act would change every digest, and would freeze an expiring token into a permanent
record. Beside the payload, committing to it by hash — aura's `BodyHash`, gRPC's metadata, AIP's
invocation binding — all three do this and for the same reason.

**4. `provenance: authored` becomes establishable.** If the key that presented on the channel also
signed the act's canonical bytes, then depositor and sender are one, and the store observed it
rather than being told it. That is the field's own definition, currently unreachable.

**5. Expiry stops mattering.** The badge can be short-lived, because the record's position in the
chain is the durable witness that it was valid at deposit. Sigstore's whole architecture is this
sentence, and our store already has the property that makes it work.

## What this does not answer

**Who mints.** A badge implies an issuer, and this project has no authority and
[#23](https://github.com/zaebee/p-e/issues/23) records that authority genesis is not searchable
from the store. Every option above assumes a trust anchor and we do not have one.

**Whether a self-signed badge is worth anything.** If an agent mints its own key and presents it,
the store learns that *the same key* deposited twice — continuity of a pseudonym, not identity.
That may be all we need, and it may be much cheaper than everything above. It is not researched
here.

**What breaks in the store.** Adding a field to the deposit path touches `deposit.ts`, the record
header grammar, `check-continuity`, and every reader. None of that is costed.

## Sources

ERC-8004 on [eco.com](https://eco.com/support/en/articles/13221214-what-is-erc-8004-the-ethereum-standard-enabling-trustless-ai-agents)
and [erc-8004/erc-8004-contracts](https://github.com/erc-8004/erc-8004-contracts) ·
[draft-niyikiza-oauth-attenuating-agent-tokens](https://datatracker.ietf.org/doc/draft-niyikiza-oauth-attenuating-agent-tokens/) ·
[AIP, draft-prakash-aip-00](https://www.ietf.org/archive/id/draft-prakash-aip-00.html) and
[arXiv 2603.24775](https://arxiv.org/abs/2603.24775) ·
[UCAN specification](https://ucan.xyz/specification/) ·
[Rekor](https://safeguard.sh/resources/blog/rekor-transparency-log) and
[Sigstore docs](https://docs.sigstore.dev/cosign/signing/overview/) ·
`~/projects/aura` README and `apply_erc8004_changes.py` · `src/relay/deposit.ts`
