# -----------------------------------------------------------------------
# Stage 1: Build the Vue 3 app with Vite
# -----------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm ci

COPY . .

# VITE_API_BASE_URL controls where API requests go.
# In Docker we leave it empty so axios uses relative URLs ("/api/...")
# which nginx then proxies to the backend container.
# Override at build time: docker build --build-arg VITE_API_BASE_URL=http://my-server
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# -----------------------------------------------------------------------
# Stage 2: Serve the built assets with nginx
# -----------------------------------------------------------------------
FROM nginx:1.27-alpine

# Replace the default nginx config with our SPA + proxy config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
