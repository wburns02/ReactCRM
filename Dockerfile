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

# Railway dynamically assigns PORT via environment variable
# Default to 8080 for local testing
ENV PORT=8080

# Expose the port (Railway will auto-detect this)
EXPOSE 8080

# Serve the static files
# -s enables SPA mode (all routes serve index.html)
# Use sh -c to interpolate the PORT variable
CMD ["sh", "-c", "serve -s dist -l tcp://0.0.0.0:${PORT}"]
