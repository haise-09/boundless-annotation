import {MODELS} from './registry.js';

export function createAIController(bridge){
  const $=id=>document.getElementById(id),svg=$('ai-overlay'),message=$('ai-message');
  const controls=['ai-detect','ai-accept','ai-cancel','ai-threshold'].map($);
  let worker=null,job=null,serial=0,imageId=null,suggestions=[],consent=false,awaitingConsent=null;
  const say=text=>{message.textContent=text;};
  const visible=()=>suggestions.filter(s=>s.score>=Number($('ai-threshold').value));
  function cancel(){
    worker?.terminate();worker=null;job=null;serial++;suggestions=[];render();
    say('AI preview cleared. Accepted annotations are unchanged.');
  }
  function allowDownloads(kind){
    if(consent)return Promise.resolve(true);
    $('ai-consent-note').textContent=`${MODELS[kind].title}: ${MODELS[kind].download}, plus the AI runtime. Files download from jsDelivr and Hugging Face and may be cached by your browser. Your images and annotations are processed on this device and are not uploaded. First use can take a while.`;
    $('ai-consent').showModal();
    return new Promise(resolve=>{awaitingConsent=resolve;});
  }
  $('ai-consent').addEventListener('close',()=>{const accepted=$('ai-consent').returnValue==='allow';if(accepted)consent=true;awaitingConsent?.(accepted);awaitingConsent=null;});
  $('ai-consent-cancel').addEventListener('click',()=>$('ai-consent').close('cancel'));
  function start(request){
    if(!worker){
      worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
      worker.onmessage=({data})=>{
        if(!job||data.id!==job.id||bridge.active()?.id!==job.imageId)return;
        if(data.type==='progress'){say(data.text);return;}
        if(data.type==='result'){
          job=null;
          suggestions=data.suggestions.map(s=>({...s,checked:true}));
          render();
          const warning=suggestions.find(s=>s.warning)?.warning||'';
          say(`${data.backend}. ${visible().length} suggestion(s). ${warning||'Review before accepting; only accepted shapes are exported.'}`);
        }else if(data.type==='error')fail(data.message);
      };
      worker.onerror=()=>fail('The local AI worker could not start. Check your browser and network, then retry.');
    }
    job={...request,id:++serial};say('Loading local AI… First use downloads model files.');render();worker.postMessage(job);
  }
  function fail(error){worker?.terminate();worker=null;job=null;say(`AI unavailable: ${error} Manual annotation still works.`);render();}
  async function detect(){
    const image=bridge.active();if(!image||job)return;
    if(!await allowDownloads('detect')||bridge.active()?.id!==image.id)return;
    suggestions=[];bridge.chooseTool('select');
    start({kind:'detect',file:image.file,imageId:image.id,width:image.width,height:image.height});
  }
  function node(tag,attrs){const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attrs))n.setAttribute(key,value);return n;}
  function draw(){
    const image=bridge.active();svg.replaceChildren();if(!image)return;
    svg.setAttribute('viewBox',`0 0 ${image.width} ${image.height}`);
    for(const s of visible())if(s.checked){const shape=node('rect',{x:s.x,y:s.y,width:s.width,height:s.height});shape.classList.add('ai-shape');svg.append(shape);}
  }
  function render(){
    const image=bridge.active();
    if(imageId!==image?.id){if(job){worker?.terminate();worker=null;job=null;serial++;}imageId=image?.id;suggestions=[];say('AI is optional. Choose Auto Annotate to suggest boxes.');}
    for(const control of controls)control.disabled=!image||!!job;
    $('ai-cancel').disabled=!image||!(job||suggestions.length);
    $('ai-cancel').textContent=job?'Cancel AI':'Clear Preview';
    $('ai-accept').disabled=!!job||!visible().some(s=>s.checked);
    $('ai-threshold-value').textContent=`${Math.round(Number($('ai-threshold').value)*100)}%`;
    $('ai-review').replaceChildren();
    for(const s of visible()){
      const row=document.createElement('label');row.className='ai-review-row';
      const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=s.checked;checkbox.disabled=!!job;
      checkbox.addEventListener('change',()=>{s.checked=checkbox.checked;draw();$('ai-accept').disabled=!visible().some(item=>item.checked);});
      const text=document.createElement('span');text.textContent=`${s.label} · ${Math.round(s.score*100)}%`;
      row.append(checkbox,text);$('ai-review').append(row);
    }
    draw();
  }
  $('ai-detect').addEventListener('click',detect);
  $('ai-cancel').addEventListener('click',cancel);
  $('ai-threshold').addEventListener('input',render);
  $('ai-accept').addEventListener('click',()=>{
    if(job)return;const image=bridge.active(),selected=visible().filter(s=>s.checked);if(!image||!selected.length)return;
    const shapes=selected.map(s=>{const {checked,score,...shape}=s;return {...shape,description:'',source:{kind:'ai-assisted',model:MODELS.detect.id,reviewed:true}};});
    suggestions=suggestions.filter(s=>!selected.includes(s));
    bridge.commit(image.id,shapes);render();say(`Accepted ${shapes.length} annotation(s). Use Select to edit; Undo reverses this batch.`);
  });
  new ResizeObserver(draw).observe(svg);
  return {render,cancel};
}
