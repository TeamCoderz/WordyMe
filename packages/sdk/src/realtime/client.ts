/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

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

export const onConnect = (callback: () => void | Promise<void>) => {
  socket.on('connect', callback);
};

export const onDisconnect = (callback: () => void | Promise<void>) => {
  socket.on('disconnect', callback);
};

/*
 * `SocketEventsMap` spans both this app's events and socket.io's reserved
 * `connect` / `disconnect`, and callers rely on that — RealtimeProvider calls
 * `off('connect', ...)` alongside `off('space:created', ...)`.
 *
 * socket.io types a reserved key's listener differently from a user key's, via
 * a conditional that cannot resolve while `K` is still generic, so no single
 * concrete type satisfies the parameter here. `(...args: unknown[]) => void`
 * is rejected for the same reason.
 *
 * The cast is therefore a genuine limitation of the library's types, not a
 * shortcut: the exported signatures above stay fully typed, which is what
 * callers are checked against. Disabled narrowly rather than relaxing the rule.
 */

export const on = <K extends SocketEventKey>(
  event: K,
  callback: (data: SocketEventsMap[K]) => void,
) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket.on(event, callback as any);
};

export const off = <K extends SocketEventKey>(
  event: K,
  callback: (data: SocketEventsMap[K]) => void,
) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket.off(event, callback as any);
};
