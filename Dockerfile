# Use a Debian-based Node for binary compatibility with esbuild
FROM node:18-bullseye-slim

WORKDIR /usr/src/app

# Install build deps for potential native packages
RUN apt-get update && apt-get install -y ca-certificates python3 build-essential --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci --production=false

COPY . .

# Build (vite + esbuild as declared in package.json build script)
RUN npm run build

# Expose port used by server.ts
EXPOSE 3000

# Use the start script (node dist/server.cjs)
CMD ["npm", "start"]
