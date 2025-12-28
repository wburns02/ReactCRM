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

# Stage 2: Serve with lightweight Node.js server
FROM node:20-alpine

WORKDIR /app

# Install serve globally (version 14 for stability)
RUN npm install -g serve@14

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Railway injects PORT=8080 - use that port
# serve uses the PORT env var automatically with -l flag
EXPOSE 8080

# Serve the static files on Railway's PORT (defaults to 8080)
# -s enables SPA mode (all routes serve index.html)
# -l with PORT env var - Railway sets PORT=8080
CMD ["sh", "-c", "serve -s dist -l tcp://0.0.0.0:${PORT:-8080}"]
