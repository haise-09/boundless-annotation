// Explicitly pin runtime/model revisions. New model families get their own adapter.
export const RUNTIME_URL='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.3';
export const MODELS={
  detect:{id:'onnx-community/rtdetr_r18vd',revision:'ec641af',dtype:'q8',device:'wasm',adapter:'rtdetr',title:'RT-DETR R18 · common objects',download:'about 22 MB of model weights'},
};
