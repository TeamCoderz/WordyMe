import { Server } from 'socket.io';
import { type Server as HttpServer } from 'node:http';
import { ioRequireAuth } from '../middlewares/auth.js';
import { userHasDocument } from '../services/access.js';

let io: Server | null = null;

export const initializeSocket = (server: HttpServer) => {
  io = new Server(server, { cors: { origin: '*' } });

  io.use(ioRequireAuth);

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} - ${socket.user.id}`);
    socket.join(`user:${socket.user.id}`);

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id} - ${socket.user.id}`);
    });

    socket.on('subscribeToSpace', (spaceId: string) => {
      if (!userHasDocument(socket.user.id, spaceId)) {
        return;
      }
      socket.join(`space:${spaceId}`);
    });

    socket.on('unsubscribeFromSpace', (spaceId: string) => {
      socket.leave(`space:${spaceId}`);
    });
  });

  return io;
};

export const getSocket = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};
