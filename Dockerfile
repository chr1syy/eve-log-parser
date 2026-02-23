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

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY --from=builder /app/.next ./.next

COPY --from=builder /app/public ./public

EXPOSE 3000

ENV NODE_ENV=production

ENV VERSION=$VERSION

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/version || exit 1

CMD ["npm", "start"]