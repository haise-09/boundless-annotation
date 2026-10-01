import {createDetector} from './adapters.js';
let adapter=null,busy=false,currentId=null;
const report=text=>self.postMessage({type:'progress',id:currentId,text});
self.onmessage=async({data})=>{
  if(busy)return;busy=true;currentId=data.id;
  try{
    if(data.kind!=='detect')throw new Error('Unsupported AI action. Only box detection is available.');
    if(!adapter)adapter=await createDetector(report);
    const result=await adapter.run(data);
    self.postMessage({type:'result',id:data.id,imageId:data.imageId,...result});
  }catch(error){self.postMessage({type:'error',id:data.id,imageId:data.imageId,message:error.message||String(error)});}
  finally{busy=false;}
};
