# syntax=docker/dockerfile:1
# Контекст сборки — корень репозитория (npm workspaces).

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci
COPY packages/shared packages/shared
COPY apps/web apps/web
ARG VITE_API_URL=/api
ARG VITE_BOT_USERNAME=ksoz_bot
# пусто в проде; задайте Telegram id, чтобы открывать сборку в обычном браузере (нужен NODE_ENV=development у API)
ARG VITE_DEV_USER=
ENV VITE_API_URL=$VITE_API_URL VITE_BOT_USERNAME=$VITE_BOT_USERNAME VITE_DEV_USER=$VITE_DEV_USER
RUN npm run build -w @ksoz/web

FROM nginx:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
