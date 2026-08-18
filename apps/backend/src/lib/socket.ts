/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Server } from 'socket.io';
import { type Server as HttpServer } from 'node:http';
import { ioRequireAuth } from '../middlewares/auth.js';
import { userHasDocument } from '../services/access.js';
import { SocketEventKey, SocketEventsMap, spaceIdSchema } from '../schemas/realtime.js';
import { env } from '../env.js';

let io: Server | null = null;

export const initializeSocket = (server: HttpServer) => {
  io = new Server(server, { cors: { origin: env.CLIENT_URL, credentials: true } });

  io.use(ioRequireAuth);

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} - ${socket.user.id}`);
    socket.join(`user:${socket.user.id}`);

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id} - ${socket.user.id}`);
    });

    socket.on('subscribeToSpace', async (spaceId: unknown) => {
      const parsed = spaceIdSchema.safeParse(spaceId);
      if (!parsed.success) {
        return;
      }
      try {
        const hasAccess = await userHasDocument(socket.user.id, parsed.data);
        if (hasAccess) {
          socket.join(`space:${parsed.data}`);
        }
      } catch (error) {
        console.error(`subscribeToSpace failed for ${socket.user.id}:`, error);
      }
    });

    socket.on('unsubscribeFromSpace', (spaceId: unknown) => {
      const parsed = spaceIdSchema.safeParse(spaceId);
      if (!parsed.success) {
        return;
      }
      socket.leave(`space:${parsed.data}`);
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

export const emitToUser = <K extends SocketEventKey>(
  userId: string,
  event: K,
  data: SocketEventsMap[K],
) => {
  const io = getSocket();
  io.to(`user:${userId}`).emit(event, data);
};

export const emitToSpace = <K extends SocketEventKey>(
  spaceId: string,
  event: K,
  data: SocketEventsMap[K],
) => {
  const io = getSocket();
  io.to(`space:${spaceId}`).emit(event, data);
};
