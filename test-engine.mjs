import test from 'node:test';
import assert from 'node:assert/strict';
import {comparePixels,suggestTranslation,diffLines,highlightSide} from './source/engine.mjs';
function image(w,h,rects=[]){const a=new Uint8ClampedArray(w*h*4).fill(255);for(const [x,y,rw,rh] of rects)for(let yy=y;yy<y+rh;yy++)for(let xx=x;xx<x+rw;xx++){const p=(yy*w+xx)*4;a[p]=a[p+1]=a[p+2]=0;}return a;}
test('Identical linework produces no changes',()=>{const a=image(90,80,[[20,20,30,4]]),r=comparePixels(a,a,90,80);assert.equal(r.added+r.removed,0);assert.equal(r.regions.length,0);});
test('An added feature and a removed feature are distinguished',()=>{const a=image(120,100,[[10,10,10,10]]),b=image(120,100,[[90,70,10,10]]),r=comparePixels(a,b,120,100,{radius:0});assert.equal(r.removed,100);assert.equal(r.added,100);assert.equal(r.regions.length,2);});
test('An excluded title block does not count as a visual change',()=>{const a=image(100,100),b=image(100,100,[[80,80,10,10]]);const r=comparePixels(a,b,100,100,{exclusions:[{x:.75,y:.75,w:.25,h:.25}]});assert.equal(r.added,0);});
test('Translation suggestion recovers a known offset',()=>{const w=120,h=100,a=new Float32Array(w*h),b=new Float32Array(w*h);for(let y=30;y<65;y++)for(let x=35;x<70;x++){if(x===35||y===30||x===69||y===64){a[y*w+x]=1;b[(y+4)*w+x+7]=1;}}const r=suggestTranslation(a,b,w,h,15);assert.equal(r.x,-7);assert.equal(r.y,-4);});
test('Report diff detects a changed quantity and added part',()=>{const r=diffLines(['Part Qty','DEMO-1 4','DEMO-2 2'],['Part Qty','DEMO-1 6','DEMO-2 2','DEMO-3 1']);assert.ok(r.some(c=>c.type==='Removed'&&c.text==='DEMO-1 4'));assert.ok(r.some(c=>c.type==='Added'&&c.text==='DEMO-1 6'));assert.ok(r.some(c=>c.type==='Added'&&c.text==='DEMO-3 1'));});
test('Antialias tolerance suppresses a one-pixel displacement',()=>{const a=image(80,80,[[20,20,3,25]]),b=image(80,80,[[21,20,3,25]]);assert.ok(comparePixels(a,b,80,80,{radius:0}).added>0);assert.equal(comparePixels(a,b,80,80,{radius:1}).added,0);});
test('Split highlights tint removals on the left and additions on the right only',()=>{
  const a=image(100,100,[[10,10,10,10],[40,40,10,10]]),b=image(100,100,[[70,70,10,10],[40,40,10,10]]);
  const {mask}=comparePixels(a,b,100,100,{radius:0});
  const left=highlightSide(a,mask,'old'),right=highlightSide(b,mask,'new');
  const at=(d,x,y)=>Array.from(d.slice((y*100+x)*4,(y*100+x)*4+3));
  assert.deepEqual(at(left,12,12),[207,44,87]);assert.deepEqual(at(right,72,72),[0,125,156]);
  assert.deepEqual(at(left,72,72),[255,255,255]);assert.deepEqual(at(right,12,12),[255,255,255]);
  assert.deepEqual(at(left,42,42),[0,0,0]);assert.deepEqual(at(right,42,42),[0,0,0]);
  assert.deepEqual(at(a,12,12),[0,0,0]);
});
