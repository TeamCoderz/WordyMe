'use client';

import { Settings } from '@repo/ui/components/icons';
import { Label } from '@repo/ui/components/label';
import { Switch } from '@repo/ui/components/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import { Input } from '@repo/ui/components/input';
import { useSelector as useEditorSelector } from '@repo/editor/store';

import {
  $getPageSetupNode,
  HeaderConfig,
  FooterConfig,
  type PageSetup,
  PageSize,
  Orientation,
  PAGE_SIZES,
} from '@repo/editor/nodes/PageNode';
import { useLexicalComposerContext } from '@repo/editor/lexical';

export function PageSetup() {
  const [editor] = useLexicalComposerContext();
  const pageSetup = useEditorSelector((state) => state.pageSetup);
  const isEditable = editor.isEditable();
  if (pageSetup === null) return null;
  const { isPaged, pageSize, orientation, margins, headers, footers } = pageSetup;
  const updatePageSetup = (pageSetup: Partial<PageSetup>) => {
    const { isPaged, pageSize, orientation, margins, headers, footers } = pageSetup;
    editor.update(() => {
      const pageSetupNode = $getPageSetupNode();
      if (!pageSetupNode) return;
      if (isPaged !== undefined) {
        pageSetupNode.setIsPaged(isPaged);
      }
      if (pageSize !== undefined) {
        pageSetupNode.setPageSize(pageSize);
      }
      if (orientation !== undefined) {
        pageSetupNode.setOrientation(orientation);
      }
      if (margins !== undefined) {
        pageSetupNode.setMargins(margins);
      }
      if (headers !== undefined) {
        pageSetupNode.setHeaders(headers);
      }
      if (footers !== undefined) {
        pageSetupNode.setFooters(footers);
      }
    });
  };

  const handlePagedChange = (isPaged: boolean) => {
    updatePageSetup({ isPaged });
  };

  const handlePageSizeChange = (pageSize: PageSize) => {
    updatePageSetup({ pageSize });
  };

  const handleOrientationChange = (orientation: Orientation) => {
    updatePageSetup({ orientation });
  };

  const handleMarginChange = (side: keyof PageSetup['margins'], value: string) => {
    const numValue = parseFloat(value) || 0;
    updatePageSetup({
      margins: { ...margins, [side]: numValue },
    });
  };

  const handleHeadersChange = (next: Partial<HeaderConfig>) => {
    updatePageSetup({
      headers: { ...headers, ...next },
    });
  };

  const handleFootersChange = (next: Partial<FooterConfig>) => {
    updatePageSetup({
      footers: { ...footers, ...next },
    });
  };

  return (
    <div className="flex flex-col text-sm p-3 gap-2 h-full overflow-x-hidden overflow-y-auto scrollbar-thin">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="paged-toggle" className="text-sm font-medium">
            Paged
          </Label>
          <Switch
            id="paged-toggle"
            checked={isPaged}
            onCheckedChange={handlePagedChange}
            disabled={!isEditable}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {isPaged
            ? 'Document uses pages with defined size and margins'
            : 'Document is pageless and flows continuously'}
        </p>
      </div>

      {isPaged && (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="page-size" className="text-sm font-medium">
              Page Size
            </Label>
            <Select value={pageSize} onValueChange={handlePageSizeChange}>
              <SelectTrigger id="page-size" className="w-full" disabled={!isEditable}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAGE_SIZES).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="orientation" className="text-sm font-medium">
              Orientation
            </Label>
            <Select value={orientation} onValueChange={handleOrientationChange}>
              <SelectTrigger id="orientation" className="w-full" disabled={!isEditable}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">Portrait</SelectItem>
                <SelectItem value="landscape">Landscape</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-3">
            <Label className="text-sm font-medium">Margins (inches)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="margin-top" className="text-xs">
                  Top
                </Label>
                <Input
                  id="margin-top"
                  type="number"
                  min="0"
                  step="0.1"
                  value={margins.top}
                  onChange={(e) => handleMarginChange('top', e.target.value)}
                  className="h-8"
                  disabled={!isEditable}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="margin-right" className="text-xs">
                  Right
                </Label>
                <Input
                  id="margin-right"
                  type="number"
                  min="0"
                  step="0.1"
                  value={margins.right}
                  onChange={(e) => handleMarginChange('right', e.target.value)}
                  className="h-8"
                  disabled={!isEditable}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="margin-bottom" className="text-xs">
                  Bottom
                </Label>
                <Input
                  id="margin-bottom"
                  type="number"
                  min="0"
                  step="0.1"
                  value={margins.bottom}
                  onChange={(e) => handleMarginChange('bottom', e.target.value)}
                  className="h-8"
                  disabled={!isEditable}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="margin-left" className="text-xs">
                  Left
                </Label>
                <Input
                  id="margin-left"
                  type="number"
                  min="0"
                  step="0.1"
                  value={margins.left}
                  onChange={(e) => handleMarginChange('left', e.target.value)}
                  className="h-8"
                  disabled={!isEditable}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Label htmlFor="header-toggle" className="text-sm font-medium">
                  Headers
                </Label>
                <p className="text-xs text-muted-foreground">Show header on each page.</p>
              </div>
              <Switch
                id="header-toggle"
                checked={headers.enabled}
                onCheckedChange={(enabled) =>
                  handleHeadersChange({
                    enabled,
                  })
                }
                disabled={!isEditable}
              />
            </div>

            {headers.enabled && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs font-medium">Different first page</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Use a different header on the first page.
                    </p>
                  </div>
                  <Switch
                    checked={headers.differentFirst}
                    onCheckedChange={(differentFirst) => handleHeadersChange({ differentFirst })}
                    disabled={!isEditable}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs font-medium">Different even pages</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Use a different header on even pages.
                    </p>
                  </div>
                  <Switch
                    checked={headers.differentEven}
                    onCheckedChange={(differentEven) => handleHeadersChange({ differentEven })}
                    disabled={!isEditable}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Label htmlFor="footer-toggle" className="text-sm font-medium">
                  Footers
                </Label>
                <p className="text-xs text-muted-foreground">Show footer on each page.</p>
              </div>
              <Switch
                id="footer-toggle"
                checked={footers.enabled}
                onCheckedChange={(enabled) =>
                  handleFootersChange({
                    enabled,
                  })
                }
                disabled={!isEditable}
              />
            </div>

            {footers.enabled && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs font-medium">Different first page</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Use a different footer on the first page.
                    </p>
                  </div>
                  <Switch
                    checked={footers.differentFirst}
                    onCheckedChange={(differentFirst) => handleFootersChange({ differentFirst })}
                    disabled={!isEditable}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs font-medium">Different even pages</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Use a different footer on even pages.
                    </p>
                  </div>
                  <Switch
                    checked={footers.differentEven}
                    onCheckedChange={(differentEven) => handleFootersChange({ differentEven })}
                    disabled={!isEditable}
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function PageSetupHeader() {
  return (
    <div className="flex items-center gap-2 p-4 shrink-0 truncate">
      <Settings className="size-4" />
      Page Setup
    </div>
  );
}
