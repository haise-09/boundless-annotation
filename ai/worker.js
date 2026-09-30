import {createDetector,createSegmenter} from './adapters.js';
let adapter=null,kind=null,busy=false,currentId=null;
const report=text=>self.postMessage({type:'progress',id:currentId,text});
self.onmessage=async({data})=>{
  if(busy)return;busy=true;currentId=data.id;
  try{
    if(kind!==data.kind){if(adapter)await adapter.dispose();adapter=null;kind=data.kind;}
    if(!adapter)adapter=await(kind==='detect'?createDetector(report):createSegmenter(report));
    const result=await adapter.run(data);
    self.postMessage({type:'result',id:data.id,imageId:data.imageId,...result});
  }catch(error){self.postMessage({type:'error',id:data.id,imageId:data.imageId,message:error.message||String(error)});}
  finally{busy=false;}
};
