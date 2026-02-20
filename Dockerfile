# Multi-stage build for React frontend
# Stage 1: Build React app
FROM node@sha256:c3324aa3efea082c8d294a93b97ba82adc5498a202bd48802f5a8af152e7dd9e AS builder
WORKDIR /app

# Skip Playwright browser downloads (not needed for build)
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Copy package files
COPY package*.json ./

# Install dependencies (skip optional to avoid playwright browsers)
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Cache bust: 2026-02-19-t430
RUN npm run build

# Verify build output
RUN ls -la dist/ && test -f dist/index.html

# Stage 2: Serve with Node.js
FROM node@sha256:c3324aa3efea082c8d294a93b97ba82adc5498a202bd48802f5a8af152e7dd9e
WORKDIR /app

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy the server (using .mjs extension for explicit ES module)
COPY server.mjs ./

# Railway expects port 5000
EXPOSE 5000

# Start the server
CMD ["node", "server.mjs"]
