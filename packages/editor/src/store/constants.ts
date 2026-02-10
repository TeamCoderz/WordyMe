export const MIN_ALLOWED_FONT_SIZE = 8;
export const MAX_ALLOWED_FONT_SIZE = 72;
export const DEFAULT_FONT_SIZE = 16;

export const blockTypeToBlockName = {
  bullet: 'Bulleted List',
  check: 'Check List',
  code: 'Code Block',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  h4: 'Heading 4',
  h5: 'Heading 5',
  h6: 'Heading 6',
  number: 'Numbered List',
  paragraph: 'Normal',
  quote: 'Quote',
};

export type BlockType = keyof typeof blockTypeToBlockName;

export const DIALOG_TYPES = {
  image: 'image',
  sketch: 'sketch',
  diagram: 'diagram',
  score: 'score',
  table: 'table',
  iframe: 'iframe',
  link: 'link',
  layout: 'layout',
  attachment: 'attachment',
};

export type EditorDialogType = keyof typeof DIALOG_TYPES | null;

export const fontFamilyToFriendlyName = {
  Roboto: 'Roboto',
  KaTeX_Main: 'KaTeX',
  Virgil: 'Virgil',
  Cascadia: 'Cascadia',
  'Courier New': 'Courier New',
  Georgia: 'Georgia',
};

export type FontFamily = keyof typeof fontFamilyToFriendlyName | string;
