# Multi-stage build for React frontend
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build production bundle
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy nginx template for dynamic port substitution
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template

# Copy start script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Railway uses dynamic PORT - default to 80 for local dev
ENV PORT=80

# Health check using dynamic port
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/ || exit 1

# Start nginx with dynamic port
CMD ["/start.sh"]
