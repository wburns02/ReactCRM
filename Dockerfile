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

# Railway injects PORT environment variable dynamically
# Default to 3000 for local development only
ARG PORT=3000
ENV PORT=${PORT}

# Serve the static files on Railway's dynamic port
# -s enables SPA mode (all routes serve index.html)
# The serve package will print "Serving!" on the port which Railway auto-detects
CMD ["sh", "-c", "echo 'Starting server on port' $PORT && serve -s dist -l $PORT"]
