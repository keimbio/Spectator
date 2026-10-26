/* =============================================================================
   Spectator: client-side Procreate & Photoshop brush previewer
   Copyright (c) 2026 Klara Keim. All rights reserved. See LICENSE.
   ========================================================================== */
const REPO_URL = "https://github.com/keimbio/Spectator";
const APP_VERSION = "v4.0.0";

/* =============================================================================
   BACKGROUND PRESETS: add your own images here.
   1. Put the full-size image in   assets/backgrounds/
   2. Put a small copy (about 320 px wide) with the same name in
      assets/backgrounds/thumbs/   (optional; the full image is used if missing)
   3. Add a line below. "label" is what Settings shows under the thumbnail.
   ========================================================================== */
const BACKGROUNDS = [
  { id:'marble-green', label:'Green marble', file:'marble-green-dark.jpg' },
  { id:'marble-blue',  label:'Blue marble',  file:'marble-blue-dark.jpg' },
  { id:'marble-grey',  label:'Grey marble',  file:'marble-grey-light.jpg' },
  { id:'marble-aqua',  label:'Aqua marble',  file:'marble-aqua-light.jpg' }
];

/* Text fonts offered in Settings. Hanken Grotesk ships with Spectator; the
   others use fonts already installed on the computer. */
const FONTS = {
  hanken:    "'Hanken Grotesk', system-ui, -apple-system, 'Segoe UI', sans-serif",
  helvetica: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  lucida:    "'Lucida Grande', 'Lucida Sans Unicode', 'Lucida Sans', sans-serif",
  system:    "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
};
