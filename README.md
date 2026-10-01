# Boundless

**Polyline feature preview (based on v1.3.2)** · A quick, browser-only image annotation tool.

## Polyline feature preview

Branch: `feature/polyline-tool`, based on `main` independently of the AI experiment. This is not a tagged release.

- Polyline replaces the Line tool on shortcut **3**. Click two or more vertices and finish with Enter or **Finish Polyline**. It stays open; a two-vertex polyline is a straight line. Clicking the first vertex does not auto-finish a polyline.
- See a live preview, use Select to move the whole path or drag its vertex handles, rename/delete it, and undo completed changes.
- Pan and temporary Space panning preserve unfinished vertices. Escape, switching to another drawing tool, or switching images cancels an unfinished path. Nearby duplicate clicks are ignored.
- Coordinates use original image pixels and stay aligned through zoom/resizing. Every image retains its own shapes and undo history.
- Existing `type: "line"` annotations retain their endpoint geometry, renderer, editing, and exports; no destructive conversion is performed. New paths use `type: "polyline"` and `points`.
- CVAT XML, VGG, CSV, and Boundless JSON include polylines. YOLO/VOC remain boxes only; COCO remains boxes plus closed polygons and skips open paths, reporting unsupported shapes.

## CVAT XML and export compatibility

- **CVAT (XML)** offers Current Image and Full Dataset exports using CVAT for images XML **1.1**. Both produce one named ZIP with `annotations.xml` at the root and original files under `images/`. Numbered image names match XML image references and avoid duplicate filename collisions. XML image names are relative to `images/`.
- Boxes use `<box>`, polygons `<polygon>`, open paths `<polyline>`, and individual points `<points>`. Legacy straight lines become two-point polylines in this export only. Coordinates stay in original-image pixels. Descriptions are declared label attributes and exported as `<attribute name="description">`; they do not change geometry.
- Include Original Images remains on by default. Turning it off keeps an empty `images/` folder and the XML references so you can supply the matching files separately. `image-map.json` is optional and off by default. Optional dataset splits add `splits.json`; CVAT uses its normal flat image folder and one XML document, not YOLO/COCO training subfolders.
- **Name Your Export** reports included/total annotations and counts skipped shapes for the selected scope. If any shapes are unsupported, Download ZIP requires the initially unchecked **Export Supported Annotations Only** confirmation. It resets each time the dialog opens. This also applies when zero annotations are supported; you can deliberately export an empty annotation set. Empty unannotated datasets do not require confirmation.
- Format choices remain available for mixed datasets. YOLO and Pascal VOC support boxes; this app's COCO export supports boxes and polygons. CVAT, VGG, CSV, and Boundless JSON preserve all current Boundless shape types. There is no automatic conversion of open paths into boxes or polygons.
- CVAT export is an interchange dataset, not a CVAT project backup. When importing annotations into an existing CVAT task, use matching packaged filenames, labels, and the `description` text attribute. Format structure is checked against the [official CVAT XML specification](https://docs.cvat.ai/docs/dataset_management/formats/format-cvat/); import into a live CVAT server has not been tested here.

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

A small, static browser app for manually drawing labeled bounding boxes on multiple images. Images stay in your browser. No account, backend, database, AI, or build process is used.

## Use

Open `index.html` locally or deploy this folder to Netlify with publish directory `.` and no build command. Choose or drop one or several JPG, PNG, WebP, AVIF, or BMP images. AVIF and BMP still require support from your browser's image decoder; unsupported files are rejected locally. Use **Add Images** to add more at any time. Click a thumbnail or use Previous / Next to switch images. Each image owns its annotations, selection, and label IDs, even when filenames match. The × beside a thumbnail removes just that image, asking for confirmation if it contains annotations. **Clear Annotations** clears only the active image; **Clear Dataset** removes all images (with confirmation if there are annotations).

Choose **Select**, **Box**, **Polyline**, **Point**, **Polygon**, or **Pan** in the workspace. Box uses click and drag, including from inside an existing annotation; Point uses a single click. With Polyline, click at least two vertices, then **Finish Polyline** or Enter. The path remains open. With Polygon, click at least three vertices, then click its first vertex, **Finish Polygon**, or press Enter; Escape discards an unfinished polygon. Type a label after completing a shape, then press Enter/Done or click **Add Annotation**. The chosen tool stays active until you change it. Use Select or click an item in the list to select a shape. Drag selected shapes to move them, box corners to resize, legacy line endpoints or polyline/polygon vertices to reposition. Zoom with +, −, and Fit, then drag with Pan to explore the image. The original coordinates stay accurate at any zoom. Move the pointer over the image to see a crosshair and its original-image x/y position; Pan hides the guide and shows the grab cursor. The last class label is offered for the next annotation; optionally add a description in the label dialog or selected annotation controls. Save changes to update both label and description. Undo reverses the last completed annotation change on the active image, including Clear Annotations; it does not undo zoom, pan, image removal, or clearing the entire dataset. A drag counts as one change when released; canceled or unchanged drags do not add an undo step. The last 50 changes for each image remain available until that image is removed or the page closes. Escape cancels a drawing; Delete or Backspace deletes the selected annotation when focus is outside a text field.


### Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Select, Box, Polyline, Point, Polygon | `1`, `2`, `3`, `4`, `5` |
| Select Pan | `H` |
| Temporarily pan | Hold `Space`; release to return to the previous tool |
| Zoom in, zoom out, fit image | `Q`, `E`, `F` |
| Undo the last annotation change on the active image | `Ctrl+Z` (`⌘Z` on Mac) |
| Finish a polyline | `Enter` or Finish Polyline (at least two vertices) |
| Finish a polygon | `Enter` or click its first vertex (at least three vertices) |
| Cancel an unfinished drawing | `Escape` |

Shortcuts are ignored while typing in an input, description, or dialog. Switching between Polyline/Polygon and Pan preserves unfinished vertices, including temporary Space panning. Return to the same drawing tool to continue. Switching to another drawing tool cancels the unfinished path. Starting Pan during an unfinished Box drag cancels that drag.

Images and annotations live only in the current page's memory and disappear on refresh. Export before leaving. Uploaded image bytes are never sent to a server; ZIP exports include the original images locally by default.

## Export formats

Choose a format in **Export**. YOLO, Pascal VOC, and Boundless JSON offer **Current Image** or **Full Dataset**; COCO, VGG, and CSV export the full dataset. Enter a name in the dialog to download one `.zip` file. Only the outer ZIP name is customized. **Include Original Images** is checked by default and adds the original uploaded files byte for byte, without re-encoding. Uncheck it for annotation-only handoff; an empty image directory remains in formats with an image directory, while names in the data still refer to their expected image paths. **Include image-map.json** is unchecked by default. The map is optional metadata listing original and packaged filenames and resolution; none of the annotation formats depend on it. The dialog estimates the ZIP size as you change options. Entries are stored without compression, so the estimate accounts for file bytes and ZIP headers, though browsers may present the downloaded size differently. Large datasets need browser memory; the ZIP writer has a 4 GB archive limit. Nothing is uploaded.

**Split Dataset** is optional for full-dataset exports and off by default. The split is stable during an open browser session, and each image is assigned to exactly one group. For 1–4 images, all go to train; for 5–9, one goes to val and the rest to train; for 10, the split is 8/1/1; above 10, it rounds to approximately 80/10/10. The dialog previews counts. Tiny validation or test sets are poor performance measures; a YOLO export with no validation images is not ready to train. Reopening the same source images starts a new session with new internal IDs, so its split may differ. A `splits.json` manifest lists the packaged names for every group. For YOLO and COCO, image and annotation paths are also organized by split. VOC keeps matching XML files in `Annotations/` and adds `ImageSets/Main/train.txt`, `val.txt`, and `test.txt`. VGG, CSV, and Boundless retain their usual native data files alongside `splits.json`.

Packaged images use ordered names such as `001-coco.jpg`, `002-coco.jpg`, even when uploads share a filename. Annotation files reference those packaged names. Coordinates remain based on the original image dimensions. The status line reports how many annotations a format skipped.

| Format | Supported shapes | ZIP contents (without optional split) |
| --- | --- | --- |
| YOLO | Boxes | `images/`, matching `labels/*.txt`, root `classes.txt` and `data.yaml` |
| Pascal VOC | Boxes | `JPEGImages/`, matching `Annotations/*.xml` |
| CVAT XML | All shapes | `images/`, `annotations.xml` |
| COCO | Boxes and polygons | `images/`, `annotations/instances.json` |
| VGG | Boxes, legacy lines, polylines, points, polygons | Root-level images and `via_region_data.json` |
| CSV | Boxes, legacy lines, polylines, points, polygons | `images/`, `labels.csv` |
| Boundless JSON | Boxes, legacy lines, polylines, points, polygons | `images/`, `boundless.json` |

With a split, YOLO uses `images/train/`, `images/val/`, `images/test/` and matching `labels/` subfolders; `data.yaml` points to the image folders and omits `test` when empty. With no split, its `data.yaml` is a starter configuration: assign distinct validation images before training, since `images/val/` starts empty. COCO uses `annotations/instances_train.json`, `instances_val.json`, and `instances_test.json` for nonempty groups, each referencing images in its matching folder. Category IDs remain consistent across splits. Add `image-map.json` with the dialog checkbox if needed.

**YOLO** lines are `class_id x_center y_center width height`, normalized to `[0, 1]` with six decimal places. IDs start at zero and correspond to the root `classes.txt`, following the first appearance of box labels. Images without boxes get an empty TXT. Lines, polylines, points, and polygons are never converted to boxes. The included `data.yaml` lists the exported classes and the selected image paths.

**Pascal VOC** XML includes one `<object>` per box, with one-based inclusive `xmin`, `ymin`, `xmax`, `ymax`. Its `<filename>` matches the corresponding packaged image, including the numbered prefix. The `<depth>` value is fixed at 3; it does not inspect source channels. PNG, AVIF, and other supported originals remain in their original formats inside the historically named `JPEGImages/` directory.

**COCO** has dataset `images`, `categories`, and `annotations` in one JSON; categories start at ID 1, and polygons include segmentation and area. Image `file_name` values point into `images/` (and the matching split folder when enabled). Lines, polylines, and points are omitted.

**VGG** uses VIA 2 style regions for rectangles, polylines, points, and polygons. Images and JSON share the ZIP root; `filename` references the packaged name. The original name remains in `file_attributes.original_filename`.

**CSV** has one row per annotation, including packaged and original image names, dimensions, type, label, description, and geometry columns. Empty images get a row without annotation fields. Polyline and polygon vertices are serialized in `points_json`. The CSV is UTF-8 with a BOM; text resembling spreadsheet formulas is escaped.

**Boundless JSON** retains each annotation's `id`, `type`, `label`, optional `description`, and original-resolution geometry. Box geometry is `x`, `y`, `width`, `height`; line is `x1`, `y1`, `x2`, `y2`; point is `x`, `y`; polyline and polygon use `points: [{x, y}, ...]`. A polyline is open and does not append a closing vertex automatically. Full Dataset contains an `images` array. Current Image keeps the earlier `{image, annotations}` structure. `filename` refers to the packaged image; `original_filename` preserves the upload name.

Descriptions are retained in VGG, CSV, and Boundless JSON; YOLO, VOC, and COCO do not represent them in these exports. The ZIP is an annotation handoff, not a reopenable Boundless project: images and edits remain in the current browser page until it closes or refreshes.

## Polyline validation

With Playwright installed for development, serve the repository using `python3 -m http.server 8765`, then run `node tests/polyline.cjs`. Set `CHROME_PATH` to use a specific Chromium binary, or `TEST_URL` for a different local server. No test dependencies are loaded by the website. The test covers mouse and touch creation, minimum vertices, Enter/button completion, cancel, pan continuity, move/vertex edit and undo, legacy line compatibility, image isolation, original coordinates at different sizes, format-specific exports, CVAT XML parsing and shape/filename mappings, and scope-aware partial-export confirmation. A test-only intercepted copy of the app exposes state for assertions; production code contains no test hook.
