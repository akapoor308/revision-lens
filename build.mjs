import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const out=path.resolve(root,process.argv[2]||'dist');
await fs.mkdir(out,{recursive:true});
// The worker runs in its own global scope, so it gets the same offline lock as
// the page: the CSP refuses outbound connections and these APIs cannot try.
const workerLock="(function(){var refuse=function(n){return function(){throw new Error('Revision Lens runs offline: '+n+' is disabled.');};};var names=['fetch','XMLHttpRequest','WebSocket','EventSource','importScripts'];for(var i=0;i<names.length;i++){try{Object.defineProperty(self,names[i],{value:refuse(names[i]),writable:false,configurable:false});}catch(e){}}})();\n";
// A classic script, not a module: Chrome refuses a module worker created from a
// blob URL on a file:// page, which silently pushed all PDF parsing onto the
// main thread. A classic blob worker loads, so parsing really runs in parallel.
const workerBundle=(await build({entryPoints:[path.join(root,'node_modules/pdfjs-dist/build/pdf.worker.mjs')],bundle:true,format:'iife',platform:'browser',target:'es2024',minify:true,write:false})).outputFiles[0].text;
if(!workerBundle.includes('pdfjsWorker'))throw new Error('Worker bundle no longer publishes globalThis.pdfjsWorker.');
const worker=Buffer.from(workerLock+workerBundle,'utf8');
const app=(await build({entryPoints:[path.join(root,'source/app.mjs')],bundle:true,format:'iife',platform:'browser',target:'es2024',minify:false,write:false})).outputFiles[0].text;
const assets={};
for(const dir of ['cmaps','standard_fonts','wasm']){
  for(const name of await fs.readdir(path.join(root,'node_modules/pdfjs-dist',dir))){
    if(name.startsWith('LICENSE')||name.endsWith('.js'))continue;
    assets[dir+'/'+name]=(await fs.readFile(path.join(root,'node_modules/pdfjs-dist',dir,name))).toString('base64');
  }
}
let html=await fs.readFile(path.join(root,'source/template.html'),'utf8');
const safe=s=>s.replace(/<\/script/gi,'<\\/script');
const style=await fs.readFile(path.join(root,'source/style.css'),'utf8');
html=html.replace('/*STYLE*/',()=>style).replace('/*ASSETS*/',()=>safe(JSON.stringify(assets))).replace('/*WORKER*/',()=>JSON.stringify(Buffer.from(worker).toString('base64'))).replace('/*APP*/',()=>safe(app));
await fs.writeFile(path.join(out,'Revision Lens.html'),html);
await fs.mkdir(path.join(out,'licenses'),{recursive:true});
await fs.copyFile(path.join(root,'node_modules/pdfjs-dist/LICENSE'),path.join(out,'licenses/PDFJS-APACHE-2.0.txt'));
for(const dir of ['cmaps','standard_fonts','wasm','iccs']){
  for(const name of await fs.readdir(path.join(root,'node_modules/pdfjs-dist',dir))){
    if(name.startsWith('LICENSE'))await fs.copyFile(path.join(root,'node_modules/pdfjs-dist',dir,name),path.join(out,'licenses',dir+'-'+name+'.txt'));
  }
}
console.log('Built self-contained HTML:',Math.round(Buffer.byteLength(html)/1024),'KB');
