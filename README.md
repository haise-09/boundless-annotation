# Boundless

**Version 1.3.1** · A quick, browser-only image annotation tool.

## Version 1.3.1 fix

- Undo now reverses completed annotation edits: adding, deleting, moving, resizing, changing labels or descriptions, and clearing the active image’s annotations. A whole drag is one undo step. Each image has its own history of up to 50 changes, held only in page memory.

## Version 1.3.0 additions

- One Export menu groups YOLO, Pascal VOC, COCO, VGG, CSV, and Boundless JSON. Open the YOLO, VOC, or Boundless JSON submenu for current-image and full-dataset choices.
- Each format shows which shapes it supports; export status reports skipped shapes when a format cannot represent them.
- YOLO and VOC dataset exports package one annotation file per image in a ZIP. COCO, VGG, CSV, and Boundless dataset exports download one file each.

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

Images and annotations live only in the current page's memory and disappear on refresh. Export before leaving. Uploaded image bytes are never sent to a server or included in exports.

## Export formats

All exports include annotation coordinates measured in pixels against the original image resolution, except YOLO, which uses normalized coordinates. Exports contain annotation data and image names, **not image bytes**. Supply the original image files separately when importing into another tool. A menu note identifies formats that omit some annotation types; after export, the workspace status reports how many shapes were skipped.

| Format | Shapes included | Download |
| --- | --- | --- |
| YOLO | Boxes | Current image: TXT plus classes TXT; full dataset: ZIP |
| Pascal VOC (XML) | Boxes | Current image: XML; full dataset: ZIP |
| COCO (JSON) | Boxes, polygons | One dataset JSON |
| VGG (JSON) | Boxes, lines, points, polygons | One dataset JSON |
| CSV | Boxes, lines, points, polygons | One dataset CSV |
| Boundless JSON | Boxes, lines, points, polygons | Current image or one dataset JSON |

Descriptions survive in Boundless JSON, VGG JSON, and CSV. Other formats omit descriptions. Duplicate original filenames remain distinct in the ZIP manifest and CSV image index; COCO, VGG, and VOC add a short internal image ID to duplicate filenames in their exported metadata so entries cannot overwrite each other. These exports do not rename your original image files on disk.

### Boundless JSON

**Full Dataset** downloads `boundless-dataset.json` with an `images` array. Each image has `filename`, original `width` and `height`, and its own `annotations` array. Every annotation has integer `id`, string `type`, and string `label`, and a string `description` (empty when omitted). A `box` has `x`, `y`, `width`, `height`; a `line` has `x1`, `y1`, `x2`, `y2`; a `point` has `x`, `y`; a `polygon` has `points: [{x, y}, ...]`. Coordinates are integer pixels relative to the **original image resolution**, with origin at top left. Entries stay distinct even if filenames repeat; their array positions correspond to the image list.

**Current Image** downloads the selected image's metadata and annotations in the earlier single-image format. Its filename gets a unique image suffix so duplicate original filenames do not overwrite the downloads.

### YOLO

**Current Image** downloads two files for the selected image: `<image-name>-<unique-id>.txt` and `<image-name>-<unique-id>-classes.txt`. **Full Dataset (.zip)** downloads `boundless-yolo.zip` with one numbered `.txt` per image, `classes.txt` with a shared dataset class map, and `image-map.json` matching each text file to its original image filename and resolution (including duplicate filenames). Images with no boxes get an empty text file. Standard YOLO bounding-box export includes **box annotations only**; lines, points, and polygons are never converted to boxes. Each box line is `class_id x_center y_center width height`, with normalized values in `[0, 1]` and six decimal places. Class IDs start at zero and follow first appearance of box labels. The current-image classes file uses IDs local to that image; all files in the ZIP use IDs from its shared `classes.txt`. Re-export both files after changing labels or boxes.

### Pascal VOC (XML)

**Current Image** downloads one XML document. **Full Dataset (.zip)** downloads one numbered XML file per image and `image-map.json` matching each XML filename to the original image name and resolution. Each `<object>` has a label and bounding box; lines, points, and polygons are omitted. VOC uses one-based inclusive `<xmin>`, `<ymin>`, `<xmax>`, `<ymax>` coordinates. The `<depth>` value is fixed at 3 for typical RGB images; it does not inspect source channels. If a filename occurs more than once, the XML filename field uses a unique suffix, recorded alongside the original name in the ZIP manifest.

### COCO (JSON)

`boundless-coco.json` contains dataset `images`, `categories`, and `annotations`. It includes boxes and polygons, with box geometry, area, and polygon segmentation. Categories start at ID 1. Lines and points are omitted. For duplicate filenames, its `file_name` receives a short unique suffix; match it to the original image manually when assembling a COCO dataset.

### VGG (JSON)

`boundless-vgg.json` uses VIA 2 style image entries and regions: rectangles, polylines, points, and polygons. Region attributes contain `label` and `description`. Image entries retain the original name as `file_attributes.original_filename`. Duplicate filenames receive a unique suffix in their exported `filename`; actual image bytes are not included.

### CSV

`boundless-annotations.csv` has one row per annotation with image index, original filename and dimensions, ID, type, label, description, and coordinate columns. Polygon vertices are JSON inside the `points_json` cell. Images without annotations get one row with empty annotation fields. Open as UTF-8 CSV; text that resembles a spreadsheet formula is escaped for safer opening in spreadsheet applications.
