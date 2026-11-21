FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages ./packages
COPY services/realtime ./services/realtime

RUN pnpm install --frozen-lockfile
RUN pnpm --filter "@vibegrid/*" build
RUN pnpm --filter @vibegrid/realtime-service build

RUN pnpm --filter @vibegrid/realtime-service deploy --prod /app/deploy

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/deploy ./

EXPOSE 8005

CMD ["node", "dist/index.js"]
