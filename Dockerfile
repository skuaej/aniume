# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
ENV VITE_API_BASE_URL=""
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine
WORKDIR /app

# Install Python and build tools for native modules
RUN apk add --no-cache python3 py3-pip build-base python3-dev

# Install PM2 globally
RUN npm install -g pm2

# Install Backend Dependencies
COPY backend/package*.json ./
RUN npm install

# Copy Backend Code
COPY backend/ ./backend/

# Install Bot Dependencies
RUN pip install --no-cache-dir -r backend/vj_bot/requirements.txt --break-system-packages

# Copy Frontend Build to Public
COPY --from=frontend-builder /app/frontend/dist ./public

# Copy PM2 Config
COPY ecosystem.config.js ./

ENV PORT=8000
EXPOSE 8000

# Start both services
CMD ["pm2-runtime", "ecosystem.config.js"]
