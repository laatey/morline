import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { tools, runTool } from './tools.js';
export function createApp({apiUrl,resourceUrl,secret,origins=[],fetchImpl=fetch}) {
 const api=new URL(apiUrl), resource=new URL(resourceUrl);
 if(!secret || secret.length<32) throw new Error('MCP_SHARED_SECRET must have at least 32 characters');
 if(!['https:','http:'].includes(api.protocol) || !['https:','http:'].includes(resource.protocol)) throw new Error('Invalid service URL');
 const issuer=api.origin, base=api.href.replace(/\/$/,''), app=express();
 app.disable('x-powered-by'); app.use(express.json({limit:'1mb'}));
 app.use((req,res,next)=>{
  if(req.headers.host!==resource.host && req.headers.host!=='127.0.0.1:'+process.env.PORT && req.headers.host!=='localhost:'+process.env.PORT) return res.status(403).end();
  const origin=req.headers.origin;
  if(origin && !origins.includes(origin)) return res.status(403).json({error:'Origin not allowed'});
  if(origin) {res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type, MCP-Protocol-Version');res.setHeader('Access-Control-Allow-Methods','POST, GET, DELETE, OPTIONS');res.setHeader('Access-Control-Expose-Headers','WWW-Authenticate');}
  if(req.method==='OPTIONS') return res.status(204).end(); next();
 });
 const metadata={resource:resource.href,authorization_servers:[issuer],scopes_supported:['morline:read','morline:write'],bearer_methods_supported:['header'],resource_name:'Morline'};
 const metadataPath='/.well-known/oauth-protected-resource'+resource.pathname.replace(/\/$/,'');
 app.get(metadataPath,(_req,res)=>res.json(metadata));
 app.get('/.well-known/oauth-protected-resource',(_req,res)=>res.json(metadata));
 const post=async (path,fields)=>{
  const r=await fetchImpl(`${base}/oauth/${path}`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Morline-MCP-Secret':secret},body:new URLSearchParams(fields),redirect:'error',signal:AbortSignal.timeout(15_000)});
  if(!r.ok) throw new Error('Authorization service rejected request'); return r.json();
 };
 app.post(resource.pathname,async(req,res)=>{
  let server,transport;
  try {
   const authorization=req.headers.authorization;
   const token=authorization?.startsWith('Bearer ')?authorization.slice(7):'';
   if(!token) {res.setHeader('WWW-Authenticate',`Bearer resource_metadata="${resource.origin}${metadataPath}"`); return res.status(401).json({error:'Sign in required'});}
   const grant=await post('introspect',{token});
   if(!grant.active || grant.aud!==resource.href) {res.setHeader('WWW-Authenticate',`Bearer error="invalid_token", resource_metadata="${resource.origin}${metadataPath}"`);return res.status(401).json({error:'Invalid or expired OAuth token'});}
   const exchanged=await post('token',{grant_type:'urn:ietf:params:oauth:grant-type:token-exchange',subject_token:token,subject_token_type:'urn:ietf:params:oauth:token-type:access_token',resource:base});
   const call=async(method,path,body)=>{
    const r=await fetchImpl(`${base}${path}`,{method,headers:{Authorization:`Bearer ${exchanged.access_token}`,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:'error',signal:AbortSignal.timeout(30_000)});
    if(!r.ok) throw new Error(`Morline API returned ${r.status}; access denied or action failed`);
    return r.status===204?{}:r.json();
   };
   server=new McpServer({name:'morline',version:'1.0.0'});
   for(const [name,description,inputSchema,route] of tools) {
    const readOnly=route===undefined || !['deploy_service','restart_service','stop_service','set_variables','analyze_deployment','create_fix_pull_request'].includes(name);
    if(!(grant.scope||'').split(' ').includes(readOnly?'morline:read':'morline:write')) continue;
    server.registerTool(name,{description,inputSchema,annotations:{readOnlyHint:readOnly,destructiveHint:!readOnly,idempotentHint:readOnly,openWorldHint:true}},async args=>{
     try { const result=await runTool(name,args,call);return {content:[{type:'text',text:JSON.stringify(result)}]}; }
     catch {return {isError:true,content:[{type:'text',text:'This action failed or is not permitted. Check your Morline account and service.'}]};}
    });
   }
   transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
   await server.connect(transport);
   res.on('close',()=>{void transport.close();void server.close();});
   await transport.handleRequest(req,res,req.body);
  } catch {if(!res.headersSent)res.status(503).json({error:'Morline authorization or API service is unavailable'});}
 });
 app.get(resource.pathname,(_req,res)=>res.status(405).end());
 app.delete(resource.pathname,(_req,res)=>res.status(405).end());
 app.use((err,req,res,next)=>{if(!res.headersSent)res.status(400).json({error:'Invalid request'});});
 return app;
}
if(process.argv[1] && import.meta.url===new URL(`file://${process.argv[1]}`).href) {
 const app=createApp({apiUrl:process.env.MORLINE_API_URL||'https://api.morline.space/v1',resourceUrl:process.env.MCP_RESOURCE_URL,secret:process.env.MCP_SHARED_SECRET,origins:(process.env.MCP_ALLOWED_ORIGINS||'').split(',').filter(Boolean)});
 const port=Number(process.env.PORT||3002); app.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Morline MCP listening on port ${port}`));
}
