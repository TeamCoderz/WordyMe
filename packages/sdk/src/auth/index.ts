/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  customSessionClient,
  inferAdditionalFields,
  usernameClient,
} from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { type auth } from '@repo/backend/auth';
import { get } from '../app/client.js';

export type SignupAvailability = {
  signupEnabled: boolean;
};

export const authClient = createAuthClient({
  // $InferAuth: options,
  baseURL: import.meta.env.VITE_BACKEND_URL,
  plugins: [
    usernameClient(),
    customSessionClient<typeof auth>(),
    inferAdditionalFields<typeof auth>(),
  ],
});

export const register = async (name: string, email: string, password: string) => {
  return await authClient.signUp.email({ name, email, password });
};

export const login = async (email: string, password: string) => {
  return await authClient.signIn.email({ email, password });
};

export const logout = async () => {
  return await authClient.signOut();
};

export const getSession = async () => {
  return await authClient.getSession();
};

export const getSignupAvailability = async (): Promise<SignupAvailability> => {
  const { data, error } = await get<SignupAvailability>('/auth-state/signup-availability');
  if (error) throw error;
  if (data === null) throw new Error('Signup availability unavailable');
  return data;
};

export type SessionData = Awaited<ReturnType<typeof getSession>>['data'];
export const useSession = authClient.useSession;
