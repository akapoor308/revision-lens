import {launchBrowser,fixture} from './test-support.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),out=path.resolve(process.argv[2]||'dist');
const browser=await launchBrowser();
const context=await browser.newContext({viewport:{width:1600,height:1100},offline:true,acceptDownloads:true});
const page=await context.newPage(),errors=[],network=[],results={};
page.setDefaultTimeout(20000);
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
async function ready(){await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Whole-document comparison complete.'),null,{timeout:120000});}
async function rows(){return page.locator('.sheet-row').evaluateAll(bs=>bs.map(b=>({old:+b.dataset.old||null,new:+b.dataset.new||null,result:b.dataset.result,review:!!b.querySelector('.match-review'),title:b.title})));}
async function load(a,b){
  await page.locator('#oldFile').setInputFiles([]);
  await page.locator('#oldFile').setInputFiles(fixture(a));
  await page.waitForFunction(()=>/PDF loaded\.|Both PDFs loaded\./.test(document.querySelector('#status').textContent));
  await page.locator('#newFile').setInputFiles([]);
  await page.locator('#newFile').setInputFiles(fixture(b));
  await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Both PDFs loaded.'));
  await page.locator('#compareAll').click();await ready();
}
try{
  await page.goto(pathToFileURL(path.join(out,'Revision Lens.html')).href);
  await page.screenshot({path:'batch-initial.png',fullPage:true});
  await load('fictional-stack-19.pdf','fictional-stack-20.pdf');
  results.insert=await rows();assert.equal(results.insert.length,20);
  assert.deepEqual(results.insert.filter(r=>!r.old).map(r=>r.new),[5]);
  assert.equal(results.insert.filter(r=>!r.new).length,0);
  for(const r of results.insert.filter(r=>r.old))assert.equal(r.new,r.old<5?r.old:r.old+1);
  await page.screenshot({path:'batch-insert.png',fullPage:true});
  await page.locator('.sheet-row[data-old="5"][data-new="6"]').click();
  await page.waitForFunction(()=>document.querySelector('#heading').textContent==='Original 5 → Revised 6');
  await page.screenshot({path:'batch-paired.png',fullPage:true});
  const pdfWait=page.waitForEvent('download',{timeout:120000});await page.locator('#saveAllPdf').click();const pdf=await pdfWait;await pdf.saveAs('batch-export.pdf');
  const csvWait=page.waitForEvent('download');await page.locator('#saveMap').click();const csv=await csvWait;await csv.saveAs('batch-map.csv');
  assert.match(await fs.readFile('batch-map.csv','utf8'),/"5","6"/);
  await load('fictional-stack-19.pdf','fictional-stack-deleted-18.pdf');
  results.delete=await rows();assert.deepEqual(results.delete.filter(r=>!r.new).map(r=>r.old),[5]);
  assert.equal(results.delete.find(r=>r.old===6).new,5);assert.equal(results.delete.filter(r=>!r.old).length,0);
  await page.screenshot({path:'batch-delete.png',fullPage:true});
  await load('fictional-stack-19.pdf','fictional-stack-mixed-19.pdf');
  results.mixed=await rows();assert.deepEqual(results.mixed.filter(r=>!r.new).map(r=>r.old),[12]);assert.deepEqual(results.mixed.filter(r=>!r.old).map(r=>r.new),[5]);
  await load('fictional-scan-4.pdf','fictional-scan-5.pdf');
  results.scanned=await rows();assert.deepEqual(results.scanned.filter(r=>!r.old).map(r=>r.new),[3]);assert.equal(results.scanned.filter(r=>!r.new).length,0);
  assert.equal(results.scanned.find(r=>r.old===3).new,4);
  await load('fictional-blank-2.pdf','fictional-blank-3.pdf');
  results.blank=await rows();assert.equal(results.blank.length,3);assert.ok(results.blank.every(r=>r.review));
  await page.locator('.manual summary').click();
  for(const [a,b]of [[1,1],[2,3]]){
    await page.locator('#oldPage').selectOption(String(a));await page.locator('#newPage').selectOption(String(b));await page.locator('#pinPair').click();await ready();
  }
  results.pinned=await rows();assert.deepEqual(results.pinned.filter(r=>!r.old).map(r=>r.new),[2]);
  assert.ok(results.pinned.filter(r=>r.old&&r.new).every(r=>!r.review));
  // Same-length, identical documents should match by content and have no changes.
  await load('fictional-revision-A.pdf','fictional-revision-A.pdf');results.identical=await rows();assert.ok(results.identical.every(r=>r.result==='Unchanged'));
  // Stop during a fresh indexing pass, then ensure a full result is not advertised.
  await page.locator('#oldFile').setInputFiles(fixture('fictional-stack-19.pdf'));
  await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Both PDFs loaded.'));
  await page.locator('#newFile').setInputFiles(fixture('fictional-stack-20.pdf'));
  await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Both PDFs loaded.'));
  await page.locator('#compareAll').click();await page.locator('#cancel').click();
  await page.waitForFunction(()=>/Stopped while indexing|Comparison stopped/.test(document.querySelector('#status').textContent),null,{timeout:60000});
  assert.equal(await page.locator('#saveAllPdf').isDisabled(),true);results.cancelled=await page.locator('#status').innerText();
  assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
  const evidence={browser:await browser.version(),offline:true,externalRequests:network.length,errors,...results};
  await fs.writeFile(process.env.REVISION_LENS_BROWSER?.includes('Edge')?'batch-edge-results.json':'batch-browser-results.json',JSON.stringify(evidence,null,2));
  console.log(JSON.stringify({browser:evidence.browser,offline:true,externalRequests:0,tests:Object.keys(results),insert:results.insert.filter(r=>!r.old),delete:results.delete.filter(r=>!r.new),mixed:results.mixed.filter(r=>!r.old||!r.new),scanned:results.scanned,blankReviews:results.blank.filter(r=>r.review).length,cancelled:results.cancelled},null,2));
}catch(e){console.log('Failure status:',await page.locator('#status').innerText());console.log('Rows:',await rows());console.log('Page errors:',errors);await page.screenshot({path:'batch-failure.png',fullPage:true});throw e;}
finally{await browser.close();}
