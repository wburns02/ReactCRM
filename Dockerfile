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

# Copy nginx config template
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Railway provides PORT env var - default to 5000 if not set
ENV PORT=5000

# Expose the port (Railway uses PORT env var)
EXPOSE ${PORT}

# nginx:alpine image automatically processes templates in /etc/nginx/templates/
# and replaces ${PORT} with the actual value, outputting to /etc/nginx/conf.d/
CMD ["nginx", "-g", "daemon off;"]
