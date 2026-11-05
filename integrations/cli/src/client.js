import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
export const API = (process.env.MORLINE_API_URL || 'https://api.morline.space/v1').replace(/\/$/,'');
export const home = process.env.MORLINE_CONFIG_DIR || path.join(os.homedir(),'.config','morline');
export const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function saveSession(session) {
 await fs.mkdir(home,{recursive:true,mode:0o700}); await fs.chmod(home,0o700);
 const dest=path.join(home,'session.json'), temp=dest+'.'+process.pid+'.tmp';
 await fs.writeFile(temp,JSON.stringify(session),{mode:0o600}); await fs.rename(temp,dest); await fs.chmod(dest,0o600);
}
export async function readSession() {
 try {const value=JSON.parse(await fs.readFile(path.join(home,'session.json'),'utf8')); if(value.api!==API) throw new Error('Account belongs to another API. Run morline login.'); return value;}
 catch(e) {if(e.code==='ENOENT') throw new Error('Sign in first: morline login');throw e;}
}
export async function oauth(fields,{fetchImpl=fetch}={}) {
 const r=await fetchImpl(`${API}/oauth/token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(fields),redirect:'error',signal:AbortSignal.timeout(20_000)});
 const data=await r.json(); if(!r.ok) {const e=new Error(data.error || `Sign-in failed (${r.status})`);e.code=data.error;throw e;}return data;
}
export async function apiRequest(method,url,body,{fetchImpl=fetch,sessionReader=readSession,sessionWriter=saveSession}={}) {
 let session=await sessionReader();
 const refresh=async()=>{const t=await oauth({grant_type:'refresh_token',client_id:'morline-cli',refresh_token:session.refresh_token,resource:API},{fetchImpl}); session={...session,...t,expiresAt:Date.now()+t.expires_in*1000};await sessionWriter(session);};
 if(session.expiresAt<Date.now()+30_000) await refresh();
 const send=()=>fetchImpl(`${API}${url}`,{method,headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:'error',signal:AbortSignal.timeout(30_000)});
 let response=await send(); if(response.status===401) {await refresh();response=await send();}
 if(!response.ok) throw new Error(`Morline request failed (${response.status}). Check permissions or service status.`);
 return response.status===204?{}:response.json();
}
export async function deviceLogin({fetchImpl=fetch,wait=delay,output=console.log}={}) {
 const r=await fetchImpl(`${API}/oauth/device/code`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:'morline-cli',scope:'morline:read morline:write',resource:API}),redirect:'error',signal:AbortSignal.timeout(20_000)});
 if(!r.ok) throw new Error('Could not start OAuth sign-in. Install the backend OAuth patch first.');
 const d=await r.json(); const target=new URL(d.verification_uri_complete);
 if(target.protocol!=='https:' && !['localhost','127.0.0.1'].includes(target.hostname)) throw new Error('Unsafe sign-in URL');
 output(`Open ${target.href}\nConfirm code: ${d.user_code}\nOnly approve if this code matches your terminal.`);
 let interval=Math.max(5,d.interval||5)*1000;const deadline=Date.now()+Math.min(600,d.expires_in)*1000;
 while(Date.now()<deadline) {
  await wait(interval);
  try {const t=await oauth({grant_type:'urn:ietf:params:oauth:grant-type:device_code',client_id:'morline-cli',device_code:d.device_code},{fetchImpl});return {...t,api:API,expiresAt:Date.now()+t.expires_in*1000};}
  catch(e) {if(e.code==='authorization_pending')continue;if(e.code==='slow_down'){interval+=5000;continue;}throw e;}
 }
 throw new Error('Sign-in code expired. Run morline login again.');
}
export async function logout() {
 const s=await readSession();
 const r=await fetch(`${API}/oauth/revoke`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:'morline-cli',token:s.refresh_token,token_type_hint:'refresh_token'}),redirect:'error',signal:AbortSignal.timeout(20_000)});
 if(!r.ok) throw new Error('Revocation failed. Your local credentials were kept so you can retry.');
 await fs.rm(path.join(home,'session.json'),{force:true});
}
export async function linkService(serviceId,call=apiRequest) {
 const service=await call('GET',`/services/${encodeURIComponent(serviceId)}`);
 const config={api:API,serviceId:service.id||serviceId};await fs.mkdir('.morline',{recursive:true});await fs.writeFile('.morline/project.json',JSON.stringify(config,null,2)+'\n');return config;
}
export async function linkedService() {
 try {const c=JSON.parse(await fs.readFile('.morline/project.json','utf8'));if(c.api!==API || !c.serviceId)throw new Error('Invalid link');return c.serviceId;}
 catch {throw new Error('Link this directory first: morline link SERVICE_ID');}
}
export async function followDeployment(id,call=apiRequest,wait=delay,output=console.log) {
 const seen=new Set(); let cursor;
 while(true) {
  let more=true;
  while(more) {
   const page=await call('GET',`/deployments/${encodeURIComponent(id)}/logs?limit=100${cursor?`&cursor=${encodeURIComponent(cursor)}`:''}`);
   for(const line of page.data||[]) {const key=line.id||JSON.stringify(line);if(!seen.has(key)){seen.add(key);output(line.message||JSON.stringify(line));}}
   more=Boolean(page.nextCursor && page.nextCursor!==cursor);if(more)cursor=page.nextCursor;
  }
  const d=await call('GET',`/deployments/${encodeURIComponent(id)}`);
  if(['active','failed','crashed','cancelled','removed'].includes(d.state)){output(`Deployment: ${d.state}`);if(['failed','crashed','cancelled'].includes(d.state))throw new Error(`Deployment ${d.state}`);return d;}
  await wait(2000);
 }
}
