// Optional integration test: downloads real models. Use a dog photo for TEST_IMAGE.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
  if(!process.env.TEST_IMAGE)throw Error('Set TEST_IMAGE to a local dog photograph.');
  const proxy=process.env.HTTPS_PROXY||process.env.HTTP_PROXY;
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),...(proxy?{proxy:{server:proxy,bypass:'localhost,127.0.0.1'}}:{})});
  const page=await browser.newPage({viewport:{width:1440,height:1100},ignoreHTTPSErrors:!!process.env.TEST_IGNORE_CERT_ERRORS});
  const failures=[],requests=[];page.on('pageerror',e=>failures.push(e.message));page.on('request',r=>requests.push({method:r.method(),url:r.url()}));
  await page.goto(process.env.TEST_URL||'http://localhost:8765');
  await page.locator('#file').setInputFiles(process.env.TEST_IMAGE);
  let last='';
  async function waitForResult(){const started=Date.now();
    for(let i=0;i<240;i++){
      const text=await page.locator('#ai-message').textContent();
      if(text!==last){console.log(text);last=text;}
      if(text.startsWith('AI unavailable:'))throw Error(text);
      if(await page.locator('.ai-review-row').count()>0){console.log('Elapsed seconds:',Math.round((Date.now()-started)/1000));return;}
      await page.waitForTimeout(1500);
    }
    throw Error('Inference exceeded six minutes');
  }
  await page.locator('#ai-detect').click();await page.getByRole('button',{name:'Download & Continue'}).click();
  await waitForResult();assert.match(await page.locator('#ai-review').textContent(),/dog/i);
  await page.locator('#ai-accept').click();
  assert.match(await page.locator('#annotations').textContent(),/BOX\s+dog/);
  assert.equal(await page.locator('#tool-smart').count(),0);
  await page.screenshot({path:process.env.TEST_SCREENSHOT||'/tmp/boundless-ai-real.png',fullPage:true});
  assert.deepEqual(failures,[]);assert(requests.every(r=>r.method==='GET'||r.method==='HEAD'));
  console.log('Real model test passed: detection, accept, no upload requests.');
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
