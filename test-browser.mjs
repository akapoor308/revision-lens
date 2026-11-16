import {launchBrowser,fixture} from './test-support.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const root=process.cwd(),output=path.resolve(root,process.argv[2]||'dist');
const browser=await launchBrowser();
const context=await browser.newContext({viewport:{width:1500,height:1050},offline:true,acceptDownloads:true});
try {
const page=await context.newPage();const errors=[],network=[],consoleMessages=[];
page.setDefaultTimeout(15000);
page.on('pageerror',e=>errors.push(e.message));page.on('console',msg=>consoleMessages.push(msg.type()+': '+msg.text()));
page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
await page.goto(pathToFileURL(path.join(output,'Revision Lens.html')).href);
// Every network API must be unreachable, and the lock must not be replaceable.
const offlineLock=await page.evaluate(()=>{
  const target='http://127.0.0.1:9/revision-lens-must-not-reach-this';
  const verdict=call=>{try{call();return 'ALLOWED';}catch(e){return /runs offline/.test(e.message)?'blocked':'blocked by: '+e.message;}};
  const results={
    fetch:verdict(()=>window.fetch(target)),
    XMLHttpRequest:verdict(()=>new window.XMLHttpRequest()),
    WebSocket:verdict(()=>new window.WebSocket('ws://127.0.0.1:9')),
    EventSource:verdict(()=>new window.EventSource(target)),
    RTCPeerConnection:verdict(()=>new window.RTCPeerConnection()),
    SharedWorker:verdict(()=>new window.SharedWorker(target)),
    Request:verdict(()=>new window.Request(target)),
    sendBeacon:verdict(()=>navigator.sendBeacon(target))
  };
  try{window.fetch=()=>'replaced';}catch{}
  results.lockReplaceable=(()=>{try{return window.fetch('x')==='replaced';}catch{return false;}})();
  const workerSource=atob(JSON.parse(document.getElementById('embedded-worker').textContent).slice(0,600));
  results.workerLocked=workerSource.startsWith('(function(){')&&workerSource.includes('runs offline');
  return results;
});
for(const [api,outcome] of Object.entries(offlineLock)){
  if(api==='lockReplaceable'||api==='workerLocked')continue;
  assert.equal(outcome,'blocked',api+' is not blocked by the offline lock: '+outcome);
}
assert.equal(offlineLock.lockReplaceable,false,'The offline lock must not be replaceable from page scripts.');
assert.equal(offlineLock.workerLocked,true,'The PDF worker bundle must start with the offline lock.');
assert.equal(await page.locator('#demo,#demo2,#simpleDemo,#embedded-demo').count(),0);
assert.equal(await page.locator('#alignmentControls').getAttribute('open'),null);
assert.equal(await page.locator('.manual').getAttribute('open'),null);
assert.deepEqual(await page.locator('[data-mode]').evaluateAll(bs=>bs.map(b=>b.dataset.mode)),['overlay','split','text']);
await page.screenshot({path:path.join(root,'initial.png'),fullPage:true});
await page.locator('#oldFile').setInputFiles(fixture('fictional-revision-A.pdf'));
await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('PDF loaded.'));
await page.locator('#newFile').setInputFiles(fixture('fictional-revision-B.pdf'));
await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Both PDFs loaded.'));
await page.locator('#compareAll').click();
await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Whole-document comparison complete.'),null,{timeout:60000});
await page.locator('.manual summary').click();
const first={status:await page.locator('#status').innerText(),summary:await page.locator('#summary').innerText()};
await page.screenshot({path:path.join(root,'drawing.png'),fullPage:true});
await page.locator('[data-mode=split]').click();
const splitColours=await page.locator('#canvas').evaluate(c=>{
  const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,half=(c.width-30)/2;let red=0,blue=0;
  for(let p=0;p<d.length/4;p++){const x=p%c.width,i=p*4;if(x<half&&d[i]===207&&d[i+1]===44&&d[i+2]===87)red++;if(x>half&&d[i]===0&&d[i+1]===125&&d[i+2]===156)blue++;}
  return {red,blue};
});
assert.ok(splitColours.red>0&&splitColours.blue>0,'Both split panes must highlight the corresponding changed pixels.');
await page.locator('#nextRegion').click();assert.equal(await page.locator('[data-mode=split]').getAttribute('class'),'active');
await page.screenshot({path:path.join(root,'split-drawing.png'),fullPage:true});
await page.locator('[data-mode=overlay]').click();
const pdfDownload=page.waitForEvent('download');await page.locator('#savePdf').click();const pdf=await pdfDownload;await pdf.saveAs(path.join(root,'export-test.pdf'));
const pngDownload=page.waitForEvent('download');await page.locator('#savePng').click();const png=await pngDownload;await png.saveAs(path.join(root,'export-test.png'));
await page.locator('#oldPage').selectOption('2');await page.locator('#newPage').selectOption('2');await page.locator('#compare').click();
await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Comparison ready.'),{timeout:60000});
await page.locator('[data-mode=text]').click();const text=await page.locator('#textView').innerText();
if(!text.includes('Powder coat')||!text.includes('DEMO-400'))throw new Error('Report changes were not extracted.');
await page.screenshot({path:path.join(root,'report.png'),fullPage:true});
const csvDownload=page.waitForEvent('download');await page.locator('#saveCsv').click();const csv=await csvDownload;await csv.saveAs(path.join(root,'export-test.csv'));
await page.locator('[data-mode=split]').click();await page.screenshot({path:path.join(root,'split.png'),fullPage:true});
// Identical documents must have no visual or text changes.
await page.locator('#oldFile').setInputFiles([]);
await page.locator('#oldFile').setInputFiles(fixture('fictional-revision-A.pdf'));
await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Both PDFs loaded.'));
await page.locator('#newFile').setInputFiles(fixture('fictional-revision-A.pdf'));
await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Both PDFs loaded.'));
await page.locator('#compare').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('No grouped visual differences'),null,{timeout:60000});
const same=await page.locator('#summary').innerText();if(!same.includes('0 original-only pixels · 0 revised-only pixels'))throw new Error('Identical PDF test failed: '+same);
await page.locator('#alignmentControls summary').click();
await page.locator('#shiftX').fill('7');
await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Comparison ready.'));
await page.locator('#align').click();
await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Translation suggestion applied.'));
const suggested=Number(await page.locator('#shiftX').inputValue());
if(Math.abs(suggested)>2)throw new Error('Shift suggestion did not recover alignment: '+suggested);
await page.locator('#unalign').click();
await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('No grouped visual differences'));
await page.locator('#shiftX').fill('7');
await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Comparison ready.'));
await page.locator('#exclude').click();
await page.locator('#zoom').selectOption('0.5');
const box=await page.locator('#annotations').boundingBox();
await page.mouse.move(box.x+1,box.y+1);await page.mouse.down();await page.mouse.move(box.x+box.width-1,box.y+box.height-1,{steps:6});await page.mouse.up();
await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('No grouped visual differences'));
const excluded=await page.locator('#summary').innerText();
await page.locator('#reset').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Session cleared.'));
// Dropping two PDFs anywhere on the page fills both cards, first one first.
const dropped=await page.evaluate(async bytes=>{
  const file=(data,name)=>new File([Uint8Array.from(atob(data),c=>c.charCodeAt(0))],name,{type:'application/pdf'});
  const transfer=new DataTransfer();
  transfer.items.add(file(bytes[0],'dropped-original.pdf'));
  transfer.items.add(file(bytes[1],'dropped-revised.pdf'));
  return document.dispatchEvent(new DragEvent('drop',{dataTransfer:transfer,bubbles:true,cancelable:true}));
},[(await fs.readFile(fixture('fictional-revision-A.pdf'))).toString('base64'),
   (await fs.readFile(fixture('fictional-revision-B.pdf'))).toString('base64')]);
assert.equal(dropped,false,'The page must take over the drop instead of letting the browser open the file.');
await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Both PDFs loaded.'));
assert.equal(await page.locator('#oldName').innerText(),'dropped-original.pdf');
assert.equal(await page.locator('#newName').innerText(),'dropped-revised.pdf');
// Swapping relabels the two already-parsed documents; shortcuts drive the views.
await page.locator('#oldFile').setInputFiles(fixture('fictional-revision-A.pdf'));
await page.waitForFunction(()=>/PDF loaded\.|Both PDFs loaded\./.test(document.querySelector('#status').textContent));
await page.locator('#newFile').setInputFiles(fixture('fictional-revision-B.pdf'));
await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Both PDFs loaded.'));
assert.equal(await page.locator('#oldName').innerText(),'fictional-revision-A.pdf');
for(const expected of ['fictional-revision-B.pdf','fictional-revision-A.pdf']){
  await page.locator('#swap').click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Swapped:'));
  assert.equal(await page.locator('#oldName').innerText(),expected);
}
await page.locator('#compareAll').click();
await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Whole-document comparison complete.'),null,{timeout:60000});
for(const [key,mode] of [['2','split'],['3','text'],['1','overlay']]){
  await page.locator('body').press(key);
  await page.waitForFunction(m=>document.querySelector('[data-mode='+m+']').classList.contains('active'),mode);
}
const namedWait=page.waitForEvent('download');await page.locator('#savePng').click();
const named=(await namedWait).suggestedFilename();
assert.match(named,/^revision-lens-overlay-A\d+-B\d+\.png$/,'Exports must be named after the pages they cover: '+named);
// A blob worker must really start: otherwise PDF.js quietly parses every page
// on the main thread and the interface locks up on large stacks.
assert.ok(!consoleMessages.some(m=>/fake worker/i.test(m)),'PDF parsing fell back to the main thread: '+consoleMessages.join(' | '));
if(errors.length)throw new Error('Page errors: '+errors.join('\n'));
if(network.length)throw new Error('External requests: '+network.join('\n'));
const results={browser:await browser.version(),offline:true,externalRequests:network.length,errors,offlineLock,exportName:named,noDemoFlow:true,collapsedSettings:true,tabs:['overlay','split','text'],splitHighlights:splitColours,splitNavigationPreserved:true,first,reportText:text,identical:same,suggestedShift:suggested,excluded,consoleMessages};
await fs.writeFile(path.join(root,process.env.REVISION_LENS_BROWSER?.includes('Edge')?'edge-results.json':'browser-results.json'),JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
} finally { await browser.close(); }
