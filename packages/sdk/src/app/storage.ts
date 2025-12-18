import { getFile } from "./client.js";

export const getRevisionContent = async (revisionId: string) => {
  return await getFile(`/revisions/${revisionId}`, "text");
};
