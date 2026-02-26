import { io } from 'socket.io-client';

// Socket.io client wrapper
const socket = io();

// Connection status
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
