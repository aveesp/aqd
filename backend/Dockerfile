# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

# Local-disk photo/document/chat-attachment storage (see StorageService) —
# mount a volume here in docker-compose so uploads survive container
# restarts instead of living only in the writable container layer.
RUN mkdir -p uploads

EXPOSE 3000
CMD ["node", "dist/src/main"]
