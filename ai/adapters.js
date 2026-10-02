import {MODELS,RUNTIME_URL} from './registry.js';
import {detectionBox} from './geometry.js';

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
    return {suggestions:results.map(result=>detectionBox(result,raw,{width,height})).filter(Boolean),backend:'CPU / WASM',labels:Object.values(detector.model.config.id2label||{})};
  },dispose:()=>detector.dispose()};
}
