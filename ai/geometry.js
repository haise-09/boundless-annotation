// Model-independent conversion. All returned coordinates use original image pixels.
export function detectionBox(result, source, target) {
  const b=result.box, sx=target.width/source.width, sy=target.height/source.height;
  const clamp=(v,max)=>Math.max(0,Math.min(max,Math.round(v)));
  const x=clamp(b.xmin*sx,target.width),y=clamp(b.ymin*sy,target.height);
  const right=clamp(b.xmax*sx,target.width),bottom=clamp(b.ymax*sy,target.height);
  if (![x,y,right,bottom,result.score].every(Number.isFinite)||right-x<2||bottom-y<2) return null;
  return {type:'box',label:String(result.label),score:result.score,x,y,width:right-x,height:bottom-y};
}

const area=points=>points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p.x*q.y-q.x*p.y;},0)/2;
function simplify(points,tolerance) {
  if(points.length<4)return points;
  const kept=new Set([0,points.length-1]),stack=[[0,points.length-1]];
  while(stack.length){const [a,b]=stack.pop(),p=points[a],q=points[b],dx=q.x-p.x,dy=q.y-p.y,d=dx*dx+dy*dy;let far=-1,max=tolerance*tolerance;
    for(let i=a+1;i<b;i++){const r=points[i],t=d?Math.max(0,Math.min(1,((r.x-p.x)*dx+(r.y-p.y)*dy)/d)):0;const dist=(r.x-p.x-t*dx)**2+(r.y-p.y-t*dy)**2;if(dist>max){max=dist;far=i;}}
    if(far>=0){kept.add(far);stack.push([a,far],[far,b]);}
  }
  return [...kept].sort((a,b)=>a-b).map(i=>points[i]);
}

export function maskToPolygon(data,width,height,target) {
  // Trace directed grid edges. Outer contours have positive area; holes have negative area.
  const edges=new Map(),stride=width+1;
  const add=(x,y,nx,ny)=>{const key=y*stride+x;if(!edges.has(key))edges.set(key,[]);edges.get(key).push(ny*stride+nx);};
  const on=(x,y)=>x>=0&&y>=0&&x<width&&y<height&&data[y*width+x]>0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(on(x,y)){
    if(!on(x,y-1))add(x,y,x+1,y);
    if(!on(x+1,y))add(x+1,y,x+1,y+1);
    if(!on(x,y+1))add(x+1,y+1,x,y+1);
    if(!on(x-1,y))add(x,y+1,x,y);
  }
  const loops=[];
  const direction=(a,b)=>b-a===1?0:b-a===stride?1:b-a===-1?2:3;
  while(edges.size){const first=edges.keys().next().value,loop=[];let key=first,previous=null;
    do{loop.push({x:key%stride,y:Math.floor(key/stride)});const next=edges.get(key);if(!next?.length)break;
      // At diagonally touching pixels, turn right to keep separate outer contours.
      if(previous!==null&&next.length>1){const incoming=direction(previous,key),rank=[1,0,3,2];next.sort((a,b)=>rank.indexOf((direction(key,b)-incoming+4)%4)-rank.indexOf((direction(key,a)-incoming+4)%4));}
      const value=next.pop();if(!next.length)edges.delete(key);previous=key;key=value;
    }while(key!==first);
    if(loop.length>=3)loops.push({points:loop,area:area(loop)});
  }
  const outer=loops.filter(loop=>loop.area>0).sort((a,b)=>b.area-a.area);
  if(!outer.length||outer[0].area<9)throw new Error('No usable outline found. Try another point.');
  const contour=outer[0].points;
  let far=1;for(let i=2;i<contour.length;i++)if((contour[i].x-contour[0].x)**2+(contour[i].y-contour[0].y)**2>(contour[far].x-contour[0].x)**2+(contour[far].y-contour[0].y)**2)far=i;
  let points,tolerance=1.5;
  do{points=[...simplify(contour.slice(0,far+1),tolerance).slice(0,-1),...simplify([...contour.slice(far),contour[0]],tolerance).slice(0,-1)];tolerance*=1.5;}while(points.length>200);
  points=points.map(p=>({x:Math.round(p.x*target.width/width),y:Math.round(p.y*target.height/height)}));
  points=points.filter((p,i)=>p.x!==points[(i+points.length-1)%points.length].x||p.y!==points[(i+points.length-1)%points.length].y);
  if(points.length<3||Math.abs(area(points))<4)throw new Error('Selection is too small. Try another point.');
  return {type:'polygon',points,warning:outer.length>1||loops.some(loop=>loop.area<0)?'Only the largest outer outline is kept; holes are filled. Review the preview.':''};
}
