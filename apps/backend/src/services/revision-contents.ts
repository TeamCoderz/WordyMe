import { mkdir, readFile, writeFile, unlink } from "fs/promises";
import { resolvePhysicalPath } from "../lib/storage.js";
import { dirname } from "path";

export const getRevisionContentUrl = (revisionId: string) => {
  return `storage/revisions/${revisionId}.json`;
};

export const getRevisionContentPhysicalPath = (revisionId: string) => {
  return resolvePhysicalPath(getRevisionContentUrl(revisionId));
};

export const readRevisionContent = async (revisionId: string) => {
  const physicalPath = resolvePhysicalPath(getRevisionContentUrl(revisionId));
  const buffer = await readFile(physicalPath);
  const content = buffer.toString();
  return content;
};

export const saveRevisionContent = async (
  content: string,
  revisionId: string
) => {
  const physicalPath = resolvePhysicalPath(getRevisionContentUrl(revisionId));
  await mkdir(dirname(physicalPath), { recursive: true });
  await writeFile(physicalPath, content);
  return physicalPath;
};

export const deleteRevisionContent = async (revisionId: string) => {
  const physicalPath = resolvePhysicalPath(getRevisionContentUrl(revisionId));
  return await unlink(physicalPath).catch(console.error);
};
