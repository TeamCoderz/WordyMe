import type { APIError } from '@repo/types';

export const handleException = (error: any) => {
  console.error(error);
  const formattedError: APIError = { title: 'Something went wrong' };
  if (error instanceof Error) {
    formattedError.subtitle = error.message;
  }
  if (typeof error === 'string') {
    formattedError.subtitle = error;
  }
  if (error.title) {
    formattedError.title = error.title;
  }
  if (error.subtitle) {
    formattedError.subtitle = error.subtitle;
  }
  return formattedError;
};
