import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createInterface } from 'readline';
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
    console.log(`💡 输入 shutdown 关闭服务器`);
});

// ---- Graceful Shutdown ----
function shutdown() {
    console.log('\n🛑 正在关闭服务器...');
    io.emit('server-shutdown', { message: '服务器即将关闭' });
    io.close(() => {
        httpServer.close(() => {
            console.log('✅ 服务器已关闭');
            process.exit(0);
        });
    });
    // Force exit after 3s if graceful shutdown stalls
    setTimeout(() => {
        console.log('⚠️  强制关闭');
        process.exit(1);
    }, 3000);
}

// Listen for shutdown commands from stdin
const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.on('line', (input) => {
    const cmd = input.trim().toLowerCase();
    if (['shutdown', 'exit', 'quit', 'stop'].includes(cmd)) {
        shutdown();
    }
});

// Handle Ctrl+C and kill signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export { io };
