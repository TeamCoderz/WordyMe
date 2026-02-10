'use client';
import {
  $createRangeSelection,
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  isHTMLElement,
  LexicalNode,
  LexicalEditor,
  $isElementNode,
} from 'lexical';
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { $toggleLink, TOGGLE_LINK_COMMAND, type LinkNode } from '@lexical/link';
import { $isImageNode } from '@repo/editor/nodes/ImageNode';
import { $isMathNode } from '@repo/editor/nodes/MathNode';
import { $isTableNode } from '@repo/editor/nodes/TableNode';
import { getEditorNodes } from '@repo/editor/utils/getEditorNodes';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useActions } from '@repo/editor/store';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';
import { RadioGroup, RadioGroupItem } from '@repo/ui/components/radio-group';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@repo/ui/components/command';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/popover';
import { UnlinkIcon, CheckIcon, ChevronsUpDown, ChevronRight } from '@repo/ui/components/icons';
import { DynamicIcon } from '@repo/ui/components/dynamic-icon';
import { formatId } from '@repo/lib/utils/id';
import { $generateHtmlFromNodes } from '@lexical/html';
import { cn } from '@repo/ui/lib/utils';
import { Document, Revision, Space } from '@repo/types';
import { sortByPosition } from '@repo/lib/utils/position';
import { generateToc, type TableOfContentsEntry } from '@repo/editor/utils/generateToc';

function $generateHtmlElementFromNode(editor: LexicalEditor, node: LexicalNode) {
  const isElement = $isElementNode(node);
  if (!isElement) return node.exportDOM(editor).element;
  const parentKey = node.getParentOrThrow().getKey();
  const indexWithinParent = node.getIndexWithinParent();
  const selection = $createRangeSelection();
  selection.anchor.set(parentKey, indexWithinParent, 'element');
  selection.focus.set(parentKey, indexWithinParent + 1, 'element');
  const html = $generateHtmlFromNodes(editor, selection);
  return new DOMParser().parseFromString(html, 'text/html').body.firstChild as HTMLElement;
}
// Flattened tree with depth for simple Command-based trees, ordered by position
const buildTreeList = <T extends { id: string; parentId?: string | null; position: string | null }>(
  items: T[],
  parentId: string | null = null,
  depth = 0,
): (T & { depth: number })[] => {
  const children = sortByPosition(items.filter((item) => (item.parentId ?? null) === parentId));
  return children.flatMap((item) => [
    { ...item, depth },
    ...buildTreeList(items, item.id, depth + 1),
  ]);
};

function LinkDialog({ node }: { node: LinkNode | null }) {
  const [editor] = useLexicalComposerContext();
  const [url, setUrl] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [rel, setRel] = useState<string | null>('external');
  const [target, setTarget] = useState<string | null>('_blank');
  const [figure, setFigure] = useState<string>('self');
  const [internalLinkType, setInternalLinkType] = useState<'figure' | 'document'>('figure');
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [spaceComboboxOpen, setSpaceComboboxOpen] = useState(false);
  const [documentComboboxOpen, setDocumentComboboxOpen] = useState(false);
  const [figureComboboxOpen, setFigureComboboxOpen] = useState(false);
  const [revisionComboboxOpen, setRevisionComboboxOpen] = useState(false);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string>('');
  const [figures, setFigures] = useState<Map<string, HTMLElement>>(new Map());
  const [tocEntries, setTocEntries] = useState<TableOfContentsEntry[]>([]);
  const [selectedHeadingId, setSelectedHeadingId] = useState<string>('');
  const [headingComboboxOpen, setHeadingComboboxOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    updateEditorStoreState,
    getSpaces,
    getDocumentsBySpaceId,
    getDocumentById,
    getDocumentByHandle,
    getRevisionsByDocumentId,
    getRevisionById,
    getLocalRevisionByDocumentId,
  } = useActions();

  const formatRevisionLabel = (revision?: Revision) => {
    if (!revision) return 'Revision not found';
    return (
      revision.revisionName ??
      new Date(revision.createdAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    );
  };

  useEffect(() => {
    if (rel === 'bookmark' && internalLinkType === 'figure' && !figures.size) {
      setTimeout(() => {
        setFigures(
          editor.getEditorState().read(() => {
            const nodes = getEditorNodes(editor).filter(
              (node) => $isImageNode(node) || $isMathNode(node) || $isTableNode(node),
            );
            const nodeDomMap = nodes.reduce((map, node) => {
              const element = $generateHtmlElementFromNode(editor, node);
              if (!isHTMLElement(element)) return map;
              map.set(node.getKey(), element);
              return map;
            }, new Map<string, HTMLElement>());
            return nodeDomMap;
          }),
        );
      }, 0);
    }
  }, [editor, rel, internalLinkType]);

  // Load spaces when dialog opens
  useEffect(() => {
    if (rel === 'bookmark' && internalLinkType === 'document') {
      getSpaces().then(setSpaces);
    }
  }, [rel, internalLinkType, getSpaces]);

  useEffect(() => {
    if (selectedSpaceId) {
      getDocumentsBySpaceId(selectedSpaceId).then(setDocuments);
    }
  }, [selectedSpaceId, getDocumentsBySpaceId]);

  useEffect(() => {
    if (selectedDocumentId) {
      getRevisionsByDocumentId(selectedDocumentId).then(setRevisions);
    }
  }, [selectedDocumentId, getRevisionsByDocumentId]);

  useEffect(() => {
    const head =
      documents.find((document) => document.id === selectedDocumentId)?.currentRevisionId ?? '';
    if (selectedRevisionId) {
      getRevisionById(selectedRevisionId).then((revision) => {
        setTocEntries(revision ? generateToc(JSON.parse(revision.content)) : []);
      });
    } else if (selectedDocumentId && head) {
      getLocalRevisionByDocumentId(selectedDocumentId, head).then((revision) => {
        setTocEntries(revision ? generateToc(JSON.parse(revision.content)) : []);
      });
    }
  }, [
    documents,
    selectedDocumentId,
    selectedRevisionId,
    getRevisionById,
    getLocalRevisionByDocumentId,
  ]);

  const tocMinDepth = useMemo(() => {
    if (tocEntries.length === 0) return 1;
    return Math.min(...tocEntries.map(([, , tag]) => parseInt(tag.slice(1), 10)));
  }, [tocEntries]);

  useEffect(() => {
    editor.getEditorState().read(() => {
      if (node) {
        const url = node.getURL();
        const rel = node.getRel();
        const target = node.getTarget();
        const text = node.getTextContent();
        setUrl(url);
        setRel(rel);
        setTarget(target);
        setText(text);
        const { pathname, searchParams, hash } = new URL(url, window.location.origin);
        if (pathname.startsWith('/view/') || pathname.startsWith('/edit/')) {
          setRel('bookmark');
          setInternalLinkType('document');
          setSelectedHeadingId(hash ? hash.slice(1) : '');
          const handle = pathname.split('/').pop() ?? '';
          const isId = searchParams.get('id') === 'true';
          const getDocumentPromise = isId ? getDocumentById(handle) : getDocumentByHandle(handle);
          getDocumentPromise.then((document) => {
            if (document) {
              setSelectedDocumentId(document.id);
              setSelectedSpaceId(document.spaceId ?? '');
              setSelectedRevisionId(searchParams.get('v') ?? '');
            }
          });
        } else if (rel === 'bookmark') {
          setInternalLinkType('figure');
          const id = url.slice(1);
          const figureNode = getEditorNodes(editor)
            .filter((node) => $isImageNode(node) || $isMathNode(node) || $isTableNode(node))
            .find((node) => node.getId() === id);
          const figureKey = figureNode ? figureNode.getKey() : null;
          const target = node.__target;
          const figure = figureKey ? figureKey : target === '_self' ? 'self' : 'none';
          setFigure(figure);
          setText(node.getTextContent());
        }
      } else {
        setUrl('');
        setRel('external');
        setTarget('_blank');
        const selection = $getSelection();
        const textContent = $isRangeSelection(selection) ? selection.getTextContent() : '';
        setText(textContent);
        setInternalLinkType('figure');
        setSelectedSpaceId('');
        setSelectedDocumentId('');
        setRevisions([]);
        setSelectedRevisionId('');
        setTocEntries([]);
        setSelectedHeadingId('');
      }
    });
  }, [node, editor, getSpaces, getDocumentsBySpaceId]);

  const getAncestorIds = <T extends { id: string; parentId?: string | null }>(
    items: T[],
    id: string | null,
  ): string[] => {
    if (!id) return [];
    const result: string[] = [];
    const visited = new Set<string>();
    let currentId: string | null | undefined = id;

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const item = items.find((i) => i.id === currentId);
      if (!item) break;
      if (item.parentId) result.unshift(item.parentId);
      currentId = item.parentId;
    }

    return result;
  };

  const [manualExpandedSpaceIds, setManualExpandedSpaceIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [manualExpandedDocumentIds, setManualExpandedDocumentIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [collapsedAutoSpaceIds, setCollapsedAutoSpaceIds] = useState<Set<string>>(() => new Set());
  const [collapsedAutoDocumentIds, setCollapsedAutoDocumentIds] = useState<Set<string>>(
    () => new Set(),
  );

  const [spaceSearch, setSpaceSearch] = useState('');
  const [documentSearch, setDocumentSearch] = useState('');

  const spaceTree = useMemo(() => buildTreeList(spaces), [spaces]);
  const documentTree = useMemo(() => buildTreeList(documents), [documents]);

  const spaceOrDescendantMatches = (spaceId: string, search: string): boolean => {
    const space = spaces.find((s) => s.id === spaceId);
    if (!space) return false;
    if (space.name.toLowerCase().includes(search.toLowerCase())) return true;
    return spaces.some((child) => {
      if (child.parentId === spaceId) {
        return spaceOrDescendantMatches(child.id, search);
      }
      return false;
    });
  };

  const documentOrDescendantMatches = (documentId: string, search: string): boolean => {
    const document = documents.find((d) => d.id === documentId);
    if (!document) return false;
    if (document.name.toLowerCase().includes(search.toLowerCase())) return true;
    return documents.some((child) => {
      if (child.parentId === documentId) {
        return documentOrDescendantMatches(child.id, search);
      }
      return false;
    });
  };

  const autoExpandedSpaceIds = useMemo(
    () => new Set(getAncestorIds(spaces, selectedSpaceId)),
    [spaces, selectedSpaceId],
  );
  const autoExpandedDocumentIds = useMemo(
    () => new Set(getAncestorIds(documents, selectedDocumentId)),
    [documents, selectedDocumentId],
  );

  const searchExpandedSpaceIds = useMemo(() => {
    if (!spaceSearch.trim()) return new Set<string>();
    const expanded = new Set<string>();
    spaces.forEach((space) => {
      if (spaceOrDescendantMatches(space.id, spaceSearch)) {
        let parentId = space.parentId ?? null;
        while (parentId) {
          expanded.add(parentId);
          const parent = spaces.find((s) => s.id === parentId);
          if (!parent) break;
          parentId = parent.parentId ?? null;
        }
      }
    });
    return expanded;
  }, [spaces, spaceSearch, spaceOrDescendantMatches]);

  const searchExpandedDocumentIds = useMemo(() => {
    if (!documentSearch.trim()) return new Set<string>();
    const expanded = new Set<string>();
    documents.forEach((document) => {
      if (documentOrDescendantMatches(document.id, documentSearch)) {
        let parentId = document.parentId ?? null;
        while (parentId) {
          expanded.add(parentId);
          const parent = documents.find((d) => d.id === parentId);
          if (!parent) break;
          parentId = parent.parentId ?? null;
        }
      }
    });
    return expanded;
  }, [documents, documentSearch, documentOrDescendantMatches]);

  const isSpaceExpanded = (id: string) =>
    (autoExpandedSpaceIds.has(id) && !collapsedAutoSpaceIds.has(id)) ||
    manualExpandedSpaceIds.has(id) ||
    searchExpandedSpaceIds.has(id);

  const isDocumentExpanded = (id: string) =>
    (autoExpandedDocumentIds.has(id) && !collapsedAutoDocumentIds.has(id)) ||
    manualExpandedDocumentIds.has(id) ||
    searchExpandedDocumentIds.has(id);

  const isSpaceVisible = (space: Space & { depth: number }) => {
    let parentId = space.parentId ?? null;
    while (parentId) {
      if (!isSpaceExpanded(parentId)) return false;
      const parent = spaces.find((s) => s.id === parentId);
      if (!parent) break;
      parentId = parent.parentId ?? null;
    }
    return true;
  };

  const isDocumentVisible = (document: Document & { depth: number }) => {
    let parentId = document.parentId ?? null;
    while (parentId) {
      if (!isDocumentExpanded(parentId)) return false;
      const parent = documents.find((d) => d.id === parentId);
      if (!parent) break;
      parentId = parent.parentId ?? null;
    }
    return true;
  };

  const updateUrl = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setUrl(value);
  };

  const updateRel = (value: string) => {
    setRel(value);
    const nodeRel = node?.__rel ?? 'external';
    const defaultUrl = value === 'bookmark' ? `#${formatId(text)}` : '';
    const nodeUrl = node?.__url ?? defaultUrl;
    const url = value === nodeRel ? nodeUrl : defaultUrl;
    setUrl(url);
    const target = value === 'external' ? '_blank' : figure === 'self' ? '_self' : null;
    setTarget(target);
    if (value === 'bookmark' && internalLinkType === 'document') {
      setTimeout(() => {
        getSpaces().then(setSpaces);
      }, 0);
    }
  };

  const updateText = (event: React.ChangeEvent<HTMLInputElement>) => {
    setText(event.target.value);
    if (rel === 'bookmark' && internalLinkType === 'figure') {
      setUrl(`#${formatId(event.target.value)}`);
    }
  };

  const updateFigure = (value: string) => {
    setUrl(`#${formatId(text)}`);
    setFigure(value);
    setTarget(value === 'self' ? '_self' : null);
  };

  const updateInternalLinkType = (value: 'figure' | 'document') => {
    setInternalLinkType(value);
    if (value === 'document') {
      const documentId = selectedDocumentId;
      setUrl(documentId ? `/view/${documentId}?id=true` : '');
      setTimeout(() => {
        getSpaces().then(setSpaces);
      }, 0);
    } else {
      setUrl(`#${formatId(text)}`);
    }
  };

  const updateSpace = (spaceId: string) => {
    if (spaceId) {
      setSelectedSpaceId(spaceId);
      setSelectedDocumentId('');
      setUrl('');
    }
  };

  const buildDocumentLinkUrl = (docId: string, revId: string, headingId: string) => {
    const base = `/view/${docId}?id=true`;
    const withRev = revId ? `${base}&v=${revId}` : base;
    return headingId ? `${withRev}#${headingId}` : withRev;
  };

  const updateDocument = (documentId: string) => {
    if (documentId) {
      setSelectedDocumentId(documentId);
      setSelectedRevisionId('');
      setSelectedHeadingId('');
      const baseUrl = `/view/${documentId}?id=true`;
      setUrl(baseUrl);
      const document = documents.find((document) => document.id === documentId);
      if (document) {
        setText(document.name);
        getRevisionsByDocumentId(documentId).then(setRevisions);
      }
    }
  };

  const updateRevision = (revisionId: string) => {
    setSelectedRevisionId(revisionId);
    setSelectedHeadingId(''); // clear heading when revision changes (TOC may differ)
    if (!selectedDocumentId) return;
    const nextUrl = buildDocumentLinkUrl(selectedDocumentId, revisionId, '');
    setUrl(nextUrl);
  };

  const updateHeading = (headingId: string) => {
    setSelectedHeadingId(headingId);
    if (!selectedDocumentId) return;
    const nextUrl = buildDocumentLinkUrl(selectedDocumentId, selectedRevisionId, headingId);
    setUrl(nextUrl);
  };

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    if (rel === 'bookmark' && internalLinkType === 'figure' && figure) {
      setNodeId(figure, url.slice(1));
    }
    editor.update(() => {
      if (node) node.remove();
      const textContent = text || url;
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      selection.insertText(textContent);
      selection.anchor.offset -= textContent.length;
      $toggleLink({ url, rel, target });
    });
    closeDialog();
    setTimeout(() => {
      editor.focus();
    }, 0);
  };

  const closeDialog = () => {
    updateEditorStoreState('openDialog', null);
  };

  const handleClose = () => {
    closeDialog();
  };

  const handleDelete = () => {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    closeDialog();
  };

  const setNodeId = (key: string, id: string) => {
    editor.update(() => {
      const prevNode = getEditorNodes(editor)
        .filter((node) => $isImageNode(node) || $isMathNode(node) || $isTableNode(node))
        .find((node) => node.getId() === id);
      if (prevNode) {
        prevNode.setId('');
      }
      const node = $getNodeByKey(key);
      if (!($isImageNode(node) || $isMathNode(node) || $isTableNode(node))) return;
      node.setId(id);
    });
  };

  // Focus input after render
  useEffect(() => {
    if (inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, []);

  return (
    <Dialog open onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Insert Link</DialogTitle>
          <DialogDescription className="sr-only">
            Add a link to an external or internal resource.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Label htmlFor="text">Text</Label>
            <Input id="text" ref={inputRef} value={text} onChange={updateText} autoComplete="off" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-4">
              <Label htmlFor="rel">Target</Label>
              <RadioGroup id="rel" value={rel} className="flex" onValueChange={updateRel}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="external" id="external" />
                  <Label htmlFor="external">External</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bookmark" id="bookmark" />
                  <Label htmlFor="bookmark">Internal</Label>
                </div>
              </RadioGroup>
            </div>
            {rel === 'bookmark' && (
              <div className="space-y-4">
                <Label htmlFor="internal-link-type">Type</Label>
                <RadioGroup
                  id="internal-link-type"
                  value={internalLinkType}
                  className="flex"
                  onValueChange={updateInternalLinkType}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="figure" id="figure-type" />
                    <Label htmlFor="figure-type">Figure</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="document" id="document-type" />
                    <Label htmlFor="document-type">Document</Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>
          {rel === 'external' && (
            <div className="space-y-4">
              <Label htmlFor="url">URL</Label>
              <Input id="url" ref={inputRef} value={url} onChange={updateUrl} autoComplete="off" />
            </div>
          )}
          {rel === 'bookmark' && (
            <>
              {internalLinkType === 'figure' && (
                <div className="space-y-4">
                  <Label htmlFor="figure">Figure</Label>
                  <Popover open={figureComboboxOpen} onOpenChange={setFigureComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={figureComboboxOpen}
                        className={cn('w-full justify-between mb-0 min-h-9', {
                          'h-full!': figure !== 'self',
                        })}
                      >
                        {figure === 'self' ? (
                          'Self'
                        ) : figure === 'none' ? (
                          'Select a figure...'
                        ) : figures.has(figure) ? (
                          <div
                            className="w-full [&_img]:w-20 max-h-24 overflow-hidden"
                            dangerouslySetInnerHTML={{
                              __html: figures.get(figure)!.outerHTML,
                            }}
                          />
                        ) : (
                          'Select a figure...'
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
                      <Command
                        filter={(value, search) => {
                          const figureText =
                            value === 'self' ? 'Self' : figures.get(value)?.textContent;
                          if (!figureText) return 0;
                          const textMatch = figureText.toLowerCase().includes(search.toLowerCase());
                          return textMatch ? 1 : 0;
                        }}
                      >
                        <CommandInput placeholder="Search figure..." className="h-9" />
                        <CommandList>
                          <CommandEmpty>No figure found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="self"
                              onSelect={() => {
                                updateFigure('self');
                                setFigureComboboxOpen(false);
                              }}
                            >
                              <CheckIcon
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  figure === 'self' ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                              Self
                            </CommandItem>
                            {[...figures.keys()].map((key) => (
                              <CommandItem
                                key={key}
                                value={key}
                                onSelect={() => {
                                  updateFigure(key);
                                  setFigureComboboxOpen(false);
                                }}
                              >
                                <CheckIcon
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    figure === key ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                <div
                                  className="w-full [&_img]:w-20 max-h-24 overflow-hidden"
                                  dangerouslySetInnerHTML={{
                                    __html: figures.get(key)!.outerHTML,
                                  }}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
              {internalLinkType === 'document' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-4">
                      <Label htmlFor="space">Space</Label>
                      <Popover open={spaceComboboxOpen} onOpenChange={setSpaceComboboxOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={spaceComboboxOpen}
                            className="w-full justify-between mb-0 min-h-9"
                          >
                            {selectedSpaceId ? (
                              <>
                                {spaces
                                  .filter((space) => space.id === selectedSpaceId)
                                  .map((space) => (
                                    <>
                                      <DynamicIcon
                                        name={space.icon || 'briefcase'}
                                        className="size-4"
                                      />
                                      <p className="flex-1 text-start font-medium truncate">
                                        {space.name}
                                      </p>
                                    </>
                                  ))}
                              </>
                            ) : (
                              'Select a space...'
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
                          <Command
                            filter={(value, search) => {
                              if (!search.trim()) return 1;
                              return spaceOrDescendantMatches(value, search) ? 1 : 0;
                            }}
                          >
                            <CommandInput
                              placeholder="Search space..."
                              className="h-9"
                              value={spaceSearch}
                              onValueChange={setSpaceSearch}
                            />
                            <CommandList>
                              <CommandEmpty>No space found.</CommandEmpty>
                              <CommandGroup>
                                {spaceTree.map((spaceWithDepth) => {
                                  const { depth, ...space } = spaceWithDepth as Space & {
                                    depth: number;
                                  };
                                  const visible =
                                    spaceSearch.trim().length > 0
                                      ? true
                                      : isSpaceVisible(space as Space & { depth: number });
                                  if (!visible) return null;

                                  if (space.isContainer) {
                                    const isExpanded = isSpaceExpanded(space.id);
                                    const handleToggle = () => {
                                      const isAuto = autoExpandedSpaceIds.has(space.id);
                                      if (isAuto) {
                                        setCollapsedAutoSpaceIds((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(space.id)) next.delete(space.id);
                                          else next.add(space.id);
                                          return next;
                                        });
                                      } else {
                                        setManualExpandedSpaceIds((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(space.id)) next.delete(space.id);
                                          else next.add(space.id);
                                          return next;
                                        });
                                      }
                                    };

                                    return (
                                      <CommandItem
                                        key={`${space.id}-label`}
                                        value={space.id}
                                        onSelect={handleToggle}
                                        className="flex items-center gap-2"
                                        style={{
                                          paddingLeft: depth > 0 ? depth * 16 : undefined,
                                        }}
                                      >
                                        {space.icon && (
                                          <div className="size-6 bg-muted shrink-0 text-muted-foreground rounded-full flex items-center justify-center">
                                            <DynamicIcon name={space.icon} className="size-4" />
                                          </div>
                                        )}
                                        <span className="truncate font-medium flex-1">
                                          {space.name}
                                        </span>
                                        <ChevronRight
                                          className={cn(
                                            'h-3 w-3 transition-transform',
                                            isExpanded ? 'rotate-90' : '',
                                          )}
                                        />
                                      </CommandItem>
                                    );
                                  }

                                  return (
                                    <CommandItem
                                      key={space.id}
                                      value={space.id}
                                      onSelect={() => {
                                        const newValue =
                                          space.id === selectedSpaceId ? '' : space.id;
                                        updateSpace(newValue);
                                        setSpaceComboboxOpen(false);
                                      }}
                                      className={cn('flex items-center gap-2', {
                                        'bg-gray-300/10': space.id === selectedSpaceId,
                                      })}
                                      style={{
                                        paddingLeft: depth > 0 ? depth * 16 : undefined,
                                      }}
                                    >
                                      {space.icon && (
                                        <div className="size-6 bg-muted shrink-0 text-muted-foreground rounded-full flex items-center justify-center">
                                          <DynamicIcon name={space.icon} className="size-4" />
                                        </div>
                                      )}
                                      <p className="font-medium truncate">{space.name}</p>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-4">
                      <Label htmlFor="document">Document</Label>
                      <Popover open={documentComboboxOpen} onOpenChange={setDocumentComboboxOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={documentComboboxOpen}
                            className="w-full justify-between mb-0 min-h-9"
                            disabled={!selectedSpaceId}
                          >
                            {selectedDocumentId ? (
                              <>
                                {documents
                                  .filter((document) => document.id === selectedDocumentId)
                                  .map((document) => (
                                    <>
                                      <DynamicIcon
                                        name={document.icon || 'file'}
                                        className="size-4"
                                      />
                                      <p className="flex-1 text-start font-medium truncate">
                                        {document.name}
                                      </p>
                                    </>
                                  ))}
                              </>
                            ) : (
                              'Select a document...'
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
                          <Command
                            filter={(value, search) => {
                              if (!search.trim()) return 1;
                              return documentOrDescendantMatches(value, search) ? 1 : 0;
                            }}
                          >
                            <CommandInput
                              placeholder="Search document..."
                              className="h-9"
                              value={documentSearch}
                              onValueChange={setDocumentSearch}
                            />
                            <CommandList>
                              <CommandEmpty>No document found.</CommandEmpty>
                              <CommandGroup>
                                {documentTree.map((documentWithDepth) => {
                                  const { depth, ...document } = documentWithDepth as Document & {
                                    depth: number;
                                  };
                                  const visible =
                                    documentSearch.trim().length > 0
                                      ? true
                                      : isDocumentVisible(
                                          document as Document & {
                                            depth: number;
                                          },
                                        );
                                  if (!visible) return null;

                                  if (document.isContainer) {
                                    const isExpanded = isDocumentExpanded(document.id);
                                    const handleToggle = () => {
                                      const isAuto = autoExpandedDocumentIds.has(document.id);
                                      if (isAuto) {
                                        setCollapsedAutoDocumentIds((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(document.id)) next.delete(document.id);
                                          else next.add(document.id);
                                          return next;
                                        });
                                      } else {
                                        setManualExpandedDocumentIds((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(document.id)) next.delete(document.id);
                                          else next.add(document.id);
                                          return next;
                                        });
                                      }
                                    };

                                    return (
                                      <CommandItem
                                        key={`${document.id}-label`}
                                        value={document.id}
                                        onSelect={handleToggle}
                                        className="flex items-center gap-2"
                                        style={{
                                          paddingLeft: depth > 0 ? depth * 16 : undefined,
                                        }}
                                      >
                                        {document.icon && (
                                          <div className="size-6 bg-muted shrink-0 text-muted-foreground rounded-full flex items-center justify-center">
                                            <DynamicIcon name={document.icon} className="size-4" />
                                          </div>
                                        )}
                                        <span className="truncate font-medium flex-1">
                                          {document.name}
                                        </span>
                                        <ChevronRight
                                          className={cn(
                                            'h-3 w-3 transition-transform',
                                            isExpanded ? 'rotate-90' : '',
                                          )}
                                        />
                                      </CommandItem>
                                    );
                                  }

                                  return (
                                    <CommandItem
                                      key={document.id}
                                      value={document.id}
                                      onSelect={() => {
                                        const newValue =
                                          document.id === selectedDocumentId ? '' : document.id;
                                        updateDocument(newValue);
                                        setDocumentComboboxOpen(false);
                                      }}
                                      className={cn('flex items-center gap-2', {
                                        'bg-gray-300/10': document.id === selectedDocumentId,
                                      })}
                                      style={{
                                        paddingLeft: depth > 0 ? depth * 16 : undefined,
                                      }}
                                    >
                                      {document.icon && (
                                        <div className="size-6 bg-muted shrink-0 text-muted-foreground rounded-full flex items-center justify-center">
                                          <DynamicIcon name={document.icon} className="size-4" />
                                        </div>
                                      )}
                                      <p className="font-medium truncate">{document.name}</p>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-4">
                      <Label htmlFor="revision">Revision</Label>
                      <Popover open={revisionComboboxOpen} onOpenChange={setRevisionComboboxOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={revisionComboboxOpen}
                            className="w-full justify-between mb-0 min-h-9"
                            disabled={!selectedDocumentId || revisions.length === 0}
                          >
                            {selectedRevisionId
                              ? formatRevisionLabel(
                                  revisions.find((revision) => revision.id === selectedRevisionId),
                                )
                              : 'Latest'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
                          <Command>
                            <CommandInput placeholder="Search revision..." className="h-9" />
                            <CommandList>
                              <CommandEmpty>No revision found.</CommandEmpty>
                              <CommandGroup>
                                {revisions.length > 0 && (
                                  <CommandItem
                                    value="latest"
                                    onSelect={() => {
                                      updateRevision('');
                                      setRevisionComboboxOpen(false);
                                    }}
                                    className={cn('flex items-center gap-2', {
                                      'bg-gray-300/10': selectedRevisionId === '',
                                    })}
                                  >
                                    Latest
                                  </CommandItem>
                                )}
                                {revisions.map((revision) => (
                                  <CommandItem
                                    key={revision.id}
                                    value={revision.id}
                                    onSelect={() => {
                                      updateRevision(revision.id);
                                      setRevisionComboboxOpen(false);
                                    }}
                                    className={cn('flex items-center gap-2', {
                                      'bg-gray-300/10': selectedRevisionId === revision.id,
                                    })}
                                  >
                                    {formatRevisionLabel(revision)}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-4">
                      <Label htmlFor="heading">Heading</Label>
                      <Popover open={headingComboboxOpen} onOpenChange={setHeadingComboboxOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={headingComboboxOpen}
                            className="w-full justify-between mb-0 min-h-9"
                            disabled={tocEntries.length === 0}
                          >
                            {selectedHeadingId
                              ? (tocEntries.find(([, , , id]) => id === selectedHeadingId)?.[1] ??
                                selectedHeadingId)
                              : tocEntries.length > 0
                                ? 'None'
                                : 'No headings in revision'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
                          <Command>
                            <CommandInput placeholder="Search heading..." className="h-9" />
                            <CommandList>
                              <CommandEmpty>No heading found.</CommandEmpty>
                              <CommandGroup>
                                {tocEntries.length > 0 && (
                                  <CommandItem
                                    value="none"
                                    onSelect={() => {
                                      updateHeading('');
                                      setHeadingComboboxOpen(false);
                                    }}
                                    className={cn('flex items-center gap-2', {
                                      'bg-gray-300/10': selectedHeadingId === '',
                                    })}
                                  >
                                    None
                                  </CommandItem>
                                )}
                                {tocEntries.map(([key, text, tag, id]) => {
                                  const depth = parseInt(tag.slice(1), 10) - tocMinDepth;
                                  const paddingInlineStart = `${depth * 0.75 + 0.25}rem`;
                                  return (
                                    <CommandItem
                                      key={key}
                                      value={`${id} ${text}`}
                                      onSelect={() => {
                                        updateHeading(id);
                                        setHeadingComboboxOpen(false);
                                      }}
                                      className={cn('flex items-center gap-2', {
                                        'bg-gray-300/10': selectedHeadingId === id,
                                      })}
                                    >
                                      <span style={{ paddingInlineStart }}>
                                        {text || '(untitled)'}
                                      </span>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
          <DialogFooter>
            {node && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                className="sm:mr-auto"
              >
                <UnlinkIcon className="h-4 w-4 mr-2" />
                Unlink
              </Button>
            )}
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !url ||
                url === '#' ||
                (rel === 'bookmark' && !text) ||
                (rel === 'bookmark' && internalLinkType === 'document' && !selectedDocumentId)
              }
            >
              Confirm
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default memo(LinkDialog);
