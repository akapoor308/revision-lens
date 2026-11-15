// Independent page matching. MIT license; see LICENSE.txt.

// One documented ceiling, shared by the user interface and the matcher.
export const MAX_PAGE_PAIRS=250000;
export function matchingTokens(lines) {
  return new Set(lines.join(' ').toLowerCase()
    .replace(/\b(?:page|sheet|sht)\s*[:#-]?\s*\d+\s*(?:(?:of|\/)\s*\d+)?\b/g,' ')
    .replace(/\b(?:revision|rev)\s*[:.]?\s*[a-z0-9.-]+\b/g,' ')
    .match(/[\p{L}\p{N}][\p{L}\p{N}_.\/-]*/gu)||[]);
}

// Token weights, per-page weight totals and visual norms are computed once, so a
// page pair costs one pass over the smaller token set instead of building a union
// set per pair. This keeps large stacks responsive.
function prepare(pages) {
  const df=new Map();
  for(const p of pages) for(const t of p.tokens)df.set(t,(df.get(t)||0)+1);
  const weights=new Map();
  for(const [token,count] of df)weights.set(token,Math.pow(Math.log(1+pages.length/count),2));
  const prepared=pages.map(page=>{
    let total=0;
    for(const t of page.tokens)total+=weights.get(t);
    let square=0;
    for(let i=0;i<page.visual.length;i++)square+=page.visual[i]**2;
    return {page,total,norm:Math.sqrt(square)};
  });
  return {weights,prepared};
}

export function similarityMatrix(oldPages,newPages) {
  const {weights,prepared}=prepare([...oldPages,...newPages]);
  const left=prepared.slice(0,oldPages.length),right=prepared.slice(oldPages.length);
  return left.map(a=>right.map(b=>{
    const small=a.page.tokens.size<=b.page.tokens.size?a.page.tokens:b.page.tokens;
    const large=small===a.page.tokens?b.page.tokens:a.page.tokens;
    let intersection=0;
    for(const t of small)if(large.has(t))intersection+=weights.get(t);
    const union=Math.max(intersection,a.total+b.total-intersection);
    let dot=0;const av=a.page.visual,bv=b.page.visual;
    for(let p=0;p<av.length;p++)dot+=av[p]*bv[p];
    const visual=a.norm&&b.norm?Math.max(0,Math.min(1,dot/(a.norm*b.norm))):(!a.norm&&!b.norm?1:0);
    const aspect=Math.min(a.page.aspect,b.page.aspect)/Math.max(a.page.aspect,b.page.aspect);
    const bothText=a.page.tokens.size>=5&&b.page.tokens.size>=5;
    return Math.max(0,Math.min(1,(bothText?.68*(union?intersection/union:1)+.32*visual:visual)*aspect));
  }));
}

export function validatePins(pins,oldCount,newCount) {
  const sorted=[...pins].sort((a,b)=>a.old-b.old);let lastOld=0,lastNew=0;
  for(const p of sorted){
    if(!Number.isInteger(p.old)||!Number.isInteger(p.new)||p.old<1||p.old>oldCount||p.new<1||p.new>newCount)throw new Error('Choose a real page from each file to pin a match.');
    if(p.old<=lastOld||p.new<=lastNew)throw new Error('Pinned matches must be unique and in page order. Clear conflicting pins before rematching.');
    lastOld=p.old;lastNew=p.new;
  }
  return sorted;
}

// Global, order-preserving alignment with explicit gaps. Page numbers are output,
// never the content identity. Weak pairs are left unmatched instead of forced.
export function alignPageScores(scores,oldCount,newCount,{minimum=.56,pins=[]}={}) {
  if(oldCount*newCount>MAX_PAGE_PAIRS)throw new Error('Revision Lens compares up to '+MAX_PAGE_PAIRS.toLocaleString()+' page-pair candidates at a time. Split very large documents first.');
  const anchors=validatePins(pins,oldCount,newCount),out=[];
  function segment(a0,a1,b0,b1){
    const n=a1-a0,m=b1-b0,cols=m+1;
    const values=new Float32Array((n+1)*cols),directions=new Uint8Array(values.length);
    for(let i=1;i<=n;i++)directions[i*cols]=1;
    for(let j=1;j<=m;j++)directions[j]=2;
    for(let i=1;i<=n;i++)for(let j=1;j<=m;j++){
      const k=i*cols+j,sim=scores[a0+i-1][b0+j-1];
      let best=values[(i-1)*cols+j],dir=1;
      if(values[i*cols+j-1]>best+1e-6){best=values[i*cols+j-1];dir=2;}
      const paired=sim>=minimum?values[(i-1)*cols+j-1]+sim-minimum:-Infinity;
      if(paired>best+1e-6 || Math.abs(paired-best)<1e-6){best=paired;dir=3;}
      values[k]=best;directions[k]=dir;
    }
    const reversed=[];let i=n,j=m;
    while(i||j){const d=directions[i*cols+j];if(d===3){reversed.push({old:a0+i,new:b0+j,score:scores[a0+i-1][b0+j-1]});i--;j--;}
      else if(d===1){reversed.push({old:a0+i,new:null,score:0});i--;}
      else {reversed.push({old:null,new:b0+j,score:0});j--;}}
    for(const row of reversed.reverse())out.push(row);
  }
  let a=0,b=0;
  for(const p of anchors){segment(a,p.old-1,b,p.new-1);out.push({old:p.old,new:p.new,score:scores[p.old-1][p.new-1],pinned:true});a=p.old;b=p.new;}
  segment(a,oldCount,b,newCount);
  for(const row of out){
    if(row.pinned){row.review=false;row.reason='Match pinned by reviewer';continue;}
    if(row.old&&row.new){
      const alternatives=[...scores[row.old-1].filter((_,j)=>j!==row.new-1),...scores.map((r,i)=>i===row.old-1?-1:r[row.new-1])];
      const alternative=alternatives.reduce((best,s)=>Math.max(best,s),-1);
      row.review=row.score<.76||alternative>=row.score-.045;
      row.reason=row.score<.76?'Low similarity; inspect this pairing':alternative>=row.score-.045?'Other sheets look similar; confirm this pairing':'Content and sequence agree';
    }else{
      const candidates=row.old?scores[row.old-1]:scores.map(r=>r[row.new-1]);
      const best=candidates.reduce((best,s)=>Math.max(best,s),0);
      row.review=best>=minimum-.04;
      row.reason=row.review?'Possible alternative match; confirm added/removed status':'No sufficiently similar sheet in document order';
    }
  }
  return out;
}

export function matchPages(oldPages,newPages,options={}) {
  const scores=similarityMatrix(oldPages,newPages);
  const rows=alignPageScores(scores,oldPages.length,newPages.length,options);
  for(const row of rows){
    if(!row.pinned&&((row.old&&oldPages[row.old-1].blank)||(row.new&&newPages[row.new-1].blank))){row.review=true;row.reason='Blank or near-blank sheet; confirm its position';}
  }
  return rows;
}
