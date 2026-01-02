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
RUN npm run build

# Verify build output
RUN ls -la dist/ && test -f dist/index.html

# Stage 2: Serve with Node.js
FROM node:20-alpine
WORKDIR /app

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy the server (using .mjs extension for explicit ES module)
COPY server.mjs ./

# Railway expects port 5000
EXPOSE 5000

# Start the server
CMD ["node", "server.mjs"]
