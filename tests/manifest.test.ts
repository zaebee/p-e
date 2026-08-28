import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadCorpus } from "../src/manifest.js";

function fixture(content: string, sha256: string) {
  const root = mkdtempSync(join(tmpdir(), "p-e-"));
  mkdirSync(join(root, "corpus", "x"), { recursive: true });
  writeFileSync(join(root, "corpus", "x", "a.json"), content);
  writeFileSync(
    join(root, "corpus", "manifest.json"),
    JSON.stringify({
      extracted_at: "2026-08-28T00:00:00.000Z",
      entries: [
        {
          path: "x/a.json",
          sha256,
          bytes: Buffer.byteLength(content),
          producer: "x",
          sourceRepo: "x",
          sourceRev: null,
          tracked: false,
        },
      ],
    }),
  );
  return root;
}

// sha256 of "{}"
const SHA_EMPTY_OBJ = "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a";

describe("loadCorpus", () => {
  it("loads an artifact whose digest matches", async () => {
    const files = await loadCorpus(fixture("{}", SHA_EMPTY_OBJ));
    expect(files.get("x/a.json")).toBeDefined();
  });

  it("refuses an artifact that moved under the manifest", async () => {
    await expect(loadCorpus(fixture('{"moved":1}', SHA_EMPTY_OBJ))).rejects.toThrow(/digest mismatch/);
  });
});
