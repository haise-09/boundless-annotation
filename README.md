# Annotate Lite

A small, static browser app for manually drawing labeled bounding boxes on multiple images. Images stay in your browser. No account, backend, database, AI, or build process is used.

## Use

Open `index.html` locally or deploy this folder to Netlify with publish directory `.` and no build command. Choose or drop one or several JPG, PNG, WebP, AVIF, or BMP images. AVIF and BMP still require support from your browser's image decoder; unsupported files are rejected locally. Use **Add Images** to add more at any time. Click a thumbnail or use Previous / Next to switch images. Each image owns its annotations, selection, and label IDs, even when filenames match. The × beside a thumbnail removes just that image, asking for confirmation if it contains annotations. **Clear annotations** clears only the active image; **Clear dataset** removes all images (with confirmation if there are annotations).

Choose **Select**, **Box**, **Line**, **Point**, or **Polygon** in the workspace. Box and Line use click and drag, including from inside an existing annotation; Point uses a single click. With Polygon, click at least three vertices, then click **Finish polygon** or press Enter; Escape discards an unfinished polygon. Type a label after completing a shape, then press Enter/Done or click **Add annotation**. The chosen tool stays active until you change it. Use Select or click an item in the list to select a shape for renaming or deletion. Undo last applies only to the active image. Escape cancels a drawing; Delete or Backspace deletes the selected annotation when focus is outside a text field.

Images and annotations live only in the current page's memory and disappear on refresh. Export before leaving. Uploaded image bytes are never sent to a server or included in exports.

## JSON export

**Export Dataset JSON** downloads `annotate-lite-dataset.json` with an `images` array. Each image has `filename`, original `width` and `height`, and its own `annotations` array. Every annotation has integer `id`, string `type`, and string `label`. A `box` has `x`, `y`, `width`, `height`; a `line` has `x1`, `y1`, `x2`, `y2`; a `point` has `x`, `y`; a `polygon` has `points: [{x, y}, ...]`. Coordinates are integer pixels relative to the **original image resolution**, with origin at top left. Entries stay distinct even if filenames repeat; their array positions correspond to the image list.

**Export Current JSON** downloads the selected image's metadata and annotations in the earlier single-image format. Its filename gets a unique image suffix so duplicate original filenames do not overwrite the downloads.

## YOLO export

**Export Current YOLO** downloads two files for the selected image: `<image-name>-<unique-id>.txt` and `<image-name>-<unique-id>-classes.txt`. Switch images and export each one in turn. This avoids browser restrictions on many automatic downloads. Standard YOLO bounding-box export includes **box annotations only**; lines, points, and polygons remain in JSON and are never converted to boxes. Each box line is `class_id x_center y_center width height`, with normalized values in `[0, 1]` and six decimal places. Class IDs start at zero and follow first appearance of box labels in that image's annotation list. The classes file lists one box class per line in the same ID order; class IDs are local to each image. Re-export both files after changing labels or boxes. Original images must be supplied separately to a training tool.
