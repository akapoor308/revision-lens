import * as pdfjs from 'pdfjs-dist/build/pdf.mjs';
import {comparePixels, inkAt, suggestTranslation, diffLines, highlightSide} from './engine.mjs';
import {matchingTokens,matchPages,validatePins} from './matching.mjs';

const $=id=>document.getElementById(id);
const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const assets=JSON.parse($('embedded-assets').textContent);
const workerUrl=URL.createObjectURL(new Blob([decode(JSON.parse($('embedded-worker').textContent))],{type:'text/javascript'}));
pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;
class EmbeddedBinaryDataFactory {
  async fetch({kind,filename}) {
    const key=({cMapUrl:'cmaps',standardFontDataUrl:'standard_fonts',wasmUrl:'wasm'})[kind]+'/'+filename;
    if(!assets[key]) throw new Error('Embedded PDF asset unavailable: '+key);
    return decode(assets[key]);
  }
}
const state={docs:{},tasks:{},names:{},pages:{},a:null,b:null,aligned:null,result:null,mode:'overlay',busy:false,exclusions:[],selecting:false,region:-1,text:[],textWarning:'',scale:2,actualDpi:144,pair:null,
  features:{},rows:[],pins:[],activeRow:-1,job:false,cancelled:false,batchComplete:false};
const canvas=$('canvas'), annotation=$('annotations');
const status=(s,type='')=>{ $('status').textContent=s; $('status').className='status '+type; };
function makeCanvas(w,h){ const c=document.createElement('canvas');c.width=w;c.height=h;return c; }
function lock(busy){
  state.busy=busy; document.body.classList.toggle('working',busy);
  const both=!!(state.docs.old&&state.docs.new), result=!!state.result;
  $('compare').disabled=busy||!both;
  $('compareAll').disabled=busy||!both;
  $('pinPair').disabled=busy||!both;
  $('clearPins').disabled=busy||!state.pins.length;
  $('saveMap').disabled=busy||!state.rows.length;
  $('saveAllPdf').disabled=busy||!state.batchComplete;
  $('cancel').hidden=!state.job;
  $('cancel').disabled=state.cancelled;
  $('sheetFilter').disabled=busy;
  for(const b of document.querySelectorAll('.sheet-row'))b.disabled=busy;
  for(const id of ['align','unalign','exclude','clearExclude','savePdf','savePng']) $(id).disabled=busy||!result;
  $('saveCsv').disabled=busy||!result||!state.text.length;
  for(const id of ['prevRegion','nextRegion']) $(id).disabled=busy||!state.result?.regions.length;
  $('reset').disabled=busy;
}
const yieldUi=()=>new Promise(r=>setTimeout(r,20));
async function run(fn){ if(state.busy)return;lock(true);try{await fn();}catch(e){ console.error(e);status(e.message||'Comparison failed.','error');}finally{lock(false);} }
function clearResult(){
  for(const key of ['a','b','base','aligned','overlay','splitOld','splitNew']){if(state[key])state[key].width=state[key].height=0;state[key]=null;}
  state.a=state.b=state.aligned=state.result=null;state.text=[];state.region=-1;state.pair=null;state.exclusions=[];state.selecting=false;
  $('empty').hidden=false;$('empty').style.display='flex';$('visual').hidden=true;$('textView').hidden=true;
  $('summary').textContent='Ready for the whole stack';$('regionPosition').textContent='—';$('heading').textContent='Let’s spot the plot twists.';
  $('exclude').classList.remove('active-exclude');$('exclude').setAttribute('aria-pressed','false');
  annotation.classList.remove('selecting');
}
async function loadBytes(side, bytes, name){
  const task=pdfjs.getDocument({data:bytes,BinaryDataFactory:EmbeddedBinaryDataFactory,useWorkerFetch:false,
    cMapPacked:true,cMapUrl:'embedded/',standardFontDataUrl:'embedded/',wasmUrl:'embedded/',
    isEvalSupported:false,enableScripting:false,useSystemFonts:false,stopAtErrors:true});
  task.onPassword=()=>task.destroy();
  let doc;
  try {doc=await task.promise;} catch(e){throw new Error('Cannot open '+name+'. Use an unencrypted, valid PDF. '+e.message);}
  if(state.tasks[side]) await state.tasks[side].destroy();
  state.tasks[side]=task;
  state.docs[side]=doc;state.names[side]=name;
  state.features={};state.rows=[];state.pins=[];state.activeRow=-1;state.batchComplete=false;
  $('sheetPanel').hidden=true;$('stackStats').hidden=true;$('progressTrack').hidden=true;$('sheetList').replaceChildren();
  $(side+'Name').textContent=name;$(side+'Meta').textContent=doc.numPages+' page'+(doc.numPages===1?'':'s')+' · loaded locally';
  const select=$(side+'Page');select.replaceChildren();
  select.append(new Option('— No sheet','0'));
  for(let p=1;p<=doc.numPages;p++){const o=document.createElement('option');o.value=p;o.textContent=p;select.append(o);}
  select.value='1';
  clearResult();
}
for(const side of ['old','new']) $(side+'File').addEventListener('change',e=>{
  const file=e.target.files[0];if(!file)return;
  run(async()=>{status('Opening '+file.name+'…','busy');
    if(file.size>150*1024*1024)throw new Error('Prototype file limit is 150 MB per PDF.');
    await loadBytes(side,new Uint8Array(await file.arrayBuffer()),file.name);
    status(state.docs.old&&state.docs.new?'Both PDFs loaded. Ready to compare all sheets.':'PDF loaded. Choose the other revision.');
  });
});
function alignValues(){return {x:Number($('shiftX').value)||0,y:Number($('shiftY').value)||0,rotation:Number($('rotation').value)||0,scale:Math.max(20,Math.min(500,Number($('scale').value)||100))};}
function resetAlign(){for(const id of ['shiftX','shiftY','rotation'])$(id).value=0;$('scale').value=100;}
async function renderPage(doc,number,scale){
  const page=await doc.getPage(number), vp=page.getViewport({scale});
  const c=makeCanvas(Math.ceil(vp.width),Math.ceil(vp.height)), ctx=c.getContext('2d',{willReadFrequently:true});
  await page.render({canvasContext:ctx,viewport:vp,background:'rgb(255,255,255)',annotationMode:pdfjs.AnnotationMode.DISABLE}).promise;
  return c;
}
async function getLines(doc,number){
  if(!number)return [];
  const page=await doc.getPage(number), content=await page.getTextContent();let lines=[],line='',y=null;
  for(const item of content.items){ if(!('str'in item))continue;
    const yy=item.transform[5];if(y!==null&&Math.abs(yy-y)>3&&line.trim()){lines.push(line);line='';}
    line+=(line?' ':'')+item.str;y=yy;
    if(item.hasEOL){lines.push(line);line='';y=null;}
  }
  if(line.trim())lines.push(line);return lines;
}
async function compare(){
  const old=+$('oldPage').value, newer=+$('newPage').value;
  if(!old&&!newer)throw new Error('Choose at least one real sheet to compare.');
  for(const key of ['a','b','base','aligned','overlay','splitOld','splitNew']){if(state[key])state[key].width=state[key].height=0;state[key]=null;}state.result=null;
  const pair=old+':'+newer;
  if(pair!==state.pair){resetAlign();state.exclusions=[];}
  state.pair=pair;status('Rendering selected pages locally…','busy');await yieldUi();
  const pa=old?await state.docs.old.getPage(old):null,pb=newer?await state.docs.new.getPage(newer):null;
  const va=pa?.getViewport({scale:1})||pb.getViewport({scale:1}),vb=pb?.getViewport({scale:1})||va;
  const wanted=+$('quality').value/72;
  const scale=Math.min(wanted,Math.sqrt(12000000/(Math.max(va.width,vb.width)*Math.max(va.height,vb.height))));
  state.scale=scale;state.actualDpi=scale*72;
  state.a=old?await renderPage(state.docs.old,old,scale):whiteCanvas(Math.ceil(va.width*scale),Math.ceil(va.height*scale));
  state.b=newer?await renderPage(state.docs.new,newer,scale):whiteCanvas(Math.ceil(vb.width*scale),Math.ceil(vb.height*scale));
  state.w=Math.max(state.a.width,state.b.width);state.h=Math.max(state.a.height,state.b.height);
  state.sizeWarning=Math.abs(va.width-vb.width)>1||Math.abs(va.height-vb.height)>1;
  state.textWarning='';
  try {
    const fa=state.features.old?.[old-1],fb=state.features.new?.[newer-1];
    if(fa?.textError||fb?.textError)throw new Error(fa?.textError||fb.textError);
    state.text=diffLines(fa?.lines||await getLines(state.docs.old,old),fb?.lines||await getLines(state.docs.new,newer));
  }
  catch(e){state.text=[];state.textWarning=e.message;}
  await updateComparison();
}
function transformB(w=state.w,h=state.h, factor=1){
  const b=makeCanvas(w,h),ctx=b.getContext('2d',{willReadFrequently:true});
  ctx.fillStyle='white';ctx.fillRect(0,0,w,h);
  const t=alignValues(),cx=state.b.width*factor/2,cy=state.b.height*factor/2;
  ctx.translate(cx+t.x*state.scale*factor,cy+t.y*state.scale*factor);ctx.rotate(t.rotation*Math.PI/180);ctx.scale(t.scale/100,t.scale/100);
  ctx.drawImage(state.b,-cx,-cy,state.b.width*factor,state.b.height*factor);return b;
}
async function updateComparison(){
  if(!state.a)return;status('Comparing pixels and grouping review regions…','busy');await yieldUi();
  for(const key of ['splitOld','splitNew']){if(state[key])state[key].width=state[key].height=0;state[key]=null;}
  const base=makeCanvas(state.w,state.h),ctx=base.getContext('2d',{willReadFrequently:true});ctx.fillStyle='white';ctx.fillRect(0,0,state.w,state.h);ctx.drawImage(state.a,0,0);
  state.base=base;state.aligned=transformB();
  state.result=comparePixels(ctx.getImageData(0,0,state.w,state.h).data,state.aligned.getContext('2d').getImageData(0,0,state.w,state.h).data,state.w,state.h,
    {threshold:+$('threshold').value/100,radius:+$('tolerance').value,exclusions:state.exclusions});
  state.overlay=makeCanvas(state.w,state.h);state.overlay.getContext('2d').putImageData(new ImageData(state.result.data,state.w,state.h),0,0);
  state.region=-1;draw();renderText();
  $('heading').textContent=!+$('oldPage').value?'A new sheet joins the stack.':!+$('newPage').value?'This sheet left the stack.':'Original '+$('oldPage').value+' → Revised '+$('newPage').value;
  const r=state.result;
  $('summary').textContent=r.regions.length+' visual region'+(r.regions.length===1?'':'s')+' · '+r.removed.toLocaleString()+' original-only pixels · '+r.added.toLocaleString()+' revised-only pixels';
  $('renderInfo').textContent=Math.round(state.actualDpi)+' dpi · '+state.w+' × '+state.h+' px · pages '+$('oldPage').value+' / '+$('newPage').value;
  status((r.regions.length?'Comparison ready. Regions group nearby changed pixels; inspect each area.':'No grouped visual differences at the current settings. Small changes may fall below the region filter.')+
    (state.sizeWarning?' Page sizes differ: pages were not automatically resized; check scale and alignment.':'')+
    (state.actualDpi+0.1<+$('quality').value?' Quality was reduced to stay within the 12 MP limit.':'')+
    (state.textWarning?' Text view unavailable: '+state.textWarning:''));
  recordCurrentRow();
}
$('compare').onclick=()=>run(compare);
for(const id of ['oldPage','newPage'])$(id).onchange=()=>{state.activeRow=-1;clearResult();renderMap();status('Manual pairing selected. Compare this pair, or pin it and rematch the full stack.');lock(false);};
$('quality').onchange=()=>{if(state.result)run(compare);else status('Quality updated. Compare all sheets when ready.');};
let updateTimer;
for(const id of ['shiftX','shiftY','rotation','scale','threshold','tolerance'])$(id).addEventListener('input',()=>{
  $('thresholdValue').textContent=$('threshold').value+'%';clearTimeout(updateTimer);updateTimer=setTimeout(()=>{if(state.result)run(updateComparison);},250);
});
$('unalign').onclick=()=>run(async()=>{resetAlign();await updateComparison();});
$('align').onclick=()=>run(async()=>{
  status('Finding a translation suggestion. Rotation and scale will be kept…','busy');await yieldUi();
  const f=Math.min(1,420/Math.max(state.w,state.h)),w=Math.round(state.w*f),h=Math.round(state.h*f);
  const a=makeCanvas(w,h),ctx=a.getContext('2d',{willReadFrequently:true});ctx.drawImage(state.base,0,0,w,h);
  const b=transformB(w,h,f),aa=ctx.getImageData(0,0,w,h).data,bb=b.getContext('2d').getImageData(0,0,w,h).data;
  const ai=new Float32Array(w*h),bi=new Float32Array(w*h);
  for(let p=0;p<ai.length;p++){ai[p]=inkAt(aa,p*4);bi[p]=inkAt(bb,p*4);}
  const t=suggestTranslation(ai,bi,w,h,Math.min(30,Math.floor(Math.min(w,h)/5)));
  $('shiftX').value=(alignValues().x+t.x/f/state.scale).toFixed(2);$('shiftY').value=(alignValues().y+t.y/f/state.scale).toFixed(2);
  await updateComparison();status('Translation suggestion applied. Verify alignment visually; reset it if the result is worse.');
});
function draw(){
  if(!state.result)return;
  $('empty').hidden=true;$('empty').style.display='none';
  $('visual').hidden=state.mode==='text';$('textView').hidden=state.mode!=='text';
  if(state.mode==='text')return;
  const split=state.mode==='split',gap=30;
  canvas.width=split?state.w*2+gap:state.w;canvas.height=state.h;
  const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
  if(split){
    if(!state.splitOld){
      state.splitOld=makeCanvas(state.w,state.h);state.splitNew=makeCanvas(state.w,state.h);
      const oldData=state.base.getContext('2d').getImageData(0,0,state.w,state.h).data;
      const newData=state.aligned.getContext('2d').getImageData(0,0,state.w,state.h).data;
      state.splitOld.getContext('2d').putImageData(new ImageData(highlightSide(oldData,state.result.mask,'old'),state.w,state.h),0,0);
      state.splitNew.getContext('2d').putImageData(new ImageData(highlightSide(newData,state.result.mask,'new'),state.w,state.h),0,0);
    }
    ctx.drawImage(state.splitOld,0,0);ctx.fillStyle='#e9edf2';ctx.fillRect(state.w,0,gap,state.h);ctx.drawImage(state.splitNew,state.w+gap,0);
  }
  else ctx.drawImage(state.overlay,0,0);
  annotation.width=canvas.width;annotation.height=canvas.height;
  const available=Math.max(250,$('stage').clientWidth-46);
  const z=$('zoom').value==='fit'?available/canvas.width:+$('zoom').value;
  for(const c of [canvas,annotation]){c.style.width=canvas.width*z+'px';c.style.height=canvas.height*z+'px';}
  $('splitLabels').hidden=!split;$('splitLabels').style.width=canvas.width*z+'px';
  $('splitOldLabel').textContent='A · Original · '+(+$('oldPage').value?'page '+$('oldPage').value:'no sheet')+' · changes in red';
  $('splitNewLabel').textContent='B · Revised · '+(+$('newPage').value?'page '+$('newPage').value:'no sheet')+' · changes in blue';
  $('canvasWrap').style.width=canvas.width*z+'px';$('canvasWrap').style.height=canvas.height*z+'px';
  paintAnnotations();
}
function paintAnnotations(drag){
  const ctx=annotation.getContext('2d');ctx.clearRect(0,0,annotation.width,annotation.height);
  const z=annotation.clientWidth/annotation.width;
  ctx.lineWidth=2/Math.max(.1,z);
  if(state.mode==='overlay'||state.mode==='split'){
    const offsets=state.mode==='split'?[0,state.w+30]:[0];
    for(const offset of offsets){
    state.result.regions.forEach((r,i)=>{ctx.strokeStyle=i===state.region?'#ee9200':state.mode==='split'?(offset?'#007d9caa':'#cf2c57aa'):'#e4a43899';ctx.setLineDash(i===state.region?[]:[6/z,4/z]);ctx.strokeRect(r.x+offset,r.y,r.w,r.h);});
    ctx.setLineDash([]);
    for(const r of state.exclusions){ctx.fillStyle='#e5b45433';ctx.strokeStyle='#ba8a27';ctx.fillRect(r.x*state.w+offset,r.y*state.h,r.w*state.w,r.h*state.h);ctx.strokeRect(r.x*state.w+offset,r.y*state.h,r.w*state.w,r.h*state.h);}
    }
    if(drag){ctx.strokeStyle='#ae7415';ctx.strokeRect(drag.x,drag.y,drag.w,drag.h);}
  }
  $('regionPosition').textContent=state.result.regions.length?(state.region<0?'0':state.region+1)+' / '+state.result.regions.length:'0 / 0';
}
for(const button of document.querySelectorAll('[data-mode]'))button.onclick=()=>{
  state.mode=button.dataset.mode;for(const b of document.querySelectorAll('[data-mode]'))b.classList.toggle('active',b===button);draw();
};
$('zoom').onchange=draw;window.addEventListener('resize',()=>{if(state.result&&$('zoom').value==='fit')draw();});
function goRegion(dir){
  if(!state.result?.regions.length)return;
  if(state.mode==='text')state.mode='overlay';for(const b of document.querySelectorAll('[data-mode]'))b.classList.toggle('active',b.dataset.mode===state.mode);
  state.region=(state.region+dir+state.result.regions.length)%state.result.regions.length;draw();
  const r=state.result.regions[state.region],z=annotation.clientWidth/annotation.width;
  $('stage').scrollTo({left:Math.max(0,(r.x+r.w/2)*z-$('stage').clientWidth/2+22),top:Math.max(0,(r.y+r.h/2)*z-$('stage').clientHeight/2+22),behavior:'smooth'});
}
$('prevRegion').onclick=()=>goRegion(-1);$('nextRegion').onclick=()=>goRegion(1);
$('exclude').onclick=()=>{
  state.selecting=!state.selecting;state.mode='overlay';
  for(const b of document.querySelectorAll('[data-mode]'))b.classList.toggle('active',b.dataset.mode==='overlay');
  $('exclude').classList.toggle('active-exclude',state.selecting);$('exclude').setAttribute('aria-pressed',String(state.selecting));annotation.classList.toggle('selecting',state.selecting);draw();
  status(state.selecting?'Drag a rectangle on the overlay to ignore that area.':'Area selection stopped.');
};
let dragStart=null;
function pointerPoint(e){const r=annotation.getBoundingClientRect();return{x:Math.max(0,Math.min(state.w,(e.clientX-r.left)*annotation.width/r.width)),y:Math.max(0,Math.min(state.h,(e.clientY-r.top)*annotation.height/r.height))};}
annotation.onpointerdown=e=>{if(!state.selecting||state.busy||state.mode!=='overlay')return;dragStart=pointerPoint(e);annotation.setPointerCapture(e.pointerId);};
annotation.onpointermove=e=>{if(!dragStart)return;const p=pointerPoint(e);paintAnnotations({x:Math.min(p.x,dragStart.x),y:Math.min(p.y,dragStart.y),w:Math.abs(p.x-dragStart.x),h:Math.abs(p.y-dragStart.y)});};
annotation.onpointerup=e=>{if(!dragStart)return;const p=pointerPoint(e),r={x:Math.min(p.x,dragStart.x)/state.w,y:Math.min(p.y,dragStart.y)/state.h,w:Math.abs(p.x-dragStart.x)/state.w,h:Math.abs(p.y-dragStart.y)/state.h};dragStart=null;
  if(r.w*state.w<5||r.h*state.h<5){paintAnnotations();return;}state.exclusions.push(r);run(updateComparison);
};
annotation.onpointercancel=()=>{dragStart=null;if(state.result)paintAnnotations();};
$('clearExclude').onclick=()=>run(async()=>{state.exclusions=[];await updateComparison();});
function renderText(){
  const root=$('textView');root.replaceChildren();const intro=document.createElement('p');intro.className='text-intro';
  intro.textContent=state.textWarning||'Extracted text from the selected page pair. Whitespace is normalized; no OCR or part-number matching is performed. Reordered rows can appear as removals and additions. Text changes are independent of visual ignore areas and sensitivity.';root.append(intro);
  if(!state.text.length){const empty=document.createElement('p');empty.className='text-empty';empty.textContent=state.textWarning?'Text comparison unavailable.':'No extracted-text differences. Scanned or outlined text may have no extractable content.';root.append(empty);return;}
  for(const change of state.text){const row=document.createElement('div');row.className='text-row '+change.type;const type=document.createElement('span');type.textContent=change.type;const text=document.createElement('p');text.textContent=change.text;row.append(type,text);root.append(row);}
}
function download(bytes,type,name){const url=URL.createObjectURL(new Blob([bytes],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function exportCanvas(){
  const w=state.w,header=Math.max(120,Math.round(w*.08)),c=makeCanvas(w,state.h+header),ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,w,c.height);
  const row=state.rows[state.activeRow];
  ctx.fillStyle='#263548';ctx.font='bold '+Math.round(w*.018)+'px Arial';ctx.fillText('Revision Lens | '+(row?.status||'visual comparison')+(row?.review?' | CHECK SHEET MATCH':''),w*.025,header*.3);
  ctx.font=Math.max(11,Math.round(w*.010))+'px Arial';
  const fit=(s,max)=>{while(s.length>5&&ctx.measureText(s).width>max)s=s.slice(0,-5)+'…';return s;};
  ctx.fillText(fit('A: '+state.names.old+' [page '+(+$('oldPage').value||'not present')+']   |   B: '+state.names.new+' [page '+(+$('newPage').value||'not present')+']',w*.95),w*.025,header*.5);
  const t=alignValues();ctx.fillText('Red: original only | Blue: revised only | '+state.result.regions.length+' regions | '+Math.round(state.actualDpi)+' dpi',w*.025,header*.68);
  ctx.fillText(fit('B shift '+t.x+','+t.y+' pt; rotation '+t.rotation+' deg; scale '+t.scale+'%; threshold '+$('threshold').value+'%; tolerance '+$('tolerance').value+' px; ignored areas '+state.exclusions.length,w*.95),w*.025,header*.85);
  ctx.drawImage(state.overlay,0,header);ctx.strokeStyle='#c18e30';ctx.lineWidth=1;
  for(const r of state.result.regions)ctx.strokeRect(r.x,r.y+header,r.w,r.h);
  ctx.setLineDash([6,4]);for(const r of state.exclusions)ctx.strokeRect(r.x*w,r.y*state.h+header,r.w*w,r.h*state.h);
  return c;
}
$('savePng').onclick=()=>run(async()=>{const c=exportCanvas();const blob=await new Promise(r=>c.toBlob(r,'image/png'));if(!blob)throw new Error('Image export failed.');download(blob,'image/png','revision-lens-overlay.png');status('Overlay PNG saved for the selected page pair.');});
function imagePdf(c){
  const jpeg=decode(c.toDataURL('image/jpeg',.95).split(',')[1]);const enc=new TextEncoder();
  const width=state.w/state.scale,height=c.height/state.scale;
  const stream='q\n'+width.toFixed(3)+' 0 0 '+height.toFixed(3)+' 0 0 cm\n/Im0 Do\nQ\n';
  const objs=[enc.encode('<< /Type /Catalog /Pages 2 0 R >>'),enc.encode('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
    enc.encode('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+width.toFixed(3)+' '+height.toFixed(3)+'] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>'),
    [enc.encode('<< /Type /XObject /Subtype /Image /Width '+c.width+' /Height '+c.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.length+' >>\nstream\n'),jpeg,enc.encode('\nendstream')],
    enc.encode('<< /Length '+enc.encode(stream).length+' >>\nstream\n'+stream+'endstream')];
  const chunks=[enc.encode('%PDF-1.4\n')],offsets=[0];let length=chunks[0].length;
  objs.forEach((obj,i)=>{offsets.push(length);for(const part of [enc.encode((i+1)+' 0 obj\n'),...(Array.isArray(obj)?obj:[obj]),enc.encode('\nendobj\n')]){chunks.push(part);length+=part.length;}});
  chunks.push(enc.encode('xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+length+'\n%%EOF'));
  return new Blob(chunks,{type:'application/pdf'});
}
$('savePdf').onclick=()=>run(async()=>{download(imagePdf(exportCanvas()),'application/pdf','revision-lens-overlay.pdf');status('Rasterized overlay PDF saved for the selected page pair.');});
$('saveCsv').onclick=()=>{
  // Neutralize spreadsheet formula prefixes in every user-controlled string.
  const cell=s=>'"'+String(/^(\s*[=+\-@]|[\t\r])/.test(String(s))?"'"+s:s).replaceAll('"','""')+'"';
  const rows=[['Type','Extracted line','Text','Original file','Original page','Revised file','Revised page'],...state.text.map(c=>[c.type,c.line,c.text,state.names.old,$('oldPage').value,state.names.new,$('newPage').value])];
  download('\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n'),'text/csv;charset=utf-8','revision-lens-text-changes.csv');
};
$('reset').onclick=()=>run(async()=>{
  for(const task of Object.values(state.tasks))await task.destroy();state.docs={};state.tasks={};state.names={};resetAlign();clearResult();
  state.rows=[];state.features={};state.pins=[];state.activeRow=-1;state.batchComplete=false;
  $('sheetPanel').hidden=true;$('stackStats').hidden=true;$('progressTrack').hidden=true;$('sheetList').replaceChildren();
  for(const side of ['old','new']){$(side+'File').value='';$(side+'Name').textContent=side==='old'?'Choose original PDF':'Choose revised PDF';$(side+'Meta').textContent='Select a file from this computer';$(side+'Page').replaceChildren(new Option('1','1'));}
  state.mode='overlay';for(const b of document.querySelectorAll('[data-mode]'))b.classList.toggle('active',b.dataset.mode==='overlay');
  $('alignmentControls').open=false;document.querySelector('.manual').open=false;
  status('Session cleared. Reload or close this tab to release remaining browser-managed resources.');$('summary').textContent='Waiting for PDFs';
});
window.addEventListener('error',e=>status('Browser error: '+e.message+'. Check the included README for supported browsers.','error'));

function whiteCanvas(w,h){const c=makeCanvas(w,h),ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,w,h);return c;}
function snapshot(){return {x:$('shiftX').value,y:$('shiftY').value,rotation:$('rotation').value,scale:$('scale').value,quality:$('quality').value,threshold:$('threshold').value,tolerance:$('tolerance').value,exclusions:state.exclusions.map(r=>({...r}))};}
function applySnapshot(s){
  $('shiftX').value=s.x;$('shiftY').value=s.y;$('rotation').value=s.rotation;$('scale').value=s.scale;
  $('quality').value=s.quality;$('threshold').value=s.threshold;$('thresholdValue').textContent=s.threshold+'%';$('tolerance').value=s.tolerance;
  state.exclusions=s.exclusions.map(r=>({...r}));state.selecting=false;$('exclude').classList.remove('active-exclude');$('exclude').setAttribute('aria-pressed','false');annotation.classList.remove('selecting');
}
function recordCurrentRow(){
  const row=state.rows[state.activeRow];if(!row||!state.result||(row.old||0)!==+$('oldPage').value)return;
  if((row.new||0)!==+$('newPage').value)return;
  row.settings=snapshot();row.regions=state.result.regions.length;row.removed=state.result.removed;row.added=state.result.added;row.textChanges=state.text.length;row.dpi=state.actualDpi;
  row.status=!row.old?'Added':!row.new?'Removed':row.removed+row.added+row.textChanges>0?'Changed':'Unchanged';
  row.textWarning=state.textWarning;
  if(state.textWarning){row.review=true;row.reason='Text comparison incomplete: '+state.textWarning;}
  renderMap();
}
function renderMap(){
  const rows=state.rows;if(!rows.length)return;
  $('sheetPanel').hidden=false;$('stackStats').hidden=false;
  $('matchedCount').textContent=rows.filter(r=>r.old&&r.new).length;
  $('addedCount').textContent=rows.filter(r=>!r.old).length;
  $('removedCount').textContent=rows.filter(r=>!r.new).length;
  $('reviewCount').textContent=rows.filter(r=>r.review).length;
  $('mapSummary').textContent=rows.filter(r=>r.status!=='Pending'&&r.status!=='Error').length+' / '+rows.length+' compared · '+state.pins.length+' pinned';
  const list=$('sheetList'),filter=$('sheetFilter').value,scroll=list.scrollTop;list.replaceChildren();
  for(const [index,r]of rows.entries()){
    if(filter==='review'&&!r.review||filter==='Pending'&&!['Pending','Error'].includes(r.status)||!['all','review','Pending'].includes(filter)&&r.status!==filter)continue;
    const button=document.createElement('button');button.className='sheet-row '+r.status+(state.activeRow===index?' selected':'');button.dataset.row=index;button.dataset.old=r.old||'';button.dataset.new=r.new||'';button.dataset.result=r.status;button.disabled=state.busy;
    button.setAttribute('aria-current',state.activeRow===index?'true':'false');
    const numbers=document.createElement('span');numbers.className='sheet-numbers';numbers.textContent='A '+(r.old||'—')+'  →  B '+(r.new||'—');
    const title=document.createElement('span');title.className='sheet-name';title.textContent=(r.new?state.features.new?.[r.new-1]:state.features.old?.[r.old-1])?.title||'Sheet '+(r.old||r.new);
    const label=document.createElement('span');label.className='sheet-state';label.textContent=r.status==='Unchanged'?'No differences':r.status;
    button.title=numbers.textContent+' · '+r.reason+(r.error?' · '+r.error:'');button.append(numbers,title,label);
    if(r.review){const review=document.createElement('span');review.className='match-review';review.textContent='⚑ Check match'+(r.old&&r.new?' · '+Math.round(r.score*100)+'% similarity':'');button.append(review);}
    if(r.pinned){const pin=document.createElement('span');pin.className='pin';pin.textContent=' · pinned';button.append(pin);}
    button.onclick=()=>run(()=>openRow(index));list.append(button);
  }
  if(!list.childElementCount){const p=document.createElement('p');p.className='no-filter-results';p.textContent='No sheets in this filter. A clear little corner!';list.append(p);}
  list.scrollTop=scroll;
}
$('sheetFilter').onchange=renderMap;
function progress(value,text){$('progressTrack').hidden=false;$('batchProgress').value=value;$('progressText').textContent=text;}

async function indexDocument(side){
  if(state.features[side])return state.features[side];
  const pages=[],doc=state.docs[side];
  for(let page=1;page<=doc.numPages;page++){
    if(state.cancelled)return null;
    const prefix=side==='old'?'Original A':'Revised B';
    status('Finding sheet identities · '+prefix+' · '+page+' / '+doc.numPages+'…','busy');
    progress((side==='old'?0:20)+20*page/doc.numPages,'Indexing '+prefix+' · '+page+' / '+doc.numPages);await yieldUi();
    const p=await doc.getPage(page),v=p.getViewport({scale:1}),thumb=await renderPage(doc,page,Math.min(1,240/Math.max(v.width,v.height)));
    const c=whiteCanvas(24,24),ctx=c.getContext('2d',{willReadFrequently:true});
    // Crop page-edge counters/title blocks for identity only. Full pages are compared later.
    ctx.drawImage(thumb,thumb.width*.055,thumb.height*.075,thumb.width*.89,thumb.height*.81,0,0,24,24);
    const data=ctx.getImageData(0,0,24,24).data,visual=new Float32Array(24*24);let sum=0;
    for(let i=0;i<visual.length;i++){visual[i]=inkAt(data,i*4);sum+=visual[i];}
    let lines=[],textError='';try{lines=await getLines(doc,page);}catch(e){textError=e.message;}
    const tokens=matchingTokens(lines);
    pages.push({visual,aspect:v.width/v.height,tokens,lines,textError,blank:sum<.1&&tokens.size<4,title:lines.find(s=>s.trim().length>4)?.slice(0,100)||'Scanned / visual sheet '+page});
    thumb.width=thumb.height=0;p.cleanup();
  }
  state.features[side]=pages;return pages;
}

async function openRow(index){
  const row=state.rows[index];if(!row)throw new Error('Sheet map entry is unavailable.');
  if(row.status==='Error'&&row.indexError)throw new Error(row.error);
  state.activeRow=index;$('oldPage').value=String(row.old||0);$('newPage').value=String(row.new||0);
  const fallback={x:'0',y:'0',rotation:'0',scale:'100',quality:$('quality').value,threshold:$('threshold').value,tolerance:$('tolerance').value,exclusions:[]};
  applySnapshot(row.settings||fallback);state.pair=(row.old||0)+':'+(row.new||0);
  state.result=null;await compare();
  if(row.review&&!state.job)status('Check this match: '+row.reason+'. Use manual pairing to pin a correction if needed.');
}

async function compareAll(){
  if(state.docs.old.numPages*state.docs.new.numPages>250000)throw new Error('This prototype allows 250,000 page-pair candidates per run. Split exceptionally large PDF stacks first.');
  state.job=true;state.cancelled=false;state.batchComplete=false;lock(true);
  const defaults={x:'0',y:'0',rotation:'0',scale:'100',quality:$('quality').value,threshold:$('threshold').value,tolerance:$('tolerance').value,exclusions:[]};
  const previous=new Map(state.rows.map(r=>[(r.old||0)+':'+(r.new||0),r.settings]));
  state.rows=[];state.activeRow=-1;state.result=null;
  $('sheetPanel').hidden=true;$('stackStats').hidden=true;$('sheetList').replaceChildren();
  $('visual').hidden=true;$('textView').hidden=true;$('heading').textContent='Matching your stack…';$('summary').textContent='Indexing the two documents';
  try{
    const old=await indexDocument('old'),newer=old?await indexDocument('new'):null;
    if(!old||!newer||state.cancelled){status('Stopped while indexing. The whole-document comparison has not completed.');return;}
    status('Matching sheet content and finding insertions or removals…','busy');progress(40,'Matching the two stacks');await yieldUi();
    const rows=matchPages(old,newer,{pins:state.pins});
    state.rows=rows.map(r=>({...r,status:'Pending',settings:{...defaults,exclusions:[]}}));
    for(const r of state.rows){const prior=previous.get((r.old||0)+':'+(r.new||0));if(prior)for(const k of ['x','y','rotation','scale','exclusions'])r.settings[k]=prior[k];}
    state.activeRow=-1;renderMap();
    for(let i=0;i<state.rows.length;i++){
      if(state.cancelled)break;
      progress(40+60*i/state.rows.length,'Comparing sheet '+(i+1)+' / '+state.rows.length);await yieldUi();
      try{await openRow(i);}catch(e){const r=state.rows[i];r.status='Error';r.error=e.message;r.review=true;r.reason='Sheet comparison failed; inspect the source PDF';renderMap();}
      const r=state.rows[i];if(r.old)(await state.docs.old.getPage(r.old)).cleanup();if(r.new)(await state.docs.new.getPage(r.new)).cleanup();
    }
    const pending=state.rows.filter(r=>r.status==='Pending').length,errors=state.rows.filter(r=>r.status==='Error').length;
    state.batchComplete=!state.cancelled&&!pending&&!errors;
    const chosen=state.rows.findIndex(r=>['Added','Removed'].includes(r.status));
    const first=chosen>=0?chosen:state.rows.findIndex(r=>!['Pending','Error'].includes(r.status));
    if(first>=0)await openRow(first);
    progress(state.batchComplete?100:40+60*(state.rows.length-pending)/state.rows.length,state.cancelled?'Stopped · '+pending+' pending':errors?'Finished with '+errors+' errors':state.rows.length+' sheets compared');
    const review=state.rows.filter(r=>r.review).length;
    status(state.cancelled?'Comparison stopped. '+pending+' sheets still pending; the document result is incomplete.':errors?'Comparison finished with '+errors+' sheet errors. Check the map; a full PDF export is unavailable.':'Whole-document comparison complete. '+state.rows.filter(r=>!r.old).length+' added, '+state.rows.filter(r=>!r.new).length+' removed'+(review?', '+review+' matches to review.':'. Every sheet is accounted for.'));
  }finally{state.job=false;lock(true);}
}
$('compareAll').onclick=()=>run(compareAll);
$('cancel').onclick=()=>{state.cancelled=true;$('cancel').disabled=true;status('Stopping after the current sheet. Pending sheets will remain marked as pending.','busy');};
$('pinPair').onclick=()=>run(async()=>{
  const pin={old:+$('oldPage').value,new:+$('newPage').value};
  const candidate=[...state.pins.filter(p=>p.old!==pin.old),pin];
  state.pins=validatePins(candidate,state.docs.old.numPages,state.docs.new.numPages);await compareAll();
});
$('clearPins').onclick=()=>run(async()=>{state.pins=[];await compareAll();});

function csvCell(s){return '"'+String(/^(\s*[=+\-@]|[\t\r])/.test(String(s))?"'"+s:s).replaceAll('"','""')+'"';}
$('saveMap').onclick=()=>{
  const rows=[['Original page','Revised page','Result','Review match','Similarity (not probability)','Reason','Regions','Original-only pixels','Revised-only pixels','Text changes','DPI','Original file','Revised file','Run complete'],
    ...state.rows.map(r=>[r.old||'',r.new||'',r.status,r.review?'Yes':'No',r.old&&r.new?r.score.toFixed(3):'',r.error||r.reason,r.regions??'',r.removed??'',r.added??'',r.textChanges??'',r.dpi?.toFixed(1)||'',state.names.old,state.names.new,state.batchComplete?'Yes':'No'])];
  download('\ufeff'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8','revision-lens-sheet-map.csv');
};

function packImagePages(pages){
  const enc=new TextEncoder(),objects=[enc.encode('<< /Type /Catalog /Pages 2 0 R >>'),enc.encode('<< /Type /Pages /Count '+pages.length+' /Kids ['+pages.map((_,i)=>(3+i*3)+' 0 R').join(' ')+'] >>')];
  for(const [i,p]of pages.entries()){
    const id=3+i*3,stream='q\n'+p.width.toFixed(3)+' 0 0 '+p.height.toFixed(3)+' 0 0 cm\n/Im0 Do\nQ\n';
    objects.push(enc.encode('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+p.width.toFixed(3)+' '+p.height.toFixed(3)+'] /Resources << /XObject << /Im0 '+(id+1)+' 0 R >> >> /Contents '+(id+2)+' 0 R >>'),
      [enc.encode('<< /Type /XObject /Subtype /Image /Width '+p.pixelsW+' /Height '+p.pixelsH+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+p.jpeg.length+' >>\nstream\n'),p.jpeg,enc.encode('\nendstream')],
      enc.encode('<< /Length '+enc.encode(stream).length+' >>\nstream\n'+stream+'endstream'));
  }
  const parts=[enc.encode('%PDF-1.4\n')],offsets=[0];let length=parts[0].length;
  for(const [i,o]of objects.entries()){offsets.push(length);for(const part of [enc.encode((i+1)+' 0 obj\n'),...(Array.isArray(o)?o:[o]),enc.encode('\nendobj\n')]){parts.push(part);length+=part.length;}}
  parts.push(enc.encode('xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+length+'\n%%EOF'));
  return new Blob(parts,{type:'application/pdf'});
}
$('saveAllPdf').onclick=()=>run(async()=>{
  state.job=true;state.cancelled=false;lock(true);const previous=state.activeRow,parts=[];let bytes=0;
  try{
    for(let i=0;i<state.rows.length;i++){
      if(state.cancelled){status('Export stopped. No partial PDF was saved.');return;}
      progress(100*i/state.rows.length,'Exporting comparison '+(i+1)+' / '+state.rows.length);await openRow(i);await yieldUi();
      const c=exportCanvas(),jpeg=decode(c.toDataURL('image/jpeg',.94).split(',')[1]);bytes+=jpeg.length;
      if(bytes>200*1024*1024)throw new Error('Export exceeds the prototype 200 MB image-data limit. Use a lower render quality and compare again.');
      parts.push({jpeg,pixelsW:c.width,pixelsH:c.height,width:c.width/state.scale,height:c.height/state.scale});c.width=c.height=0;
    }
    if(state.cancelled){status('Export stopped. No partial PDF was saved.');return;}
    download(packImagePages(parts),'application/pdf','revision-lens-all-sheets.pdf');progress(100,'All sheets exported');status('Saved a '+parts.length+'-page comparison PDF, including added and removed sheets.');
  }finally{
    const message=$('status').textContent;state.job=false;
    if(previous>=0)try{await openRow(previous);}catch{}status(message);lock(true);
  }
});
lock(false);
