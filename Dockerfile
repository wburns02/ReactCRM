# Multi-stage build for React frontend
# Stage 1: Build React app
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build production bundle
# VITE_API_URL is injected via Railway environment variables at build time
RUN npm run build

# Stage 2: Serve with nginx (production-grade static file serving)
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Railway networking expects port 5000
EXPOSE 5000

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
