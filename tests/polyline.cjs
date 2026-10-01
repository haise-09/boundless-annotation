// Development only: run against a local static server with Playwright installed.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.TEST_URL||'http://localhost:8765';
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  const errors=[],remote=[];
  async function setup(options={}){
    const context=await browser.newContext({viewport:{width:1440,height:1100},...options});
    const page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',r=>{if(!r.url().startsWith(base))remote.push(r.url());});
    page.on('dialog',d=>d.accept());
    await page.route('**/app.js',async route=>{
      const response=await route.fetch(),source=await response.text();
      // Test hook only in the intercepted response, never shipped in app.js.
      const hook=`  window.__test={active,project,exportFiles,render,draft:()=>pathDraft,tool:effectiveTool};\n  render();\n})();`;
      assert(source.endsWith('  render();\n})();\n'));
      await route.fulfill({response,body:source.replace('  render();\n})();',hook)});
    });
    await page.goto(base);
    const buffer=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1200;c.height=800;const g=c.getContext('2d');g.fillStyle='#344d60';g.fillRect(0,0,1200,800);return c.toDataURL().split(',')[1];}),'base64');
    await page.locator('#file').setInputFiles([{name:'same.png',mimeType:'image/png',buffer},{name:'same.png',mimeType:'image/png',buffer}]);
    await page.waitForFunction(()=>window.__test.active()?.width===1200);
    return page;
  }
  const annotations=p=>p.evaluate(()=>structuredClone(window.__test.active().annotations));
  async function position(page,x,y){await page.locator('#overlay').scrollIntoViewIfNeeded();const b=await page.locator('#overlay').boundingBox();return{x:b.x+x*b.width/1200,y:b.y+y*b.height/800};}
  async function click(page,x,y,touch=false){const p=await position(page,x,y);if(touch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);}
  async function drag(page,x,y,tx,ty){const a=await position(page,x,y),b=await position(page,tx,ty);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:5});await page.mouse.up();}
  async function label(page,text){const n=(await annotations(page)).length;await page.locator('#new-label').fill(text);await page.locator('#new-label').press('Enter');await page.waitForFunction(n=>window.__test.active().annotations.length===n+1,n);}
  async function undo(page){await page.locator('#undo').click();}
  const page=await setup();
  await page.keyboard.press('3');assert.equal(await page.locator('#tool-polyline').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#finish-polyline').isVisible(),true);assert.equal(await page.locator('#finish-polygon').isVisible(),false);
  await click(page,120,160);await click(page,121,160); // Ignore an accidental nearby duplicate.
  assert.equal(await page.evaluate(()=>__test.draft().points.length),1);
  await page.keyboard.press('Enter');assert.equal(await page.locator('#label-dialog').isVisible(),false);
  await click(page,600,320);await page.keyboard.press('Enter');await label(page,'road');
  const original=(await annotations(page))[0];assert.equal(original.type,'polyline');assert.deepEqual(original.points,[{x:120,y:160},{x:600,y:320}]);
  assert.equal(await page.locator('polyline.annotation-polyline').count(),1);
  assert.equal(await page.locator('polyline.annotation-polyline').evaluate(el=>getComputedStyle(el).fill),'none');
  // Edit whole path and one vertex, with independent undo transactions.
  await page.keyboard.press('1');await drag(page,360,240,420,280);
  assert.deepEqual((await annotations(page))[0].points,[{x:180,y:200},{x:660,y:360}]);await undo(page);assert.deepEqual((await annotations(page))[0],original);
  await drag(page,120,160,150,200);assert.deepEqual((await annotations(page))[0].points[0],{x:150,y:200});await undo(page);
  await page.keyboard.down('Space');await drag(page,120,160,170,200);await page.keyboard.up('Space');assert.deepEqual((await annotations(page))[0],original);
  await page.locator('#label-input').fill('renamed');await page.locator('#label-input').press('Enter');assert.equal((await annotations(page))[0].label,'renamed');await undo(page);
  await page.keyboard.press('Delete');assert.equal((await annotations(page)).length,0);await undo(page);assert.deepEqual((await annotations(page))[0],original);
  // Draft vertices survive both temporary pan and explicit Pan/tool navigation.
  await page.keyboard.press('3');await click(page,200,400);await click(page,500,500);
  const pending=await page.evaluate(()=>__test.draft().points);
  await page.keyboard.down('Space');await drag(page,900,600,950,650);await page.keyboard.up('Space');assert.deepEqual(await page.evaluate(()=>__test.draft().points),pending);
  await page.keyboard.press('h');assert.equal(await page.locator('#finish-polyline').isDisabled(),true);await page.keyboard.press('3');assert.deepEqual(await page.evaluate(()=>__test.draft().points),pending);
  await click(page,800,400);await page.locator('#finish-polyline').click();await label(page,'three vertices');assert.equal((await annotations(page))[1].points.length,3);
  await click(page,200,500);await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>__test.draft()),null);
  await click(page,200,500);await page.keyboard.press('2');assert.equal(await page.evaluate(()=>__test.draft()),null);
  // Manual box and point still work, including drawing inside an existing shape.
  await drag(page,100,100,900,650);await label(page,'box');
  await page.keyboard.press('4');await click(page,1000,650);await label(page,'point');
  await page.keyboard.press('3');await click(page,250,250);await click(page,600,250);await click(page,450,500);await click(page,250,250);
  assert.equal(await page.locator('#label-dialog').isVisible(),false);assert.equal(await page.evaluate(()=>__test.draft().points.length),4);await page.keyboard.press('Escape');
  // Polygon retains its original click-first-vertex completion behavior.
  await page.keyboard.press('5');await click(page,250,250);await click(page,600,250);await click(page,450,500);await click(page,250,250);await label(page,'polygon');
  const beforeSwitch=await annotations(page);
  await page.keyboard.press('3');await click(page,1000,700);await page.locator('#next').click();assert.equal(await page.evaluate(()=>__test.draft()),null);assert.equal((await annotations(page)).length,0);
  await click(page,120,160);await click(page,500,500);await page.locator('#finish-polyline').click();await label(page,'other image');
  await page.locator('#previous').click();assert.deepEqual(await annotations(page),beforeSwitch);
  await page.locator('#clear').click();assert.equal((await annotations(page)).length,0);await undo(page);assert.deepEqual(await annotations(page),beforeSwitch);
  // Compatibility fixture for an old line, without changing its stored geometry.
  await page.evaluate(()=>{const image=__test.active();image.annotations.push({id:image.nextId++,type:'line',label:'legacy',description:'',x1:900,y1:100,x2:1100,y2:100});__test.render();});
  await page.keyboard.press('1');await drag(page,1000,100,1000,150);assert.equal((await annotations(page)).at(-1).y1,150);await undo(page);assert.equal((await annotations(page)).at(-1).y1,100);
  await page.setViewportSize({width:1000,height:900});await page.locator('#zoom-in').click();await page.locator('#zoom-fit').click();
  assert.deepEqual((await annotations(page))[0],original);
  assert.equal(await page.locator('polyline.annotation-polyline').first().getAttribute('points'),'120,160 600,320');
  // Exports retain open paths only in formats that represent them.
  const exports=await page.evaluate(()=>Object.fromEntries(['json','vgg','csv','coco','yolo','voc'].map(format=>{const result=__test.exportFiles(format,__test.project.images,false,{includeImages:false});return[format,{included:result.included,total:result.total,files:Object.fromEntries(result.files)}];})));
  const native=JSON.parse(exports.json.files['boundless.json']);assert.deepEqual(native.images[0].annotations[0],original);assert.equal(native.images[1].annotations[0].label,'other image');
  const regions=Object.values(JSON.parse(exports.vgg.files['via_region_data.json']))[0].regions;
  assert.equal(regions[0].shape_attributes.name,'polyline');assert.deepEqual(regions[0].shape_attributes.all_points_x,[120,600]);assert.equal(regions.at(-1).shape_attributes.name,'polyline');
  assert.match(exports.csv.files['labels.csv'],/"polyline","road"/);assert(exports.csv.files['labels.csv'].includes('""x"":120'));
  assert.equal(exports.coco.included,2);assert.equal(exports.yolo.included,1);assert.equal(exports.voc.included,1);
  assert.equal(JSON.parse(exports.coco.files['annotations/instances.json']).annotations.length,2);
  assert.equal(exports.yolo.files['labels/002-same.txt'],'');
  assert.equal(exports.voc.files['Annotations/002-same.xml'].includes('<object>'),false);
  // CVAT XML 1.1: every shape, image/label references, attributes and ZIP layout.
  const cvat=await page.evaluate(()=>{
    const image=__test.active();image.annotations[0].label='road & <edge> "測試"';image.annotations[0].description='note & <tag>\\nsecond line';
    const result=__test.exportFiles('cvat',__test.project.images,false,{includeImages:true,includeMap:true,split:true});
    const text=result.files.find(([name])=>name==='annotations.xml')[1],doc=new DOMParser().parseFromString(text,'application/xml');
    return {error:!!doc.querySelector('parsererror'),version:doc.querySelector('version').textContent,mode:doc.querySelector('mode').textContent,
      names:result.files.map(([name])=>name),xml:text,images:[...doc.querySelectorAll('image')].map(el=>({id:el.getAttribute('id'),name:el.getAttribute('name'),width:el.getAttribute('width'),shapes:[...el.children].map(shape=>({type:shape.tagName,label:shape.getAttribute('label'),points:shape.getAttribute('points'),xtl:shape.getAttribute('xtl'),xbr:shape.getAttribute('xbr'),description:shape.querySelector('attribute')?.textContent}))})),labels:[...doc.querySelectorAll('labels > label > name')].map(el=>el.textContent),included:result.included,total:result.total};
  });
  assert.equal(cvat.error,false);assert.equal(cvat.version,'1.1');assert.equal(cvat.mode,'annotation');assert.equal(cvat.included,cvat.total);
  assert(cvat.names.includes('annotations.xml'));assert(cvat.names.includes('image-map.json'));assert(cvat.names.includes('splits.json'));
  for(const image of cvat.images){assert(cvat.names.includes('images/'+image.name));assert.equal(image.width,'1200');for(const shape of image.shapes)assert(cvat.labels.includes(shape.label));}
  assert.deepEqual(cvat.images[0].shapes.map(s=>s.type),['polyline','polyline','box','points','polygon','polyline']);
  assert.equal(cvat.images[0].shapes[0].label,'road & <edge> "測試"');assert.equal(cvat.images[0].shapes[0].points,'120,160;600,320');assert.equal(cvat.images[0].shapes[0].description,'note & <tag>\\nsecond line');
  assert.equal(cvat.images[0].shapes[2].xtl,'100');assert.equal(cvat.images[0].shapes[2].xbr,'900');assert.equal(cvat.images[0].shapes[3].points,'1000,650');assert.equal(cvat.images[0].shapes.at(-1).points,'900,100;1100,100');
  const annotationOnly=await page.evaluate(()=>__test.exportFiles('cvat',[__test.active()],true,{includeImages:false}).files.map(([name])=>name));assert.deepEqual(annotationOnly,['annotations.xml','images/']);
  async function openFormat(id){await page.evaluate(id=>document.getElementById(id).click(),id);}
  // Partial export must be a conscious opt-in, reset on each opening and scoped correctly.
  await openFormat('yolo');assert.match(await page.locator('#export-compatibility').textContent(),/Current Image: 1 of 6/);
  assert.match(await page.locator('#export-skipped').textContent(),/2 polylines/);assert.equal(await page.locator('#confirm-export').isDisabled(),true);
  assert.equal(await page.locator('#allow-partial').isChecked(),false);
  await page.evaluate(()=>document.querySelector('#export-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));assert.equal(await page.locator('#export-dialog').isVisible(),true);
  await page.locator('#allow-partial').check();assert.equal(await page.locator('#confirm-export').isEnabled(),true);
  await page.locator('#cancel-export').click();await openFormat('yolo-all');assert.match(await page.locator('#export-compatibility').textContent(),/Full Dataset: 1 of 7/);assert.equal(await page.locator('#allow-partial').isChecked(),false);await page.locator('#cancel-export').click();
  await openFormat('coco');assert.match(await page.locator('#export-compatibility').textContent(),/2 of 7/);assert.equal(await page.locator('#confirm-export').isDisabled(),true);await page.locator('#cancel-export').click();
  await openFormat('voc-current');assert.equal(await page.locator('#confirm-export').isDisabled(),true);await page.locator('#cancel-export').click();
  await openFormat('cvat-all');assert.match(await page.locator('#export-compatibility').textContent(),/7 of 7/);assert.equal(await page.locator('#export-warning').isVisible(),false);assert.equal(await page.locator('#confirm-export').isEnabled(),true);await page.locator('#cancel-export').click();
  // Exercise the actual ZIP download with an entered outer filename.
  await page.evaluate(()=>document.getElementById('json-current').click());await page.locator('#export-name').fill('polyline-check');await page.locator('#include-images').uncheck();
  const downloadReady=page.waitForEvent('download');await page.locator('#confirm-export').click();const download=await downloadReady;assert.equal(download.suggestedFilename(),'polyline-check.zip');
  const stream=await download.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);const zip=Buffer.concat(chunks);assert.equal(zip.readUInt32LE(0),0x04034b50);assert(zip.includes(Buffer.from('"type": "polyline"')));
  await page.screenshot({path:'/tmp/boundless-polyline-desktop.png',fullPage:true});
  // Touch creation uses the same original-pixel coordinates and explicit finish button.
  const mobile=await setup({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await mobile.locator('#tool-polyline').tap();
  await click(mobile,120,160,true);await click(mobile,600,320,true);await mobile.locator('#finish-polyline').tap();await label(mobile,'touch path');
  const touch=(await annotations(mobile))[0];assert.equal(touch.type,'polyline');for(let i=0;i<2;i++)for(const key of ['x','y'])assert(Math.abs(touch.points[i][key]-original.points[i][key])<=3);
  await mobile.screenshot({path:'/tmp/boundless-polyline-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  await browser.close();console.log('Passed: polyline desktop/touch creation, finish/cancel, pan continuity, move/vertex edit + undo, legacy lines, shapes, image isolation, original coordinates, CVAT XML, compatibility confirmation, exports and ZIP download; no network uploads.');
})().catch(error=>{console.error(error);process.exit(1);});
