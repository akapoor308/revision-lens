import {chromium} from 'playwright';
import path from 'node:path';
export const fixture=name=>path.join(process.cwd(),'test-fixtures',name);
export function launchBrowser(){
  const selection=process.env.REVISION_LENS_BROWSER?{executablePath:process.env.REVISION_LENS_BROWSER}:process.platform==='win32'?{channel:'chrome'}:{};
  return chromium.launch({...selection,headless:true});
}
