// Development only: TEST_URL and CHROME_PATH follow the other browser tests.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
function unzip(buffer){const files={};let offset=0;while(buffer.readUInt32LE(offset)===0x04034b50){const size=buffer.readUInt32LE(offset+18),n=buffer.readUInt16LE(offset+26),extra=buffer.readUInt16LE(offset+28),start=offset+30+n+extra;files[buffer.subarray(offset+30,offset+30+n).toString()]=buffer.subarray(start,start+size);offset=start+size;}return files;}
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{for(const mobile of [false,true]){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},hasTouch:mobile});const errors=[],remote=[];const base=process.env.TEST_URL||'http://localhost:8765';
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(base))remote.push(r.url());});
 await page.route('**/app.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('  render();\n})();','  window.__test={project,render};\n  render();\n})();')});});
 await page.goto(base);
 for(const format of ['coco','vgg','csv'])assert(await page.locator('#'+format+'-current').isDisabled());
 const buffer=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=100;c.height=80;return c.toDataURL().split(',')[1]}),'base64');
 await page.locator('#file').setInputFiles([0,1].map(()=>({name:'duplicate.png',mimeType:'image/png',buffer})));
 await page.waitForFunction(()=>__test.project.images.length===2);
 await page.evaluate(()=>{__test.project.images.forEach((image,i)=>image.annotations.push({id:1,type:'box',label:i?'second-label':'first-label',x:10,y:10,width:20,height:20}));__test.render()});
 await page.locator('#next').click();
 for(const format of ['coco','vgg','csv'])for(const current of [true,false]){
 await page.locator('#export-menu > summary').click();
 const summary=page.locator('.export-group').filter({has:page.locator('#'+format)}).locator('summary');
 if(mobile)await summary.tap();else await summary.hover();
 await page.locator('#'+format+(current?'-current':'')).click();
 assert.equal(await page.locator('#split-choice').isVisible(),!current);
 assert.match(await page.locator('#export-details').textContent(),current?/^1 image\./:/^2 images\./);
 await page.locator('#export-name').fill('scope-test');
 const pending=page.waitForEvent('download');await page.locator('#confirm-export').click();const download=await pending;
 assert.equal(download.suggestedFilename(),'scope-test.zip');const files=unzip(await fs.readFile(await download.path()));
 const images=Object.keys(files).filter(n=>n.endsWith('.png'));assert.equal(images.length,current?1:2);assert.equal(new Set(images).size,images.length);
 const data=files[format==='coco'?'annotations/instances.json':format==='vgg'?'via_region_data.json':'labels.csv'].toString();assert(data.includes('second-label'));assert.equal(data.includes('first-label'),!current);
 if(format==='coco'){const doc=JSON.parse(data);assert.equal(doc.images.length,current?1:2);for(const image of doc.images)assert(files[image.file_name]);for(const a of doc.annotations)assert(doc.images.some(i=>i.id===a.image_id));}
 if(format==='vgg')for(const image of Object.values(JSON.parse(data)))assert(files[image.filename]);
 }
 assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);await page.close();
 }console.log('PASS: COCO/VGG/CSV current and dataset ZIPs, duplicate filenames, desktop/touch menus, image references, no external requests.');}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
