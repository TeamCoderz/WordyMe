import { inferAdditionalFields, usernameClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { type auth, options } from '@repo/backend/auth';

export const authClient = createAuthClient({
  $InferAuth: options,
  baseURL: import.meta.env.VITE_BACKEND_URL,
  plugins: [usernameClient(), inferAdditionalFields<typeof auth>()],
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
