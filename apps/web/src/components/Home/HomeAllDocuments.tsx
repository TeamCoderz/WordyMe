/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { DocumentRow } from '@/components/docs/DocumentRow';
import { getHomeAllDocumentsQueryOptions, useDocumentFavoritesMutation } from '@/queries/documents';
import { SortOptions } from '@/types/sort';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/table';
import { useQuery } from '@tanstack/react-query';
import { ListFilter } from '@repo/ui/components/icons';
import { useState } from 'react';

type HomeAllDocumentsProps = {
  allDocumentsSort: SortOptions;
  setAllDocumentsSort: (value: SortOptions) => void;
};

export const HomeAllDocuments = ({
  allDocumentsSort,
  setAllDocumentsSort,
}: HomeAllDocumentsProps) => {
  const { data, isLoading } = useQuery(getHomeAllDocumentsQueryOptions(allDocumentsSort));
  const { removeDocumentFromFavorites, isRemoving } = useDocumentFavoritesMutation({
    document: data?.[0] || ({} as any),
  });
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [renamingDocumentId, setRenamingDocumentId] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium">All Documents</h2>
        <Select
          value={allDocumentsSort}
          onValueChange={(value: SortOptions) => {
            setAllDocumentsSort(value);
          }}
        >
          <SelectTrigger className="rounded-md px-3 py-2">
            <ListFilter className="size-4 text-foreground" />
            <SelectValue className="text-sm" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a-z">A-Z</SelectItem>
            <SelectItem value="z-a">Z-A</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="lastViewed">Last Viewed</SelectItem>
          </SelectContent>
        </Select>
      </div>
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
          {isLoading ? (
            Array.from({ length: 2 }).map((_, idx) => (
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
          ) : (data?.length ?? 0) === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No documents yet
              </TableCell>
            </TableRow>
          ) : (
            data?.map((doc) => (
              <DocumentRow
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
  );
};
