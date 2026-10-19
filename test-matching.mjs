import test from 'node:test';
import assert from 'node:assert/strict';
import {alignPageScores,matchingTokens,matchPages} from './source/matching.mjs';
const mapping=(a,b)=>alignPageScores(a.map(x=>b.map(y=>x===y?1:.1)),a.length,b.length);
const ids=n=>Array.from({length:n},(_,i)=>'sheet-'+(i+1));
test('19 to 20: insertion at page 5 shifts original 5 to revised 6',()=>{
  const a=ids(19),b=[...a.slice(0,4),'new-sheet',...a.slice(4)],rows=mapping(a,b);
  assert.equal(rows.length,20);assert.deepEqual(rows.filter(r=>!r.old).map(r=>r.new),[5]);
  for(const r of rows.filter(r=>r.old))assert.equal(r.new,r.old<5?r.old:r.old+1);
});
test('20 to 19: deletion restores subsequent pairing',()=>{
  const a=ids(20),b=a.filter((_,i)=>i!==4),rows=mapping(a,b);
  assert.deepEqual(rows.filter(r=>!r.new).map(r=>r.old),[5]);assert.equal(rows.find(r=>r.old===6).new,5);
});
test('Same page counts can contain both an insertion and deletion',()=>{
  const a=ids(19),b=[...a.slice(0,4),'new-sheet',...a.slice(4)].filter(x=>x!=='sheet-12'),rows=mapping(a,b);
  assert.equal(rows.filter(r=>!r.old).length,1);assert.equal(rows.filter(r=>!r.new).length,1);
  assert.equal(rows.find(r=>r.old===5).new,6);assert.equal(rows.find(r=>r.old===19).new,19);
});
test('Insertions at both ends and an empty document',()=>{
  const rows=mapping(['a','b'],['front','a','b','end']);assert.deepEqual(rows.filter(r=>!r.old).map(r=>r.new),[1,4]);
  assert.equal(alignPageScores([],0,3).length,3);
});
test('Unrelated pages remain unmatched',()=>{const rows=alignPageScores([[.1,.2],[.2,.1]],2,2);assert.equal(rows.filter(r=>r.old&&r.new).length,0);});
test('Duplicate pages are explicitly flagged as ambiguous',()=>{const rows=alignPageScores([[1,1,1],[1,1,1]],2,3);assert.ok(rows.filter(r=>r.old&&r.new).every(r=>r.review));});
test('Reviewer pins resolve ambiguous order and reject crossing assignments',()=>{
  const rows=alignPageScores([[1,1,1],[1,1,1]],2,3,{pins:[{old:1,new:1},{old:2,new:3}]});
  assert.equal(rows.find(r=>!r.old).new,2);assert.ok(rows.filter(r=>r.pinned).every(r=>!r.review));
  assert.throws(()=>alignPageScores([[1,1],[1,1]],2,2,{pins:[{old:1,new:2},{old:2,new:1}]}),/page order/);
});
test('Page counters and revision letters do not define text identity',()=>{
  assert.deepEqual(matchingTokens(['DEMO-1042 bracket Revision A Page 5 / 19']),matchingTokens(['DEMO-1042 bracket Revision B Page 6 / 20']));
  assert.notDeepEqual(matchingTokens(['DIA 26']),matchingTokens(['DIA 36']));
});
test('Blank pages are review items even when identical',()=>{
  const p={tokens:new Set(),visual:new Float32Array(4),aspect:1,blank:true};const rows=matchPages([p],[p]);assert.equal(rows[0].review,true);
});
