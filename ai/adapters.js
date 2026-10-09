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

export async function createDetector(report,modelKey='detect'){
  const {pipeline}=await getRuntime(),config=MODELS[modelKey];
  if(!config)throw new Error('Unknown model.');
  if(config.adapter==='grounding-dino')return createGroundedDetector(report,config);
  const detector=await pipeline('object-detection',config.id,{revision:config.revision,dtype:config.dtype,device:config.device,progress_callback:progressHandler(report)});
  return {async run({file,width,height}){
    const raw=await readImage(file);report('Detecting objects locally…');
    const results=await detector(raw,{threshold:0.1,percentage:false});
    return {suggestions:results.map(result=>detectionBox(result,raw,{width,height})).filter(Boolean),backend:'CPU / WASM',labels:Object.values(detector.model.config.id2label||{})};
  },dispose:()=>detector.dispose()};
}

async function createGroundedDetector(report,config){
  const {AutoModelForZeroShotObjectDetection,AutoProcessor}=await getRuntime();
  const options={revision:config.revision,progress_callback:progressHandler(report)};
  const processor=await AutoProcessor.from_pretrained(config.id,options);
  const model=await AutoModelForZeroShotObjectDetection.from_pretrained(config.id,{...options,dtype:config.dtype,device:config.device});
  return {async run({file,width,height,labels}){
    if(!Array.isArray(labels)||!labels.length)throw new Error('Enter at least one label.');
    const raw=await readImage(file),text=labels.join('. ')+'.';
    report('Finding your labels locally… Larger models can take longer.');
    const inputs=await processor(raw,text);
    let outputs;
    try{
      outputs=await model(inputs);
      const result=processor.post_process_grounded_object_detection(outputs,inputs.input_ids,{box_threshold:0.1,text_threshold:0.25,target_sizes:[[raw.height,raw.width]]})[0];
      const suggestions=result.boxes.map((b,i)=>detectionBox({box:{xmin:b[0],ymin:b[1],xmax:b[2],ymax:b[3]},score:result.scores[i],label:result.labels[i]},raw,{width,height})).filter(s=>s&&s.label.trim());
      return {suggestions,backend:'CPU / WASM'};
    }finally{for(const value of [...Object.values(inputs),...Object.values(outputs||{})])value?.dispose?.();}
  },dispose:()=>model.dispose()};
}
