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
#
# That refusal is a property of how the image is run, not of the server, and
# the run can undo it:
#   --user root (or the store's uid)  appends land in the container's copy — a
#                                     divergent store, the thing refused above
#   -v <store>:/app/relay              with a user that can write there,
#                                     appends land in THAT store as
#                                     `deposited-by: mcp`, unsigned
# Do not run either against a store anyone else reads. (relay-1161, C2)
#
# Two consequences of a store that cannot grow (relay-1161, A1 and A2):
# wait_for_relay can only time out, after 30s by default and 90s at most; and
# nothing in the handshake says how old the snapshot is — list_relays is the
# only way to learn the newest id it holds.
# Since #235 there are two guards, and only one of them is here. `writeProblem`
# refuses any store inside a git working tree — which is what protects a
# registry's own image, because a registry clones the repository and `.git`
# lands beside `relay/`. This image copies no `.git`, so that guard does not
# fire in it and the ownership above is the one doing the work.
FROM oven/bun:1.3-slim

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile --ignore-scripts
COPY src ./src
COPY relay ./relay

# The registry's proof that this image belongs to the server record it is
# published under: mcp-publisher checks this exact label against `name` in
# server.json and refuses the publish when they differ.
LABEL io.modelcontextprotocol.server.name="io.github.zaebee/p-e"

USER bun
ENTRYPOINT ["bun", "--no-env-file", "run", "src/relay/mcp.ts"]
