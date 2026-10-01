import {MODELS} from './registry.js';
import {isLikelyDuplicate,normalizeSuggestions} from './review.js';

export function createAIController(bridge){
  const $=id=>document.getElementById(id),svg=$('ai-overlay'),message=$('ai-message');
  let worker=null,job=null,serial=0,imageId=null,suggestions=[],consent=false,awaitingConsent=null;
  const say=text=>{message.textContent=text;message.hidden=!text;};
  const visible=()=>suggestions.filter(s=>s.score>=Number($('ai-threshold').value));
  const duplicate=s=>isLikelyDuplicate(s,bridge.active()?.annotations||[]);
  const checked=s=>s.choice??!duplicate(s);
  function cancel(){
    worker?.terminate();worker=null;job=null;serial++;suggestions=[];render();
    say('Preview cleared.');
  }
  function allowDownloads(){
    if(consent)return Promise.resolve(true);
    if(awaitingConsent)return Promise.resolve(false);
    $('ai-consent-note').textContent=`${MODELS.detect.title}: ${MODELS.detect.download}, plus the AI runtime. Files download from jsDelivr and Hugging Face and may be cached by your browser. Images and annotations stay on this device. First use can take a while.`;
    $('ai-consent').returnValue='cancel';$('ai-consent').showModal();
    return new Promise(resolve=>{awaitingConsent=resolve;});
  }
  $('ai-consent').addEventListener('close',()=>{const accepted=$('ai-consent').returnValue==='allow';if(accepted)consent=true;awaitingConsent?.(accepted);awaitingConsent=null;});
  $('ai-consent-cancel').addEventListener('click',()=>$('ai-consent').close('cancel'));
  function start(request){
    if(!worker){
      worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
      const currentWorker=worker;
      worker.onmessage=({data})=>{
        if(worker!==currentWorker||!job||data.id!==job.id||data.imageId!==job.imageId||bridge.active()?.id!==job.imageId)return;
        if(data.type==='progress'){say(data.text);return;}
        if(data.type==='result'){
          job=null;suggestions=normalizeSuggestions(data.suggestions,bridge.active());
          render();say(suggestions.length?'':'No suggestions found.');
        }else if(data.type==='error')fail(data.message);
      };
      worker.onerror=()=>{if(worker===currentWorker)fail('The local AI worker could not start. Check your browser and connection, then retry.');};
    }
    job={...request,id:++serial};say('Loading local AI… First use downloads model files.');render();worker.postMessage(job);
  }
  function fail(error){worker?.terminate();worker=null;job=null;render();say(`AI unavailable: ${error} Manual annotation still works.`);}
  async function detect(){
    const image=bridge.active();if(!image||job)return;
    if(!await allowDownloads()||bridge.active()?.id!==image.id)return;
    suggestions=[];bridge.chooseTool('select');
    try{start({kind:'detect',file:image.file,imageId:image.id,width:image.width,height:image.height});}catch(error){fail(error.message);}
  }
  function node(tag,attrs){const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attrs))n.setAttribute(key,value);return n;}
  function draw(){
    const image=bridge.active();svg.replaceChildren();if(!image)return;
    svg.setAttribute('viewBox',`0 0 ${image.width} ${image.height}`);
    const scale=image.width/Math.max(1,svg.getBoundingClientRect().width);
    for(const s of visible())if(checked(s)){
      const shape=node('rect',{x:s.x,y:s.y,width:s.width,height:s.height});shape.classList.add('ai-shape');svg.append(shape);
      const label=node('text',{x:s.x+3*scale,y:Math.min(image.height-3*scale,s.y+14*scale),'font-size':12*scale});label.classList.add('ai-preview-label');label.textContent=`${s.label} ${Math.round(s.score*100)}%`;svg.append(label);
    }
  }
  function updateSelection(){
    const shown=visible(),selected=shown.filter(checked);
    $('ai-accept').disabled=!!job||!selected.length;
    $('ai-summary').hidden=!suggestions.length;
    $('ai-summary').textContent=`${shown.length} suggestions · ${selected.length} selected`;
    draw();
  }
  function render(){
    const image=bridge.active();
    if(imageId!==image?.id){if(job){worker?.terminate();worker=null;job=null;serial++;}imageId=image?.id;suggestions=[];say('Choose Smart Annotate to suggest boxes.');}
    $('ai-detect').disabled=!image||!!job;
    $('ai-threshold').disabled=!image||!!job;
    $('ai-cancel').disabled=!image||!(job||suggestions.length);
    $('ai-cancel').textContent=job?'Cancel AI':'Clear Preview';
    $('ai-progress').hidden=!job;$('ai-panel').setAttribute('aria-busy',String(!!job));
    $('ai-threshold-value').textContent=`${Math.round(Number($('ai-threshold').value)*100)}%`;
    renderRows();
  }
  function renderRows(){
    $('ai-review').replaceChildren();
    for(const s of visible()){
      const row=document.createElement('label');row.className='ai-review-row';
      const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=checked(s);checkbox.disabled=!!job;
      checkbox.addEventListener('change',()=>{s.choice=checkbox.checked;updateSelection();});
      const text=document.createElement('span');text.textContent=`${s.label} · ${Math.round(s.score*100)}%${duplicate(s)?' · Likely Duplicate':''}`;
      row.append(checkbox,text);$('ai-review').append(row);
    }
    updateSelection();
  }
  function accept(){
    if(job)return;const image=bridge.active(),selected=visible().filter(checked);if(!image||!selected.length)return;
    const shapes=selected.map(s=>({type:'box',label:s.label,x:s.x,y:s.y,width:s.width,height:s.height,description:'',source:{kind:'ai-assisted',model:MODELS.detect.id,confidence:s.score,reviewed:true}}));
    suggestions=suggestions.filter(s=>!selected.includes(s));bridge.commit(image.id,shapes);render();say(`Accepted ${shapes.length} annotation(s).`);
  }
  $('ai-detect').addEventListener('click',detect);
  $('ai-cancel').addEventListener('click',cancel);
  $('ai-threshold').addEventListener('input',renderRows);
  $('ai-threshold').addEventListener('input',()=>{$('ai-threshold-value').textContent=`${Math.round(Number($('ai-threshold').value)*100)}%`;});
  $('ai-accept').addEventListener('click',()=>accept());
  new ResizeObserver(draw).observe(svg);
  return {render,cancel};
}
