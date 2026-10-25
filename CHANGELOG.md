# Changelog

All notable changes to Spectator are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/); versioning follows [SemVer](https://semver.org/).

## [3.3.0] - 2026-10-25

### Added
- **Redesigned export window** with a live preview. What you see is drawn by the same code that
  writes the file, so the preview matches the export exactly. Multi-image exports get a pager.
  A summary line shows how many files you'll get and their pixel size before you export.
- **Grid layout:** choose columns and rows (each can stay on Auto). If the brushes don't fit
  in one grid, they continue onto further images.
- **Stacked layout:** choose the number of columns, and save them as one image or one image per
  column. Brushes fill each column top to bottom, in set order.
- **Strip layout:** choose the number of rows, and save them as one image or one image per row.
- **Background:** None, White, Black or Custom. Custom opens a colour picker with a hue/saturation
  field, hex entry, a screen eyedropper (Chromium browsers), recent colours, and searchable
  libraries: the Spectator retro palette, Pantone TCX (2,310) and Resene (1,383).
- **Brush colour:** Auto, Original or Custom. Auto turns strokes black on light backgrounds.
  Recolouring maps stroke brightness to opacity, so texture survives in any colour.
- **Trim empty space** (on by default): every tile is cropped to its stroke, and the final
  image is sized to the cells actually used. No more blank rows or wide empty margins.
- Export settings and recent colours are remembered between visits (stored only in this browser).
- Copyright notice: a `NOTICE.md` file, a copyright comment and author metadata at the top of
  `index.html`, and a copyright and license line in the page footer.
- TIFF exports keep transparency (RGBA with an unassociated alpha channel) when Background is None.

### Fixed
- **White previews disappeared on a white background.** Procreate renders brush thumbnails as
  white strokes, and the old "White background" checkbox filled the canvas white under them.
  The new Brush colour setting fixes this (Auto switches strokes to black on light backgrounds).
- **JPEG and PDF "no background" exports came out black or invisible.** JPEG can't store
  transparency, so transparent pixels became black. PDF pages render white, so white strokes
  vanished. "None" is now unavailable for those two formats, and the window explains why.
- **Separate export dropped brushes that share a name.** Each file was named after its brush,
  so duplicates such as several "[ Insert Label ]" dividers overwrote each other inside the
  .zip. Files now get a set-order number prefix (`01_…`, `02_…`).
- **Grid, Stacked and Strip had fixed shapes.** Grid was always roughly square, and Stacked
  and Strip were always a single column or row. Every tile was a full square, so wide strokes
  sat inside large empty bands.
- TIFF `BitsPerSample` now lists a value per channel, as the TIFF 6.0 spec requires.
  Previously one value was written for three channels.

### Changed
- **License changed from MIT to the Spectator Source-Available License.** Spectator is still
  free to use and fork on GitHub. Re-uploading, re-hosting and redistribution now need the
  author's written permission. Versions up to 3.2.1 remain under MIT.
- Source-file tools (shape + grain, split, `.abr`, package `.brushset`) moved to their own
  "Source files" tab in the export window.
- Version bumped to 3.3.0.

## [3.2.1] - 2026-07-12

### Fixed
- **Brushes from a `.brushset` now load in the set's true order.** Procreate writes
  `brushset.plist` as an **XML** plist, while `Brush.archive` inside each brush folder is a
  **binary** plist. Spectator only had a binary-plist reader, so parsing `brushset.plist` threw,
  the brush order silently fell back to ZIP central-directory order (which is arbitrary), and
  brushes appeared shuffled. Brush *names* still worked, which masked the failure — they come
  from the binary `Brush.archive`, not the manifest.
- Added an XML plist parser. `brushset.plist` is now sniffed by header (`bplist00` vs `<?xml`)
  and read with the appropriate parser, so both formats are handled.

### Added
- Logo displayed beneath the site credit in the footer.

### Changed
- Version bumped to 3.2.1.

## [1.0.1] - 2026-07-12

### Fixed
- Handled `NSKeyedArchiver`-wrapped `brushset.plist` (where `brushes` is an `NS.objects` array of
  UID references) in addition to the plain form; case-insensitive manifest lookup; brush folders
  missing from the manifest are appended rather than dropped.

## [1.0.0] - 2026-06-14

### Added
- Initial release: Procreate `.brush` / `.brushset` and Photoshop `.abr` preview, inspection,
  export and packaging. Runs entirely client-side.
- Grid / Stack views with adjustable column count; click-or-drop import.
- Info panel with decoded Procreate parameters, shape, grain, and dual-brush secondary sources.
- Preview export (PNG / JPEG / WEBP / TIFF / PDF), shape+grain export, `.brushset` split and package.

### Fixed
- NSKeyedArchiver `UID` values were resolved against the wrong object table, which erased brush
  names and all decoded parameters.
- `Reset/` and `Sub01/` subfolders were treated as separate brushes, splitting dual brushes in two.
