# PDF fallback fonts

Served at `/pdf-fonts/`. PDFium reaches for these only when a PDF **does not
embed** the font it needs — an embedded font is always used as-is, so nothing
here changes how a normal document renders.

Everything small enough to ship is shipped. Only CJK is left out, and only
because of its size.

## Shipped

| Charset                        | File                          |
| ------------------------------ | ----------------------------- |
| Arabic                         | `NotoNaskhArabic-Regular.ttf` |
| Arabic                         | `NotoNaskhArabic-Bold.ttf`    |
| Hebrew                         | `NotoSansHebrew-Regular.ttf`  |
| Hebrew                         | `NotoSansHebrew-Bold.ttf`     |
| Cyrillic, Greek and Vietnamese | `NotoSans-Regular.ttf`        |
| Cyrillic, Greek and Vietnamese | `NotoSans-Bold.ttf`           |

1.5 MB in total. Noto fonts under the SIL Open Font License 1.1 — see
`LICENSE`, which must travel with the files if you redistribute them.

Cyrillic, Greek and Vietnamese share the same two Noto Sans faces, which is how
`@embedpdf/engines` maps them too. Two faces rather than the Latin pack's
eighteen: 1.2 MB against 11 MB. The weight matcher falls back to the nearest
available face, so a document asking for Light or Thin still renders.

Vendored rather than installed: the `@embedpdf/fonts-*` packages export only a
metadata listing, not the `.ttf` files themselves, so there is no supported way
to import the fonts from them.

## Adding CJK

Japanese, Korean and Chinese are already wired up in
`packages/embed-pdf/src/fonts.ts`. They are not shipped because the four packs
come to roughly 139 MB, which would grow the image by about 40% for a fallback
most readers never reach — CJK documents nearly always embed or subset their
fonts, precisely because they cannot count on the reader having them.

Drop the files in beside these ones and they start working. No rebuild, no
configuration:

| Charset             | Expected filenames                                  | Source               |
| ------------------- | --------------------------------------------------- | -------------------- |
| Japanese            | `NotoSansJP-Regular.otf`, `NotoSansJP-Bold.otf`     | `@embedpdf/fonts-jp` |
| Korean              | `NotoSansKR-Regular.otf`, `NotoSansKR-Bold.otf`     | `@embedpdf/fonts-kr` |
| Simplified Chinese  | `NotoSansHans-Regular.otf`, `NotoSansHans-Bold.otf` | `@embedpdf/fonts-sc` |
| Traditional Chinese | `NotoSansHant-Regular.otf`, `NotoSansHant-Bold.otf` | `@embedpdf/fonts-tc` |

Use the names exactly as they come out of those packages. Chinese is the trap:
the packs are called `fonts-sc` and `fonts-tc`, but the files inside are
`NotoSansHans-*` and `NotoSansHant-*`. Rename one and it silently never loads.

The Regular weight is enough on its own — Bold is optional, and the matcher
falls back to the nearest available weight.

For a container, mount them over this directory:

```yaml
volumes:
  - ./pdf-fonts:/app/web/pdf-fonts
```

Include the files above **and** the ones already here — a bind mount replaces
the directory rather than merging with it, so Arabic and Hebrew disappear if
you leave them out.

Until a file is present, a PDF needing that charset renders exactly as it does
today and one line is logged to the browser console. Nothing breaks.

One caveat while developing: `pnpm dev` and `pnpm start` answer a missing font
with the SPA shell and a `200`, because Vite falls back to `index.html` for
unmatched paths. The font loader then gets HTML where it expected a font. In
production the backend returns a real `404` for these — `.otf` and `.ttf` are in
its static-asset list, so the SPA fallback does not apply. If you are testing
CJK locally, put the file in place rather than reading anything into the `200`.
