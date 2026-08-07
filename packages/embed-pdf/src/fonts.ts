/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { FontCharset } from '@embedpdf/models';
import type { FontFallbackConfig } from '@embedpdf/engines';

/**
 * Fallback fonts for PDFs that do not embed their own.
 *
 * PDFium only reaches for these when a document names a font it did not
 * embed. An embedded font always wins, so this changes nothing about how a
 * normal PDF renders — it is the difference between tofu boxes and readable
 * text on the documents that left their fonts out.
 *
 * Everything resolves against our own origin. @embedpdf/engines defaults these
 * to cdn.jsdelivr.net, which would put a third party in the path of reading a
 * document stored on your own server, and would fail outright on an air-gapped
 * install. Same reasoning as the wasm binary in `viewer.tsx`.
 *
 * Arabic and Hebrew ship with the app (328 KB, in `apps/web/public/pdf-fonts`).
 * The CJK entries are wired but their files are not shipped: the four packs
 * come to ~139 MB, roughly a 40% increase in image size, for a fallback most
 * readers never reach — CJK documents nearly always embed or subset their
 * fonts precisely because they cannot rely on the reader having them.
 *
 * Dropping a file into that directory is all it takes to enable one; see the
 * README there. Until then the fetch 404s, the manager logs one line and
 * returns null, and rendering carries on exactly as it does today.
 */
const FONT_BASE_URL = '/pdf-fonts/';

export const pdfFontFallback: FontFallbackConfig = {
  baseUrl: FONT_BASE_URL,
  fonts: {
    // Shipped.
    [FontCharset.ARABIC]: [
      { url: 'NotoNaskhArabic-Regular.ttf', weight: 400 },
      { url: 'NotoNaskhArabic-Bold.ttf', weight: 700 },
    ],
    [FontCharset.HEBREW]: [
      { url: 'NotoSansHebrew-Regular.ttf', weight: 400 },
      { url: 'NotoSansHebrew-Bold.ttf', weight: 700 },
    ],

    // Cyrillic, Greek and Vietnamese all resolve to the same Noto Sans faces,
    // which is how @embedpdf/engines maps them too. Two faces rather than the
    // pack's eighteen: 1.2 MB against 11 MB, and the weight matcher falls back
    // to the nearest available, so Light and Thin documents still render.
    [FontCharset.CYRILLIC]: [
      { url: 'NotoSans-Regular.ttf', weight: 400 },
      { url: 'NotoSans-Bold.ttf', weight: 700 },
    ],
    [FontCharset.GREEK]: [
      { url: 'NotoSans-Regular.ttf', weight: 400 },
      { url: 'NotoSans-Bold.ttf', weight: 700 },
    ],
    [FontCharset.VIETNAMESE]: [
      { url: 'NotoSans-Regular.ttf', weight: 400 },
      { url: 'NotoSans-Bold.ttf', weight: 700 },
    ],

    // Wired, not shipped. Add the files to enable — no rebuild required.
    //
    // These are the names the upstream packs actually use, so a downloaded file
    // drops straight in. Note that Simplified and Traditional Chinese are
    // "Hans" and "Hant", not "SC" and "TC" as their package names suggest — a
    // renamed file simply never loads, and the only sign is one console line.
    [FontCharset.SHIFTJIS]: [
      { url: 'NotoSansJP-Regular.otf', weight: 400 },
      { url: 'NotoSansJP-Bold.otf', weight: 700 },
    ],
    [FontCharset.HANGEUL]: [
      { url: 'NotoSansKR-Regular.otf', weight: 400 },
      { url: 'NotoSansKR-Bold.otf', weight: 700 },
    ],
    [FontCharset.GB2312]: [
      { url: 'NotoSansHans-Regular.otf', weight: 400 },
      { url: 'NotoSansHans-Bold.otf', weight: 700 },
    ],
    [FontCharset.CHINESEBIG5]: [
      { url: 'NotoSansHant-Regular.otf', weight: 400 },
      { url: 'NotoSansHant-Bold.otf', weight: 700 },
    ],
  },
};
