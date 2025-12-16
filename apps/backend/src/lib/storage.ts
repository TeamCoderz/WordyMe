import path from "path";

export const STORAGE_DIR = path.join(process.cwd(), "storage");

export const resolvePhysicalPath = (relativePath: string) => {
  if (
    relativePath.startsWith("/storage") ||
    relativePath.startsWith("storage")
  ) {
    relativePath = relativePath.replace(/^\/?storage\/?/, "");
  }
  return path.join(STORAGE_DIR, relativePath);
};
