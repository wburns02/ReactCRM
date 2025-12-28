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

# Railway networking is configured for port 5000
EXPOSE 5000

# Serve the static files on port 5000 (matching Railway networking config)
# -s enables SPA mode (all routes serve index.html)
CMD ["serve", "-s", "dist", "-l", "tcp://0.0.0.0:5000"]
