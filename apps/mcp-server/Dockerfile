# Build from the repository root:
#   docker build -f apps/mcp-server/Dockerfile -t mcp-saas-starter-mcp .

FROM node:22-bookworm-slim AS build

RUN corepack enable && corepack prepare pnpm@10.17.1 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=@mcp-saas-starter/mcp-server
# dist/ is gitignored. Each package lists it in "files" so deploy still packs the build.
RUN pnpm --filter=@mcp-saas-starter/mcp-server --legacy deploy --prod /out

FROM node:22-bookworm-slim AS run

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001

WORKDIR /app
COPY --from=build --chown=node:node /out /app

USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3001) + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/index.js"]
