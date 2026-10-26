# Spectator: step-by-step guide

You don't need any coding experience. Everything runs in your web browser, and your brush files never leave your computer.

## 1. Open Spectator

- **Online:** go to https://keimbio.github.io/Spectator/
- **On your own computer:** keep the whole Spectator folder together (`index.html` plus the `lib`, `fonts` and `assets` folders), then double-click `index.html`. It works without internet.

## 2. Load brushes

1. Click **Import**, or drag `.brush`, `.brushset` or `.abr` files onto the **Brushes** panel.
2. Click a preview to select it. **Shift-click** another preview to select everything between them. You can also use **Select all**, **Procreate only** or **Clear selection**.
3. Switch between **Grid** and **List**, and choose how many **Columns** to show. List view shows wide stroke previews.

## 3. Read a brush's settings

Click the **i** button on a brush card.
- **Left side:** the stroke preview, shape and grain, each with a save button. Dual brushes also show the secondary brush. Below that, **About this brush** lists the author, creation date and file details, and shows the author's signature.
- **Right side:** the settings, in the same order as Procreate's Brush Studio. Click a section name at the top to jump to it.
- Only the settings the brush actually uses are shown. Turn on **Show unused settings** to see everything.
- **Shape source / Grain source:**
  - **Imported image** means the image is stored inside the brush.
  - **Procreate library: Hard** (for example) means the brush uses one of Procreate's built-in shapes, which isn't inside the file.

## 4. Export preview images

1. Select brushes, then click **Export previews**. A live preview appears on the right.
2. **Format:** PNG or WEBP keep transparency. JPEG gives the smallest files. TIFF suits print. PDF puts each image on its own page.
3. **Layout:**
   - **Separate:** one image per brush, delivered as a .zip.
   - **Grid:** set **Columns** and **Rows**, or leave either on **Auto**. Brushes that don't fit continue onto more images.
   - **Stacked:** set the number of columns, then choose **One image** or **Image per column**.
   - **Strip:** set the number of rows, then choose **One image** or **Image per row**.
4. **Background:** choose None, White, Black or **Custom**. Custom opens a color picker:
   - Drag in the square to pick a color, and use the rainbow bar to change the hue.
   - Type a hex code such as `#3F6E57`.
   - Browse the **Spectator**, **Pantone** or **Resene** libraries, and type in the search box to filter by name.
5. **Brush color:** leave this on **Auto** unless you need a specific color. Auto turns the strokes black on light backgrounds.
6. Check the line at the bottom, which shows how many files you'll get and their size. Then click **Export N previews**.

## 5. Export brush files

Select brushes, then click **Export brushes** to:
- save each brush's shape and grain as PNGs
- split a `.brushset` into single `.brush` files
- turn `.abr` tips into PNGs
- bundle the selected brushes into a new `.brushset`

## 6. Settings

Click **Settings** in the top-right corner:
- **Appearance:** Dark, Light or Match system.
- **Color theme:** pick one of the palettes.
- **Background:**
  - **None** is a plain color.
  - **Aura** is a soft glow in your theme's colors.
  - The marble photos are the presets.
  - **Upload image** uses any picture from your computer. It stays in this browser only.
- **Dimming:** darkens or lightens the background so the panel stays easy to read.
- **Text:** choose the font and text size.

Spectator remembers your settings. **Reset to defaults** puts everything back.

## 7. Customize Spectator (for Klara)

All edits happen in the `src` folder. When you're done, rebuild `index.html` (step 7.3).

### 7.1 Add a color theme
1. Open `src/js/themes.js` in a text editor such as TextEdit (in plain-text mode), BBEdit or VS Code.
2. Copy one theme block, from `{ id:` to the closing `},`. Paste it below the last theme.
3. Give it a new `id` (lowercase, no spaces) and a `name`. Then change the six colors:
   - `light`: text in dark mode, page color in light mode
   - `accent`: buttons and selections
   - `accent2`: the second highlight color
   - `deep`: a supporting color
   - `shade`: tints the panels (repeat `dark` for a neutral look)
   - `dark`: page color in dark mode, text in light mode
4. Save, then rebuild (7.3). The theme appears in Settings with dark and light versions, and the contrast is adjusted automatically.

### 7.2 Add a background preset
1. Put the image in `assets/backgrounds/`. JPG, about 2560 px wide, works well.
2. Optionally, put a small copy (about 320 px wide) with the same file name in `assets/backgrounds/thumbs/`.
3. Open `src/js/config.js` and add a line to `BACKGROUNDS`, for example:
   `{ id:'sunset', label:'Sunset', file:'sunset.jpg' },`
4. Save, then rebuild (7.3).

### 7.3 Rebuild index.html
1. Open **Terminal**.
2. Type `cd ` (with a space after it), drag the Spectator folder from Finder into the Terminal window, then press **Return**.
3. Type `python3 build.py` and press **Return**.
4. You should see `index.html written`. If you see "JavaScript error", the message names the line to fix, and `index.html` is left unchanged.

## 8. Publish an update (maintainer only)

1. On GitHub, open the **Spectator** repository and click **Add file → Upload files**.
2. Drag in everything from your Spectator folder, including the `lib`, `fonts`, `assets` and `src` folders and `build.py`. Then click **Commit changes**.
3. GitHub Pages republishes automatically. Wait about a minute, then reload https://keimbio.github.io/Spectator/.

## Troubleshooting

| Problem | Fix |
|---|---|
| The page looks unstyled, or the font is wrong | The `fonts`, `lib` or `assets` folder is missing next to `index.html`. Keep the whole folder together. |
| A background tile says "File missing" | Its image isn't in `assets/backgrounds/`, or the file name in `config.js` doesn't match exactly. |
| Your uploaded background disappeared | Uploaded images are stored per browser. Clearing site data, or using a private window, removes them. Upload it again. |
| Changes don't show up after publishing | Your browser cached the old page. Hard-reload with `Cmd + Shift + R`. |
| "Very large image" warning when exporting | Lower **Tile width**, or add more columns or rows. |
| "None" is greyed out under Background | JPEG and PDF can't be transparent. Choose PNG, WEBP or TIFF instead. |
| No eyedropper in the color picker | Only Chrome, Edge and Arc support it. Type the hex code instead. |
| `python3: command not found` | Install Python 3 from https://www.python.org/downloads/, then try again. |
| You can't find a downloaded file | Look in your **Downloads** folder. To see hidden files in Finder, press `Cmd + Shift + .` |
