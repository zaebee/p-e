import { exists, getRelay, listRelays, listReplies, loadRecord, loadStore } from "./store.js";

const [op, arg] = process.argv.slice(2);

switch (op) {
  case "get": {
    if (arg) {
      const record = await loadRecord(arg);
      if (record) {
        console.log(record.bytes);
        break;
      }
    }
    const store = await loadStore();
    const r = arg ? getRelay(store, arg) : null;
    if (!r) {
      // The one thing this tool will not do.
      console.log(`${arg}: ${arg ? exists(store, arg) : "no id given"} — not reconstructed`);
      break;
    }
    console.log(r.bytes);
    break;
  }
  case "exists": {
    const store = await loadStore();
    console.log(`${arg}: ${arg ? exists(store, arg) : "no id given"}`);
    break;
  }
  case "replies": {
    const store = await loadStore();
    for (const r of arg ? listReplies(store, arg) : [])
      console.log(`${r.id}  ${r.kind}  ${r.from}>${r.to}`);
    break;
  }
  case "list": {
    const store = await loadStore();
    const { present, missing } = listRelays(store, arg);
    console.log(`present (${present.length}): ${present.join(" ")}`);
    console.log(`known missing (${missing.length}): ${missing.join(" ") || "—"}`);
    break;
  }
  default:
    console.log("usage: relay <get|exists|replies|list> [id|after]");
}
