FROM node:20-alpine

# Build tools required for better-sqlite3's native bindings
RUN apk add --no-cache python3 make g++ wget

WORKDIR /app

# Install dependencies first (layer-cached unless package.json changes)
COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ ./src/

# Create default data directory; overridden by volume mount at runtime
RUN mkdir -p /data/covers

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "src/index.js"]
