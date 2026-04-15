/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { getSignupAvailability, type SignupAvailability, login, register } from '@repo/sdk/auth';
import { toast } from '@repo/ui/components/sonner';
import { AUTH_QUERY_KEYS } from './query-keys';

export const signupAvailabilityQueryOptions: UseQueryOptions<SignupAvailability, Error> = {
  queryKey: AUTH_QUERY_KEYS.SIGNUP_AVAILABILITY,
  queryFn: getSignupAvailability,
  staleTime: 60_000,
};

export function useLoginMutation() {
  return useMutation({
    mutationKey: ['login'],
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const result = await login(email, password);

      // Handle better-auth response format
      if (result && 'error' in result && result.error) {
        throw new Error(result.error.message || 'Invalid email or password');
      }

      return result;
    },
    onMutate() {
      return toast.loading('Signing in...');
    },
    onSuccess: (_, __, toastId) => {
      toast.success('Login successful', {
        id: toastId,
      });
    },
    onError: (error, __, toastId) => {
      toast.error('Login failed', {
        description: error.message || 'An unexpected error occurred',
        id: toastId,
      });
    },
  });
}

export function useRegisterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['register'],
    mutationFn: async ({
      name,
      email,
      password,
    }: {
      name: string;
      email: string;
      password: string;
    }) => {
      const result = await register(name, email, password);

      // Handle better-auth response format
      if (result && 'error' in result && result.error) {
        console.log(result.error);
        throw new Error(result.error.message || 'Registration failed');
      }

      return result;
    },
    onMutate() {
      return toast.loading('Creating account...');
    },
    onSuccess: (_, __, toastId) => {
      void queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.SIGNUP_AVAILABILITY });
      toast.success('Account created successfully', {
        id: toastId,
      });
    },
    onError: (error, __, toastId) => {
      toast.error('Registration failed', {
        description: error.message || 'An unexpected error occurred',
        id: toastId,
      });
    },
  });
}
