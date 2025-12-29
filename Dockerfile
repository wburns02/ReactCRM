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

# Stage 2: Serve with simple Node.js server
FROM node:20-alpine
WORKDIR /app

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy the server
COPY server.js ./

# Railway networking expects port 5000
ENV PORT=5000

# Expose the port
EXPOSE 5000

# Start the server
CMD ["node", "server.js"]
