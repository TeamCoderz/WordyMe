import {
  CreateRevisionInput,
  PlainRevision,
  RevisionDetails,
  UpdateRevisionName,
} from "@repo/backend/revisions.js";
import { get, post, patch, del } from "./client.js";

export const createRevision = async (data: CreateRevisionInput) => {
  return await post<RevisionDetails>("/revisions", data);
};

export const getRevisionById = async (revisionId: string) => {
  return await get<RevisionDetails>(`/revisions/${revisionId}`);
};

export const updateRevision = async (
  revisionId: string,
  data: UpdateRevisionName
) => {
  return await patch<PlainRevision>(`/revisions/${revisionId}`, data);
};

export const deleteRevision = async (revisionId: string) => {
  return await del(`/revisions/${revisionId}`);
};
