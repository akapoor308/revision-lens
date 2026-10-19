// Independent page matching. MIT license; see LICENSE.txt.
export function matchingTokens(lines) {
  return new Set(lines.join(' ').toLowerCase()
    .replace(/\b(?:page|sheet|sht)\s*[:#-]?\s*\d+\s*(?:(?:of|\/)\s*\d+)?\b/g,' ')
    .replace(/\b(?:revision|rev)\s*[:.]?\s*[a-z0-9.-]+\b/g,' ')
    .match(/[\p{L}\p{N}][\p{L}\p{N}_.\/-]*/gu)||[]);
}

export function similarityMatrix(oldPages,newPages) {
  const pages=[...oldPages,...newPages],df=new Map();
  for(const p of pages) for(const t of p.tokens)df.set(t,(df.get(t)||0)+1);
  const weight=t=>Math.pow(Math.log(1+pages.length/(df.get(t)||1)),2);
  return oldPages.map(a=>newPages.map(b=>{
    let intersection=0,union=0;
    for(const t of new Set([...a.tokens,...b.tokens])){const w=weight(t);union+=w;if(a.tokens.has(t)&&b.tokens.has(t))intersection+=w;}
    let dot=0,aa=0,bb=0;
    for(let p=0;p<a.visual.length;p++){dot+=a.visual[p]*b.visual[p];aa+=a.visual[p]**2;bb+=b.visual[p]**2;}
    const visual=aa&&bb?Math.max(0,Math.min(1,dot/Math.sqrt(aa*bb))):(!aa&&!bb?1:0);
    const aspect=Math.min(a.aspect,b.aspect)/Math.max(a.aspect,b.aspect);
    const bothText=a.tokens.size>=5&&b.tokens.size>=5;
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
  if((oldCount+1)*(newCount+1)>4000000)throw new Error('This prototype supports at most 4 million page-pair candidates. Split very large documents first.');
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
