# ═══════════════════════════════════════════════════════════════════
# SMART-INFRA AI — FRONTEND SERVICE DOCKERFILE
# Multi-stage build: Node.js 20 build -> Nginx Alpine production server
# ═══════════════════════════════════════════════════════════════════

# Stage 1: Build the React + Vite static bundle
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies using cached layer with legacy peer deps for leaflet compatibility
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code and build production bundle
COPY . .
RUN npm run build

# Stage 2: Serve with lightweight Nginx web server
FROM nginx:alpine

# Remove default Nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy built static files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration with reverse proxy & routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
