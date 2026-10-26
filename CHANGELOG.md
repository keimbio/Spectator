# Changelog

All notable changes to Spectator are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/); versioning follows [SemVer](https://semver.org/).

## [4.0.0] - 2026-10-26

### Added
- **New main window.** The header now has four actions: **Import**, **Export brushes**,
  **Export previews** (each showing how many brushes are selected) and **Settings**. Selection
  and layout controls sit in a toolbar inside the Brushes panel. The empty panel is now a large
  drop zone.
- **Settings window**, modeled on Claude Export Viewer:
  - Dark, light or match-system appearance.
  - Five color themes: Spectator, Aquamarine, Burnt peach, Sunlit clay and Twilight indigo.
    Each theme is six colors in `src/js/themes.js`, and the surfaces, borders, text shades,
    light-mode version and contrast checks are derived from them.
  - Background: none, an "aura" in the theme's colors, four photo presets, or an uploaded image.
    The uploaded image is stored in IndexedDB.
  - Background dimming, text font (Hanken Grotesk, Helvetica Neue, Lucida Grande or system),
    and text size. The size control moved here from the header.
- **Redesigned brush details**, laid out like Procreate's Brush Studio:
  - Section tabs follow Procreate's order, and settings are grouped under their Procreate
    subheadings (for example Pressure taper and Stamp color jitter).
  - Values show as meters, On/Off states, named modes or degrees.
  - Only the settings a brush uses are listed. "Show unused settings" lists the rest.
  - A side column shows the stroke preview, shape, grain, the secondary brush for dual brushes,
    About this brush (author, creation date, set, file) and the author's signature.
- List view now shows wide stroke previews with the name beside them. Grid view goes up to 6
  columns, adapts to narrow windows, and remembers your layout.
- Shift-click selects a range of brushes.

### Fixed
- **Brush settings were mis-decoded.** Spectator used a trimmed copy of the parameter schema that
  kept only the first archive key of each setting and dropped the mapping tables.
  - Settings stored across several keys lost their meaning. For example, "Input Style" printed
    every possible value ("On Touch Only, Azimuth, Azimuth and Rolling") instead of the brush's
    actual value.
  - Text-only formulas such as "0 = Moving, 1 = Texturised" were never applied.
  - Spectator now embeds the full v1.7 schema and decodes it the way the reference decoder does:
    multi-key pattern matching, derived blend-mode pairs, defaults for missing keys, enumerations,
    and JavaScript-style formulas such as Pressure roundness.
- **"Shape Source: $null"**: `$null` is how Procreate marks a shape or grain imported into the
  brush. It now reads "Imported image (stored as Shape.png)". A named source such as
  `Brush-Preset-Hard.png` reads "Procreate library: Hard", with a note that the file isn't
  inside the brush.
- **Count showed 0** on some brushes. Procreate's minimum is 1, so the value is now clamped.
- **Brush previews disappeared in light mode.** Procreate thumbnails are white strokes, so preview
  areas stay dark in both modes.
- **Card text was too small.** Brush names are larger, wrap to two lines, and show the brush set
  underneath.

### Changed
- **Fonts and libraries are bundled.** Hanken Grotesk, JSZip and jsPDF ship in `fonts/` and
  `lib/`, with nothing loaded from Google Fonts or a CDN. Spectator is now a small folder rather
  than a single file. Deploy all of it: `index.html`, `lib/`, `fonts/` and `assets/`.
- **Source is split into `src/`.** `build.py` assembles `index.html` from it and checks the
  JavaScript before writing.
- **US spelling throughout the interface** ("color").
- Version bumped to 4.0.0.

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
