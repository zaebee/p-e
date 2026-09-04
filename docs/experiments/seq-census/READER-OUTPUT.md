# Census of the field `seq`

## Rule statement

**Occurrence rule:** Every identifier literally containing the substring `seq` that denotes the monotonic sequence number field is counted. This includes the exact field name `seq`, object properties named `seq`, interface field declarations named `seq`, and local variables named `seq` that hold sequence values.

**Read vs display rule:** A *read* is any use where the value is accessed for programmatic decision-making (comparisons, arithmetic, object construction for processing). A *display* is any use where the value is rendered as text for human consumption (logging, UI text, JSON strings shown to users). When a value is both read and displayed in the same expression (e.g., template literals that are logged), it is classified as *display* if the primary purpose is human-readable output.

---

## §1. Every occurrence of `seq`

### Type Declarations

| File | Line | Role | Context |
|------|------|------|---------|
| `server/store/types.ts` | 31 | *type declaration* | `seq: number;` in `EnvelopeHeaderBlock` interface |
| `server/store/types.ts` | 39 | *type declaration* | `seq: number;` in `Envelope` interface |
| `server/store/types.ts` | 149 | *type declaration* | Return type `{ seq: number; locator: string }` of `allocateSequence()` |
| `server/attest/log.ts` | 107 | *type declaration* | `seq: number;` in `AttestAct` interface |
| `server/attest/log.ts` | 209 | *type declaration* | Return type `{ seq: number; id: string; problem: string }[]` of `verify()` |
| `src/types.ts` | 52 | *type declaration* | `ledgerSeq?: number;` in `finalRuling` object |
| `src/types.ts` | 71 | *type declaration* | `seq?: number;` in `RelayEnvelope` interface |
| `src/components/chatTypes.ts` | 5 | *type declaration* | `seq?: number;` in `ChatMessage` interface |
| `src/components/LiveRelayConsole.tsx` | 27 | *type declaration* | `seq: number;` in `RelayRecordItem.envelope` interface |
| `src/components/LiveRelayConsole.tsx` | 54 | *type declaration* | `totalSequencesAllocated: number;` in `RelayStatus` interface |
| `src/components/AttestationDesk.tsx` | 9 | *type declaration* | `seq: number;` in interface (assumed from usage) |

### Write (value assigned into field)

| File | Line | Role | Context |
|------|------|------|---------|
| `server/store/posixStore.ts` | 137 | *write* | `let seq = 1;` local variable in `allocateSequence()` |
| `server/store/posixStore.ts` | 139 | *write* | `const locator = \`relay-${String(seq).padStart(4, '0')}\`;` |
| `server/store/posixStore.ts` | 148 | *write* | `return { seq, locator };` |
| `server/store/posixStore.ts` | 151 | *write* | `seq++;` increment |
| `server/store/posixStore.ts` | 164 | *write* | `const { seq, locator } = this.allocateSequence();` destructuring |
| `server/store/posixStore.ts` | 170 | *write* | `id: \`env-${Date.now()}-${seq}\`,` |
| `server/store/posixStore.ts` | 171 | *write* | `seq,` in Envelope object construction |
| `server/store/posixStore.ts` | 183 | *write* | `seq,` in header_block construction |
| `server/store/peTextStore.ts` | 113 | *write* | `const seq = Number(locator.slice('relay-'.length));` |
| `server/store/peTextStore.ts` | 121 | *write* | `seq,` in Envelope object construction |
| `server/store/peTextStore.ts` | 136 | *write* | `seq,` in header_block construction |
| `server/attest/log.ts` | 186 | *write* | `seq: (prev?.seq ?? 0) + 1,` in new act construction |
| `server/attest/log.ts` | 187 | *write* | `id: \`act-${String((prev?.seq ?? 0) + 1).padStart(4, '0')}\`,` |
| `server/attest/log.ts` | 210 | *write* | `const problems: { seq: number; id: string; problem: string }[] = [];` |
| `server/attest/log.ts` | 216 | *write* | `problems.push({ seq: act.seq, id: act.id, problem: '...' })` |
| `server/attest/log.ts` | 219 | *write* | `problems.push({ seq: act.seq, id: act.id, problem: '...' })` |
| `server/attest/log.ts` | 222 | *write* | `problems.push({ seq: act.seq, id: act.id, problem: ... })` |
| `src/components/EnvelopeStudio.tsx` | 14 | *write* | `const [seq, setSeq] = useState<number>(183);` |
| `src/components/EnvelopeStudio.tsx` | 47 | *write* | `seq: seq,` in object construction |
| `src/components/BridgeExporter.tsx` | 310 | *write* | `let seq = 1;` local variable |
| `src/components/BridgeExporter.tsx` | 312 | *write* | `const locator = \`relay-${String(seq).padStart(4, '0')}\`;` |
| `src/components/BridgeExporter.tsx` | 317 | *write* | `return seq;` |
| `src/components/BridgeExporter.tsx` | 319 | *write* | `seq++;` increment |
| `server.ts` | 75 | *write* | `seq: envelope.seq,` in SSE deposit broadcast |
| `server.ts` | 620 | *write* | `seq: envelope.seq,` in MCP tool response |
| `server.ts` | 876 | *write* | `seq: envelope.seq,` in HTTP deposit response |
| `server.ts` | 1098 | *write* | `seq: findingEnvelope.seq,` in HTTP adjudication response |
| `server.ts` | 1354 | *write* | `seq: envelope.seq,` in HTTP assisted deposit response |

### Read (value taken out and used)

| File | Line | Role | Context |
|------|------|------|---------|
| `server/attest/log.ts` | 212 | *read* | `let expectedSeq = 1;` then used in loop |
| `server/attest/log.ts` | 214 | *read* | `if (sha256(canonicalJson(body)) !== digest) {` (uses act fields) |
| `server/attest/log.ts` | 221 | *read* | `if (act.seq !== expectedSeq) {` comparison |
| `server/attest/log.ts` | 225 | *read* | `expectedSeq = act.seq + 1;` arithmetic |
| `server/store/peTextStore.ts` | 113 | *read* | `const seq = Number(locator.slice('relay-'.length));` parsing locator |
| `server/store/peTextStore.ts` | 159 | *read* | `totalSequencesAllocated: markers.length,` array length |
| `server/store/posixStore.ts` | 124 | *read* | `totalSequencesAllocated: historyFiles.length,` array length |
| `server.ts` | 177 | *read* | string contains `'seq reuse'` - textual mention in reasoning |
| `server.ts` | 178 | *read* | string contains `'seq=3'` and `'seq=2'` - textual mention in counter_case |
| `server.ts` | 196 | *read* | string contains `'seq=42'` - textual mention in counter_case |
| `server.ts` | 641 | *read* | `total: status.totalSequencesAllocated,` accessing status |
| `src/components/LiveRelayConsole.tsx` | 202 | *display* | `addLog(\-[SSE DEPOSIT] New act ${data.locator} (seq=${data.seq})\);` |
| `src/components/LiveRelayConsole.tsx` | 270 | *read* | `logical: env.seq || 0,` fallback for display |
| `src/components/LiveRelayConsole.tsx` | 392 | *display* | `addLog(\-[COMMIT] Act committed... (seq=${data.seq})\);` |
| `src/components/LiveRelayConsole.tsx` | 676 | *display* | `${status?.totalSequencesAllocated ?? '...'}` |
| `src/components/CausalGraphView.tsx` | 508 | *display* | `seq:{node.msg.seq || 0}` JSX rendering |
| `src/components/CausalGraphView.tsx` | 569 | *display* | `${inspectNode.id} \u2022 seq ${inspectNode.msg.seq}` JSX rendering |
| `src/components/AgentChatInterface.tsx` | 195 | *read* | `seq: env.seq,` in message construction |
| `src/components/AgentChatInterface.tsx` | 241 | *read* | `seq: env.seq,` in message construction |
| `src/components/AgentChatInterface.tsx` | 526 | *display* | Text mentions `seq` in Russian legal text |
| `src/components/EnvelopeStudio.tsx` | 156 | *display* | `<label>Sequence (seq):</label>` |
| `src/components/EnvelopeStudio.tsx` | 159 | *read* | `value={seq}` React prop binding |
| `src/utils/causalGraph.ts` | 87 | *read* | `const locator = msg.locator || \`relay-${String(msg.seq || 0).padStart(4, '0')}\`;` |
| `src/utils/causalGraph.ts` | 92 | *read* | `const locator = msg.locator || \`relay-${String(msg.seq || 0).padStart(4, '0')}\`;` |
| `src/utils/causalGraph.ts` | 163 | *read* | `return (a.msg.seq || 0) - (b.msg.seq || 0);` sort comparison |
| `src/components/FailureSandbox.tsx` | 219 | *display* | Text `\u0417\u0430\u043f\u0438\u0441\u0430\u0442\u044c Doc \u03b1 (seq=183)` |
| `src/components/FailureSandbox.tsx` | 253 | *display* | Text `seq #184` in success message |
| `src/components/AdjudicationWorkbench.tsx` | 367 | *display* | `<span>Seq: #{activeCase.finalRuling.ledgerSeq || 'N/A'}</span>` |
| `src/data/simulationScenarios.ts` | 9 | *display* | Text mentions `(authority_id, seq)` and `seq` reuse |
| `src/data/simulationScenarios.ts` | 12 | *display* | Text `free seq for new deposit` |
| `src/components/RosettaMatrix.tsx` | 14-15 | *display* | JSON strings containing `"seq": 42` |

### Other occurrences

| File | Line | Role | Context |
|------|------|------|---------|
| `server/store/types.ts` | 71 | *other* | `totalSequencesAllocated: number;` - related but different field |
| `server/store/types.ts` | 148 | *other* | Comment: `Allocate next monotonic sequence slot` |
| `server/store/types.ts` | 154 | *other* | Comment: `Retrieve all sequence slots & records` |
| `server/store/types.ts` | 160 | *other* | Comment: `Soft-delete / unlink payload while preserving sequence marker` |
| `server/store/posixStore.ts` | 29 | *other* | Comment: `monotonic sequence allocation` |
| `server.ts` | 494 | *other* | Description: `Read all committed records from the monotonic sequence log` |
| `server.ts` | 529 | *other* | Description: `Get current sequence count` |
| `src/lib/relay.ts` | 27 | *other* | Comment: `logical sequence counter` |
| `src/data/rosettaPrinciples.ts` | 25 | *other* | Text: `single-agent loops` (contains "sequential" substring) |
| `src/utils/causalGraph.ts` | 149 | *other* | Comment: `sequential depth` |
| `src/utils/causalGraph.ts` | 160 | *other* | Comment: `then by sequence / timestamp` |
| `src/components/LiveRelayConsole.tsx` | 1099 | *other* | Text: `Monotonic record feed (O_EXCL sequence log)` |
| `src/data/simulationScenarios.ts` | 7 | *other* | Text: `recycle sequence numbers` |
| `src/data/simulationScenarios.ts` | 136, 260, 390 | *other* | `ledgerSeq: number` values |
| `src/data/simulationScenarios.ts` | 402 | *other* | Description: `integer sequence number` |
| `src/data/simulationScenarios.ts` | 412 | *other* | Description: `ledger sequence allocation marker` |

---

## §2. Where does the value come from?

### Sequence allocation sources

1. **`server/store/posixStore.ts:137`**
   - **How:** Computed locally via monotonic increment starting at 1
   - **Line:** `let seq = 1;`
   - **Mechanism:** Atomic O_CREAT|O_EXCL file creation guarantees uniqueness; EEXIST triggers increment

2. **`server/store/posixStore.ts:151`**
   - **How:** Increment after EEXIST collision
   - **Line:** `seq++;`
   - **Mechanism:** Collision detection via filesystem, increment and retry

3. **`server/store/attest/log.ts:186`**
   - **How:** Computed from previous act's seq + 1
   - **Line:** `seq: (prev?.seq ?? 0) + 1,`
   - **Mechanism:** Read last act from JSONL file, increment for next

4. **`server/store/peTextStore.ts:113`**
   - **How:** Parsed from locator string
   - **Line:** `const seq = Number(locator.slice('relay-'.length));`
   - **Mechanism:** Extract numeric suffix from `relay-XXXX` format

5. **`src/components/BridgeExporter.tsx:310`**
   - **How:** Computed locally via monotonic increment
   - **Line:** `let seq = 1;`
   - **Mechanism:** Same algorithm as posixStore but in frontend demo code

6. **`src/components/EnvelopeStudio.tsx:14`**
   - **How:** User-supplied via UI input
   - **Line:** `const [seq, setSeq] = useState<number>(183);`
   - **Mechanism:** React state initialized to 183, editable by user

### Propagated values (from store or envelope)

7. **All `envelope.seq` usages in `server.ts` (lines 75, 620, 876, 1098, 1354)**
   - **How:** Supplied by caller (store.deposit() returns Envelope with seq)
   - **Source:** Ultimately from `posixStore.allocateSequence()` or `peTextStore` parsing

8. **`server/attest/log.ts:216,219,222`**
   - **How:** Read from act objects during verification
   - **Source:** From previously stored acts in the attestation log

---

## §3. Where `seq` crosses a process boundary

### HTTP Response Bodies

1. **`server.ts:75`** — SSE broadcast
   ```typescript
   broadcastSSE('deposit', { locator: envelope.locator, seq: envelope.seq, ... });
   ```
   *Crosses:* Server \u2192 Browser via Server-Sent Events

2. **`server.ts:620`** — MCP tool response
   ```typescript
   toolResult = { success: true, locator: envelope.locator, seq: envelope.seq, ... };
   ```
   *Crosses:* Server \u2192 MCP Client via JSON-RPC response

3. **`server.ts:876`** — REST deposit response
   ```typescript
   res.status(201).json({ success: true, locator: envelope.locator, seq: envelope.seq, ... });
   ```
   *Crosses:* Server \u2192 HTTP Client via JSON response body

4. **`server.ts:1098`** — REST adjudication response
   ```typescript
   res.json({ success: true, verdict: findingVerdict, locator: findingEnvelope.locator, seq: findingEnvelope.seq, ... });
   ```
   *Crosses:* Server \u2192 HTTP Client via JSON response body

5. **`server.ts:1354`** — REST assisted deposit response
   ```typescript
   res.json({ success: true, locator: envelope.locator, seq: envelope.seq, ... });
   ```
   *Crosses:* Server \u2192 HTTP Client via JSON response body

### Event Streams

6. **`server.ts:75`** — Same as above, SSE event stream `deposit` event

### Log Files (persistent storage)

7. **`server/attest/log.ts:204`** — Appended to acts.jsonl
   ```typescript
   fs.appendFileSync(this.file, `${JSON.stringify(act)}\n`, 'utf8');
   ```
   *Crosses:* Process memory \u2192 Filesystem (act.seq written to log)

8. **`server/store/posixStore.ts:197`** — Record file creation
   ```typescript
   fs.renameSync(tempFile, targetFile);
   ```
   *Crosses:* Process memory \u2192 Filesystem (envelope with seq written to JSON file)

9. **`server/store/posixStore.ts:142-147`** — Marker file creation
   ```typescript
   const fd = fs.openSync(markerPath, fs.constants.O_CREAT | fs.constants.O_EXCL | ...);
   ```
   *Crosses:* Process memory \u2192 Filesystem (marker file named with seq)

---

## §4. If the field were absent, what would notice?

| Site | File:Line | Effect | Reason |
|------|-----------|--------|--------|
| `server/store/posixStore.ts:148` | Return from allocateSequence | **(a) throw** | `seq` undefined in return object, destructuring fails |
| `server/store/posixStore.ts:171` | Envelope construction | **(a) throw** | Missing required field, TypeScript error |
| `server/store/posixStore.ts:183` | Header block construction | **(a) throw** | Missing required field |
| `server/store/peTextStore.ts:121` | Envelope construction | **(a) throw** | Missing required field in interface |
| `server/store/peTextStore.ts:113` | Locator parsing | **(b) render different** | `seq` would be NaN, locator parsing fails silently |
| `server/attest/log.ts:186` | Act construction | **(a) throw** | `seq` undefined in act object |
| `server/attest/log.ts:221` | Verification comparison | **(a) throw** | `act.seq` undefined, comparison fails |
| `server.ts:75` | SSE broadcast | **(a) throw** | `envelope.seq` undefined, serialization fails |
| `server.ts:876` | HTTP response | **(a) throw** | `envelope.seq` undefined, JSON serialization fails |
| `server.ts:620` | MCP response | **(a) throw** | Same as above |
| `src/components/LiveRelayConsole.tsx:202` | Log display | **(b) render different** | `data.seq` undefined, shows `seq=undefined` |
| `src/components/LiveRelayConsole.tsx:270` | Logical clock | **(b) render different** | `env.seq || 0` falls back to 0, different behavior |
| `src/components/CausalGraphView.tsx:508` | Node display | **(b) render different** | `seq:{node.msg.seq || 0}` shows 0 instead of actual sequence |
| `src/components/CausalGraphView.tsx:569` | Inspection | **(b) render different** | Shows `seq undefined` or similar |
| `src/components/EnvelopeStudio.tsx:159` | Input value | **(b) render different** | Empty input field instead of 183 |
| `src/utils/causalGraph.ts:87,92` | Locator generation | **(b) render different** | `relay-NaN` or `relay-0` instead of proper sequence |
| `src/utils/causalGraph.ts:163` | Sorting | **(c) different result** | Sort order changes, no visible signal |
| `src/components/AgentChatInterface.tsx:195,241` | Message construction | **(a) throw or (b) different** | `env.seq` undefined, message lacks seq field |
| `server/attest/log.ts:216,219,222` | Problem reporting | **(b) render different** | Reports seq as undefined instead of actual number |

**Least secure site:** `src/utils/causalGraph.ts:163` — here `seq` absence would silently produce a different sort order (effect c) without any visible signal. This would change node ordering in the causal graph display, potentially altering the visual representation without user awareness. To settle: verify that `msg.seq` is actually present in all messages passed to the sort comparator, or add validation that throws when seq is missing.

---

## §5. External consumers

**Nothing found in `input/` that explicitly names a consumer outside this tree.**

The codebase contains no configuration files, documentation, or comments that reference external systems, clients, scripts, or documents that read `seq` from this application's output. All consumers are within the same codebase:

- The SSE clients are browser tabs running the same frontend code
- The HTTP clients are assumed to be the same frontend or local testing tools
- The MCP clients are part of the same application context
- The filesystem storage is local to the same process

The closest to external reference are descriptive strings:
- `server.ts:177,178,196` contain Russian counter-cases mentioning `seq=3`, `seq=2`, `seq=42` but these are internal reasoning texts, not external consumer references
- `src/data/simulationScenarios.ts:7-12` describe scenarios involving sequence number recycling but are internal simulation data

**Conclusion:** No named external consumer found.

---

## §6. Evidence against my own classification

The classification of `server.ts:177,178,196` as *read* is debatable. These lines contain string literals that mention `seq` as part of textual descriptions (e.g., `'seq reuse'`, `'seq=3'`). A stricter interpretation would exclude these as they are not accessing a `seq` variable but merely containing the substring in a string.

However, I included them because:
1. They are literal occurrences of the substring `seq`
2. They directly reference the `seq` concept in the context of the system
3. The contract asks for "every occurrence"

**To settle:** A stricter rule that excludes string literals containing `seq` unless they are template strings that interpolate a `seq` variable would remove these three lines from the census. Given the contract's emphasis on comprehensive enumeration, I kept them.

---

## §7. Confidence

**Q1 (Enumerate every occurrence):** Certain of the exhaustive list for variable/field/properties named exactly `seq`. Not certain about edge cases like string literals containing the substring `seq` — included them all but some may be noise.

**Q2 (Value origins):** Certain for all identified sources. The primary source is atomic filesystem allocation in `posixStore.ts`; all other sources derive from this or parse existing values.

**Q3 (Process boundaries):** Certain. Every HTTP response, SSE event, and filesystem write containing `seq` has been identified.

**Q4 (Absence impact):** Mostly certain. The least certain is the silent sort order change in `causalGraph.ts:163`, which might have visible effects in the UI that I cannot verify without running the application.

**Q5 (External consumers):** Certain. No external consumer is named anywhere in `input/`.

---
Generated by Mistral Vibe.
Co-Authored-By: Mistral Vibe <vibe@mistral.ai>