(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const ui=Object.fromEntries(['file','json','json-current','yolo','yolo-all','undo','clear','reset','drop','empty','image-wrap','image','overlay','meta','status','classes','class-count','annotations','count','label-input','description-input','rename','delete','label-dialog','label-form','cancel-label','new-label','new-description','image-count','image-list','previous','next','position','tool-select','tool-pan','tool-box','tool-line','tool-point','tool-polygon','finish-polygon','zoom-in','zoom-out','zoom-fit','zoom-level'].map(id=>[id,$(id)]));
  const project={images:[]};
  let activeId=null,draft=null,polygonDraft=null,pending=null,editDraft=null,panDraft=null,lastLabel='',session=0,tool='box';
  const active=()=>project.images.find(item=>item.id===activeId)||null;
  const boxes=()=>active()?.annotations||[];
  const status=message=>{ui.status.textContent=message;};
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const point=e=>{const r=ui.overlay.getBoundingClientRect(),image=active();return {x:clamp((e.clientX-r.left)*image.width/r.width,0,image.width),y:clamp((e.clientY-r.top)*image.height/r.height,0,image.height)};};
  const rounded=b=>{const x=Math.round(b.x),y=Math.round(b.y);return {x,y,width:Math.max(1,Math.round(b.x+b.width)-x),height:Math.max(1,Math.round(b.y+b.height)-y)};};
  const svgNS='http://www.w3.org/2000/svg';
  function lineLayer(image){const svg=document.createElementNS(svgNS,'svg');svg.classList.add('annotation-line-layer');svg.setAttribute('viewBox',`0 0 ${image.width} ${image.height}`);svg.setAttribute('preserveAspectRatio','none');return svg;}
  function lineElement(b,selected=false){const line=document.createElementNS(svgNS,'line');line.classList.add('annotation-line');if(selected)line.classList.add('selected');for(const key of ['x1','y1','x2','y2'])line.setAttribute(key,b[key]);return line;}
  const coords=b=>b.type==='polygon'?`${b.points.length} vertices: ${b.points.map(p=>`(${p.x}, ${p.y})`).join(' ')}`:b.type==='line'?`(${b.x1}, ${b.y1}) → (${b.x2}, ${b.y2})`:b.type==='point'?`x: ${b.x}  y: ${b.y}`:`x: ${b.x}  y: ${b.y}  w: ${b.width}  h: ${b.height}`;
  function chooseTool(next){closeDrawing();tool=next;for(const name of ['select','pan','box','line','point','polygon'])ui[`tool-${name}`].setAttribute('aria-pressed',String(tool===name));ui.overlay.classList.toggle('select-mode',tool==='select');ui.overlay.classList.toggle('pan-mode',tool==='pan');status({select:'Select a shape to move it. Drag its handles to edit it.',pan:'Pan: drag the image to move around. Use +, −, or Fit to zoom.',box:'Box: drag on the image to draw. Esc cancels a drawing.',line:'Line: drag from start to end. Esc cancels a drawing.',point:'Point: click on the image to mark a location.',polygon:'Polygon: click three or more vertices, then click the first vertex, Finish polygon, or press Enter. Esc cancels.'}[tool]);}
  for(const name of ['select','pan','box','line','point','polygon'])ui[`tool-${name}`].addEventListener('click',()=>chooseTool(name));
  function fitWidth(image){return Math.min(image.width,ui.drop.clientWidth-2,Math.max(100,window.innerHeight*.7)*image.width/image.height);}
  function updateZoom(){const image=active();ui['zoom-level'].textContent=image?`${Math.round((image.zoom||1)*100)}%`:'100%';for(const id of ['zoom-in','zoom-out','zoom-fit'])ui[id].disabled=!image;if(image){ui['image-wrap'].style.width=`${fitWidth(image)*(image.zoom||1)}px`;}}
  function zoomTo(value){const image=active();if(!image)return;const oldWidth=ui['image-wrap'].getBoundingClientRect().width,centerX=ui.drop.scrollLeft+ui.drop.clientWidth/2,centerY=ui.drop.scrollTop+ui.drop.clientHeight/2;image.zoom=clamp(value,.25,8);updateZoom();const ratio=ui['image-wrap'].getBoundingClientRect().width/oldWidth;if(Number.isFinite(ratio)){ui.drop.scrollLeft=centerX*ratio-ui.drop.clientWidth/2;ui.drop.scrollTop=centerY*ratio-ui.drop.clientHeight/2;}}
  ui['zoom-in'].addEventListener('click',()=>zoomTo((active()?.zoom||1)*1.25));ui['zoom-out'].addEventListener('click',()=>zoomTo((active()?.zoom||1)/1.25));ui['zoom-fit'].addEventListener('click',()=>{zoomTo(1);ui.drop.scrollTo(0,0);});
  new ResizeObserver(updateZoom).observe(ui.drop);
  function bindShape(element,image,b){element.addEventListener('pointerdown',e=>{if(tool!=='select'||e.button!==0)return;e.preventDefault();e.stopPropagation();if(image.selected!==b.id){image.selected=b.id;render();}startEdit(e,image,b,'move');});element.addEventListener('click',e=>{if(tool==='select')e.stopPropagation();});}
  function addVertex(svg,image,b,part,x,y){const handle=document.createElementNS(svgNS,'circle');handle.classList.add('edit-vertex');handle.setAttribute('cx',x);handle.setAttribute('cy',y);handle.setAttribute('r',Math.max(6,9*image.width/ui.overlay.clientWidth));handle.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();startEdit(e,image,b,part);});svg.append(handle);}
  function startEdit(e,image,b,part){editDraft={pointer:e.pointerId,imageId:image.id,annotation:b,original:structuredClone(b),part,start:point(e)};ui.overlay.setPointerCapture(e.pointerId);}
  function moveEdit(e){const edit=editDraft,image=active();if(!edit||e.pointerId!==edit.pointer||image?.id!==edit.imageId)return;const p=point(e),b=edit.annotation,o=edit.original,dx=Math.round(p.x-edit.start.x),dy=Math.round(p.y-edit.start.y),part=edit.part;
    if(part==='move'){if((b.type||'box')==='box'){b.x=clamp(o.x+dx,0,image.width-o.width);b.y=clamp(o.y+dy,0,image.height-o.height);}else if(b.type==='point'){b.x=clamp(o.x+dx,0,image.width);b.y=clamp(o.y+dy,0,image.height);}else{const vertices=b.type==='line'?[{x:o.x1,y:o.y1},{x:o.x2,y:o.y2}]:o.points;const minX=Math.min(...vertices.map(v=>v.x)),maxX=Math.max(...vertices.map(v=>v.x)),minY=Math.min(...vertices.map(v=>v.y)),maxY=Math.max(...vertices.map(v=>v.y));const shiftX=clamp(dx,-minX,image.width-maxX),shiftY=clamp(dy,-minY,image.height-maxY);if(b.type==='line'){b.x1=o.x1+shiftX;b.x2=o.x2+shiftX;b.y1=o.y1+shiftY;b.y2=o.y2+shiftY;}else b.points=o.points.map(v=>({x:v.x+shiftX,y:v.y+shiftY}));}}
    else if(b.type==='box'){const right=o.x+o.width,bottom=o.y+o.height;const left=part.includes('w')?clamp(Math.round(p.x),0,right-1):o.x,top=part.includes('n')?clamp(Math.round(p.y),0,bottom-1):o.y;b.x=left;b.y=top;b.width=(part.includes('e')?clamp(Math.round(p.x),o.x+1,image.width):right)-left;b.height=(part.includes('s')?clamp(Math.round(p.y),o.y+1,image.height):bottom)-top;}
    else if(b.type==='line'){const k=part==='line-start'?'1':'2';b[`x${k}`]=Math.round(p.x);b[`y${k}`]=Math.round(p.y);}
    else if(b.type==='polygon'&&part.startsWith('vertex-'))b.points[Number(part.slice(7))]={x:Math.round(p.x),y:Math.round(p.y)};
    render();
  }
  function render(){
    const image=active(),annotations=boxes(),selected=image?.selected,index=project.images.findIndex(item=>item.id===activeId);
    ui.empty.hidden=!!image;ui['image-wrap'].hidden=!image;
    if(image&&ui.image.dataset.imageId!==image.id){ui.image.src=image.url;ui.image.dataset.imageId=image.id;}
    if(!image){ui.image.removeAttribute('src');delete ui.image.dataset.imageId;}
    ui.meta.textContent=image?`${image.filename} · ${image.width} × ${image.height}`:'No image loaded';
    ui.position.textContent=image?`Image ${index+1} of ${project.images.length}`:'No images';
    ui.previous.disabled=index<=0;ui.next.disabled=index<0||index>=project.images.length-1;
    ui.count.textContent=`${annotations.length} ${annotations.length===1?'annotation':'annotations'}`;
    ui['image-count'].textContent=`${project.images.length} ${project.images.length===1?'image':'images'}`;
    ui.json.disabled=ui['yolo-all'].disabled=ui.reset.disabled=!project.images.length;
    ui['json-current'].disabled=ui.yolo.disabled=!image;
    ui.clear.disabled=ui.undo.disabled=!annotations.length;
    ui['image-list'].replaceChildren();
    if(!project.images.length)ui['image-list'].textContent='Add images to start a dataset.';
    for(const item of project.images){
      const entry=document.createElement('div');entry.className='image-entry';
      const choice=document.createElement('button');choice.className='image-choice'+(item.id===activeId?' active':'');choice.setAttribute('aria-label',`Select ${item.filename}`);
      const thumb=document.createElement('img');thumb.src=item.url;thumb.alt='';
      const info=document.createElement('span');info.className='image-details';
      const title=document.createElement('strong');title.textContent=item.filename;title.title=item.filename;
      const count=document.createElement('small');count.textContent=`${item.annotations.length} ${item.annotations.length===1?'annotation':'annotations'}`;
      info.append(title,count);choice.append(thumb,info);choice.addEventListener('click',()=>switchImage(item.id));
      const remove=document.createElement('button');remove.className='remove-image';remove.textContent='×';remove.title=`Remove ${item.filename}`;remove.setAttribute('aria-label',`Remove ${item.filename}`);
      remove.addEventListener('click',()=>removeImage(item.id));entry.append(choice,remove);ui['image-list'].append(entry);
    }
    ui.overlay.replaceChildren();
    if(image){
      const svg=lineLayer(image);ui.overlay.append(svg);
      for(const b of annotations){
        const type=b.type||'box',isSelected=b.id===selected;
        if(type==='line'){
          const line=lineElement(b,isSelected);bindShape(line,image,b);svg.append(line);if(isSelected&&tool==='select')for(const key of ['1','2'])addVertex(svg,image,b,key==='1'?'line-start':'line-end',b[`x${key}`],b[`y${key}`]);
          const label=document.createElement('div');label.className='line-label'+(isSelected?' selected':'');label.style.left=`${(b.x1+b.x2)/2/image.width*100}%`;label.style.top=`${(b.y1+b.y2)/2/image.height*100}%`;
          const tag=document.createElement('span');tag.className='tag';tag.textContent=b.label;label.append(tag);ui.overlay.append(label);
        }else if(type==='polygon'){
          const shape=document.createElementNS(svgNS,'polygon');shape.classList.add('annotation-polygon');if(isSelected)shape.classList.add('selected');shape.setAttribute('points',b.points.map(p=>`${p.x},${p.y}`).join(' '));
          bindShape(shape,image,b);svg.append(shape);if(isSelected&&tool==='select')b.points.forEach((p,i)=>addVertex(svg,image,b,`vertex-${i}`,p.x,p.y));
          const center=b.points.reduce((sum,p)=>({x:sum.x+p.x,y:sum.y+p.y}),{x:0,y:0});
          const label=document.createElement('div');label.className='line-label'+(isSelected?' selected':'');label.style.left=`${center.x/b.points.length/image.width*100}%`;label.style.top=`${center.y/b.points.length/image.height*100}%`;
          const tag=document.createElement('span');tag.className='tag';tag.textContent=b.label;label.append(tag);ui.overlay.append(label);
        }else{
          const el=document.createElement('div');el.className=(type==='point'?'point-marker':'box')+(isSelected?' selected':'');
          el.style.left=`${b.x/image.width*100}%`;el.style.top=`${b.y/image.height*100}%`;
          if(type==='box'){el.style.width=`${b.width/image.width*100}%`;el.style.height=`${b.height/image.height*100}%`;}
          const tag=document.createElement('span');tag.className='tag';tag.textContent=b.label;el.append(tag);
          bindShape(el,image,b);ui.overlay.append(el);if(type==='box'&&isSelected&&tool==='select')for(const corner of ['nw','ne','sw','se']){const handle=document.createElement('span');handle.className=`resize-handle ${corner}`;handle.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();startEdit(e,image,b,corner);});el.append(handle);}
        }
      }
    }
    ui.annotations.replaceChildren();
    if(!annotations.length)ui.annotations.textContent='No annotations yet.';
    for(const [i,b] of annotations.entries()){
      const row=document.createElement('button');row.className='row'+(b.id===selected?' active':'');
      const text=document.createElement('span');text.textContent=`#${i+1}  ${(b.type||'box').toUpperCase()}  ${b.label}`;
      const detail=document.createElement('small');detail.textContent=coords(b);
      text.append(detail);if(b.description){const note=document.createElement('small');note.textContent=b.description;text.append(note);}row.append(text);row.addEventListener('click',()=>{image.selected=b.id;render();});ui.annotations.append(row);
    }
    const classes=[...new Set(annotations.filter(b=>(b.type||'box')==='box').map(b=>b.label))];ui.classes.replaceChildren();
    if(!classes.length)ui.classes.textContent='Labels appear here as you annotate.';
    classes.forEach((name,id)=>{const el=document.createElement('div');el.className='class-row';const code=document.createElement('span');code.className='class-id';code.textContent=String(id);el.append(code,document.createTextNode(name));ui.classes.append(el);});
    ui['class-count'].textContent=`${classes.length} ${classes.length===1?'class':'classes'}`;
    const current=annotations.find(b=>b.id===selected);ui['label-input'].disabled=ui['description-input'].disabled=ui.rename.disabled=ui.delete.disabled=!current;
    ui['label-input'].value=current?.label??'';ui['description-input'].value=current?.description??'';updateZoom();
    if(polygonDraft)drawPolygonDraft();
  }
  function cancelDraft(){if(editDraft){Object.assign(editDraft.annotation,editDraft.original);editDraft=null;render();}panDraft=null;ui.overlay.classList.remove('panning');if(draft){try{ui.overlay.releasePointerCapture(draft.pointer);}catch{}draft=null;ui.overlay.querySelector('.draft')?.remove();}if(polygonDraft){polygonDraft=null;ui.overlay.querySelector('.polygon-draft')?.remove();ui['finish-polygon'].disabled=true;}}
  function closeDrawing(){cancelDraft();pending=null;if(ui['label-dialog'].open)ui['label-dialog'].close('cancel');}
  function switchImage(id){if(id===activeId)return;closeDrawing();activeId=id;render();}
  function removeImage(id){const index=project.images.findIndex(item=>item.id===id);if(index<0)return;const item=project.images[index],n=item.annotations.length;
    if(n&&!confirm(`Remove this image and its ${n} ${n===1?'annotation':'annotations'}?`))return;
    if(id===activeId)closeDrawing();project.images.splice(index,1);
    if(id===activeId)activeId=project.images[Math.min(index,project.images.length-1)]?.id||null;
    URL.revokeObjectURL(item.url);render();status(`Removed ${item.filename}.`);
  }
  function probeFile(file){return new Promise(resolve=>{
    const url=URL.createObjectURL(file),probe=new Image();
    probe.onload=()=>{if(!probe.naturalWidth||!probe.naturalHeight){URL.revokeObjectURL(url);resolve(null);return;}
      resolve({id:crypto.randomUUID(),filename:file.name,width:probe.naturalWidth,height:probe.naturalHeight,url,annotations:[],selected:null,nextId:1});};
    probe.onerror=()=>{URL.revokeObjectURL(url);resolve(null);};probe.src=url;
  });}
  const supportedImage=file=>['image/jpeg','image/png','image/webp','image/avif','image/bmp','image/x-ms-bmp'].includes(file.type)||(!file.type&&/\.(?:jpe?g|png|webp|avif|bmp)$/i.test(file.name));
  async function addImages(files){const valid=[...files].filter(supportedImage);
    if(!valid.length){status('Choose JPG, PNG, WebP, AVIF, or BMP images.');return;}
    const currentSession=session,results=await Promise.all(valid.map(probeFile));
    if(currentSession!==session){for(const item of results)if(item)URL.revokeObjectURL(item.url);return;}
    for(const item of results)if(item)project.images.push(item);
    if(!activeId&&results.some(Boolean))activeId=results.find(Boolean).id;
    render();const added=results.filter(Boolean).length;status(`Added ${added} ${added===1?'image':'images'}${results.some(item=>!item)?'; some files could not be opened':''}.`);
  }
  ui.file.addEventListener('change',e=>{addImages(e.target.files);e.target.value='';});
  ui.drop.addEventListener('dragover',e=>{e.preventDefault();ui.drop.classList.add('dragover');});
  ui.drop.addEventListener('dragleave',()=>ui.drop.classList.remove('dragover'));
  ui.drop.addEventListener('drop',e=>{e.preventDefault();ui.drop.classList.remove('dragover');addImages(e.dataTransfer.files);});
  ui.previous.addEventListener('click',()=>{const i=project.images.findIndex(item=>item.id===activeId);if(i>0)switchImage(project.images[i-1].id);});
  ui.next.addEventListener('click',()=>{const i=project.images.findIndex(item=>item.id===activeId);if(i>=0&&i<project.images.length-1)switchImage(project.images[i+1].id);});
  function drawPolygonDraft(){if(!polygonDraft||polygonDraft.imageId!==activeId)return;
    ui.overlay.querySelector('.polygon-draft')?.remove();const svg=ui.overlay.querySelector('.annotation-line-layer');if(!svg)return;
    const group=document.createElementNS(svgNS,'g');group.classList.add('polygon-draft');
    const points=[...polygonDraft.points,polygonDraft.cursor].filter(Boolean);
    if(points.length>1){const preview=document.createElementNS(svgNS,'polyline');preview.classList.add('polygon-preview');preview.setAttribute('points',points.map(p=>`${p.x},${p.y}`).join(' '));group.append(preview);}
    for(const [index,p] of polygonDraft.points.entries()){const vertex=document.createElementNS(svgNS,'circle');vertex.classList.add('polygon-vertex');if(index===0&&polygonDraft.points.length>=3){vertex.classList.add('start-vertex');if(polygonDraft.cursor&&nearPolygonStart(polygonDraft.cursor))vertex.classList.add('near-start');}vertex.setAttribute('cx',p.x);vertex.setAttribute('cy',p.y);vertex.setAttribute('r',index===0&&polygonDraft.points.length>=3?Math.max(6,8*active().width/ui.overlay.getBoundingClientRect().width):5);group.append(vertex);}
    svg.append(group);ui['finish-polygon'].disabled=polygonDraft.points.length<3;
  }
  function nearPolygonStart(p){if(!polygonDraft?.points.length)return false;const image=active(),r=ui.overlay.getBoundingClientRect(),first=polygonDraft.points[0];return Math.hypot((p.x-first.x)*r.width/image.width,(p.y-first.y)*r.height/image.height)<=12;}
  function addPolygonVertex(p){const image=active();if(!image)return;
    if(!polygonDraft)polygonDraft={imageId:activeId,points:[],cursor:null};
    if(polygonDraft.points.length>=3&&nearPolygonStart(p)){finishPolygon();return;}
    const r=ui.overlay.getBoundingClientRect(),last=polygonDraft.points.at(-1);
    if(last&&Math.hypot((p.x-last.x)*r.width/image.width,(p.y-last.y)*r.height/image.height)<5)return;
    polygonDraft.points.push({x:Math.round(p.x),y:Math.round(p.y)});polygonDraft.cursor=null;drawPolygonDraft();
    status(`${polygonDraft.points.length} polygon ${polygonDraft.points.length===1?'vertex':'vertices'}. Add at least 3, then click the first vertex, Finish polygon, or press Enter.`);
  }
  function finishPolygon(){if(!polygonDraft||polygonDraft.points.length<3||polygonDraft.imageId!==activeId)return;
    const image=active(),points=polygonDraft.points;
    const area=Math.abs(points.reduce((total,p,i)=>total+p.x*points[(i+1)%points.length].y-p.y*points[(i+1)%points.length].x,0))/2;
    const r=ui.overlay.getBoundingClientRect(),displayArea=area*r.width*r.height/(image.width*image.height);
    if(displayArea<12){status('Polygon too small. Add vertices farther apart.');return;}
    polygonDraft=null;ui.overlay.querySelector('.polygon-draft')?.remove();ui['finish-polygon'].disabled=true;
    requestLabel('polygon',{points:points.map(p=>({...p}))});
  }
  ui['finish-polygon'].addEventListener('click',finishPolygon);
  function drawDraft(){if(!draft)return;const image=active();
    if(draft.type==='line'){
      let el=ui.overlay.querySelector('.draft');if(!el){el=lineElement({x1:draft.start.x,y1:draft.start.y,x2:draft.end.x,y2:draft.end.y});el.classList.add('draft');ui.overlay.querySelector('.annotation-line-layer').append(el);}
      el.setAttribute('x2',draft.end.x);el.setAttribute('y2',draft.end.y);return;
    }
    let el=ui.overlay.querySelector('.draft');if(!el){el=document.createElement('div');el.className='box draft';ui.overlay.append(el);}
    const x=Math.min(draft.start.x,draft.end.x),y=Math.min(draft.start.y,draft.end.y);
    el.style.left=`${x/image.width*100}%`;el.style.top=`${y/image.height*100}%`;
    el.style.width=`${Math.abs(draft.end.x-draft.start.x)/image.width*100}%`;el.style.height=`${Math.abs(draft.end.y-draft.start.y)/image.height*100}%`;
  }
  function requestLabel(type,shape){pending={imageId:activeId,type,shape};ui['new-label'].value=lastLabel;ui['new-description'].value='';ui['label-dialog'].showModal();ui['new-label'].focus();ui['new-label'].select();}
  ui.overlay.addEventListener('pointerdown',e=>{if(!active()||pending||e.button!==0||tool==='select')return;e.preventDefault();if(tool==='pan'){panDraft={pointer:e.pointerId,x:e.clientX,y:e.clientY,left:ui.drop.scrollLeft,top:ui.drop.scrollTop};ui.overlay.setPointerCapture(e.pointerId);ui.overlay.classList.add('panning');return;}const start=point(e);
    if(tool==='polygon'){addPolygonVertex(start);return;}
    if(tool==='point'){requestLabel('point',{x:Math.round(start.x),y:Math.round(start.y)});return;}
    draft={pointer:e.pointerId,start,end:start,imageId:activeId,type:tool};ui.overlay.setPointerCapture(e.pointerId);drawDraft();});
  ui.overlay.addEventListener('pointermove',e=>{if(editDraft){moveEdit(e);return;}if(panDraft&&e.pointerId===panDraft.pointer){ui.drop.scrollLeft=panDraft.left+panDraft.x-e.clientX;ui.drop.scrollTop=panDraft.top+panDraft.y-e.clientY;return;}if(draft&&e.pointerId===draft.pointer){draft.end=point(e);drawDraft();}else if(polygonDraft){polygonDraft.cursor=point(e);drawPolygonDraft();}});
  ui.overlay.addEventListener('pointerup',e=>{if(editDraft&&e.pointerId===editDraft.pointer){editDraft=null;return;}if(panDraft&&e.pointerId===panDraft.pointer){panDraft=null;ui.overlay.classList.remove('panning');return;}if(!draft||e.pointerId!==draft.pointer)return;const {start,imageId,type}=draft,end=point(e);cancelDraft();const image=active();if(!image||image.id!==imageId)return;
    if(type==='line'){
      const r=ui.overlay.getBoundingClientRect(),distance=Math.hypot((end.x-start.x)*r.width/image.width,(end.y-start.y)*r.height/image.height);
      if(distance<5){status('Line too short. Drag at least a few pixels.');return;}
      requestLabel('line',{x1:Math.round(start.x),y1:Math.round(start.y),x2:Math.round(end.x),y2:Math.round(end.y)});return;
    }
    const raw={x:Math.min(start.x,end.x),y:Math.min(start.y,end.y),width:Math.abs(end.x-start.x),height:Math.abs(end.y-start.y)};
    if(raw.width<Math.max(3,image.width*.003)||raw.height<Math.max(3,image.height*.003)){status('Box too small. Drag a larger rectangle.');return;}
    requestLabel('box',rounded(raw));});
  ui.overlay.addEventListener('pointercancel',cancelDraft);
  ui['cancel-label'].addEventListener('click',()=>ui['label-dialog'].close('cancel'));
  ui['label-form'].addEventListener('submit',e=>{e.preventDefault();if(!ui['new-label'].value.trim()){ui['new-label'].setCustomValidity('Enter a class name.');ui['new-label'].reportValidity();return;}ui['label-dialog'].close('save');});
  ui['new-label'].addEventListener('input',()=>ui['new-label'].setCustomValidity(''));
  ui['new-label'].addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();ui['label-form'].requestSubmit();}});
  ui['label-dialog'].addEventListener('close',()=>{const label=ui['new-label'].value.trim(),image=active();
    if(ui['label-dialog'].returnValue==='save'&&label&&pending&&image?.id===pending.imageId){const b={id:image.nextId++,type:pending.type,label,description:ui['new-description'].value.trim(),...pending.shape};lastLabel=label;image.annotations.push(b);image.selected=b.id;render();status(`Added “${label}”.`);}pending=null;});
  ui.rename.addEventListener('click',()=>{const b=boxes().find(b=>b.id===active()?.selected),label=ui['label-input'].value.trim();if(!b||!label){status('Enter a class name.');return;}b.label=label;b.description=ui['description-input'].value.trim();lastLabel=label;render();status('Annotation saved.');});
  ui['label-input'].addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();ui.rename.click();}});
  function removeSelected(){const image=active(),index=boxes().findIndex(b=>b.id===image?.selected);if(index<0)return;image.annotations.splice(index,1);image.selected=null;render();status('Annotation deleted.');}
  ui.delete.addEventListener('click',removeSelected);
  ui.undo.addEventListener('click',()=>{const image=active();if(!image?.annotations.length)return;image.annotations.pop();image.selected=null;render();status('Last annotation removed.');});
  ui.clear.addEventListener('click',()=>{const image=active();if(!image?.annotations.length)return;if(!confirm('Clear all annotations for this image?'))return;image.annotations=[];image.selected=null;render();status('Annotations cleared for this image.');});
  ui.reset.addEventListener('click',()=>{if(project.images.some(item=>item.annotations.length)&&!confirm('Clear the entire dataset and all its annotations?'))return;
    closeDrawing();session++;for(const item of project.images)URL.revokeObjectURL(item.url);project.images=[];activeId=null;render();status('Dataset cleared.');});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){cancelDraft();return;}
    if(e.key==='Enter'&&polygonDraft&&!ui['label-dialog'].open&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();finishPolygon();return;}
    if((e.key==='Delete'||e.key==='Backspace')&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)&&!ui['label-dialog'].open){e.preventDefault();removeSelected();}});
  function download(name,content,type){const blob=new Blob([content],{type}),href=URL.createObjectURL(blob),link=document.createElement('a');link.href=href;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(href),60000);}
  const stem=image=>image.filename.replace(/\.[^.]+$/,'')||'annotations';
  const exported=image=>({filename:image.filename,width:image.width,height:image.height,annotations:image.annotations.map(b=>({...b}))});
  ui.json.addEventListener('click',()=>{if(!project.images.length)return;download('boundless-dataset.json',JSON.stringify({images:project.images.map(exported)},null,2)+'\n','application/json');});
  ui['json-current'].addEventListener('click',()=>{const image=active();if(!image)return;download(`${stem(image)}-${image.id.slice(0,8)}.json`,JSON.stringify({image:{filename:image.filename,width:image.width,height:image.height},annotations:image.annotations.map(b=>({...b}))},null,2)+'\n','application/json');});
  ui.yolo.addEventListener('click',()=>{const image=active();if(!image)return;const rectangles=image.annotations.filter(b=>(b.type||'box')==='box'),classes=[...new Set(rectangles.map(b=>b.label))];
    const lines=rectangles.map(b=>[classes.indexOf(b.label),(b.x+b.width/2)/image.width,(b.y+b.height/2)/image.height,b.width/image.width,b.height/image.height].map((n,i)=>i?clamp(n,0,1).toFixed(6):n).join(' '));
    const name=`${stem(image)}-${image.id.slice(0,8)}`;download(`${name}.txt`,lines.join('\n')+(lines.length?'\n':''),'text/plain');download(`${name}-classes.txt`,classes.join('\n')+(classes.length?'\n':''),'text/plain');});
  const yoloLine=(b,image,classes)=>[classes.indexOf(b.label),(b.x+b.width/2)/image.width,(b.y+b.height/2)/image.height,b.width/image.width,b.height/image.height].map((n,i)=>i?clamp(n,0,1).toFixed(6):n).join(' ');
  function zipFiles(files){const encoder=new TextEncoder(),parts=[],directory=[];let offset=0;const table=Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
    const crc32=data=>{let c=0xffffffff;for(const byte of data)c=table[(c^byte)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
    for(const [filename,content] of files){const name=encoder.encode(filename),data=encoder.encode(content),crc=crc32(data),local=new Uint8Array(30+name.length),lv=new DataView(local.buffer);lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0x0800,true);lv.setUint32(14,crc,true);lv.setUint32(18,data.length,true);lv.setUint32(22,data.length,true);lv.setUint16(26,name.length,true);local.set(name,30);parts.push(local,data);
      const central=new Uint8Array(46+name.length),cv=new DataView(central.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x0800,true);cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);central.set(name,46);directory.push(central);offset+=local.length+data.length;}
    const directorySize=directory.reduce((sum,entry)=>sum+entry.length,0),end=new Uint8Array(22),view=new DataView(end.buffer);view.setUint32(0,0x06054b50,true);view.setUint16(8,files.length,true);view.setUint16(10,files.length,true);view.setUint32(12,directorySize,true);view.setUint32(16,offset,true);return new Blob([...parts,...directory,end],{type:'application/zip'});
  }
  ui['yolo-all'].addEventListener('click',()=>{if(!project.images.length)return;const classes=[...new Set(project.images.flatMap(image=>image.annotations.filter(b=>(b.type||'box')==='box').map(b=>b.label)))];const manifest=[];
    const files=project.images.map((image,index)=>{const name=`${String(index+1).padStart(3,'0')}-${stem(image).replace(/[^a-z0-9_-]/gi,'_').slice(0,60)||'image'}.txt`;manifest.push({annotation_file:name,image_filename:image.filename,width:image.width,height:image.height});const lines=image.annotations.filter(b=>(b.type||'box')==='box').map(b=>yoloLine(b,image,classes));return[name,lines.join('\n')+(lines.length?'\n':'')];});
    files.push(['classes.txt',classes.join('\n')+(classes.length?'\n':'')],['image-map.json',JSON.stringify({images:manifest},null,2)+'\n']);download('boundless-yolo.zip',zipFiles(files),'application/zip');status(`Exported ${project.images.length} image annotation files with shared class IDs.`);
  });
  render();
})();
