import { SerializedParagraphNode } from 'lexical';
import { PageSetup, PageSize } from './types';

export const PAGE_SIZES: Record<PageSize, { width: number; height: number; label: string }> = {
  Letter: { width: 816, height: 1056, label: 'Letter (8.5" x 11")' },
  Tabloid: { width: 1056, height: 1632, label: 'Tabloid (11" x 17")' },
  Legal: { width: 816, height: 1344, label: 'Legal (8.5" x 14")' },
  Statement: { width: 528, height: 816, label: 'Statement (5.5" x 8.5")' },
  Executive: { width: 696, height: 1008, label: 'Executive (7.25" x 10.5")' },
  Folio: { width: 816, height: 1248, label: 'Folio (8.5" x 13")' },
  A3: { width: 1123, height: 1587, label: 'A3 (11.69" x 16.54")' },
  A4: { width: 794, height: 1123, label: 'A4 (8.27" x 11.69")' },
  A5: { width: 559, height: 794, label: 'A5 (5.83" x 8.27")' },
  B4: { width: 945, height: 1334, label: 'B4 (9.84" x 13.90")' },
  B5: { width: 665, height: 945, label: 'B5 (6.93" x 9.84")' },
};

export const DEFAULT_PAGE_SETUP: PageSetup = {
  isPaged: false,
  pageSize: 'A4',
  orientation: 'portrait',
  margins: {
    top: 0.4,
    right: 0.4,
    bottom: 0.4,
    left: 0.4,
  },
  headers: {
    enabled: false,
    differentFirst: false,
    differentEven: false,
    default: null,
    first: null,
    even: null,
  },
  footers: {
    enabled: false,
    differentFirst: false,
    differentEven: false,
    default: null,
    first: null,
    even: null,
  },
};

export const EMPTY_PARAGRAPH: SerializedParagraphNode = {
  children: [],
  direction: null,
  format: '',
  indent: 0,
  type: 'paragraph',
  version: 1,
  textFormat: 0,
  textStyle: '',
};
