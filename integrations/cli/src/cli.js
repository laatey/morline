#!/usr/bin/env node
import fs from 'node:fs/promises';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { apiRequest as call,deviceLogin,saveSession,logout,linkService,linkedService,followDeployment,delay } from './client.js';
const help=`Morline CLI — OAuth sign-in\n\n  login                      Sign in using a browser confirmation code\n  logout                     Revoke this CLI grant\n  whoami                     Show the signed-in account\n  projects TEAM_ID           List team projects\n  services ENVIRONMENT_ID    List environment services\n  link SERVICE_ID            Link this directory to a remote service\n  deploy [-f] [-y]           Deploy remote GitHub/image configuration\n  logs DEPLOYMENT_ID [-f]    Print deployment logs; -f follows until complete\n  vars                      List variable names (values redacted)\n  vars set KEY              Read a value from standard input and upsert it\n  vars delete KEY [-y]      Delete a variable\n  restart [-y]              Restart linked service\n  stop [-y]                 Stop linked service\n  diagnose DEPLOYMENT_ID     Start AI diagnosis\n  diagnosis DEPLOYMENT_ID    Read AI diagnosis\n  pr DEPLOYMENT_ID [-y]      Create a proposed fix pull request\n\n  --service SERVICE_ID       Override directory link\n  --json                    Print JSON results\n\nMORLINE_API_URL selects API (default https://api.morline.space/v1).\nNo local source upload: deploy builds the service's configured remote source.`;
const args=process.argv.slice(2), command=args.shift(), json=args.includes('--json'), yes=args.includes('-y')||args.includes('--yes');
const idx=args.indexOf('--service'), override=idx>=0?args[idx+1]:undefined;
if(idx>=0)args.splice(idx,2);
const positional=args.filter(a=>!a.startsWith('-')), enc=encodeURIComponent;
const print=value=>console.log(JSON.stringify(value,null,2));
async function confirm(message) {
 if(yes)return;if(!stdin.isTTY)throw new Error('This action needs confirmation. Pass --yes to approve.');
 const reader=readline.createInterface({input:stdin,output:stdout});try {if((await reader.question(`${message} [y/N] `)).toLowerCase()!=='y')throw new Error('Cancelled');}finally{reader.close();}
}
async function service() {return override||linkedService();}
async function main() {
 if(!command||command==='help'||command==='--help'){console.log(help);return;}
 if(command==='login'){await saveSession(await deviceLogin());console.log('Signed in.');return;}
 if(command==='logout'){await logout();console.log('Signed out and grant revoked.');return;}
 if(command==='whoami'){print(await call('GET','/me'));return;}
 if(command==='projects'||command==='services'){
  if(!positional[0])throw new Error('A team or environment ID is required.');
  print(await call('GET',command==='projects'?`/teams/${enc(positional[0])}/projects`:`/environments/${enc(positional[0])}/services`));return;
 }
 if(command==='link'){if(!positional[0])throw new Error('Service ID is required.');print(await linkService(positional[0]));return;}
 if(command==='deploy'){
  const id=await service();await confirm('Deploy the remote service configuration?');const d=await call('POST',`/services/${enc(id)}/deployments`,{});print(d);
  if(args.includes('-f')||args.includes('--follow'))await followDeployment(d.id);return;
 }
 if(command==='logs'){
  if(!positional[0])throw new Error('Deployment ID is required.');
  if(args.includes('-f')||args.includes('--follow'))await followDeployment(positional[0]);else {const r=await call('GET',`/deployments/${enc(positional[0])}/logs?limit=100`);if(json)print(r);else for(const l of r.data||[])console.log(l.message);}return;
 }
 if(command==='vars'){
  const id=await service(), action=positional[0];
  if(!action){const r=await call('GET',`/services/${enc(id)}/variables`);print({data:(r.data||[]).map(v=>({key:v.key,secret:Boolean(v.secret),value:'[redacted]'}))});return;}
  const key=positional[1];if(!key)throw new Error('Variable key is required.');
  if(action==='set'){
   if(stdin.isTTY)throw new Error('Pipe the value via standard input; do not pass secrets as command arguments.');
   let value='';for await(const chunk of stdin){value+=chunk;if(value.length>65536)throw new Error('Variable value is too large.');}value=value.replace(/\r?\n$/,'');
   await call('POST',`/services/${enc(id)}/variables`,{variables:[{key,value,secret:true}]});console.log(`Updated ${key}. Redeploy to apply.`);return;
  }
  if(action==='delete'){await confirm(`Delete variable ${key}?`);await call('DELETE',`/services/${enc(id)}/variables/${enc(key)}`);console.log('Variable deleted. Redeploy to apply.');return;}
  throw new Error('Use vars, vars set KEY, or vars delete KEY.');
 }
 if(command==='restart'||command==='stop'){const id=await service();await confirm(`${command} service ${id}?`);print(await call('POST',`/services/${enc(id)}/${command}`,{}));return;}
 if(['diagnose','diagnosis','pr'].includes(command)){
  const id=positional[0];if(!id)throw new Error('Deployment ID is required.');
  if(command==='pr')await confirm('Create a fix pull request?');
  print(await call(command==='diagnosis'?'GET':'POST',`/deployments/${enc(id)}/diagnosis${command==='pr'?'/pull-request':''}`,command==='diagnosis'?undefined:{}));return;
 }
 throw new Error(`Unknown command: ${command}. Run morline help.`);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
