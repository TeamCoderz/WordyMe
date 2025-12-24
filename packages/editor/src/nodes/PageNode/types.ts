import { SerializedLexicalNode } from 'lexical';

export type PageSize =
  | 'Letter'
  | 'Tabloid'
  | 'Legal'
  | 'Statement'
  | 'Executive'
  | 'Folio'
  | 'A3'
  | 'A4'
  | 'A5'
  | 'B4'
  | 'B5';

export type Orientation = 'portrait' | 'landscape';

export type PageSetup = {
  isPaged: boolean;
  pageSize: PageSize;
  orientation: Orientation;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  headers: HeaderConfig;
  footers: FooterConfig;
};

type HeaderFooterConfig = {
  enabled: boolean;
  differentFirst: boolean;
  differentEven: boolean;
  default: SerializedLexicalNode[] | null;
  first: SerializedLexicalNode[] | null;
  even: SerializedLexicalNode[] | null;
};

export type HeaderConfig = HeaderFooterConfig;
export type FooterConfig = HeaderFooterConfig;
