import { nanoid } from 'nanoid';

export const slugify = (text: string) => {
  return text
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
};

export const appendUniqueSuffix = (text: string) => {
  return `${text}-${nanoid(10)}`;
};

export const safeFilename = (filename: string, extension: string) => {
  const timestamp = Date.now();
  const safeName = filename.replace(/[^a-zA-Z0-9-_]/g, '_');
  return `${safeName}_${timestamp}${extension}`;
};
