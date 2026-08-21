import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

let io: SocketIOServer | null = null;

export function initWebSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    // Join specific rooms
    socket.on('join:session', (sessionId: string) => {
      socket.join(`session:${sessionId}`);
      console.log(`[WebSocket] Client ${socket.id} joined session room: session:${sessionId}`);
    });

    socket.on('leave:session', (sessionId: string) => {
      socket.leave(`session:${sessionId}`);
    });

    socket.on('join:room', (room: string) => {
      socket.join(room);
    });

    socket.on('disconnect', () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function emitTelemetryEvent(sessionId: string, event: any) {
  if (io) {
    io.to(`session:${sessionId}`).emit('telemetry:event', event);
    io.emit('telemetry:global', { sessionId, event });
  }
}

export function emitScoreUpdate(sessionId: string, scoreData: { authenticityScore: number; riskLevel: string; alertsCount: number }) {
  if (io) {
    io.to(`session:${sessionId}`).emit('score:update', scoreData);
    io.emit('score:update:global', { sessionId, ...scoreData });
  }
}

export function emitNewAnomalyAlert(alert: any) {
  if (io) {
    io.emit('anomaly:alert', alert);
  }
}

export function emitScheduleUpdate(data: { type: string; details: any }) {
  if (io) {
    io.emit('schedule:updated', data);
  }
}

export function emitAllocationProgress(data: { stepIndex: number; totalSteps: number; message: string; stage: string }) {
  if (io) {
    io.emit('allocation:progress', data);
  }
}
