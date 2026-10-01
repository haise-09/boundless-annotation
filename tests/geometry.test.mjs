import assert from 'node:assert/strict';
import {detectionBox} from '../ai/geometry.js';

assert.deepEqual(detectionBox({box:{xmin:10,ymin:20,xmax:40,ymax:60},label:'dog',score:.9},{width:100,height:100},{width:2000,height:1000}),{type:'box',label:'dog',score:.9,x:200,y:200,width:600,height:400});
assert.equal(detectionBox({box:{xmin:NaN,ymin:0,xmax:4,ymax:4},score:1},{width:10,height:10},{width:10,height:10}),null);
assert.equal(detectionBox({box:{xmin:4,ymin:4,xmax:3,ymax:3},score:1},{width:10,height:10},{width:10,height:10}),null);
console.log('Geometry: original-resolution scaling and invalid boxes passed.');
