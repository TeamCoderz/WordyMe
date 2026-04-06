/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { searchDocumentsQueryOptions } from '@/queries/documents';
import { Button } from '@repo/ui/components/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@repo/ui/components/command';
import { FileText, Search } from '@repo/ui/components/icons';
import DynamicIcon from '@repo/ui/components/dynamic-icon';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { cloneElement, useEffect, useMemo, useState } from 'react';
import { useDebounce } from 'use-debounce';
import DOMPurify from 'dompurify';

interface SearchDocumentsProps {
  spaceId?: string;
  children?: React.ReactElement;
}

function renderSnippet(snippet: string) {
  // Convert backend bracket markers into <mark> so we can keep
  // the exact rendering approach used in the reference project.
  return snippet.replace(/\[([^\]]+)\]/g, '<mark>$1</mark>');
}

function SearchDocuments({ spaceId: _spaceId, children }: SearchDocumentsProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <>
      {children ? (
        cloneElement(children, { onClick: () => setOpen(true) } as any)
      ) : (
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          className="h-9 w-9 sm:w-50 sm:max-w-50 sm:text-muted-foreground truncate"
        >
          <Search />
          <span className="max-sm:sr-only sm:block truncate flex-1 text-left">
            {search ? <>{search}</> : 'Search.....'}
          </span>
          <kbd className="bg-muted hidden sm:ml-1 p-0.5 text-muted-foreground pointer-events-none sm:inline-flex h-6 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none">
            <span className="text-xs">⌘</span>k
          </kbd>
        </Button>
      )}

      <CommandDialog shouldFilter={false} open={open} onOpenChange={setOpen} modal>
        <SearchCommandContent
          setOpen={setOpen}
          search={search}
          setSearch={setSearch}
          spaceId={_spaceId}
        />
      </CommandDialog>
    </>
  );
}

const SearchCommandContent = ({
  setOpen,
  search,
  setSearch,
}: {
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  spaceId?: string;
}) => {
  const [debouncedSearch] = useDebounce(search, 800);
  const queryOptions = useMemo(
    () => searchDocumentsQueryOptions(debouncedSearch),
    [debouncedSearch],
  );
  const navigate = useNavigate();
  const { data = [], isError } = useQuery(queryOptions);

  return (
    <>
      <div className="flex items-center border-b px-3 w-full [&>div]:flex-1 [&>div]:border-0 pr-8">
        <CommandInput
          value={search}
          onValueChange={setSearch}
          placeholder="Search documents..."
          className=""
        />
        {search && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearch('')}
            className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            Clear
          </Button>
        )}
      </div>

      <CommandList className="p-3 space-y-1">
        {data.length === 0 && !isError && <CommandEmpty>No documents found.</CommandEmpty>}

        {isError ? (
          <div className="px-2 py-6 text-center">
            <p className="text-sm text-destructive font-medium">Failed to search documents</p>
            <p className="text-xs text-muted-foreground mt-1">Please try again later</p>
          </div>
        ) : (
          <>
            {data.map((doc) => {
              const cleanHtml = DOMPurify.sanitize(renderSnippet(doc.snippet), {
                ALLOWED_TAGS: ['mark', 'b', 'i', 'em', 'strong', 'br'],
                ALLOWED_ATTR: [],
              });
              return (
                <CommandItem
                  key={doc.id}
                  value={`${doc.title}_${doc.id}_${doc.snippet}`}
                  className="flex items-center gap-2 cursor-pointer"
                  onSelect={() => {
                    setOpen(false);
                    navigate({
                      to: '/view/$handle',
                      params: { handle: doc.id },
                      search: {
                        id: true,
                        search: search || undefined,
                      },
                    });
                  }}
                >
                  <div className="size-8 bg-muted shrink-0 text-muted-foreground rounded-full flex items-center justify-center">
                    <DynamicIcon
                      name={'file'}
                      className="size-4"
                      fallback={() => <FileText className="size-4" />}
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.title}</p>
                    <p
                      dangerouslySetInnerHTML={{
                        __html: cleanHtml,
                      }}
                      className="text-sm text-muted-foreground [&_mark]:font-bold [&_mark]:text-foreground [&_mark]:bg-transparent line-clamp-2"
                    />
                  </div>
                </CommandItem>
              );
            })}
          </>
        )}
      </CommandList>
    </>
  );
};

export default SearchDocuments;
