// Model-independent review rules. Never delete or replace accepted annotations.
export function overlapRatio(a,b){
  const intersection=Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
  return intersection/Math.max(1,a.width*a.height+b.width*b.height-intersection);
}
export function isLikelyDuplicate(s,annotations){
  return annotations.some(a=>(a.type||'box')==='box'&&a.label.trim().toLowerCase()===s.label.trim().toLowerCase()&&overlapRatio(s,a)>=.8);
}
export function normalizeSuggestions(items,image){
  return (Array.isArray(items)?items:[]).filter(s=>s&&s.type==='box'&&typeof s.label==='string'&&s.label.trim()&&[s.x,s.y,s.width,s.height,s.score].every(Number.isFinite)&&s.width>0&&s.height>0&&s.score>=0&&s.score<=1).map(s=>{
    const x=Math.max(0,Math.min(image.width,s.x)),y=Math.max(0,Math.min(image.height,s.y));
    return {type:'box',label:s.label.trim(),score:s.score,x,y,width:Math.max(0,Math.min(image.width,s.x+s.width)-x),height:Math.max(0,Math.min(image.height,s.y+s.height)-y),choice:null};
  }).filter(s=>s.width>0&&s.height>0);
}
