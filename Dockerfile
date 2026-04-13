# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN VITE_API_BASE_URL="" npm run build

# Stage 2: Runtime
FROM node:20-alpine
WORKDIR /app

# Install Python and build tools for native C extensions
RUN apk add --no-cache python3 py3-pip build-base python3-dev libffi-dev

# Install PM2 globally
RUN npm install -g pm2

# Install Backend Node.js Dependencies
COPY backend/package*.json ./
RUN npm install

# Copy all backend files to /app (so server.js can find its modules correctly)
COPY backend/ ./

# Install Python Bot Dependencies
RUN pip install --no-cache-dir \
    motor \
    pymongo \
    dnspython \
    tgcrypto \
    'pyrogram~=2.0.59' \
    'aiohttp>=3.9.0' \
    --break-system-packages -r vj_bot/requirements.txt

# Copy Frontend Build
COPY --from=frontend-builder /app/frontend/dist ./public

# Copy PM2 Config
COPY ecosystem.config.js ./

ENV PORT=8000
EXPOSE 8000

CMD ["pm2-runtime", "ecosystem.config.js"]
