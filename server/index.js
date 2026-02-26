import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: '*' },
});

// Serve static files in production
app.use(express.static(join(__dirname, '..', 'dist')));

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`🃏 Texas Hold'em server running on http://localhost:${PORT}`);
});

export { io };
