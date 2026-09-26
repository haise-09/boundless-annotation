# Boundless

**Version 1.2.1** · A quick, browser-only image annotation tool.

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
- Export the complete dataset or current image as JSON, the current image as YOLO, or all images as a YOLO ZIP.
- Keep images and annotations local to this open browser page; export before closing or refreshing.

Project save and reopen is planned for a later version.

A small, static browser app for manually drawing labeled bounding boxes on multiple images. Images stay in your browser. No account, backend, database, AI, or build process is used.

## Use

Open `index.html` locally or deploy this folder to Netlify with publish directory `.` and no build command. Choose or drop one or several JPG, PNG, WebP, AVIF, or BMP images. AVIF and BMP still require support from your browser's image decoder; unsupported files are rejected locally. Use **Add Images** to add more at any time. Click a thumbnail or use Previous / Next to switch images. Each image owns its annotations, selection, and label IDs, even when filenames match. The × beside a thumbnail removes just that image, asking for confirmation if it contains annotations. **Clear annotations** clears only the active image; **Clear dataset** removes all images (with confirmation if there are annotations).

Choose **Select**, **Box**, **Line**, **Point**, **Polygon**, or **Pan** in the workspace. Box and Line use click and drag, including from inside an existing annotation; Point uses a single click. With Polygon, click at least three vertices, then click its first vertex, **Finish polygon**, or press Enter; Escape discards an unfinished polygon. Type a label after completing a shape, then press Enter/Done or click **Add annotation**. The chosen tool stays active until you change it. Use Select or click an item in the list to select a shape. Drag selected shapes to move them, box corners to resize, line endpoints or polygon vertices to reposition. Zoom with +, −, and Fit, then drag with Pan to explore the image. The original coordinates stay accurate at any zoom. Move the pointer over the image to see a crosshair and its original-image x/y position; Pan hides the guide and shows the grab cursor. The last class label is offered for the next annotation; optionally add a description in the label dialog or selected annotation controls. Save changes to update both label and description. Undo last applies only to the active image. Escape cancels a drawing; Delete or Backspace deletes the selected annotation when focus is outside a text field.


### Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Select, Box, Line, Point, Polygon | `1`, `2`, `3`, `4`, `5` |
| Select Pan | `H` |
| Temporarily pan | Hold `Space`; release to return to the previous tool |
| Zoom in, zoom out, fit image | `Q`, `E`, `F` |
| Undo last annotation on the active image | `Ctrl+Z` (`⌘Z` on Mac) |
| Finish a polygon | `Enter` or click its first vertex (at least three vertices) |
| Cancel an unfinished drawing | `Escape` |

Shortcuts are ignored while typing in an input, description, or dialog. Switching between Polygon and Pan preserves unfinished polygon vertices, including during temporary Space panning. Switching to other tools cancels an unfinished polygon. Starting Pan during an unfinished Box or Line drag cancels that drag.

Images and annotations live only in the current page's memory and disappear on refresh. Export before leaving. Uploaded image bytes are never sent to a server or included in exports.

## JSON export

**Export Dataset JSON** downloads `boundless-dataset.json` with an `images` array. Each image has `filename`, original `width` and `height`, and its own `annotations` array. Every annotation has integer `id`, string `type`, and string `label`, and a string `description` (empty when omitted). A `box` has `x`, `y`, `width`, `height`; a `line` has `x1`, `y1`, `x2`, `y2`; a `point` has `x`, `y`; a `polygon` has `points: [{x, y}, ...]`. Coordinates are integer pixels relative to the **original image resolution**, with origin at top left. Entries stay distinct even if filenames repeat; their array positions correspond to the image list.

**Export Current JSON** downloads the selected image's metadata and annotations in the earlier single-image format. Its filename gets a unique image suffix so duplicate original filenames do not overwrite the downloads.

## YOLO export

**Export Current YOLO** downloads two files for the selected image: `<image-name>-<unique-id>.txt` and `<image-name>-<unique-id>-classes.txt`. For a full dataset, **Export YOLO ZIP** downloads `boundless-yolo.zip` with one numbered `.txt` per image, `classes.txt` with a shared dataset class map, and `image-map.json` matching each text file to its original image filename and resolution (including duplicate filenames). Images with no boxes get an empty text file. Standard YOLO bounding-box export includes **box annotations only**; lines, points, and polygons remain in JSON and are never converted to boxes. Each box line is `class_id x_center y_center width height`, with normalized values in `[0, 1]` and six decimal places. Class IDs start at zero and follow first appearance of box labels. The current-image classes file uses IDs local to that image; all files in the ZIP use IDs from its shared `classes.txt`. Re-export both files after changing labels or boxes. Original images must be supplied separately to a training tool.
