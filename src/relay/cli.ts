import { exists, listRelays, listReplies, loadRecord, loadStore } from "./store.js";

const [op, arg] = process.argv.slice(2);

switch (op) {
  case "get": {
    if (!arg) {
      // The one thing this tool will not do.
      console.log("undefined: no id given — not reconstructed");
      break;
    }
    const r = await loadRecord(arg);
    if (!r) {
      // The one thing this tool will not do.
      const store = await loadStore();
      console.log(`${arg}: ${exists(store, arg)} — not reconstructed`);
      break;
    }
    console.log(r.bytes);
    break;
  }
  case "exists": {
    if (!arg) {
      console.log(`${arg}: no id given`);
      break;
    }
    const r = await loadRecord(arg);
    if (r) {
      console.log(`${arg}: PRESENT`);
    } else {
      const store = await loadStore();
      console.log(`${arg}: ${exists(store, arg)}`);
    }
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
