# --- Build Stage ---
FROM node:18-alpine AS builder

WORKDIR /app

# Copy deps
COPY package.json package-lock.json* ./
RUN npm install

# Copy source
COPY . .

# Build
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# --- Runtime Stage ---
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Install only production dependencies if needed, or copy everything
# For a standard Next.js build, we'll copy everything but node_modules could be large
# For simplicity and reliability in this specific project structure:
COPY --from=builder /app /app

EXPOSE 3000

CMD ["npm", "start"]
