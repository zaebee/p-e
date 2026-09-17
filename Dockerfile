# The relay MCP server over stdio, for registries that start a server to list
# its tools (Glama). It serves a SNAPSHOT: the records in relay/ at build time.
#
# Only src/ and relay/ are copied, never the build context wholesale, so a .env
# in the checkout cannot reach an image layer. .dockerignore says the same thing
# a second time, for anyone who later changes these COPY lines.
#
# The store is owned by root and the server runs as `bun`, so append_relay is
# refused here. That is deliberate: a record appended inside a throwaway
# container would be a record no one else ever sees, under an id the real store
# will assign to something else.
FROM oven/bun:1.3-slim

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile --ignore-scripts
COPY src ./src
COPY relay ./relay

USER bun
ENTRYPOINT ["bun", "--no-env-file", "run", "src/relay/mcp.ts"]
