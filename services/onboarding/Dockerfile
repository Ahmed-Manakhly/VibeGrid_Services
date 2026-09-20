FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages ./packages
COPY services/onboarding ./services/onboarding

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @vibegrid/onboarding-worker exec prisma generate
RUN pnpm --filter @vibegrid/onboarding-worker build

RUN pnpm --filter @vibegrid/onboarding-worker deploy --prod /app/deploy
RUN cp -r /app/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/.prisma /app/deploy/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/ 2>/dev/null || true

FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-req openssl openssl1.1-compat 2>/dev/null || apk add --no-cache openssl

ENV NODE_ENV=production

COPY --from=builder /app/deploy ./

EXPOSE 8004

CMD ["node", "dist/index.js"]
