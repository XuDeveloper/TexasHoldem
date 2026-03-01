# Texas Hold'em Deployment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a Docker Compose environment with Caddy and Node.js for zero-downtime, auto-HTTPS deployment of the Texas Hold'em application.

**Architecture:** We will set up a multi-stage `Dockerfile` to build the Vite static assets and serve them alongside the Socket.io Node server. A `docker-compose.yml` will run the app behind a `Caddy` reverse proxy container.

**Tech Stack:** Docker, Docker Compose, Caddy, Node.js.

---

### Task 1: Create Dockerfile

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

**Step 1: Write `.dockerignore`**

```text
node_modules
dist
.git
.env
```

**Step 2: Write `Dockerfile`**

```dockerfile
# Build Stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production Stage
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY server ./server
COPY index.html ./
COPY start.sh ./

EXPOSE 3000

CMD ["npm", "start"]
```

**Step 3: Commit**
```bash
git add Dockerfile .dockerignore
git commit -m "build: add Dockerfile and dockerignore for node.js app"
```

### Task 2: Create Caddyfile

**Files:**
- Create: `Caddyfile`

**Step 1: Write Caddyfile (with domain placeholder)**

```text
{
    email admin@example.com
}

pokersite.example.com {
    reverse_proxy app:3000
}
```

**Step 2: Commit**

```bash
git add Caddyfile
git commit -m "build: add Caddyfile for auto-HTTPS reverse proxy"
```

### Task 3: Create Docker Compose Orchestration

**Files:**
- Create: `docker-compose.yml`

**Step 1: Write docker-compose.yml**

```yaml
version: '3.8'

services:
  app:
    build: .
    restart: unless-stopped
    expose:
      - "3000"
    environment:
      - NODE_ENV=production

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - app

volumes:
  caddy_data:
  caddy_config:
```

**Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "build: add docker-compose orchestration with caddy"
```

### Task 4: Create deployment script

**Files:**
- Create: `deploy.sh`

**Step 1: Write simple deploy bash script**

```bash
#!/bin/bash
echo "Pulling latest code..."
git pull origin main

echo "Rebuilding and starting containers..."
docker compose up -d --build

echo "Deployment complete."
```

**Step 2: Make executable and commit**

```bash
chmod +x deploy.sh
git add deploy.sh
git commit -m "build: add deployment automation script"
```
