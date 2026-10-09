import assert from 'node:assert/strict';
import {groundedResults} from '../ai/grounding.js';
const logit=p=>Math.log(p/(1-p));
const tensor=data=>({tolist:()=>data});
let calls=0;
const tokenizer={all_special_ids:[101,102,0],decode(tokens){assert(tokens.length&&tokens.every(Number.isInteger));calls++;return tokens.map(id=>({5:'car',6:'.',7:'bus'}[id]||'')).join(' ');}};
const ids=tensor([[101n,5n,6n,102n]]);
function run(rows,input=ids){return groundedResults({logits:tensor([rows.map(row=>row.map(logit))]),pred_boxes:tensor([rows.map(()=>[.5,.5,.4,.2])])},input,tokenizer,{width:1000,height:500});}
// A .2 box passes .1, but no text token passes .25. Previously decode([]) threw.
assert.deepEqual(run([[.01,.2,.01,.01]]),[]);assert.equal(calls,0);
// One weak candidate cannot discard a strong detection in the same image.
let out=run([[.01,.2,.01,.01],[.01,.9,.01,.01]]);assert.equal(out.length,1);assert.equal(out[0].label,'car');assert.deepEqual(out[0].box,{xmin:300,ymin:200,xmax:700,ymax:300});
// Special-only, padded and punctuation-only candidates are not labels.
assert.deepEqual(run([[.9,.01,.01,.9],[.01,.01,.01,.01,.95],[.01,.01,.9,.01]]),[]);
assert.deepEqual(run([[.01,.9,.01,.01]],tensor([[101n,undefined,6n,102n]])),[]);
out=run([[.01,.8,.01,.7,.01,.01]],tensor([[101n,5n,6n,7n,6n,102n]]));assert.equal(out[0].label,'car bus');
console.log('Grounding labels: weak/empty/special/padded tokens skipped; valid labels and original-scale geometry preserved.');
