import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[WebSocket] Connected to TalentMatrix server:', socket?.id);
    });

    socket.on('disconnect', () => {
      console.log('[WebSocket] Disconnected from server');
    });
  }
  return socket;
}
