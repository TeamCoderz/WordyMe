import z from "zod";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).default(10),
});

export type PaginationQuery = z.output<typeof paginationQuerySchema>;

export const documentFiltersSchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  documentType: z.enum(["space", "folder", "note"]).optional(),
  spaceId: z.uuid().optional(),
  parentId: z.uuid().optional(),
  orderBy: z.enum(["name", "createdAt", "lastViewedAt"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  days: z.coerce.number().min(1).optional(),
});

export type DocumentFilters = z.output<typeof documentFiltersSchema>;

export type DocumentFiltersInput = Partial<DocumentFilters>;

export type PaginatedResult<T> = {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};
