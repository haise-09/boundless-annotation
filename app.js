(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const ui=Object.fromEntries(['file','export-dialog','export-form','export-name','export-details','include-images','include-map','split-dataset','split-choice','cancel-export','confirm-export','export-menu','json','json-current','yolo','yolo-all','voc-current','voc-all','coco','vgg','csv','undo','clear','reset','drop','empty','image-wrap','image','overlay','crosshair','crosshair-coordinates','meta','status','classes','class-count','annotations','count','label-input','description-input','rename','delete','label-dialog','label-form','cancel-label','new-label','new-description','image-count','image-list','previous','next','position','tool-smart','tool-select','tool-pan','tool-box','tool-line','tool-point','tool-polygon','finish-polygon','zoom-in','zoom-out','zoom-fit','zoom-level'].map(id=>[id,$(id)]));
  const project={images:[]};
  let ai=null;
  let activeId=null,draft=null,polygonDraft=null,pending=null,editDraft=null,panDraft=null,lastLabel='',session=0,tool='box',spacePan=false,lastPointer=null;
  const active=()=>project.images.find(item=>item.id===activeId)||null;
  const boxes=()=>active()?.annotations||[];
  const snapshot=image=>({annotations:structuredClone(image.annotations),selected:image.selected,nextId:image.nextId});
  function recordUndo(image,before){
    if(JSON.stringify(before.annotations)===JSON.stringify(image.annotations))return;
    image.history.push(before);
    if(image.history.length>50)image.history.shift();
  }
  const status=message=>{ui.status.textContent=message;};
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const point=e=>{const r=ui.overlay.getBoundingClientRect(),image=active();return {x:clamp((e.clientX-r.left)*image.width/r.width,0,image.width),y:clamp((e.clientY-r.top)*image.height/r.height,0,image.height)};};
  const rounded=b=>{const x=Math.round(b.x),y=Math.round(b.y);return {x,y,width:Math.max(1,Math.round(b.x+b.width)-x),height:Math.max(1,Math.round(b.y+b.height)-y)};};
  const svgNS='http://www.w3.org/2000/svg';
  function lineLayer(image){const svg=document.createElementNS(svgNS,'svg');svg.classList.add('annotation-line-layer');svg.setAttribute('viewBox',`0 0 ${image.width} ${image.height}`);svg.setAttribute('preserveAspectRatio','none');return svg;}
  function lineElement(b,selected=false){const line=document.createElementNS(svgNS,'line');line.classList.add('annotation-line');if(selected)line.classList.add('selected');for(const key of ['x1','y1','x2','y2'])line.setAttribute(key,b[key]);return line;}
  const coords=b=>b.type==='polygon'?`${b.points.length} vertices: ${b.points.map(p=>`(${p.x}, ${p.y})`).join(' ')}`:b.type==='line'?`(${b.x1}, ${b.y1}) → (${b.x2}, ${b.y2})`:b.type==='point'?`x: ${b.x}  y: ${b.y}`:`x: ${b.x}  y: ${b.y}  w: ${b.width}  h: ${b.height}`;
  const effectiveTool=()=>spacePan?'pan':tool;
  const toolMessage={smart:'Auto Select: click inside the object, then use Include or Exclude clicks to refine. Review and label the preview.',select:'Select a shape to move it. Drag its handles to edit it.',pan:'Pan: drag the image to move around. Hold Space to pan temporarily.',box:'Box: drag on the image to draw. Esc cancels a drawing.',line:'Line: drag from start to end. Esc cancels a drawing.',point:'Point: click on the image to mark a location.',polygon:'Polygon: click three or more vertices, then click the first vertex, Finish polygon, or press Enter. Esc cancels.'};
  function hideCrosshair(){ui.crosshair.hidden=true;}
  function updateCrosshair(e){lastPointer={x:e.clientX,y:e.clientY};const image=active();if(!image||effectiveTool()==='pan'||ui['label-dialog'].open){hideCrosshair();return;}const r=ui.overlay.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;if(x<0||y<0||x>r.width||y>r.height){hideCrosshair();return;}const p=point(e);ui.crosshair.style.setProperty('--guide-x',`${x}px`);ui.crosshair.style.setProperty('--guide-y',`${y}px`);ui.crosshair.classList.toggle('flip-x',x>r.width/2);ui.crosshair.classList.toggle('flip-y',y>r.height/2);ui['crosshair-coordinates'].textContent=`x: ${Math.round(p.x)}  y: ${Math.round(p.y)}`;ui.crosshair.hidden=false;}
  function showTool(){const current=effectiveTool();for(const name of ['select','pan','box','line','point','polygon','smart'])ui[`tool-${name}`].setAttribute('aria-pressed',String(current===name));ui.overlay.classList.toggle('select-mode',current==='select');ui.overlay.classList.toggle('pan-mode',current==='pan');if(current==='pan')hideCrosshair();else if(lastPointer)updateCrosshair({clientX:lastPointer.x,clientY:lastPointer.y});status(toolMessage[current]);}
  function chooseTool(next){if(next===tool)return;if(next==='pan'&&tool==='polygon'||next==='polygon'&&tool==='pan'&&polygonDraft){cancelDraft(true);}else closeDrawing();tool=next;if(polygonDraft)polygonDraft.cursor=null;render();showTool();}
  for(const name of ['select','pan','box','line','point','polygon','smart'])ui[`tool-${name}`].addEventListener('click',()=>chooseTool(name));
  function fitWidth(image){return Math.min(image.width,ui.drop.clientWidth-2,Math.max(100,window.innerHeight*.7)*image.width/image.height);}
  function updateZoom(){const image=active();ui['zoom-level'].textContent=image?`${Math.round((image.zoom||1)*100)}%`:'100%';for(const id of ['zoom-in','zoom-out','zoom-fit'])ui[id].disabled=!image;if(image){ui['image-wrap'].style.width=`${fitWidth(image)*(image.zoom||1)}px`;}}
  function zoomTo(value){hideCrosshair();lastPointer=null;const image=active();if(!image)return;const oldWidth=ui['image-wrap'].getBoundingClientRect().width,centerX=ui.drop.scrollLeft+ui.drop.clientWidth/2,centerY=ui.drop.scrollTop+ui.drop.clientHeight/2;image.zoom=clamp(value,.25,8);updateZoom();const ratio=ui['image-wrap'].getBoundingClientRect().width/oldWidth;if(Number.isFinite(ratio)){ui.drop.scrollLeft=centerX*ratio-ui.drop.clientWidth/2;ui.drop.scrollTop=centerY*ratio-ui.drop.clientHeight/2;}}
  ui['zoom-in'].addEventListener('click',()=>zoomTo((active()?.zoom||1)*1.25));ui['zoom-out'].addEventListener('click',()=>zoomTo((active()?.zoom||1)/1.25));ui['zoom-fit'].addEventListener('click',()=>{zoomTo(1);ui.drop.scrollTo(0,0);});
  new ResizeObserver(updateZoom).observe(ui.drop);
  function bindShape(element,image,b){element.addEventListener('pointerdown',e=>{if(tool!=='select'||e.button!==0)return;e.preventDefault();e.stopPropagation();if(image.selected!==b.id){image.selected=b.id;render();}startEdit(e,image,b,'move');});element.addEventListener('click',e=>{if(effectiveTool()==='select')e.stopPropagation();});}
  function addVertex(svg,image,b,part,x,y){const handle=document.createElementNS(svgNS,'circle');handle.classList.add('edit-vertex');handle.setAttribute('cx',x);handle.setAttribute('cy',y);handle.setAttribute('r',Math.max(6,9*image.width/ui.overlay.clientWidth));handle.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();startEdit(e,image,b,part);});svg.append(handle);}
  function startEdit(e,image,b,part){editDraft={pointer:e.pointerId,imageId:image.id,annotation:b,original:structuredClone(b),before:snapshot(image),part,start:point(e)};ui.overlay.setPointerCapture(e.pointerId);}
  function moveEdit(e){const edit=editDraft,image=active();if(!edit||e.pointerId!==edit.pointer||image?.id!==edit.imageId)return;const p=point(e),b=edit.annotation,o=edit.original,dx=Math.round(p.x-edit.start.x),dy=Math.round(p.y-edit.start.y),part=edit.part;
    if(part==='move'){if((b.type||'box')==='box'){b.x=clamp(o.x+dx,0,image.width-o.width);b.y=clamp(o.y+dy,0,image.height-o.height);}else if(b.type==='point'){b.x=clamp(o.x+dx,0,image.width);b.y=clamp(o.y+dy,0,image.height);}else{const vertices=b.type==='line'?[{x:o.x1,y:o.y1},{x:o.x2,y:o.y2}]:o.points;const minX=Math.min(...vertices.map(v=>v.x)),maxX=Math.max(...vertices.map(v=>v.x)),minY=Math.min(...vertices.map(v=>v.y)),maxY=Math.max(...vertices.map(v=>v.y));const shiftX=clamp(dx,-minX,image.width-maxX),shiftY=clamp(dy,-minY,image.height-maxY);if(b.type==='line'){b.x1=o.x1+shiftX;b.x2=o.x2+shiftX;b.y1=o.y1+shiftY;b.y2=o.y2+shiftY;}else b.points=o.points.map(v=>({x:v.x+shiftX,y:v.y+shiftY}));}}
    else if(b.type==='box'){const right=o.x+o.width,bottom=o.y+o.height;const left=part.includes('w')?clamp(Math.round(p.x),0,right-1):o.x,top=part.includes('n')?clamp(Math.round(p.y),0,bottom-1):o.y;b.x=left;b.y=top;b.width=(part.includes('e')?clamp(Math.round(p.x),o.x+1,image.width):right)-left;b.height=(part.includes('s')?clamp(Math.round(p.y),o.y+1,image.height):bottom)-top;}
    else if(b.type==='line'){const k=part==='line-start'?'1':'2';b[`x${k}`]=Math.round(p.x);b[`y${k}`]=Math.round(p.y);}
    else if(b.type==='polygon'&&part.startsWith('vertex-'))b.points[Number(part.slice(7))]={x:Math.round(p.x),y:Math.round(p.y)};
    render();
  }
  function render(){
    hideCrosshair();lastPointer=null;
    const image=active(),annotations=boxes(),selected=image?.selected,index=project.images.findIndex(item=>item.id===activeId);
    ui.empty.hidden=!!image;ui['image-wrap'].hidden=!image;
    if(image&&ui.image.dataset.imageId!==image.id){ui.image.src=image.url;ui.image.dataset.imageId=image.id;}
    if(!image){ui.image.removeAttribute('src');delete ui.image.dataset.imageId;}
    ui.meta.textContent=image?`${image.filename} · ${image.width} × ${image.height}`:'No image loaded';
    ui.position.textContent=image?`Image ${index+1} of ${project.images.length}`:'No images';
    ui.previous.disabled=index<=0;ui.next.disabled=index<0||index>=project.images.length-1;
    ui.count.textContent=`${annotations.length} ${annotations.length===1?'annotation':'annotations'}`;
    ui['image-count'].textContent=`${project.images.length} ${project.images.length===1?'image':'images'}`;
    const hasDataset=!!project.images.length;
    ui.json.disabled=ui['yolo-all'].disabled=ui['voc-all'].disabled=ui.coco.disabled=ui.vgg.disabled=ui.csv.disabled=ui.reset.disabled=!hasDataset;
    ui['json-current'].disabled=ui.yolo.disabled=ui['voc-current'].disabled=!image;
    ui['export-menu'].querySelector('.export-trigger').setAttribute('aria-disabled',String(!hasDataset));
    ui['export-menu'].querySelector('.export-trigger').tabIndex=hasDataset?0:-1;
    if(!hasDataset)ui['export-menu'].open=false;
    ui.clear.disabled=!annotations.length;ui.undo.disabled=!image?.history.length;
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
          const line=lineElement(b,isSelected);bindShape(line,image,b);svg.append(line);if(isSelected&&effectiveTool()==='select')for(const key of ['1','2'])addVertex(svg,image,b,key==='1'?'line-start':'line-end',b[`x${key}`],b[`y${key}`]);
          const label=document.createElement('div');label.className='line-label'+(isSelected?' selected':'');label.style.left=`${(b.x1+b.x2)/2/image.width*100}%`;label.style.top=`${(b.y1+b.y2)/2/image.height*100}%`;
          const tag=document.createElement('span');tag.className='tag';tag.textContent=b.label;label.append(tag);ui.overlay.append(label);
        }else if(type==='polygon'){
          const shape=document.createElementNS(svgNS,'polygon');shape.classList.add('annotation-polygon');if(isSelected)shape.classList.add('selected');shape.setAttribute('points',b.points.map(p=>`${p.x},${p.y}`).join(' '));
          bindShape(shape,image,b);svg.append(shape);if(isSelected&&effectiveTool()==='select')b.points.forEach((p,i)=>addVertex(svg,image,b,`vertex-${i}`,p.x,p.y));
          const center=b.points.reduce((sum,p)=>({x:sum.x+p.x,y:sum.y+p.y}),{x:0,y:0});
          const label=document.createElement('div');label.className='line-label'+(isSelected?' selected':'');label.style.left=`${center.x/b.points.length/image.width*100}%`;label.style.top=`${center.y/b.points.length/image.height*100}%`;
          const tag=document.createElement('span');tag.className='tag';tag.textContent=b.label;label.append(tag);ui.overlay.append(label);
        }else{
          const el=document.createElement('div');el.className=(type==='point'?'point-marker':'box')+(isSelected?' selected':'');
          el.style.left=`${b.x/image.width*100}%`;el.style.top=`${b.y/image.height*100}%`;
          if(type==='box'){el.style.width=`${b.width/image.width*100}%`;el.style.height=`${b.height/image.height*100}%`;}
          const tag=document.createElement('span');tag.className='tag';tag.textContent=b.label;el.append(tag);
          bindShape(el,image,b);ui.overlay.append(el);if(type==='box'&&isSelected&&effectiveTool()==='select')for(const corner of ['nw','ne','sw','se']){const handle=document.createElement('span');handle.className=`resize-handle ${corner}`;handle.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();startEdit(e,image,b,corner);});el.append(handle);}
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
    ai?.render();
  }
  function cancelDraft(keepPolygon=false){if(editDraft){Object.assign(editDraft.annotation,editDraft.original);editDraft=null;render();}panDraft=null;ui.overlay.classList.remove('panning');if(draft){try{ui.overlay.releasePointerCapture(draft.pointer);}catch{}draft=null;ui.overlay.querySelector('.draft')?.remove();}if(polygonDraft&&!keepPolygon){polygonDraft=null;ui.overlay.querySelector('.polygon-draft')?.remove();ui['finish-polygon'].disabled=true;}}
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
      resolve({id:crypto.randomUUID(),filename:file.name,file,size:file.size,width:probe.naturalWidth,height:probe.naturalHeight,url,annotations:[],selected:null,nextId:1,history:[]});};
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
  function requestLabel(type,shape){hideCrosshair();pending={imageId:activeId,type,shape};ui['new-label'].value=lastLabel;ui['new-description'].value='';ui['label-dialog'].showModal();ui['new-label'].focus();ui['new-label'].select();}
  ui.overlay.addEventListener('pointerdown',e=>{if(!active()||pending||e.button!==0||effectiveTool()==='select')return;e.preventDefault();if(effectiveTool()==='pan'){panDraft={pointer:e.pointerId,x:e.clientX,y:e.clientY,left:ui.drop.scrollLeft,top:ui.drop.scrollTop};ui.overlay.setPointerCapture(e.pointerId);ui.overlay.classList.add('panning');return;}const start=point(e);
    if(effectiveTool()==='smart'){ai?.click(start);return;}
    if(effectiveTool()==='polygon'){addPolygonVertex(start);return;}
    if(effectiveTool()==='point'){requestLabel('point',{x:Math.round(start.x),y:Math.round(start.y)});return;}
    draft={pointer:e.pointerId,start,end:start,imageId:activeId,type:effectiveTool()};ui.overlay.setPointerCapture(e.pointerId);drawDraft();});
  ui.overlay.addEventListener('pointermove',e=>{updateCrosshair(e);if(editDraft){moveEdit(e);return;}if(panDraft&&e.pointerId===panDraft.pointer){ui.drop.scrollLeft=panDraft.left+panDraft.x-e.clientX;ui.drop.scrollTop=panDraft.top+panDraft.y-e.clientY;return;}if(draft&&e.pointerId===draft.pointer){draft.end=point(e);drawDraft();}else if(polygonDraft&&effectiveTool()==='polygon'){polygonDraft.cursor=point(e);drawPolygonDraft();}});
  ui.overlay.addEventListener('pointerup',e=>{if(editDraft&&e.pointerId===editDraft.pointer){const edit=editDraft;editDraft=null;const image=active();if(image?.id===edit.imageId){recordUndo(image,edit.before);render();}return;}if(panDraft&&e.pointerId===panDraft.pointer){panDraft=null;ui.overlay.classList.remove('panning');return;}if(!draft||e.pointerId!==draft.pointer)return;const {start,imageId,type}=draft,end=point(e);cancelDraft();const image=active();if(!image||image.id!==imageId)return;
    if(type==='line'){
      const r=ui.overlay.getBoundingClientRect(),distance=Math.hypot((end.x-start.x)*r.width/image.width,(end.y-start.y)*r.height/image.height);
      if(distance<5){status('Line too short. Drag at least a few pixels.');return;}
      requestLabel('line',{x1:Math.round(start.x),y1:Math.round(start.y),x2:Math.round(end.x),y2:Math.round(end.y)});return;
    }
    const raw={x:Math.min(start.x,end.x),y:Math.min(start.y,end.y),width:Math.abs(end.x-start.x),height:Math.abs(end.y-start.y)};
    if(raw.width<Math.max(3,image.width*.003)||raw.height<Math.max(3,image.height*.003)){status('Box too small. Drag a larger rectangle.');return;}
    requestLabel('box',rounded(raw));});
  ui.overlay.addEventListener('pointerleave',()=>{hideCrosshair();lastPointer=null;});
  ui.overlay.addEventListener('pointercancel',()=>{hideCrosshair();lastPointer=null;cancelDraft();});
  ui['cancel-label'].addEventListener('click',()=>ui['label-dialog'].close('cancel'));
  ui['label-form'].addEventListener('submit',e=>{e.preventDefault();if(!ui['new-label'].value.trim()){ui['new-label'].setCustomValidity('Enter a class name.');ui['new-label'].reportValidity();return;}ui['label-dialog'].close('save');});
  ui['new-label'].addEventListener('input',()=>ui['new-label'].setCustomValidity(''));
  ui['new-label'].addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();ui['label-form'].requestSubmit();}});
  ui['label-dialog'].addEventListener('close',()=>{const label=ui['new-label'].value.trim(),image=active();
    if(ui['label-dialog'].returnValue==='save'&&label&&pending&&image?.id===pending.imageId){const before=snapshot(image),b={id:image.nextId++,type:pending.type,label,description:ui['new-description'].value.trim(),...pending.shape};lastLabel=label;image.annotations.push(b);image.selected=b.id;recordUndo(image,before);render();status(`Added “${label}”.`);}pending=null;});
  ui.rename.addEventListener('click',()=>{const image=active(),b=boxes().find(b=>b.id===image?.selected),label=ui['label-input'].value.trim();if(!b||!label){status('Enter a class name.');return;}const before=snapshot(image);b.label=label;b.description=ui['description-input'].value.trim();lastLabel=label;recordUndo(image,before);render();status('Annotation saved.');});
  ui['label-input'].addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();ui.rename.click();}});
  function removeSelected(){const image=active(),index=boxes().findIndex(b=>b.id===image?.selected);if(index<0)return;const before=snapshot(image);image.annotations.splice(index,1);image.selected=null;recordUndo(image,before);render();status('Annotation deleted.');}
  ui.delete.addEventListener('click',removeSelected);
  ui.undo.addEventListener('click',()=>{const image=active();if(!image?.history.length)return;cancelDraft();const before=image.history.pop();image.annotations=before.annotations;image.selected=before.selected;image.nextId=before.nextId;render();status('Last change undone.');});
  ui.clear.addEventListener('click',()=>{const image=active();if(!image?.annotations.length)return;if(!confirm('Clear all annotations for this image?'))return;const before=snapshot(image);image.annotations=[];image.selected=null;recordUndo(image,before);render();status('Annotations cleared for this image.');});
  ui.reset.addEventListener('click',()=>{if(project.images.some(item=>item.annotations.length)&&!confirm('Clear the entire dataset and all its annotations?'))return;
    closeDrawing();session++;for(const item of project.images)URL.revokeObjectURL(item.url);project.images=[];activeId=null;render();status('Dataset cleared.');});
  const typingTarget=element=>!!element?.closest?.('input, textarea, select, [contenteditable="true"], [role="textbox"]');
  function releaseTemporaryPan(){if(!spacePan)return;spacePan=false;if(panDraft){try{ui.overlay.releasePointerCapture(panDraft.pointer);}catch{}panDraft=null;ui.overlay.classList.remove('panning');}showTool();}
  document.addEventListener('keydown',e=>{
    if(e.isComposing||ui['label-dialog'].open||ui['export-dialog'].open||document.getElementById('ai-consent').open||typingTarget(e.target)||e.target.closest?.('#export-menu'))return;
    const key=e.key.toLowerCase();
    if((e.ctrlKey||e.metaKey)&&!e.altKey&&key==='z'){e.preventDefault();ui.undo.click();return;}
    if(e.ctrlKey||e.metaKey||e.altKey)return;
    if(e.code==='Space'){e.preventDefault();if(!e.repeat&&!spacePan){cancelDraft(true);if(polygonDraft){polygonDraft.cursor=null;drawPolygonDraft();}spacePan=true;showTool();}return;}
    if(key==='escape'){cancelDraft();if(effectiveTool()==='smart')ai?.cancel();return;}
    if(key==='enter'&&polygonDraft&&effectiveTool()==='polygon'&&!e.target.closest?.('button,a,[role="button"]')){e.preventDefault();finishPolygon();return;}
    if(key==='delete'||key==='backspace'){e.preventDefault();removeSelected();return;}
    const shortcuts={'1':'select','2':'box','3':'line','4':'point','5':'polygon',h:'pan'};
    if(shortcuts[key]){e.preventDefault();if(!e.repeat)chooseTool(shortcuts[key]);return;}
    if(key==='q'||key==='e'||key==='f'){if(!active())return;e.preventDefault();ui[key==='q'?'zoom-in':key==='e'?'zoom-out':'zoom-fit'].click();}
  });
  document.addEventListener('keyup',e=>{if(e.code==='Space')releaseTemporaryPan();});
  window.addEventListener('blur',()=>{hideCrosshair();lastPointer=null;releaseTemporaryPan();});
  const exportGroups=[...ui['export-menu'].querySelectorAll('.export-group')];
  const exportTrigger=ui['export-menu'].querySelector('.export-trigger');
  function closeExportMenu(){if(ui['export-menu'].contains(document.activeElement)&&document.activeElement!==exportTrigger)exportTrigger.focus();ui['export-menu'].open=false;exportGroups.forEach(group=>group.open=false);}
  exportTrigger.addEventListener('click',e=>{if(!project.images.length)e.preventDefault();});
  ui['export-menu'].addEventListener('toggle',e=>{if(e.target===ui['export-menu']&&!e.target.open)exportGroups.forEach(group=>group.open=false);},true);
  exportGroups.forEach(group=>{
    group.addEventListener('toggle',()=>{if(group.open)exportGroups.forEach(other=>{if(other!==group)other.open=false;});});
    group.addEventListener('mouseenter',()=>{if(window.matchMedia('(hover:hover) and (min-width:741px)').matches)group.open=true;});
    group.addEventListener('mouseleave',()=>{if(window.matchMedia('(hover:hover) and (min-width:741px)').matches)group.open=false;});
  });
  ui['export-menu'].addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeExportMenu();}});
  document.addEventListener('pointerdown',e=>{if(!ui['export-menu'].contains(e.target))closeExportMenu();});
  ui['export-menu'].querySelectorAll('.export-popover button').forEach(button=>button.addEventListener('click',closeExportMenu));
  function download(name,content,type){const blob=content instanceof Blob?content:new Blob([content],{type}),href=URL.createObjectURL(blob),link=document.createElement('a');link.href=href;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(href),60000);}
  const stem=image=>image.filename.replace(/\.[^.]+$/,'')||'image';
  const safeStem=image=>stem(image).replace(/[^a-z0-9_.-]/gi,'_').replace(/^\.+/,'').slice(0,70)||'image';
  const imageName=(image,index)=>`${String(index+1).padStart(3,'0')}-${safeStem(image)}${/\.(?:jpe?g|png|webp|avif|bmp)$/i.exec(image.filename)?.[0]||'.png'}`;
  const json=value=>JSON.stringify(value,null,2)+'\n';
  const imageMap=images=>({images:images.map((image,index)=>({original_filename:image.filename,exported_filename:imageName(image,index),width:image.width,height:image.height}))});
  const imageFiles=(images,folder)=>images.map((image,index)=>[`${folder}${imageName(image,index)}`,image.file]);
  const mapFile=images=>['image-map.json',json(imageMap(images))];
  const exported=(image,index)=>({filename:imageName(image,index),original_filename:image.filename,width:image.width,height:image.height,annotations:structuredClone(image.annotations)});
  const yoloLine=(b,image,classes)=>[classes.indexOf(b.label),(b.x+b.width/2)/image.width,(b.y+b.height/2)/image.height,b.width/image.width,b.height/image.height].map((n,i)=>i?clamp(n,0,1).toFixed(6):n).join(' ');
  const xmlText=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
  function vocXml(image,filename){
    const objects=image.annotations.filter(b=>(b.type||'box')==='box').map(b=>{
      const xmin=clamp(Math.round(b.x)+1,1,image.width),ymin=clamp(Math.round(b.y)+1,1,image.height);
      const xmax=clamp(Math.round(b.x+b.width),xmin,image.width),ymax=clamp(Math.round(b.y+b.height),ymin,image.height);
      return `  <object><name>${xmlText(b.label)}</name><pose>Unspecified</pose><truncated>0</truncated><difficult>0</difficult><bndbox><xmin>${xmin}</xmin><ymin>${ymin}</ymin><xmax>${xmax}</xmax><ymax>${ymax}</ymax></bndbox></object>`;
    });
    return `<?xml version="1.0" encoding="UTF-8"?>\n<annotation>\n  <filename>${xmlText(filename)}</filename>\n  <size><width>${image.width}</width><height>${image.height}</height><depth>3</depth></size>\n  <segmented>0</segmented>\n${objects.join('\n')}\n</annotation>\n`;
  }
  function cocoDataset(entries,allImages,splitName=''){
    const supported=allImages.flatMap(image=>image.annotations).filter(b=>['box','polygon'].includes(b.type||'box'));
    const names=[...new Set(supported.map(b=>b.label))],categories=names.map((name,i)=>({id:i+1,name,supercategory:''}));let nextId=1;
    const records=entries.map(({image,index})=>({id:index+1,file_name:`images/${splitName?splitName+'/':''}${imageName(image,index)}`,width:image.width,height:image.height}));
    const annotations=entries.flatMap(({image,index})=>image.annotations.flatMap(b=>{
      const type=b.type||'box';if(type!=='box'&&type!=='polygon')return[];
      let bbox,area,segmentation=[];
      if(type==='box'){bbox=[b.x,b.y,b.width,b.height];area=b.width*b.height;}
      else{const xs=b.points.map(p=>p.x),ys=b.points.map(p=>p.y),xmin=Math.min(...xs),ymin=Math.min(...ys);
        bbox=[xmin,ymin,Math.max(...xs)-xmin,Math.max(...ys)-ymin];
        area=Math.abs(b.points.reduce((sum,p,j)=>sum+p.x*b.points[(j+1)%b.points.length].y-p.y*b.points[(j+1)%b.points.length].x,0))/2;
        segmentation=[b.points.flatMap(p=>[p.x,p.y])];}
      return[{id:nextId++,image_id:index+1,category_id:names.indexOf(b.label)+1,bbox,area,iscrowd:0,segmentation}];
    }));
    return{info:{description:'Boundless export'},licenses:[],images:records,annotations,categories};
  }
  // Stable across repeated exports of the same page; duplicate filenames use distinct image IDs.
  function datasetSplit(images){
    const ordered=images.map((image,index)=>({image,index})).sort((a,b)=>{
      const hash=value=>{let h=2166136261;for(const char of value){h=Math.imul(h^char.charCodeAt(0),16777619);}return h>>>0;};
      return hash(a.image.id)-hash(b.image.id)||a.index-b.index;
    });
    const count=images.length,train=count<5?count:count<10?count-1:Math.round(count*.8);
    const val=count<5?0:count<10?1:Math.max(1,Math.round(count*.1));
    const groups={train:ordered.slice(0,train),val:ordered.slice(train,train+val),test:ordered.slice(train+val)};
    return groups;
  }
  const splitNames=['train','val','test'];
  function yoloYaml(classes,groups,split){
    const quoted=value=>JSON.stringify(value);
    const names=classes.map((name,index)=>`  ${index}: ${quoted(name)}`).join('\n');
    return `# Paths are relative to this data.yaml\n${split?'':'# Unsplit export: assign distinct train/val images before training.\n'}path: .\ntrain: images/${split?'train':''}\nval: images/${split?'val':'val'}\n${groups.test.length?'test: images/test\n':''}nc: ${classes.length}\nnames:\n${names||'  {}'}\n`;
  }
  function vggDataset(images){
    const data={};images.forEach((image,index)=>{
      const filename=imageName(image,index),size=image.size??image.file.size;
      const regions=image.annotations.map(b=>{
        const type=b.type||'box';let shape;
        if(type==='box')shape={name:'rect',x:b.x,y:b.y,width:b.width,height:b.height};
        else if(type==='point')shape={name:'point',cx:b.x,cy:b.y};
        else{const points=type==='line'?[{x:b.x1,y:b.y1},{x:b.x2,y:b.y2}]:b.points;shape={name:type==='line'?'polyline':'polygon',all_points_x:points.map(p=>p.x),all_points_y:points.map(p=>p.y)};}
        return{shape_attributes:shape,region_attributes:{label:b.label,description:b.description||''}};
      });
      data[`${filename}${size}`]={filename,size,regions,file_attributes:{original_filename:image.filename}};
    });return data;
  }
  const csvCell=value=>{let text=String(value??'');if(/^[=+@-]/.test(text))text="'"+text;return`"${text.replace(/"/g,'""')}"`;};
  function csvDataset(images){
    const columns=['image_index','image_filename','original_filename','image_width','image_height','annotation_id','type','label','description','x','y','width','height','x1','y1','x2','y2','points_json'];
    const rows=[columns.join(',')];images.forEach((image,index)=>{
      for(const b of image.annotations.length?image.annotations:[null]){
        const type=b?.type||'box',values=[index+1,imageName(image,index),image.filename,image.width,image.height,b?.id??'',b?type:'',b?.label??'',b?.description??'',b&&(type==='box'||type==='point')?b.x:'',b&&(type==='box'||type==='point')?b.y:'',type==='box'&&b?b.width:'',type==='box'&&b?b.height:'',type==='line'&&b?b.x1:'',type==='line'&&b?b.y1:'',type==='line'&&b?b.x2:'',type==='line'&&b?b.y2:'',type==='polygon'&&b?JSON.stringify(b.points):''];
        rows.push(values.map(csvCell).join(','));
      }
    });return'\ufeff'+rows.join('\r\n')+'\r\n';
  }
  function exportFiles(format,images,current,options={}){
    const {includeImages=true,includeMap=false,split=false}=options;
    const files=[],all=images.flatMap(image=>image.annotations),boxes=all.filter(b=>(b.type||'box')==='box');let included=all.length;
    const groups=split&&!current?datasetSplit(images):null;
    const entries=images.map((image,index)=>({image,index}));
    const folderFor=index=>groups?splitNames.find(name=>groups[name].some(entry=>entry.index===index))+'/':'';
    const addImages=folder=>{if(includeImages)entries.forEach(({image,index})=>files.push([`${folder}${format==='yolo'||format==='coco'?folderFor(index):''}${imageName(image,index)}`,image.file]));else if(folder)files.push([folder,'']);if(groups&&(format==='yolo'||format==='coco')&&folder)for(const name of splitNames)files.push([`${folder}${name}/`,'']);if(format==='yolo'&&!groups)files.push(['images/val/','']);};
    if(format==='yolo'){
      const classes=[...new Set(boxes.map(b=>b.label))];included=boxes.length;
      entries.forEach(({image,index})=>{const lines=image.annotations.filter(b=>(b.type||'box')==='box').map(b=>yoloLine(b,image,classes));files.push([`labels/${folderFor(index)}${imageName(image,index).replace(/\.[^.]+$/,'.txt')}`,lines.join('\n')+(lines.length?'\n':'')]);});
      if(groups)for(const name of splitNames)files.push([`labels/${name}/`,'']);
      files.push(['classes.txt',classes.join('\n')+(classes.length?'\n':'')],['data.yaml',yoloYaml(classes,groups||{train:entries,val:[],test:[]},!!groups)]);addImages('images/');
    }else if(format==='voc'){
      included=boxes.length;
      entries.forEach(({image,index})=>files.push([`Annotations/${imageName(image,index).replace(/\.[^.]+$/,'.xml')}`,vocXml(image,imageName(image,index))]));
      if(groups)for(const name of splitNames)files.push([`ImageSets/Main/${name}.txt`,groups[name].map(({image,index})=>imageName(image,index).replace(/\.[^.]+$/,'')).join('\n')+(groups[name].length?'\n':'')]);
      addImages('JPEGImages/');
    }else if(format==='coco'){
      included=all.filter(b=>['box','polygon'].includes(b.type||'box')).length;
      if(groups){for(const name of splitNames)if(groups[name].length)files.push([`annotations/instances_${name}.json`,json(cocoDataset(groups[name],images,name))]);}
      else files.push(['annotations/instances.json',json(cocoDataset(entries,images))]);
      addImages('images/');
    }else if(format==='vgg'){files.push(['via_region_data.json',json(vggDataset(images))]);addImages('');}
    else if(format==='csv'){files.push(['labels.csv',csvDataset(images)]);addImages('images/');}
    else if(format==='json'){
      const data=current?{image:{filename:imageName(images[0],0),original_filename:images[0].filename,width:images[0].width,height:images[0].height},annotations:structuredClone(images[0].annotations)}:{images:images.map(exported)};
      files.push(['boundless.json',json(data)]);addImages('images/');
    }
    if(groups){
      // CSV, VGG, Boundless, and VOC keep their native data layout; this manifest assigns images to splits.
      files.push(['splits.json',json(Object.fromEntries(splitNames.map(name=>[name,groups[name].map(({image,index})=>imageName(image,index))])))]);
    }
    if(includeMap)files.push(mapFile(images));
    return{files,included,total:all.length,groups};
  }
  // Store entries without compression: image bytes stay unchanged. ZIP32 cannot hold 4 GiB files.
  async function zipFiles(files){const encoder=new TextEncoder(),parts=[],directory=[];let offset=0;
    const table=Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
    const crc32=data=>{let c=0xffffffff;for(const byte of data)c=table[(c^byte)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
    if(files.length>65535)throw new Error('Too many files for one ZIP.');
    for(const [filename,content] of files){const name=encoder.encode(filename),data=typeof content==='string'?encoder.encode(content):new Uint8Array(await content.arrayBuffer());
      if(data.length>=0xffffffff||offset+30+name.length+data.length>=0xffffffff)throw new Error('Dataset too large for a browser ZIP (4 GB limit).');
      const crc=crc32(data),local=new Uint8Array(30+name.length),lv=new DataView(local.buffer);lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0x0800,true);lv.setUint32(14,crc,true);lv.setUint32(18,data.length,true);lv.setUint32(22,data.length,true);lv.setUint16(26,name.length,true);local.set(name,30);parts.push(local,data);
      const central=new Uint8Array(46+name.length),cv=new DataView(central.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x0800,true);cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);central.set(name,46);directory.push(central);offset+=local.length+data.length;}
    const size=directory.reduce((sum,entry)=>sum+entry.length,0);if(offset+size>=0xffffffff)throw new Error('Dataset too large for a browser ZIP (4 GB limit).');
    const end=new Uint8Array(22),view=new DataView(end.buffer);view.setUint32(0,0x06054b50,true);view.setUint16(8,files.length,true);view.setUint16(10,files.length,true);view.setUint32(12,size,true);view.setUint32(16,offset,true);return new Blob([...parts,...directory,end],{type:'application/zip'});
  }
  const exportDefaults={yolo:'boundless-yolo',voc:'boundless-voc',coco:'boundless-coco',vgg:'boundless-vgg',csv:'boundless-csv',json:'boundless-dataset'};
  let exportRequest=null,exportBusy=false;
  function announceExport(format,included,total){const skipped=total-included;status(`Exported ${format}: ${included} ${included===1?'annotation':'annotations'}${skipped?`; skipped ${skipped} unsupported ${skipped===1?'shape':'shapes'}`:''}.`);}
  const exportOptions=()=>({includeImages:ui['include-images'].checked,includeMap:ui['include-map'].checked,split:ui['split-dataset'].checked});
  function updateExportDetails(){if(!exportRequest)return;const {format,images,current}=exportRequest;
    const {files,groups}=exportFiles(format,images,current,exportOptions()),encoder=new TextEncoder();
    // This ZIP uses stored entries, so every byte and header is known before packaging.
    const size=files.reduce((sum,[name,content])=>sum+(typeof content==='string'?encoder.encode(content).length:content.size)+76+2*encoder.encode(name).length,22);
    const display=size<1024?`${size} B`:size<1048576?`${(size/1024).toFixed(1)} KiB`:`${(size/1048576).toFixed(2)} MiB`;
    const count=groups?`Train ${groups.train.length} · Val ${groups.val.length} · Test ${groups.test.length}. `:'';
    const warning=groups&&groups.val.length===0?'No validation images: add more images before YOLO training. ':groups&&groups.val.length===1?'One validation image gives an unreliable evaluation. ':'';
    ui['export-details'].textContent=`${images.length} ${images.length===1?'image':'images'}. ${count}Estimated ZIP size: ${display} (stored without compression). ${warning}${!ui['include-images'].checked?'Image references remain, but image files are omitted. ':''}Only the outer ZIP is renamed.`;
  }
  function openExport(format,current){const images=current?[active()].filter(Boolean):[...project.images];if(!images.length)return;
    exportRequest={format,images,current};ui['split-choice'].hidden=current;
    ui['include-images'].checked=true;ui['include-map'].checked=false;ui['split-dataset'].checked=false;
    ui['export-name'].value=current?`${safeStem(images[0])}-${format}`:exportDefaults[format];
    updateExportDetails();
    ui['export-dialog'].showModal();ui['export-name'].focus();ui['export-name'].select();
  }
  for(const key of ['include-images','include-map','split-dataset'])ui[key].addEventListener('change',updateExportDetails);
  for(const [id,format,current] of [['yolo','yolo',true],['yolo-all','yolo',false],['voc-current','voc',true],['voc-all','voc',false],['coco','coco',false],['vgg','vgg',false],['csv','csv',false],['json-current','json',true],['json','json',false]])ui[id].addEventListener('click',()=>openExport(format,current));
  ui['cancel-export'].addEventListener('click',()=>ui['export-dialog'].close());
  ui['export-dialog'].addEventListener('close',()=>{exportRequest=null;});
  ui['export-form'].addEventListener('submit',async e=>{e.preventDefault();if(exportBusy||!exportRequest)return;
    let name=ui['export-name'].value.trim().replace(/\.zip$/i,'').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').replace(/[. ]+$/,'');
    if(!name){ui['export-name'].setCustomValidity('Enter a filename.');ui['export-name'].reportValidity();return;}
    const {format,images,current}=exportRequest;exportBusy=true;ui['confirm-export'].disabled=true;status('Packaging images and annotations locally…');
    try{const {files,included,total}=exportFiles(format,images,current,exportOptions()),blob=await zipFiles(files);download(`${name}.zip`,blob,'application/zip');ui['export-dialog'].close();announceExport(format.toUpperCase(),included,total);}
    catch(error){status(`Export failed: ${error.message}`);}
    finally{exportBusy=false;ui['confirm-export'].disabled=false;}
  });
  ui['export-name'].addEventListener('input',()=>ui['export-name'].setCustomValidity(''));
  import('./ai/controller.js').then(({createAIController})=>{ai=createAIController({active,lastLabel:()=>lastLabel,chooseTool,tool:effectiveTool,
    commit(imageId,shapes){const image=project.images.find(item=>item.id===imageId);if(!image)return;
      const before=snapshot(image);for(const shape of shapes)image.annotations.push({...shape,id:image.nextId++});
      image.selected=image.annotations.at(-1)?.id;lastLabel=shapes.at(-1)?.label||lastLabel;recordUndo(image,before);render();
    }
  });ai.render();}).catch(()=>{document.getElementById('ai-message').textContent='AI needs an HTTP/HTTPS page and a browser with module support. Manual annotation remains available.';});
  render();
})();
