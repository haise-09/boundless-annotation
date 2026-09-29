# Boundless

**Version 1.3.2** · A quick, browser-only image annotation tool.

## Version 1.3.2 additions

- Every export downloads one ZIP containing the original images and the chosen annotation format. Name the outer ZIP in the export dialog; internal filenames remain paired.
- Number each packaged image (`001-name.png`) so duplicate source names stay distinct. `image-map.json` records original names and the packaged names.
- Align the format notes in the Export menu and use title case for action buttons.

## Version 1.3.1 fix

- Undo now reverses completed annotation edits: adding, deleting, moving, resizing, changing labels or descriptions, and clearing the active image’s annotations. A whole drag is one undo step. Each image has its own history of up to 50 changes, held only in page memory.

## Version 1.3.0 additions

- One Export menu groups YOLO, Pascal VOC, COCO, VGG, CSV, and Boundless JSON. Open the YOLO, VOC, or Boundless JSON submenu for current-image and full-dataset choices.
- Each format shows which shapes it supports; export status reports skipped shapes when a format cannot represent them.
- YOLO and VOC dataset exports package one annotation file per image in a ZIP. At the time, COCO, VGG, CSV, and Boundless dataset exports downloaded one data file each; version 1.3.2 packages images with them.

## Version 1.2.1 additions

- Add the Boundless coffee and bounding-box icon beside the name with a transparent header background; use the same artwork with its dark background for browser tab and home screen icons.
- Hide the system pointer over the image while using Select, Box, Line, Point, or Polygon so the visual crosshair has a single center point. Pan keeps its grab/grabbing hand cursor.

## Version 1.2.0 addition

- A full-image crosshair and floating x/y readout follow the pointer over an image. The readout uses original-image pixels at any zoom. The guide hides while panning, when the pointer leaves the image, and while entering a label; it is visual only and is absent from exports.

## Version 1.1.0 additions

- Keyboard shortcuts for tools, zoom, fit, and undo. Hover or focus a tool button to see its shortcut.
- Hold Space to pan temporarily, then release it to return to the selected tool. Polygon vertices stay in place when panning; an unfinished box or line drag is canceled.
- A divider groups the Pan button separately from the drawing tools.

## Version 1.0 features

- Annotate multiple images with boxes, lines, points, and polygons; edit shapes using zoom, pan, and selection handles.
- Reuse the last label and add descriptions to annotations.
- Export annotations with the Export menu in a format appropriate for your dataset.
- Keep images and annotations local to this open browser page; export before closing or refreshing.

Project save and reopen is planned for a later version.

A small, static browser app for manually drawing labeled bounding boxes on multiple images. Images stay in your browser. No account, backend, database, AI, or build process is used.

## Use

Open `index.html` locally or deploy this folder to Netlify with publish directory `.` and no build command. Choose or drop one or several JPG, PNG, WebP, AVIF, or BMP images. AVIF and BMP still require support from your browser's image decoder; unsupported files are rejected locally. Use **Add Images** to add more at any time. Click a thumbnail or use Previous / Next to switch images. Each image owns its annotations, selection, and label IDs, even when filenames match. The × beside a thumbnail removes just that image, asking for confirmation if it contains annotations. **Clear annotations** clears only the active image; **Clear dataset** removes all images (with confirmation if there are annotations).

Choose **Select**, **Box**, **Line**, **Point**, **Polygon**, or **Pan** in the workspace. Box and Line use click and drag, including from inside an existing annotation; Point uses a single click. With Polygon, click at least three vertices, then click its first vertex, **Finish polygon**, or press Enter; Escape discards an unfinished polygon. Type a label after completing a shape, then press Enter/Done or click **Add annotation**. The chosen tool stays active until you change it. Use Select or click an item in the list to select a shape. Drag selected shapes to move them, box corners to resize, line endpoints or polygon vertices to reposition. Zoom with +, −, and Fit, then drag with Pan to explore the image. The original coordinates stay accurate at any zoom. Move the pointer over the image to see a crosshair and its original-image x/y position; Pan hides the guide and shows the grab cursor. The last class label is offered for the next annotation; optionally add a description in the label dialog or selected annotation controls. Save changes to update both label and description. Undo reverses the last completed annotation change on the active image, including Clear Annotations; it does not undo zoom, pan, image removal, or clearing the entire dataset. A drag counts as one change when released; canceled or unchanged drags do not add an undo step. The last 50 changes for each image remain available until that image is removed or the page closes. Escape cancels a drawing; Delete or Backspace deletes the selected annotation when focus is outside a text field.


### Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Select, Box, Line, Point, Polygon | `1`, `2`, `3`, `4`, `5` |
| Select Pan | `H` |
| Temporarily pan | Hold `Space`; release to return to the previous tool |
| Zoom in, zoom out, fit image | `Q`, `E`, `F` |
| Undo the last annotation change on the active image | `Ctrl+Z` (`⌘Z` on Mac) |
| Finish a polygon | `Enter` or click its first vertex (at least three vertices) |
| Cancel an unfinished drawing | `Escape` |

Shortcuts are ignored while typing in an input, description, or dialog. Switching between Polygon and Pan preserves unfinished polygon vertices, including during temporary Space panning. Switching to other tools cancels an unfinished polygon. Starting Pan during an unfinished Box or Line drag cancels that drag.

Images and annotations live only in the current page's memory and disappear on refresh. Export before leaving. Uploaded image bytes are never sent to a server; ZIP exports include the original images locally.

## Export formats

Choose a format in **Export**. YOLO, Pascal VOC, and Boundless JSON offer **Current Image** or **Full Dataset**; COCO, VGG, and CSV export the full dataset. Enter a name in the dialog to download one `.zip` file. Only the outer ZIP name is customized. Its original uploaded images are included byte for byte with no re-encoding, and no data leaves your browser. The dialog shows the approximate size of the images; large datasets need browser memory and the built-in ZIP writer has a 4 GB archive limit. ZIP entries are stored without compression.

Every ZIP contains `image-map.json` with each original filename, packaged filename, and resolution. Packaged images use ordered names such as `001-coco.jpg`, `002-coco.jpg`, even when the uploads share a filename. The chosen format's annotation files refer to the packaged image names. Coordinates remain based on the original image dimensions. The status line reports how many annotations a format skipped.

| Format | Supported shapes | ZIP contents |
| --- | --- | --- |
| YOLO | Boxes | `images/`, matching `labels/*.txt`, root `classes.txt`, root `image-map.json` |
| Pascal VOC | Boxes | `JPEGImages/`, matching `Annotations/*.xml`, root `image-map.json` |
| COCO | Boxes and polygons | `images/`, `annotations/instances.json`, root `image-map.json` |
| VGG | Boxes, lines, points, polygons | Root-level images and `via_region_data.json`, root `image-map.json` |
| CSV | Boxes, lines, points, polygons | `images/`, `labels.csv`, root `image-map.json` |
| Boundless JSON | Boxes, lines, points, polygons | `images/`, `boundless.json`, root `image-map.json` |

**YOLO** lines are `class_id x_center y_center width height`, normalized to `[0, 1]` with six decimal places. IDs start at zero and correspond to the root `classes.txt`, following the first appearance of box labels. Images without boxes get an empty TXT. Lines, points, and polygons are never converted to boxes. A training tool may also need its own dataset configuration, such as `data.yaml`.

**Pascal VOC** XML includes one `<object>` per box, with one-based inclusive `xmin`, `ymin`, `xmax`, `ymax`. Its `<filename>` matches the corresponding packaged image, including the numbered prefix. The `<depth>` value is fixed at 3; it does not inspect source channels. PNG, AVIF, and other supported originals remain in their original formats inside the historically named `JPEGImages/` directory.

**COCO** has dataset `images`, `categories`, and `annotations` in one JSON; categories start at ID 1, and polygons include segmentation and area. Image `file_name` values point into `images/`. Lines and points are omitted.

**VGG** uses VIA 2 style regions for rectangles, polylines, points, and polygons. Images and JSON share the ZIP root; `filename` references the packaged name. The original name remains in `file_attributes.original_filename`.

**CSV** has one row per annotation, including packaged and original image names, dimensions, type, label, description, and geometry columns. Empty images get a row without annotation fields. Polygon vertices are serialized in `points_json`. The CSV is UTF-8 with a BOM; text resembling spreadsheet formulas is escaped.

**Boundless JSON** retains each annotation's `id`, `type`, `label`, optional `description`, and original-resolution geometry. Box geometry is `x`, `y`, `width`, `height`; line is `x1`, `y1`, `x2`, `y2`; point is `x`, `y`; polygon is `points: [{x, y}, ...]`. Full Dataset contains an `images` array. Current Image keeps the earlier `{image, annotations}` structure. `filename` refers to the packaged image; `original_filename` preserves the upload name.

Descriptions are retained in VGG, CSV, and Boundless JSON; YOLO, VOC, and COCO do not represent them in these exports. The ZIP is an annotation handoff, not a reopenable Boundless project: images and edits remain in the current browser page until it closes or refreshes.
