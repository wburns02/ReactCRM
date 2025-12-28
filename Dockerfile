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

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy built React app to nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Railway expects port 5000
EXPOSE 5000

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
