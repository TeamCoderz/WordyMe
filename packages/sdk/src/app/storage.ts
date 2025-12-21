import { HttpException } from '@repo/backend/errors.js';
import axios, { AxiosError } from 'axios';

const storageClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL + '/storage',
});

export const getFile = async (url: string, responseType: 'text' | 'blob' = 'text') => {
  try {
    const response = await storageClient.get(url, { responseType });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error as AxiosError<HttpException> };
  }
};

export const uploadFormData = async <T>(url: string, formData: FormData) => {
  try {
    const response = await storageClient.post<T>(url, formData, {});
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error as AxiosError<HttpException> };
  }
};

export const getRevisionContent = async (revisionId: string) => {
  return await getFile(`/revisions/${revisionId}`, 'text');
};

export const uploadAttachment = async (documentId: string, file: File) => {
  const formData = new FormData();
  formData.append('attachments', file);

  return await uploadFormData<{ url: string }>(`/attachments/${documentId}`, formData);
};

export const getAttachment = async (documentId: string, filename: string) => {
  return await getFile(`/attachments/${documentId}/${filename}`, 'blob');
};
