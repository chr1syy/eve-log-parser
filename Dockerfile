# Build stage
FROM node:20-alpine AS builder

ARG VERSION

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

RUN npm run generate-changelog

# Runtime stage
FROM node:20-alpine AS runtime

ARG VERSION
ARG GIT_SHA
ARG GIT_TAG
ARG BUILD_TIME

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY --from=builder /app/.next ./.next

COPY --from=builder /app/public ./public

RUN apk add --no-cache curl

EXPOSE 3000

ENV NODE_ENV=production

ENV VERSION=$VERSION
ENV GIT_SHA=$GIT_SHA
ENV GIT_TAG=$GIT_TAG
ENV BUILD_TIME=$BUILD_TIME

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/version || exit 1

CMD ["npm", "start"]
