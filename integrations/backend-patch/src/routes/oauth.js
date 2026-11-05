import express from 'express';
import crypto from 'node:crypto';
import { queryOne, queryAll, execute } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { FRONTEND_URL } from '../config.js';
import { issuer, apiResource, mcpResource, hash, random, check, scope, resource, client, redirectAllowed, createGrant, activeToken, issue, confidential, verificationUri, transaction, cleanup, OAuthError } from '../services/oauth.js';
const router = express.Router();
export function oauthMetadata() { const base = `${issuer()}/v1/oauth`; return { issuer: issuer(), authorization_endpoint: `${base}/authorize`, token_endpoint: `${base}/token`, registration_endpoint: `${base}/register`, revocation_endpoint: `${base}/revoke`, device_authorization_endpoint: `${base}/device/code`, response_types_supported: ['code'], grant_types_supported: ['authorization_code', 'refresh_token', 'urn:ietf:params:oauth:grant-type:device_code'], code_challenge_methods_supported: ['S256'], token_endpoint_auth_methods_supported: ['none'], scopes_supported: ['morline:read','morline:write'] }; }
router.use((req,res,next) => { res.setHeader('Cache-Control','no-store'); next(); });
const wrap = fn => (req,res,next) => { try { cleanup(); fn(req,res); } catch(e) { if (e instanceof OAuthError) return res.status(e.status).json({error:e.code}); next(e); } };
router.post('/register', wrap((req,res) => {
  const { redirect_uris: redirects, client_name: name = 'External assistant', token_endpoint_auth_method: method = 'none' } = req.body;
  check(method === 'none' && Array.isArray(redirects) && redirects.length > 0 && redirects.length <= 10 && redirects.every(redirectAllowed), 'invalid_client_metadata');
  check(typeof name === 'string' && name.length > 0 && name.length <= 100, 'invalid_client_metadata');
  const id = random('moc_'); execute('INSERT INTO oauth_clients VALUES (?,?,?,?)', id,name,JSON.stringify(redirects),Date.now());
  res.status(201).json({client_id:id,client_name:name,redirect_uris:redirects,token_endpoint_auth_method:'none',grant_types:['authorization_code','refresh_token'],response_types:['code']});
}));
router.get('/authorize', wrap((req,res) => {
  const q = req.query, c = client(q.client_id);
  check(q.response_type === 'code' && typeof q.redirect_uri === 'string' && JSON.parse(c.redirects).includes(q.redirect_uri));
  check(q.code_challenge_method === 'S256' && typeof q.code_challenge === 'string' && /^[A-Za-z0-9_-]{43}$/.test(q.code_challenge));
  check(typeof q.state === 'string' && q.state.length >= 16 && q.state.length <= 512);
  const id = random('req_'); execute('INSERT INTO oauth_requests VALUES (?,?,?,?,?,?,?,?)', id,c.id,q.redirect_uri,q.state,q.code_challenge,scope(q.scope),resource(q.resource),Date.now()+600_000);
  res.redirect(`${FRONTEND_URL.replace(/\/$/,'')}/oauth/consent?request=${encodeURIComponent(id)}`);
}));
router.get('/requests/:id', requireAuth, wrap((req,res) => {
  const r=queryOne('SELECT * FROM oauth_requests WHERE id=?',req.params.id); check(r,'invalid_request');
  res.json({clientName:client(r.client_id).name,redirectHost:new URL(r.redirect).host,scope:r.scope});
}));
for (const action of ['approve','deny']) router.post(`/requests/:id/${action}`,requireAuth,wrap((req,res) => transaction(() => {
  const r=queryOne('SELECT * FROM oauth_requests WHERE id=?',req.params.id); check(r,'invalid_request'); execute('DELETE FROM oauth_requests WHERE id=?',r.id);
  const url = new URL(r.redirect); url.searchParams.set('state',r.state);
  if (action==='deny') url.searchParams.set('error','access_denied');
  else { const code=random(); execute('INSERT INTO oauth_codes VALUES (?,?,?,?,?,?,?,?)',hash(code),r.client_id,req.user.id,r.redirect,r.challenge,r.scope,r.resource,Date.now()+60_000); url.searchParams.set('code',code); }
  res.json({redirectUrl:url.href});
})));
router.post('/device/code',wrap((req,res) => {
  check(req.body.client_id === 'morline-cli','invalid_client');
  const device=random(), userCode=crypto.randomBytes(5).toString('hex').toUpperCase();
  execute('INSERT INTO oauth_devices (hash,user_code,client_id,scope,resource,expires) VALUES (?,?,?,?,?,?)',hash(device),`${userCode.slice(0,5)}-${userCode.slice(5)}`,'morline-cli',scope(req.body.scope),resource(req.body.resource),Date.now()+600_000);
  const code=`${userCode.slice(0,5)}-${userCode.slice(5)}`;
  res.json({device_code:device,user_code:code,verification_uri:verificationUri(),verification_uri_complete:`${verificationUri()}?code=${code}`,expires_in:600,interval:5});
}));
router.post('/device/approve',requireAuth,wrap((req,res) => {
  check(typeof req.body.userCode==='string'); const code=req.body.userCode.trim().toUpperCase();
  const d=queryOne('SELECT * FROM oauth_devices WHERE user_code=?',code); check(d && !d.user_id,'invalid_request');
  execute('UPDATE oauth_devices SET user_id=? WHERE hash=? AND user_id IS NULL',req.user.id,d.hash); res.json({approved:true});
}));
router.post('/token',wrap((req,res) => {
  const b=req.body;
  if (b.grant_type==='urn:ietf:params:oauth:grant-type:device_code') {
    check(b.client_id==='morline-cli','invalid_client'); const d=queryOne('SELECT * FROM oauth_devices WHERE hash=?',hash(String(b.device_code||''))); check(d && d.client_id===b.client_id,'expired_token');
    const now=Date.now(); if(now-d.last_poll<d.interval*1000) {execute('UPDATE oauth_devices SET last_poll=?,interval=interval+5 WHERE hash=?',now,d.hash); throw new OAuthError('slow_down');}
    execute('UPDATE oauth_devices SET last_poll=? WHERE hash=?',now,d.hash); check(d.user_id,'authorization_pending');
    return transaction(() => { execute('DELETE FROM oauth_devices WHERE hash=?',d.hash); res.json(issue(createGrant(d.user_id,d.client_id,d.scope,d.resource,req))); });
  }
  if (b.grant_type==='authorization_code') return transaction(() => {
    const c=queryOne('SELECT * FROM oauth_codes WHERE hash=?',hash(String(b.code||''))); check(c,'invalid_grant');
    check(c.client_id===b.client_id && c.redirect===b.redirect_uri && c.resource===b.resource,'invalid_grant');
    check(typeof b.code_verifier==='string' && /^[A-Za-z0-9._~-]{43,128}$/.test(b.code_verifier) && hash(b.code_verifier)===c.challenge,'invalid_grant');
    execute('DELETE FROM oauth_codes WHERE hash=?',c.hash); res.json(issue(createGrant(c.user_id,c.client_id,c.scope,c.resource,req)));
  });
  if (b.grant_type==='refresh_token') return transaction(() => {
    const g=activeToken(b.refresh_token,'refresh'); check(g && g.client_id===b.client_id && g.token_resource===b.resource,'invalid_grant');
    execute('DELETE FROM oauth_tokens WHERE hash=?',hash(b.refresh_token)); res.json(issue(g,g.token_resource));
  });
  if (b.grant_type==='urn:ietf:params:oauth:grant-type:token-exchange') {
    confidential(req); check(b.subject_token_type==='urn:ietf:params:oauth:token-type:access_token' && b.resource===apiResource(),'invalid_request');
    const g=activeToken(b.subject_token); check(g && g.token_resource===mcpResource(),'invalid_grant');
    return res.json({...issue(g,apiResource(),false),issued_token_type:'urn:ietf:params:oauth:token-type:access_token'});
  }
  throw new OAuthError('unsupported_grant_type');
}));
router.post('/introspect',wrap((req,res) => {
  confidential(req); const g=activeToken(req.body.token);
  res.json(g ? {active:true,sub:g.user_id,client_id:g.client_id,scope:g.scope,aud:g.token_resource,exp:Math.floor(g.token_expires/1000)} : {active:false});
}));
router.post('/revoke',wrap((req,res) => {
  const g=activeToken(req.body.token,req.body.token_type_hint==='refresh_token'?'refresh':'access');
  if(g && g.client_id===req.body.client_id) transaction(() => {execute('DELETE FROM oauth_grants WHERE id=?',g.id);execute('DELETE FROM sessions WHERE id=?',g.session_id);});
  res.json({});
}));
router.get('/grants',requireAuth,wrap((req,res) => res.json({data:queryAll('SELECT g.id,c.name AS clientName,g.scope,g.resource,g.expires FROM oauth_grants g JOIN oauth_clients c ON c.id=g.client_id WHERE g.user_id=?',req.user.id)})));
router.delete('/grants/:id',requireAuth,wrap((req,res) => { const g=queryOne('SELECT * FROM oauth_grants WHERE id=? AND user_id=?',req.params.id,req.user.id); if(g) transaction(() => {execute('DELETE FROM oauth_grants WHERE id=?',g.id);execute('DELETE FROM sessions WHERE id=?',g.session_id);}); res.status(204).end(); }));
export default router;
