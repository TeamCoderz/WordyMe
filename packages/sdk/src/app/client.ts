import { HttpException } from "@repo/backend/errors.js";
import axios, { AxiosError } from "axios";

export const client = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL + "/api",
});

const storageClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
});

// Graceful Axios Functions without throwing errors
export const get = async <T>(url: string) => {
  try {
    const response = await client.get<T>(url);
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error as AxiosError<HttpException> };
  }
};

export const post = async <T>(url: string, data?: unknown) => {
  try {
    const response = await client.post<T>(url, data);
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error as AxiosError<HttpException> };
  }
};

export const patch = async <T>(url: string, data?: unknown) => {
  try {
    const response = await client.patch<T>(url, data);
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error as AxiosError<HttpException> };
  }
};

export const del = async (url: string) => {
  try {
    await client.delete(url);
    return { error: null };
  } catch (error) {
    return { error: error as AxiosError<HttpException> };
  }
};

export const getFile = async (
  url: string,
  responseType: "text" | "blob" = "text"
) => {
  try {
    const response = await storageClient.get(url, { responseType });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error as AxiosError<HttpException> };
  }
};
