// Revision Lens comparison engine. MIT license; see LICENSE.txt.
export function inkAt(data, i) {
  return (255 - (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2])) / 255;
}

// Preserve each source image; tint only that revision's changed pixels.
export function highlightSide(source,mask,side) {
  if(source.length!==mask.length*4)throw new Error('Highlight mask dimensions do not match the image.');
  if(!['old','new'].includes(side))throw new Error('Choose old or new for side-by-side highlights.');
  const output=new Uint8ClampedArray(source),target=side==='old'?1:2;
  const colour=side==='old'?[207,44,87]:[0,125,156];
  for(let p=0;p<mask.length;p++)if(mask[p]===target){output[p*4]=colour[0];output[p*4+1]=colour[1];output[p*4+2]=colour[2];output[p*4+3]=255;}
  return output;
}

export function comparePixels(a, b, width, height, {threshold = 0.18, radius = 1, exclusions = []} = {}) {
  const n = width * height;
  if (a.length !== n * 4 || b.length !== n * 4) throw new Error('Image dimensions do not match.');
  const ai = new Float32Array(n), bi = new Float32Array(n);
  for (let p = 0; p < n; p++) { ai[p] = inkAt(a, p * 4); bi[p] = inkAt(b, p * 4); }
  function dilate(input) {
    if (!radius) return input;
    const result = new Float32Array(n);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      let v = input[y * width + x];
      for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && xx < width && yy >= 0 && yy < height) v = Math.max(v, input[yy * width + xx]);
      }
      result[y * width + x] = v;
    }
    return result;
  }
  const ad = dilate(ai), bd = dilate(bi);
  const out = new Uint8ClampedArray(n * 4), mask = new Uint8Array(n);
  const ignored = new Uint8Array(n);
  for (const r of exclusions) {
    const x0 = Math.max(0, Math.floor(r.x * width)), x1 = Math.min(width, Math.ceil((r.x+r.w)*width));
    const y0 = Math.max(0, Math.floor(r.y * height)), y1 = Math.min(height, Math.ceil((r.y+r.h)*height));
    for (let y = y0; y < y1; y++) ignored.fill(1, y * width + x0, y * width + x1);
  }
  let removed = 0, added = 0;
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    let colour;
    if (!ignored[p] && ai[p] > 0.1 && ai[p] - bd[p] > threshold) {
      colour = [207, 44, 87]; mask[p] = 1; removed++;
    } else if (!ignored[p] && bi[p] > 0.1 && bi[p] - ad[p] > threshold) {
      colour = [0, 125, 156]; mask[p] = 2; added++;
    } else {
      const grey = Math.round(255 - Math.max(ai[p], bi[p]) * (ignored[p] ? 45 : 170));
      colour = [grey, grey, grey];
    }
    out[i] = colour[0]; out[i+1] = colour[1]; out[i+2] = colour[2]; out[i+3] = 255;
  }
  return {data: out, mask, removed, added, regions: groupRegions(mask, width, height)};
}

export function groupRegions(mask, width, height, tile = 40, minPixels = 8) {
  const cols = Math.ceil(width / tile), rows = Math.ceil(height / tile);
  const counts = new Uint32Array(cols * rows);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (mask[y * width + x]) counts[Math.floor(y/tile)*cols+Math.floor(x/tile)]++;
  const seen = new Uint8Array(counts.length), regions = [];
  for (let start = 0; start < counts.length; start++) {
    if (!counts[start] || seen[start]) continue;
    const queue = [start]; seen[start] = 1;
    let x0 = cols, y0 = rows, x1 = 0, y1 = 0, pixels = 0;
    for (let at = 0; at < queue.length; at++) {
      const t = queue[at], x = t % cols, y = Math.floor(t / cols);
      x0 = Math.min(x0,x); y0 = Math.min(y0,y); x1 = Math.max(x1,x); y1 = Math.max(y1,y); pixels += counts[t];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx=x+dx, yy=y+dy, idx=yy*cols+xx;
        if (xx>=0 && xx<cols && yy>=0 && yy<rows && counts[idx] && !seen[idx]) { seen[idx]=1; queue.push(idx); }
      }
    }
    if (pixels >= minPixels) regions.push({x:x0*tile,y:y0*tile,w:Math.min(width,(x1+1)*tile)-x0*tile,h:Math.min(height,(y1+1)*tile)-y0*tile,pixels});
  }
  return regions.sort((a,b)=>a.y-b.y || a.x-b.x);
}

// Suggests translation only. Does not infer rotation, scale, or engineering intent.
export function suggestTranslation(a, b, width, height, limit = 30) {
  const points=[];
  for (let y=limit; y<height-limit; y++) for (let x=limit; x<width-limit; x++) {
    if (a[y*width+x] > 0.18) points.push([x,y,a[y*width+x]]);
  }
  if (points.length < 15) throw new Error('Not enough linework for a translation suggestion. Use manual alignment.');
  // A distance field gives narrow lines a smooth search surface at coarse steps.
  const distance=new Float32Array(width*height).fill(width+height);
  for(let p=0;p<b.length;p++)if(b[p]>.18)distance[p]=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const p=y*width+x;if(x)distance[p]=Math.min(distance[p],distance[p-1]+1);if(y)distance[p]=Math.min(distance[p],distance[p-width]+1);
  }
  for(let y=height-1;y>=0;y--)for(let x=width-1;x>=0;x--){
    const p=y*width+x;if(x+1<width)distance[p]=Math.min(distance[p],distance[p+1]+1);if(y+1<height)distance[p]=Math.min(distance[p],distance[p+width]+1);
  }
  const score=(dx,dy)=> {
    let sum=0;
    for (const [x,y,v] of points) sum += Math.min(20,distance[(y-dy)*width+x-dx])*v;
    return sum/points.length;
  };
  let best={x:0,y:0,score:score(0,0)}, step=5;
  for (let y=-limit;y<=limit;y+=step) for (let x=-limit;x<=limit;x+=step) {
    const s=score(x,y); if(s<best.score) best={x,y,score:s};
  }
  const cx=best.x,cy=best.y;
  for(let y=Math.max(-limit,cy-5);y<=Math.min(limit,cy+5);y++) for(let x=Math.max(-limit,cx-5);x<=Math.min(limit,cx+5);x++) {
    const s=score(x,y); if(s<best.score) best={x,y,score:s};
  }
  return best;
}

export function diffLines(oldLines, newLines) {
  const norm=s=>s.replace(/\s+/g,' ').trim();
  const a=oldLines.map(norm).filter(Boolean), b=newLines.map(norm).filter(Boolean);
  if(a.length>1500 || b.length>1500) throw new Error('Text comparison is limited to 1,500 extracted lines per selected page.');
  const cols=b.length+1, table=new Uint16Array((a.length+1)*cols);
  for(let i=a.length-1;i>=0;i--) for(let j=b.length-1;j>=0;j--) table[i*cols+j]=a[i]===b[j]?1+table[(i+1)*cols+j+1]:Math.max(table[(i+1)*cols+j],table[i*cols+j+1]);
  const changes=[]; let i=0,j=0;
  while(i<a.length || j<b.length) {
    if(i<a.length && j<b.length && a[i]===b[j]) {i++;j++;}
    else if(j<b.length && (i===a.length || table[i*cols+j+1]>=table[(i+1)*cols+j])) changes.push({type:'Added',text:b[j++],line:j});
    else changes.push({type:'Removed',text:a[i++],line:i});
  }
  return changes;
}
