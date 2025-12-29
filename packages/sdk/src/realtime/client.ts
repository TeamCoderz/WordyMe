import { io } from 'socket.io-client';
import { SocketEventKey, SocketEventsMap } from '@repo/backend/realtime.js';

const socket = io(import.meta.env.VITE_BACKEND_URL, { autoConnect: false, withCredentials: true });

export const connectSocket = () => {
  socket.connect();
};

export const disconnectSocket = () => {
  socket.disconnect();
};

export const subscribeToSpace = (spaceId: string) => {
  socket.emit('subscribeToSpace', spaceId);
};

export const unsubscribeFromSpace = (spaceId: string) => {
  socket.emit('unsubscribeFromSpace', spaceId);
};

export const on = <K extends SocketEventKey>(
  event: K,
  callback: (data: SocketEventsMap[K]) => void,
) => {
  socket.on(event, callback as any);
};

export const off = <K extends SocketEventKey>(
  event: K,
  callback: (data: SocketEventsMap[K]) => void,
) => {
  socket.off(event, callback as any);
};
