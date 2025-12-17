import path from "path";

export const STORAGE_DIR = path.join(process.cwd(), "storage");

export const resolvePhysicalPath = (relativePath: string) => {
  if (
    relativePath.startsWith("/storage") ||
    relativePath.startsWith("storage")
  ) {
    relativePath = relativePath.replace(/^\/?storage\/?/, "");
  }

  const resolvedPath = path.resolve(STORAGE_DIR, relativePath);

  if (!resolvedPath.startsWith(path.resolve(STORAGE_DIR))) {
    throw new Error(`Path traversal detected: ${relativePath}`);
  }

  return resolvedPath;
};
