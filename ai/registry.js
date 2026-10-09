// Explicitly pin runtime/model revisions. New model families get their own adapter.
export const RUNTIME_URL='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.3';
export const MODELS={
  detect:{id:'onnx-community/rtdetr_r18vd',revision:'ec641af',dtype:'q8',device:'wasm',adapter:'rtdetr',title:'RT-DETR R18 · common objects',download:'about 22 MB of model weights'},
  dino:{id:'onnx-community/grounding-dino-tiny-ONNX',revision:'ff690b0a8050566c290287545bd059350f3e9096',dtype:'q8',device:'wasm',adapter:'grounding-dino',title:'Grounding DINO Tiny · custom labels',download:'about 204 MB of model weights'},
};

export function parseLabels(value){return [...new Set(String(value).split(/[,\n.]+/).map(s=>s.trim().toLowerCase()).filter(Boolean))];}

