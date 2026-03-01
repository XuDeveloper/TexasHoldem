# Texas Hold'em Deployment Architecture Design

## Overview
This document outlines the deployment architecture for the Texas Hold'em web application on an Aliyun server located in Hong Kong. The goal is to provide a robust, easily maintainable, and secure environment for the Node.js backend and Vite-built static frontend.

## Architecture

The deployment will utilize **Docker** and **Docker Compose** to containerize and orchestrate the services, ensuring environment consistency and simplified updates. 

The architecture consists of two primary services:

1.  **Caddy (Reverse Proxy & Auto-HTTPS Gateway)**
    *   **Role**: Handles all incoming HTTP/HTTPS traffic from the public internet.
    *   **Responsibilities**:
        *   Terminates SSL/TLS connections automatically using Let's Encrypt.
        *   Proxies WebSocket (`wss://`) and HTTP (`https://`) requests to the Node.js application container.
    *   **Ports**: Exposed to the host on `80` and `443`.

2.  **Node.js Application (Backend + Static File Server)**
    *   **Role**: Runs the core game logic (Socket.io) and serves the production-built frontend static files.
    *   **Responsibilities**:
        *   Manages game state, user connections, and real-time communication.
        *   Serves the `dist/` directory containing the frontend assets.
    *   **Ports**: Exposes port `3000` internally to the Docker network (not directly to the host).

## Components

### 1. `Dockerfile`
A multi-stage build or a standard Node.js image setup to package the application.
*   **Base Image**: `node:20-alpine` (or similar lightweight image).
*   **Build Steps**: 
    1.  Copy `package.json` and install dependencies.
    2.  Copy source code.
    3.  Run `npm run build` to generate the Vite production files in `dist/`.
*   **Start Command**: `npm start` (which runs `node server/index.js`).

### 2. `Caddyfile`
A minimal configuration file for Caddy.
*   Takes the user's domain name (to be configured later).
*   Configures a `reverse_proxy` to the internal `app:3000` service.

### 3. `docker-compose.yml`
Orchestrates both containers.
*   **Services**: `app` (Node.js) and `caddy` (Proxy).
*   **Networks**: defines an internal network so Caddy can resolve `app`.
*   **Volumes**: Maps the `Caddyfile` and persists Caddy's certificate data so limits aren't hit during restarts.

### 4. `deploy.sh` (Optional/Convenience)
A bash script to automate pulling code updates, building the new Docker image, and restarting the containers (`docker-compose up -d --build`).

## Deployment Workflow
1.  **Manual Prerequisites (User Action)**:
    *   Configure Domain A Record pointing to the Aliyun server IP.
    *   Open ports `80` and `443` in the Aliyun security group.
2.  **Initial Server Setup**:
    *   SSH into the server.
    *   Install Docker and Docker Compose.
    *   Clone the repository.
3.  **Application Launch**:
    *   Run `docker-compose up -d --build`.
    *   Caddy automatically provisions SSL certificates and the app is live.

## Advantages
*   **Zero-Downtime SSL Maintenance**: Caddy handles all certificate renewals invisibly.
*   **Isolation**: Node.js app dependencies are isolated within the container, preventing conflicts with the host OS.
*   **Easy Rollback/State Reset**: Restarting the container guarantees a clean slate if needed.
