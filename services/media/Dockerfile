FROM node:20-slim AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages ./packages
COPY services/media ./services/media

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @vibegrid/media-service build

RUN pnpm --filter @vibegrid/media-service deploy --prod /app/deploy

FROM node:20-slim AS runner

WORKDIR /app

COPY --from=builder /app/deploy ./

EXPOSE 3002

CMD ["node", "dist/index.js"]
