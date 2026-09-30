# Local AI prototype

This feature branch adds optional, human-reviewed suggestions to the existing static editor. It is a preview, not part of the stable v1.3.2 release.

## Try it

Open the Netlify deploy preview, or serve the repository with `python3 -m http.server 8000` and open `http://localhost:8000`. No build step or application server is required. Opening `index.html` directly still supports manual annotation; AI modules require HTTP/HTTPS. WebGPU requires a secure context (HTTPS or localhost).

1. Add images as usual.
2. **Auto Annotate (Boxes)** loads RT-DETR and detects common objects in the active image. Confirm the initial model download. Adjust Detection Confidence and check/uncheck suggestions. Click **Accept Selected** to add them. These generic labels may need renaming for your dataset.
3. **Auto Select (Polygon)** activates a click tool. Start with an **Include Click** on the object. Add Include or Exclude clicks (up to 16) to refine the outline. Type a Polygon Label and accept it (Enter in the label field also works). Use Clear Preview to start another object.
4. Dashed purple shapes are previews, excluded from exports. Accepted shapes use the existing selection, edit, delete, and export tools. An accepted batch is one Undo step.
5. **Cancel AI** terminates the worker and discards the unfinished preview. Switching/removing the active image also discards its unaccepted preview and cancels in-flight work. Accepted shapes remain attached to their image. Pan/zoom can be used while inspecting a preview.

## Models and privacy

- Runtime: pinned Transformers.js 3.3.3 browser distribution, loaded from jsDelivr on the first AI action.
- Detection: `onnx-community/rtdetr_r18vd`, revision `ec641af`, q8 weights (~22 MB), CPU/WASM execution for operator compatibility.
- Segmentation: `Xenova/slimsam-77-uniform`, revision `d827ef090922d0c7b96fc6111908fb996ff3d1c1`, fp32 encoder/decoder weights (~40 MB), WebGPU when available and CPU fallback otherwise. FP32 is the initial quality baseline; smaller quantized weights can be evaluated through the adapter later.
- Weights/configuration download from Hugging Face and may use its asset CDN. These are downloads, not remote inference calls. Uploaded images and annotations are never sent to either provider. The providers still receive ordinary download request metadata such as an IP address.
- The model/runtime download requires a connection initially. Browser caching may avoid repeat downloads, but offline availability is not guaranteed and caches may be evicted.
- Worker memory holds one active model adapter and, for SAM, the current image's embeddings. Switching model families disposes the previous adapter. Cancel terminates the worker. WASM uses one thread to avoid requiring cross-origin isolation headers.

## Modular design

- `registry.js`: runtime URL, model identifiers/revisions, descriptions and adapter metadata.
- `adapters.js`: model-specific loading, preprocessing and inference. Detector output becomes ordinary boxes; segmentation output becomes a simplified polygon.
- `geometry.js`: pure coordinate conversion and mask contour/simplification functions.
- `worker.js`: asynchronous inference, progress and errors. Messages carry both a job ID and an image ID.
- `controller.js`: consent, previews, confidence filtering, refinement clicks, acceptance and cancellation. Results from stale jobs never enter another image.
- `app.js`: a small bridge to the current image, tool choice and the existing undo transaction. Manual tools do not depend on the external runtime loading successfully.

Replacing a checkpoint within an architecture may only require registry changes. A different architecture needs an adapter with the same result contract. Detection and segmentation are independent capabilities; changing one must not change the editor's annotation schema. Accepted annotations include optional `source` metadata (`kind`, `model`, `reviewed`) in Boundless JSON; geometry exports retain their existing shape restrictions.

## Limits to review

- Current image only. Re-running detection can suggest an already annotated object; no automatic deduplication or replacement of manual work.
- The detector recognizes its trained common-object categories, not arbitrary brands, names, or text prompts. Segmentation does not generate a label.
- The AI working image has a maximum dimension of 1024 pixels; original uploads remain unchanged. Results are mapped back to original dimensions. Tiny objects and fine edges may be missed.
- Masks become a simplified polygon with at most 200 vertices. The largest outer contour is kept, holes are filled, and disconnected pieces are omitted; a warning appears for these cases. Review before accepting. The application does not silently claim lossless mask export.
- CPU inference can take considerable time on phones or weak devices. Download size is not peak RAM usage. Browser/device compatibility and segmentation quality require real-device testing.
- The confidence slider filters detection scores; it does not represent a calibrated probability or segmentation quality.

## Validation

`node tests/geometry.test.mjs` checks scale conversion, invalid boxes, simple contours, holes, disconnected regions and empty masks.

With Playwright installed for development and a static server running, `TEST_URL=http://localhost:8000 node tests/browser.cjs` checks manual box creation, preview acceptance, threshold filtering, batch undo, polygon naming, image isolation, cancellation and stale-result handling using a controlled test worker. `CHROME_PATH` optionally selects an installed Chromium binary. This test is intentionally separate from real model quality/performance testing. No test dependency is shipped to browser users.

For the real-model integration check, run `TEST_URL=http://localhost:8765 TEST_IMAGE=/absolute/path/to/corgi.jpg node tests/real-model.cjs` with a static server, Playwright, Chromium, and the upstream Transformers.js documentation corgi sample. This downloads the actual models and checks detection, segmentation, an exclude-click refinement, acceptance, and absence of upload requests. `CHROME_PATH` can select Chromium. The CPU/WASM run passed; GPU hardware and physical mobile devices still need testing. Timings vary with downloads and hardware.

Upstream references:
- https://huggingface.co/docs/transformers.js/v3.3.3/en/index
- https://huggingface.co/onnx-community/rtdetr_r18vd
- https://huggingface.co/Xenova/slimsam-77-uniform
- https://huggingface.co/spaces/Xenova/segment-anything-webgpu
