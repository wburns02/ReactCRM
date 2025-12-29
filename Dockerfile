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

# List build output for debugging
RUN ls -la dist/

# Stage 2: Serve with nginx
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# List copied files for debugging
RUN ls -la /usr/share/nginx/html/

# Railway networking expects port 5000
EXPOSE 5000

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
