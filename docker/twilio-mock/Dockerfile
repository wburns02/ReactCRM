# Twilio Mock Server
# Simulates Twilio REST API for E2E testing without real SMS

FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install --production

# Copy server code
COPY server.js ./
COPY routes/ ./routes/

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5010/health || exit 1

EXPOSE 5010

CMD ["node", "server.js"]
