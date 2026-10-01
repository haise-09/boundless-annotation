# Local AI prototype

This feature branch adds optional, human-reviewed suggestions to the existing static editor. It is a preview, not part of the stable v1.4.0 release.

## Try it

Open the Netlify deploy preview, or serve the repository with `python3 -m http.server 8000` and open `http://localhost:8000`. No build step or application server is required. Opening `index.html` directly still supports manual annotation; AI modules require HTTP/HTTPS.

1. Add images as usual.
2. **Auto Annotate (Boxes)** loads RT-DETR and detects common objects in the active image. Confirm the initial model download. Adjust Detection Confidence and check/uncheck individual suggestions. Click **Accept Selected** to add checked, shown boxes. Hidden suggestions are never accepted. These generic labels may need renaming for your dataset.
3. Dashed purple boxes with labels and confidence scores are previews, excluded from exports. Accepted shapes use the existing selection, edit, delete, and export tools. An accepted batch is one Undo step.
4. **Cancel AI** terminates the worker and discards the unfinished preview. Switching/removing the active image also discards its unaccepted preview and cancels in-flight work. Accepted shapes remain attached to their image. Pan/zoom can be used while inspecting a preview.

AI polygon selection was removed after user testing. The manual Polygon tool and already accepted polygon annotations remain supported. The experiment is preserved in Git history. No segmentation model is registered or downloaded by this version.

## Review and repeated runs

- Re-running detection replaces pending suggestions for the active image; it never deletes or modifies accepted annotations.
- A suggestion is marked **Likely Duplicate** when an accepted box has the same label (case-insensitive) and intersection-over-union of at least 0.8. Such suggestions start unchecked. This is a heuristic, not a guarantee that objects match. Different labels are not suppressed.
- **Accept Selected** adds only checked suggestions above the confidence threshold. Check a likely duplicate explicitly if you want to keep it.
- Confidence filtering only hides pending suggestions; it never alters accepted annotations. Checkbox choices persist while filtering. Duplicate status is recomputed against current annotations after edits/undo.
- The panel keeps only Auto Annotate, confidence, individual suggestion checkboxes, Accept Selected, and Cancel/Clear Preview. A short summary reports shown suggestions and selections. Model-label lists, class filters, bulk buttons, and the long explanation paragraph are omitted to keep the workflow compact.
- Loading is indeterminate overall, with per-file download percentages and a local detection message. Cancel stops computation by terminating the worker (the next run recreates it). Model errors allow retry and never disable manual annotation.

## Models and privacy

- Runtime: pinned Transformers.js 3.3.3 browser distribution, loaded from jsDelivr on the first AI action.
- Detection: `onnx-community/rtdetr_r18vd`, revision `ec641af`, q8 weights (~22 MB), CPU/WASM execution for operator compatibility.
- Weights/configuration download from Hugging Face and may use its asset CDN. These are downloads, not remote inference calls. Uploaded images and annotations are never sent to either provider. The providers still receive ordinary download request metadata such as an IP address.
- The model/runtime download requires a connection initially. Browser caching may avoid repeat downloads, but offline availability is not guaranteed and caches may be evicted.
- Worker memory holds the detector adapter. Cancel terminates the worker. WASM uses one thread to avoid requiring cross-origin isolation headers.

## Modular design

- `registry.js`: runtime URL, model identifiers/revisions, descriptions and adapter metadata.
- `adapters.js`: model-specific loading, preprocessing and inference. Detector output becomes ordinary boxes.
- `geometry.js`: pure box coordinate conversion functions.
- `review.js`: adapter-independent prediction validation and duplicate-review rules.
- `worker.js`: asynchronous inference, progress and errors. Messages carry both a job ID and an image ID.
- `controller.js`: consent, previews, confidence filtering, acceptance and cancellation. Results from stale jobs never enter another image.
- `app.js`: a small bridge to the current image, tool choice and the existing undo transaction. Manual tools do not depend on the external runtime loading successfully.

Replacing a checkpoint within an architecture may only require registry changes. A different architecture needs an adapter with the same result contract. New capabilities can use separate adapters without changing the editor's annotation schema. Accepted annotations include optional `source` metadata (`kind`, `model`, `confidence`, `reviewed`) in Boundless JSON; standard exports omit that source metadata and retain their existing shape restrictions.

## Limits to review

- Current image only. Re-running detection can suggest an already annotated object; likely duplicates are flagged and unchecked by default, without automatic deletion or replacement of manual work.
- The detector recognizes its trained common-object categories, not arbitrary brands, names, or text prompts.
- The AI working image has a maximum dimension of 1024 pixels; original uploads remain unchanged. Results are mapped back to original dimensions. Tiny objects and fine edges may be missed.
- CPU inference can take considerable time on phones or weak devices. Download size is not peak RAM usage. Browser/device compatibility requires real-device testing.
- The confidence slider filters detection scores; it does not represent a calibrated probability.

## Validation

`node tests/geometry.test.mjs` checks original-resolution box conversion and invalid boxes. `node tests/review.test.mjs` checks duplicate matching and prediction validation.

With Playwright installed for development and a static server running, `TEST_URL=http://localhost:8000 node tests/browser.cjs` checks manual box creation, preview acceptance, threshold filtering, batch undo, manual polygon creation and absence of AI polygon controls, image isolation, cancellation and stale-result handling using a controlled test worker. `CHROME_PATH` optionally selects an installed Chromium binary. This test is intentionally separate from real model quality/performance testing. No test dependency is shipped to browser users.

`TEST_URL=http://localhost:8765 node tests/review-browser.cjs` adds progress, compact controls, individual selection/acceptance, repeated-run duplicate protection and explicit overrides, error recovery, confidence metadata/export isolation, and responsive layout checks with a controlled worker. `tests/polyline.cjs` retains the v1.4.0 desktop/touch, polyline, CVAT, and export compatibility regressions. `CHROME_PATH` also applies to these tests.

For the real-model integration check, run `TEST_URL=http://localhost:8765 TEST_IMAGE=/absolute/path/to/corgi.jpg node tests/real-model.cjs` with a static server, Playwright, Chromium, and the upstream Transformers.js documentation corgi sample. This downloads the actual detector model and checks detection, acceptance, and absence of upload requests. `CHROME_PATH` can select Chromium. The CPU/WASM run passed; physical mobile devices still need testing. Timings vary with downloads and hardware.

Upstream references:
- https://huggingface.co/docs/transformers.js/v3.3.3/en/index
- https://huggingface.co/onnx-community/rtdetr_r18vd
