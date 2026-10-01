// Model-independent conversion. All returned coordinates use original image pixels.
export function detectionBox(result, source, target) {
  const b=result.box, sx=target.width/source.width, sy=target.height/source.height;
  const clamp=(v,max)=>Math.max(0,Math.min(max,Math.round(v)));
  const x=clamp(b.xmin*sx,target.width),y=clamp(b.ymin*sy,target.height);
  const right=clamp(b.xmax*sx,target.width),bottom=clamp(b.ymax*sy,target.height);
  if (![x,y,right,bottom,result.score].every(Number.isFinite)||right-x<2||bottom-y<2) return null;
  return {type:'box',label:String(result.label),score:result.score,x,y,width:right-x,height:bottom-y};
}
