import { useMutation } from '@tanstack/react-query';
import { login, register } from '@repo/sdk/auth';
import { toast } from '@repo/ui/components/sonner';

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
