import { io } from 'socket.io-client';

// Socket.io client - do not auto-connect so we can set auth token first
const socket = io({
    autoConnect: false
});

socket.on('connect', () => {
    console.log('🃏 Connected to server:', socket.id);
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected from server');
});

socket.on('connect_error', (err) => {
    console.error('Connection error:', err.message);
});

export default socket;
