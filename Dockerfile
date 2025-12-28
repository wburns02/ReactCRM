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

# Stage 2: Serve with Node.js
FROM node:20-alpine

WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Railway networking routes to port 5000 by default
# Use port 5000 to match Railway's expected port
EXPOSE 5000
ENV PORT=5000

# Serve the static files
# -s enables SPA mode (all routes serve index.html)
CMD ["sh", "-c", "serve -s dist -l $PORT"]
