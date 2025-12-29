import { HttpException } from '@repo/backend/errors.js';
import { ImageMeta } from '@repo/backend/images.js';
import axios, { AxiosError } from 'axios';

const storageClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL + '/storage',
  withCredentials: true,
});

export const getFile = async (url: string, responseType: 'text' | 'blob' = 'text') => {
  try {
    const response = await storageClient.get(url, { responseType });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error as AxiosError<HttpException> };
  }
};

export const uploadFormData = async <T>(
  url: string,
  formData: FormData,
  method: 'post' | 'put' = 'post',
) => {
  try {
    const response = await storageClient[method]<T>(url, formData, {});
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error as AxiosError<HttpException> };
  }
};

export const deleteFile = async (url: string) => {
  try {
    await storageClient.delete(url);
    return { error: null };
  } catch (error) {
    return { error: error as AxiosError<HttpException> };
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

export const updateUserImage = async (file: File, meta: ImageMeta) => {
  const formData = new FormData();
  formData.append('image', file);

  Object.entries(meta).forEach(([key, value]) => {
    if (value !== undefined) {
      formData.append(key, value.toString());
    }
  });

  return await uploadFormData<{ url: string; meta: ImageMeta }>('/images', formData, 'put');
};

export const deleteUserImage = async () => {
  return await deleteFile('/images');
};

export const getUserImage = async (userId: string, filename: string) => {
  return await getFile(`/images/${userId}/${filename}`, 'blob');
};

export const updateUserCover = async (file: File, meta: ImageMeta) => {
  const formData = new FormData();
  formData.append('cover', file);

  Object.entries(meta).forEach(([key, value]) => {
    if (value !== undefined) {
      formData.append(key, value.toString());
    }
  });

  return await uploadFormData<{ url: string; meta: ImageMeta }>('/covers', formData, 'put');
};

export const deleteUserCover = async () => {
  return await deleteFile('/covers');
};

export const getUserCover = async (userId: string, filename: string) => {
  return await getFile(`/covers/${userId}/${filename}`, 'blob');
};
