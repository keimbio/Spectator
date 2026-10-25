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

## Colour libraries (embedded in the export colour picker)

- **Pantone TCX colour list.** A community-compiled list of Pantone Fashion, Home + Interiors
  (TCX) names with approximate sRGB hex values, the same dataset used by ChromaScope. Values are
  screen approximations, not official Pantone standards. PANTONE® is a registered trademark of
  Pantone LLC. Spectator is not affiliated with or endorsed by Pantone.
- **Resene RGB Values List.** Embedded under the permission notice below, which must accompany
  any copy:

> Resene RGB Values List. For further information refer to http://www.resene.co.nz
> Copyright Resene Paints Ltd 2001
>
> Permission to copy this software, to modify it, to redistribute it, to distribute modified
> versions, and to use it for any purpose is granted, subject to the following restrictions and
> understandings.
>
> 1. Any text copy made of this dictionary must include this copyright notice in full.
> 2. Any redistribution in binary form must reproduce this copyright notice in the documentation
>    or other materials provided with the distribution.
> 3. Resene Paints Ltd makes no warranty or representation that this dictionary is error-free,
>    and is under no obligation to provide any services, by way of maintenance, update, or
>    otherwise.
> 4. There shall be no use of the name of Resene or Resene Paints Ltd in any advertising,
>    promotional, or sales literature without prior written consent in each case.
> 5. These RGB colour formulations may not be used to the detriment of Resene Paints Ltd.

  The 2021 Resene `.ase` master file was not embedded, because it doesn't carry a redistribution
  licence.
- **Spectator retro palette.** Klara Keim's own palette (`retro_icons_palette2`).

## Design references for the v3.3 export window

Interaction patterns follow established guidance: Saffer's *Microinteractions* and Cooper's
*About Face* (live feedback over dialogs, smart remembered defaults, error prevention). No code
or assets were copied.

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
