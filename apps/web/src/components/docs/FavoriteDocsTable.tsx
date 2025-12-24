import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
  PaginationLink,
} from '@repo/ui/components/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/table';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Route } from '../../routes/_authed/docs/favorites';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getFavoriteDocumentsQueryOptions } from '../../queries/documents';
import { FavoriteDocumentRow } from './FavoriteDocumentRow';
import { useDocumentFavoritesMutation } from '../../queries/documents';

export function FavoriteDocsTable() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const query = useQuery(getFavoriteDocumentsQueryOptions(searchParams));
  const documents = query.data?.items ?? [];
  const paginationMeta = query.data?.meta ?? {
    total: 0,
    page: 1,
    last_page: 1,
    limit: 10,
  };

  const { removeDocumentFromFavorites, isRemoving } = useDocumentFavoritesMutation({
    document: documents[0] || ({} as any),
  });
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [renamingDocumentId, setRenamingDocumentId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const currentPage = paginationMeta?.page ?? 1;
  const lastPage = paginationMeta?.last_page ?? 1;
  const visualLastPage = Math.max(lastPage, 1);

  const handleRemove = async (documentId: string) => {
    try {
      setPendingRemoveId(documentId);
      await removeDocumentFromFavorites(documentId);
    } finally {
      setPendingRemoveId(null);
    }
  };

  const handleRename = (document: any) => {
    if (document.id === null) {
      setRenamingDocumentId(null);
    } else {
      setRenamingDocumentId(document.id);
      setOpenDropdownId(null);
    }
  };

  useEffect(() => {
    const page = searchParams.page ?? 1;
    if (page > 1) {
      queryClient.prefetchQuery(
        getFavoriteDocumentsQueryOptions({
          ...searchParams,
          page: page - 1,
        }),
      );
    }
    if (page < lastPage) {
      queryClient.prefetchQuery(
        getFavoriteDocumentsQueryOptions({
          ...searchParams,
          page: page + 1,
        }),
      );
    }
  }, [searchParams.page, queryClient, lastPage]);

  useEffect(() => {
    if ((documents?.length ?? 0) === 0 && currentPage > Math.max(lastPage, 1)) {
      const targetPage = lastPage <= 1 ? undefined : lastPage;
      navigate({ to: '.', search: { ...searchParams, page: targetPage } });
      toast.error("This page doesn't exist. Redirected to the last page.");
    }
  }, [documents?.length, currentPage, lastPage, navigate, searchParams]);

  type PageItem = { type: 'page'; value: number } | { type: 'ellipsis' };
  const pageItems: PageItem[] = (() => {
    if (visualLastPage <= 5) {
      return Array.from({ length: visualLastPage }, (_, i) => ({
        type: 'page',
        value: i + 1,
      }));
    }
    if (currentPage === 1) {
      return [
        { type: 'page', value: 1 },
        { type: 'page', value: 2 },
        { type: 'page', value: 3 },
        { type: 'ellipsis' },
        { type: 'page', value: visualLastPage },
      ];
    }
    if (currentPage === 2) {
      return [
        { type: 'page', value: 1 },
        { type: 'page', value: 2 },
        { type: 'page', value: 3 },
        { type: 'ellipsis' },
        { type: 'page', value: visualLastPage },
      ];
    }
    if (currentPage === 3) {
      return [
        { type: 'page', value: 1 },
        { type: 'page', value: 2 },
        { type: 'page', value: 3 },
        { type: 'page', value: 4 },
        { type: 'ellipsis' },
        { type: 'page', value: visualLastPage },
      ];
    }
    const items: PageItem[] = [{ type: 'page', value: 1 }, { type: 'ellipsis' }];
    const prevPage = currentPage - 1;
    const nextPage = currentPage + 1;
    items.push({ type: 'page', value: prevPage });
    items.push({ type: 'page', value: currentPage });
    let addedNextValue: number | null = null;
    if (currentPage < visualLastPage) {
      const nextVal = Math.min(nextPage, visualLastPage);
      items.push({ type: 'page', value: nextVal });
      addedNextValue = nextVal;
    }
    if (currentPage <= visualLastPage - 3) {
      items.push({ type: 'ellipsis' });
      if (addedNextValue !== visualLastPage) {
        items.push({ type: 'page', value: visualLastPage });
      }
    } else if (currentPage === visualLastPage - 2) {
      if (addedNextValue !== visualLastPage) {
        items.push({ type: 'page', value: visualLastPage });
      }
    }
    return items;
  })();

  return (
    <>
      <div className="py-6 max-w-5xl w-full px-6 mx-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Created On</TableHead>
              <TableHead>Last Modified</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              Array.from({ length: 10 }).map((_, idx) => (
                <TableRow key={idx} className="animate-pulse">
                  <TableCell>
                    <div className="h-5 w-40 bg-muted rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-5 w-24 bg-muted rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-5 w-28 bg-muted rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-5 w-32 bg-muted rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-9 w-9 bg-muted rounded" />
                  </TableCell>
                </TableRow>
              ))
            ) : (documents?.length ?? 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No favorite documents yet
                </TableCell>
              </TableRow>
            ) : (
              documents?.map((doc) => (
                <FavoriteDocumentRow
                  key={doc.id}
                  document={doc}
                  isRemoving={isRemoving}
                  pendingRemoveId={pendingRemoveId}
                  onRemove={handleRemove}
                  onRename={handleRename}
                  openDropdownId={openDropdownId}
                  setOpenDropdownId={setOpenDropdownId}
                  renamingDocumentId={renamingDocumentId}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Pagination className="mt-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              to="."
              search={{
                ...searchParams,
                page: currentPage - 1 <= 1 ? undefined : currentPage - 1,
              }}
              disabled={currentPage <= 1}
            />
          </PaginationItem>
          {pageItems.map((item, idx) => (
            <PaginationItem key={idx}>
              {item.type === 'ellipsis' ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  isActive={item.value === currentPage}
                  to="."
                  search={{
                    ...searchParams,
                    page: item.value <= 1 ? undefined : item.value,
                  }}
                >
                  {item.value}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              to="."
              search={{ ...searchParams, page: currentPage + 1 }}
              disabled={currentPage >= visualLastPage}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </>
  );
}
