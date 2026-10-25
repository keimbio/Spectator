# Spectator — step-by-step guide

No coding experience needed. Everything runs in your web browser. Your brush files never leave your computer.

## 1. Open Spectator

- **Online:** go to https://keimbio.github.io/Spectator/
- **Offline:** double-click `index.html`. It opens in your default browser. The first visit needs internet to load two helper libraries and the font.

## 2. Load brushes

1. Click the **Brushes** box (or the **Import** button). Or drag `.brush`, `.brushset` or `.abr` files onto the box.
2. Click a thumbnail to select it, or use **Select all**.
3. Click the **i** button on a card to see the brush's parameters, shape and grain.

## 3. Export preview images

1. Select the brushes you want, then click **Export**. The window opens on the **Preview images** tab, with a live preview on the right.
2. **Format:** PNG or WEBP keep transparency. JPEG gives the smallest files. TIFF suits print. PDF puts each image on its own page.
3. **Layout:**
   - **Separate:** one image per brush, delivered as a .zip.
   - **Grid:** set **Columns** and **Rows**, or leave either on **Auto**. Brushes that don't fit continue onto more images.
   - **Stacked:** set the number of columns, then choose **One image** or **Image per column**.
   - **Strip:** set the number of rows, then choose **One image** or **Image per row**.
4. **Background:** choose None, White, Black or **Custom**. Custom opens a colour picker:
   - Drag in the square to pick a colour, and use the rainbow bar to change the hue.
   - Type a hex code such as `#3F6E57`.
   - Browse the **Spectator**, **Pantone** or **Resene** libraries, and type in the search box to filter by name.
   - Click **Done**, or press `Esc`.
5. **Brush colour:** leave this on **Auto** unless you need a specific colour. Auto turns the strokes black on light backgrounds, so they stay visible.
6. **Size & labels:** set **Tile width** for more or less detail, and **Spacing** for the gap between tiles. You can also turn **Name captions** and **Trim empty space** on or off.
7. Check the line at the bottom: it shows how many files you'll get and their size. Then click **Export N previews**.

Spectator remembers your settings for next time.

## 4. Source files and packaging

Open the **Source files** tab in the export window to:
- save each brush's shape and grain as PNGs
- split a `.brushset` into single `.brush` files
- turn `.abr` tips into PNGs
- bundle the selected brushes into a new `.brushset`

## 5. Publish your own copy on GitHub Pages

1. On GitHub, open your **Spectator** repository and click **Add file → Upload files**.
2. Drag in `index.html`, `README.md`, `INSTRUCTIONS.md`, `CHANGELOG.md`, `CREDITS.md` and `LICENSE`. Then click **Commit changes**.
3. Go to **Settings → Pages**. Under **Branch**, choose `main` and `/ (root)`, then click **Save**.
4. Wait about a minute, then reload `https://<your-username>.github.io/Spectator/`.

## Troubleshooting

| Problem | Fix |
|---|---|
| The export window looks the same as before | Your browser cached the old page. Hard-reload with `Cmd + Shift + R`. |
| "Very large image" warning | Lower **Tile width**, or add more columns or rows. Safari has the lowest size limit; Chrome and Firefox handle bigger images. |
| The export button is greyed out with "Too large…" | The image is bigger than any browser can draw. Make the same change as above. |
| No eyedropper button in the colour picker | Only Chrome, Edge and Arc support it. In other browsers, type the hex code instead. |
| "None" is greyed out under Background | JPEG and PDF can't be transparent. Choose PNG, WEBP or TIFF instead. |
| Nothing happens when you drop files | Drop them onto the dark **Brushes** box, not the page edge. |
| You can't find a downloaded file | Look in your **Downloads** folder. To see hidden files in Finder, press `Cmd + Shift + .` |
