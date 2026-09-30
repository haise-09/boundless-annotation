// Explicitly pin runtime/model revisions. New model families get their own adapter.
export const RUNTIME_URL='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.3';
export const MODELS={
  detect:{id:'onnx-community/rtdetr_r18vd',revision:'ec641af',dtype:'q8',device:'wasm',adapter:'rtdetr',title:'RT-DETR R18 · common objects',download:'about 22 MB of model weights'},
  segment:{id:'Xenova/slimsam-77-uniform',revision:'d827ef090922d0c7b96fc6111908fb996ff3d1c1',dtype:'fp32',device:'auto',adapter:'sam',title:'SlimSAM · click to select',download:'about 40 MB of model weights'},
};
