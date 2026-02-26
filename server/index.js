import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { setupSocketHandler } from './SocketHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: '*' },
});

// Serve static files in production
app.use(express.static(join(__dirname, '..', 'dist')));

// Setup Socket.io event handlers
setupSocketHandler(io);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`🃏 Texas Hold'em server running on http://localhost:${PORT}`);
});

export { io };
