// Grounding DINO may propose boxes without any usable label tokens. Skip those
// candidates before decoding: Transformers.js 3.3.3 batch_decode rejects [].
export function groundedResults(outputs,inputIds,tokenizer,{width,height,boxThreshold=0.1,textThreshold=0.25}){
  const logits=outputs.logits.tolist()[0],boxes=outputs.pred_boxes.tolist()[0];
  const ids=inputIds.tolist()[0],special=new Set((tokenizer.all_special_ids||[]).map(Number));
  const results=[];
  for(let query=0;query<logits.length;query++){
    const probabilities=logits[query].map(value=>1/(1+Math.exp(-value)));
    const score=Math.max(...probabilities);
    if(!Number.isFinite(score)||score<=boxThreshold)continue;
    const tokens=[];
    // Exclude CLS/SEP, special tokens, and padding beyond the actual prompt.
    for(let i=1;i<ids.length-1;i++){
      const id=Number(ids[i]);
      if(probabilities[i]>textThreshold&&Number.isSafeInteger(id)&&!special.has(id))tokens.push(id);
    }
    if(!tokens.length)continue;
    const label=tokenizer.decode(tokens,{skip_special_tokens:true}).trim();
    if(!label||!/[\p{L}\p{N}]/u.test(label))continue;
    const [cx,cy,w,h]=boxes[query];
    results.push({label,score,box:{xmin:(cx-w/2)*width,ymin:(cy-h/2)*height,xmax:(cx+w/2)*width,ymax:(cy+h/2)*height}});
  }
  return results;
}
