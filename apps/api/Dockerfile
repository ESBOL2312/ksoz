# syntax=docker/dockerfile:1
# Контекст сборки — корень репозитория (npm workspaces).

FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

# build: все зависимости + исходники; этот этап же запускает тесты (target: build)
FROM base AS build
RUN npm ci
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build

FROM base AS prod-deps
RUN npm ci --omit=dev --workspace @ksoz/api --workspace @ksoz/shared

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/packages/shared/package.json packages/shared/package.json
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/api/package.json apps/api/package.json
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/drizzle apps/api/drizzle
USER node
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "dist/main.js", "serve"]
