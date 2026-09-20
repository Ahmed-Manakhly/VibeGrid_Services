FROM node:20-slim AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages ./packages
COPY services/auth ./services/auth

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @vibegrid/auth-service build

# Deploy standalone production bundle
RUN pnpm --filter @vibegrid/auth-service deploy --prod /app/deploy

FROM node:20-slim AS runner

WORKDIR /app

COPY --from=builder /app/deploy ./

EXPOSE 8001

CMD ["node", "dist/interface/main.js"]
