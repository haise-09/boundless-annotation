import {MODELS,RUNTIME_URL} from './registry.js';
import {detectionBox,maskToPolygon} from './geometry.js';

let runtime;
async function getRuntime(){
  if(!runtime){runtime=await import(RUNTIME_URL);runtime.env.allowLocalModels=false;runtime.env.backends.onnx.wasm.numThreads=1;}
  return runtime;
}
async function readImage(file){
  const {RawImage}=await getRuntime();let image=await RawImage.fromBlob(file);
  const scale=Math.min(1,1024/Math.max(image.width,image.height));
  if(scale<1)image=await image.resize(Math.round(image.width*scale),Math.round(image.height*scale));
  return image;
}
function progressHandler(report){return event=>{if(event.status==='progress')report(`Downloading ${event.file}: ${Math.round(event.progress||0)}%`);else if(event.status==='initiate')report(`Loading ${event.file}…`);};}

export async function createDetector(report){
  const {pipeline}=await getRuntime(),config=MODELS.detect;
  const detector=await pipeline('object-detection',config.id,{revision:config.revision,dtype:config.dtype,device:config.device,progress_callback:progressHandler(report)});
  return {async run({file,width,height}){
    const raw=await readImage(file);report('Detecting objects locally…');
    const results=await detector(raw,{threshold:0.1,percentage:false});
    return {suggestions:results.map(result=>detectionBox(result,raw,{width,height})).filter(Boolean),backend:'CPU / WASM'};
  },dispose:()=>detector.dispose()};
}

export async function createSegmenter(report){
  const {SamModel,AutoProcessor,Tensor}=await getRuntime(),config=MODELS.segment;
  const processor=await AutoProcessor.from_pretrained(config.id,{revision:config.revision});
  let backend='wasm',model;
  const load=device=>SamModel.from_pretrained(config.id,{revision:config.revision,dtype:config.dtype,device,progress_callback:progressHandler(report)});
  if(navigator.gpu){try{model=await load('webgpu');backend='webgpu';}catch{report('GPU unavailable; loading CPU fallback…');}}
  if(!model)model=await load('wasm');
  let cache=null;
  async function run(request){
    const {file,imageId,width,height,points}=request;
    if(cache?.imageId!==imageId){
      if(cache)for(const tensor of Object.values(cache.embeddings))tensor.dispose?.();
      const raw=await readImage(file),inputs=await processor(raw);
      report('Preparing this image locally…');
      const embeddings=await model.get_image_embeddings(inputs);
      cache={imageId,embeddings,original_sizes:inputs.original_sizes,reshaped_input_sizes:inputs.reshaped_input_sizes};
      inputs.pixel_values.dispose?.();
    }
    const {embeddings,original_sizes,reshaped_input_sizes}=cache;
    const [reshapedHeight,reshapedWidth]=reshaped_input_sizes[0];
    const input_points=new Tensor('float32',Float32Array.from(points.flatMap(p=>[p.x*reshapedWidth/width,p.y*reshapedHeight/height])),[1,1,points.length,2]);
    const input_labels=new Tensor('int64',BigInt64Array.from(points.map(p=>BigInt(p.label))),[1,1,points.length]);
    report('Finding the outline locally…');
    const output=await model({...embeddings,input_points,input_labels});
    const masks=await processor.post_process_masks(output.pred_masks,original_sizes,reshaped_input_sizes);
    const scores=Array.from(output.iou_scores.data),best=scores.indexOf(Math.max(...scores)),mask=masks[0];
    const h=mask.dims.at(-2),w=mask.dims.at(-1),pixels=mask.data.subarray(best*w*h,(best+1)*w*h);
    return {suggestions:[{...maskToPolygon(pixels,w,h,{width,height}),label:'',score:scores[best]}],backend:backend==='webgpu'?'GPU / WebGPU':'CPU / WASM'};
  }
  return {async run(request){try{return await run(request);}catch(error){if(backend!=='webgpu')throw error;await model.dispose();cache=null;backend='wasm';report('Retrying with CPU fallback…');model=await load('wasm');return run(request);}},dispose:()=>model.dispose()};
}
