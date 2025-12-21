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
