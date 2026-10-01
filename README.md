# Boundless

**AI feature preview, based on version 1.3.2** · A quick, browser-only image annotation tool.

## AI assistance preview

This branch adds **Auto Annotate (Boxes)** with local browser inference and human review. Accept suggestions to use the existing edit, undo and export controls. Models download only after opting in; images and annotations remain on your device. Manual annotation remains available if AI cannot load. Read [the AI preview guide](ai/README.md) for usage, model downloads, modular architecture, testing and limitations. AI polygon selection has been removed from this preview; the manual Polygon tool and existing polygon annotations are unchanged. This prototype is intended for a Netlify deploy preview before merging into production.

## Version 1.3.2 additions

- Every export downloads one ZIP containing the chosen annotation format and, by default, the original images. Name the outer ZIP in the export dialog; internal filenames remain paired.
- Number each packaged image (`001-name.png`) so duplicate source names stay distinct. Optionally include `image-map.json` to record original names and packaged names (off by default).
- The export dialog estimates the stored ZIP size and offers an image inclusion checkbox (on by default). Full-dataset exports can optionally assign images to train, val, and test splits; YOLO exports include `data.yaml`.
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

A small, static browser app for manually drawing labeled bounding boxes on multiple images. Images stay in your browser. No account, backend, database, or build process is used. AI assistance is optional in this feature preview and runs on the device.

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

Images and annotations live only in the current page's memory and disappear on refresh. Export before leaving. Uploaded image bytes are never sent to a server; ZIP exports include the original images locally by default.

## Export formats

Choose a format in **Export**. YOLO, Pascal VOC, and Boundless JSON offer **Current Image** or **Full Dataset**; COCO, VGG, and CSV export the full dataset. Enter a name in the dialog to download one `.zip` file. Only the outer ZIP name is customized. **Include Original Images** is checked by default and adds the original uploaded files byte for byte, without re-encoding. Uncheck it for annotation-only handoff; an empty image directory remains in formats with an image directory, while names in the data still refer to their expected image paths. **Include image-map.json** is unchecked by default. The map is optional metadata listing original and packaged filenames and resolution; none of the annotation formats depend on it. The dialog estimates the ZIP size as you change options. Entries are stored without compression, so the estimate accounts for file bytes and ZIP headers, though browsers may present the downloaded size differently. Large datasets need browser memory; the ZIP writer has a 4 GB archive limit. Nothing is uploaded.

**Split Dataset** is optional for full-dataset exports and off by default. The split is stable during an open browser session, and each image is assigned to exactly one group. For 1–4 images, all go to train; for 5–9, one goes to val and the rest to train; for 10, the split is 8/1/1; above 10, it rounds to approximately 80/10/10. The dialog previews counts. Tiny validation or test sets are poor performance measures; a YOLO export with no validation images is not ready to train. Reopening the same source images starts a new session with new internal IDs, so its split may differ. A `splits.json` manifest lists the packaged names for every group. For YOLO and COCO, image and annotation paths are also organized by split. VOC keeps matching XML files in `Annotations/` and adds `ImageSets/Main/train.txt`, `val.txt`, and `test.txt`. VGG, CSV, and Boundless retain their usual native data files alongside `splits.json`.

Packaged images use ordered names such as `001-coco.jpg`, `002-coco.jpg`, even when uploads share a filename. Annotation files reference those packaged names. Coordinates remain based on the original image dimensions. The status line reports how many annotations a format skipped.

| Format | Supported shapes | ZIP contents (without optional split) |
| --- | --- | --- |
| YOLO | Boxes | `images/`, matching `labels/*.txt`, root `classes.txt` and `data.yaml` |
| Pascal VOC | Boxes | `JPEGImages/`, matching `Annotations/*.xml` |
| COCO | Boxes and polygons | `images/`, `annotations/instances.json` |
| VGG | Boxes, lines, points, polygons | Root-level images and `via_region_data.json` |
| CSV | Boxes, lines, points, polygons | `images/`, `labels.csv` |
| Boundless JSON | Boxes, lines, points, polygons | `images/`, `boundless.json` |

With a split, YOLO uses `images/train/`, `images/val/`, `images/test/` and matching `labels/` subfolders; `data.yaml` points to the image folders and omits `test` when empty. With no split, its `data.yaml` is a starter configuration: assign distinct validation images before training, since `images/val/` starts empty. COCO uses `annotations/instances_train.json`, `instances_val.json`, and `instances_test.json` for nonempty groups, each referencing images in its matching folder. Category IDs remain consistent across splits. Add `image-map.json` with the dialog checkbox if needed.

**YOLO** lines are `class_id x_center y_center width height`, normalized to `[0, 1]` with six decimal places. IDs start at zero and correspond to the root `classes.txt`, following the first appearance of box labels. Images without boxes get an empty TXT. Lines, points, and polygons are never converted to boxes. The included `data.yaml` lists the exported classes and the selected image paths.

**Pascal VOC** XML includes one `<object>` per box, with one-based inclusive `xmin`, `ymin`, `xmax`, `ymax`. Its `<filename>` matches the corresponding packaged image, including the numbered prefix. The `<depth>` value is fixed at 3; it does not inspect source channels. PNG, AVIF, and other supported originals remain in their original formats inside the historically named `JPEGImages/` directory.

**COCO** has dataset `images`, `categories`, and `annotations` in one JSON; categories start at ID 1, and polygons include segmentation and area. Image `file_name` values point into `images/` (and the matching split folder when enabled). Lines and points are omitted.

**VGG** uses VIA 2 style regions for rectangles, polylines, points, and polygons. Images and JSON share the ZIP root; `filename` references the packaged name. The original name remains in `file_attributes.original_filename`.

**CSV** has one row per annotation, including packaged and original image names, dimensions, type, label, description, and geometry columns. Empty images get a row without annotation fields. Polygon vertices are serialized in `points_json`. The CSV is UTF-8 with a BOM; text resembling spreadsheet formulas is escaped.

**Boundless JSON** retains each annotation's `id`, `type`, `label`, optional `description`, and original-resolution geometry. Box geometry is `x`, `y`, `width`, `height`; line is `x1`, `y1`, `x2`, `y2`; point is `x`, `y`; polygon is `points: [{x, y}, ...]`. Full Dataset contains an `images` array. Current Image keeps the earlier `{image, annotations}` structure. `filename` refers to the packaged image; `original_filename` preserves the upload name.

Descriptions are retained in VGG, CSV, and Boundless JSON; YOLO, VOC, and COCO do not represent them in these exports. The ZIP is an annotation handoff, not a reopenable Boundless project: images and edits remain in the current browser page until it closes or refreshes.
