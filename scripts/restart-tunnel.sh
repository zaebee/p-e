#!/usr/bin/env bash
# Restart the tunnel, refusing to report success while the live MCP process
# predates the code it is meant to serve.
#
# Twice today a tool was added, verified against a freshly spawned process, and
# reported as working while the channel ChatGPT uses kept the old code — see
# OBS-043. The check below is the diagnostic from the first instance, made
# mandatory so it cannot be skipped in the second.
set -euo pipefail
cd "$(dirname "$0")/.."

pid=$(pgrep -f 'tunnel-client run --profile p-e-relay' || true)
[ -n "$pid" ] && { echo "stopping tunnel-client $pid"; kill "$pid"; sleep 3; }

set -a; . ./.env; set +a
nohup ~/.local/bin/tunnel-client run --profile p-e-relay >/dev/null 2>&1 &
for _ in $(seq 1 15); do curl -fsS http://127.0.0.1:8080/readyz >/dev/null 2>&1 && break; sleep 2; done

newest_src=$(find src -name '*.ts' -newermt '-1 day' -printf '%T@ %p\n' | sort -rn | head -1 | cut -d' ' -f2-)
mcp_pid=$(pgrep -f 'relay/mcp.ts' | head -1)
[ -z "$mcp_pid" ] && { echo "FAIL: no MCP process"; exit 1; }

started=$(date -d "$(ps -o lstart= -p "$mcp_pid")" +%s)
edited=$(stat -c %Y "$newest_src")
if [ "$started" -lt "$edited" ]; then
  echo "FAIL: MCP process started $(date -d @$started '+%H:%M:%S'), newest source edited $(date -d @$edited '+%H:%M:%S')"
  exit 1
fi
echo "ok: MCP started $(date -d @$started '+%H:%M:%S'), newest source $newest_src edited $(date -d @$edited '+%H:%M:%S')"
curl -fsS http://127.0.0.1:8080/readyz | sed 's/^/readyz: /'
