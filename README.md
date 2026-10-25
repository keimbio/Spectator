# ₊°˖.⟡ ݁. Spectator – Brush Studio⋆°.⊹ ݁₊*。݁

A single-file, client-side previewer & packager for Procreate (`.brush`, `.brushset`) and
Photoshop (`.abr`) brushes. Everything runs in your browser — files are never uploaded.

## Deploy
Drop `index.html` in a repo and enable GitHub Pages, or just open it locally. Identical
capability either way (pure client-side). No build step.

Edit two constants near the top of the `<script>` to point the footer at your repo:
`REPO_URL` and `APP_VERSION`.

## Features
- Batch-load `.brush`, `.brushset`, `.abr` — click the Brushes box or drag & drop onto it.
- **Brushset order and names are preserved** exactly as stored in the set
  (both XML and binary `brushset.plist` formats are supported).
- **Dual brushes** stay intact (not split); their secondary shape/grain appear in the info panel.
- Grid / Stack views with adjustable column count.
- Info panel: name, source, dates, decoded Procreate parameters, plus Preview / Shape / Grain
  (and Secondary shape/grain for dual brushes), each with its own Save link.
- Export previews with a live preview window:
  - Layouts: Separate, Grid (set columns and rows), Stacked (set columns; one image or one per
    column) and Strip (set rows; one image or one per row).
  - Formats: PNG, JPEG, WEBP, TIFF (with transparency) and PDF.
  - Background: none, white, black or any custom colour. The colour picker includes the
    Spectator palette plus searchable Pantone TCX and Resene libraries (see `CREDITS.md`).
  - Brush colour: auto-contrast, original or custom, so white strokes never vanish.
  - Tiles are trimmed to the stroke at a consistent scale. Optional name captions; adjustable
    tile width and spacing.
- Export shape + grain PNGs; split a `.brushset` into individual `.brush` files; package selected
  Procreate brushes into a new `.brushset`.
- `.abr` tips → PNG (reliable Photoshop route) and an experimental `.abr` → `.brush` converter.

## Notes
- Writing real `.abr` files isn't reliably possible in-browser (the newer format isn't fully
  documented); use the PNG-tip route for Photoshop. See `CREDITS.md`.
- License: MIT (see `LICENSE`). 

See `CHANGELOG.md` for release history and `INSTRUCTIONS.md` for a step-by-step guide.

# Credits & third-party notices — Spectator

Spectator is released under the MIT License (see `LICENSE`). It is an original implementation,
but it stands on knowledge and one piece of data from the open-source community.

## Embedded material (attribution required)

- **Procreate brush-parameter schema** — adapted from
  [aumlette-lab/procreate-brush-decoder](https://github.com/aumlette-lab/procreate-brush-decoder)
  (MIT License). A trimmed version of its parameter map (setting names, archive paths, and value
  formulas) is embedded to label decoded brush parameters. Used under the MIT License.

## Runtime libraries (loaded from CDN, not bundled)

- **JSZip** — MIT License. https://stuk.github.io/jszip/
- **jsPDF** — MIT License. https://github.com/parallax/jsPDF

If you self-host these instead of loading them from a CDN, include their MIT notices alongside
the copies you distribute.

## Format & technique references (no code copied — acknowledged with thanks)

File formats and techniques are facts/ideas rather than copyrightable expression, so these
projects' licenses do not attach to Spectator. Credited out of respect.

- [jaromvogel/prospect](https://github.com/jaromvogel/prospect) (GPLv3) — the macOS Procreate
  viewer that inspired this tool; demonstrated the `QuickLook/Thumbnail.png` preview approach.
- [tohsakrat/Brush-Converter](https://github.com/tohsakrat/Brush-Converter) (CC BY-NC-SA 4.0) —
  reverse-engineering write-up that aided understanding of the Photoshop `.abr` sampled-brush
  layout, and confirmed the `Reset/` + `Sub01/` brushset folder semantics.
- [aredridel/mkbrushset](https://github.com/aredridel/mkbrushset) (AGPLv3) — reference for the
  Procreate `.brushset` packaging method.
- [joanroig/palette-studio](https://github.com/joanroig/palette-studio) (GPLv3) — reference for
  the overall UI structure.

Photoshop `.abr` parsing is based on the publicly documented format
(http://fileformats.archiveteam.org/wiki/Photoshop_brush) and Adobe's file-format specification.
- Attribution for the embedded parameter schema is also found in `CREDITS.md`.