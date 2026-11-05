import crypto from 'node:crypto';
import { getDb, queryOne, execute, transaction } from '../db/index.js';
import { PUBLIC_URL, FRONTEND_URL } from '../config.js';
export const issuer = () => PUBLIC_URL.replace(/\/$/, '');
export const apiResource = () => `${issuer()}/v1`;
export const mcpResource = () => process.env.MCP_RESOURCE_URL || '';
export const hash = value => crypto.createHash('sha256').update(value).digest('base64url');
export const random = (prefix = '') => prefix + crypto.randomBytes(32).toString('base64url');
export class OAuthError extends Error { constructor(code, status = 400) { super(code); this.code = code; this.status = status; } }
export function check(condition, code = 'invalid_request', status = 400) { if (!condition) throw new OAuthError(code, status); }
export function initOAuth() {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS oauth_clients (id TEXT PRIMARY KEY, name TEXT NOT NULL, redirects TEXT NOT NULL, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS oauth_requests (id TEXT PRIMARY KEY, client_id TEXT NOT NULL, redirect TEXT NOT NULL, state TEXT NOT NULL, challenge TEXT NOT NULL, scope TEXT NOT NULL, resource TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS oauth_codes (hash TEXT PRIMARY KEY, client_id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, redirect TEXT NOT NULL, challenge TEXT NOT NULL, scope TEXT NOT NULL, resource TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS oauth_devices (hash TEXT PRIMARY KEY, user_code TEXT UNIQUE NOT NULL, client_id TEXT NOT NULL, scope TEXT NOT NULL, resource TEXT NOT NULL, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL, last_poll INTEGER NOT NULL DEFAULT 0, interval INTEGER NOT NULL DEFAULT 5);
    CREATE TABLE IF NOT EXISTS oauth_grants (id TEXT PRIMARY KEY, client_id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE, scope TEXT NOT NULL, resource TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS oauth_tokens (hash TEXT PRIMARY KEY, grant_id TEXT NOT NULL REFERENCES oauth_grants(id) ON DELETE CASCADE, kind TEXT NOT NULL, resource TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS oauth_tokens_grant ON oauth_tokens(grant_id);
  `);
  execute('INSERT OR IGNORE INTO oauth_clients VALUES (?, ?, ?, ?)', 'morline-cli', 'Morline CLI', '[]', Date.now());
}
export function cleanup() {
  const now = Date.now();
  for (const table of ['oauth_requests', 'oauth_codes', 'oauth_devices', 'oauth_tokens', 'oauth_grants']) execute(`DELETE FROM ${table} WHERE expires < ?`, now);
}
export function resource(value) { check([apiResource(), mcpResource()].filter(Boolean).includes(value), 'invalid_target'); return value; }
export function scope(value = 'morline:read morline:write') {
  check(typeof value === 'string'); const parts = [...new Set(value.split(' ').filter(Boolean))];
  check(parts.length && parts.every(p => ['morline:read', 'morline:write'].includes(p)), 'invalid_scope'); return parts.sort().join(' ');
}
export function client(id) { const row = queryOne('SELECT * FROM oauth_clients WHERE id = ?', id); check(row, 'invalid_client'); return row; }
export function redirectAllowed(value) {
  try { const u = new URL(value); return !u.username && !u.password && !u.hash && (u.protocol === 'https:' || (u.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname))); } catch { return false; }
}
export function createGrant(userId, clientId, grantedScope, audience, req) {
  const now = Date.now(), expires = now + 30 * 86400_000, id = random('mog_'), session = crypto.randomUUID();
  execute('INSERT INTO sessions (id,user_id,refresh_token,user_agent,ip,expires_at,created_at,last_active_at) VALUES (?,?,?,?,?,?,?,?)', session, userId, random('unused_'), `OAuth: ${client(clientId).name}`, req.ip || '', new Date(expires).toISOString(), new Date(now).toISOString(), new Date(now).toISOString());
  execute('INSERT INTO oauth_grants VALUES (?,?,?,?,?,?,?)', id, clientId, userId, session, grantedScope, audience, expires);
  return queryOne('SELECT * FROM oauth_grants WHERE id = ?', id);
}
export function activeToken(token, kind = 'access') {
  if (typeof token !== 'string') return null;
  return queryOne(`SELECT g.*, t.resource AS token_resource, t.expires AS token_expires FROM oauth_tokens t JOIN oauth_grants g ON g.id=t.grant_id JOIN sessions s ON s.id=g.session_id JOIN users u ON u.id=g.user_id WHERE t.hash=? AND t.kind=? AND t.expires>? AND g.expires>? AND s.expires_at>?`, hash(token), kind, Date.now(), Date.now(), new Date().toISOString()) || null;
}
export function issue(grant, audience = grant.resource, refresh = true) {
  const access = random('moa_'); const now = Date.now();
  execute('INSERT INTO oauth_tokens VALUES (?,?,?,?,?)', hash(access), grant.id, 'access', audience, Math.min(now + 3600_000, grant.expires));
  const result = { access_token: access, token_type: 'Bearer', expires_in: Math.min(3600, Math.floor((grant.expires-now)/1000)), scope: grant.scope };
  if (refresh) { const value = random('mor_'); execute('INSERT INTO oauth_tokens VALUES (?,?,?,?,?)', hash(value), grant.id, 'refresh', audience, grant.expires); result.refresh_token = value; }
  return result;
}
export function oauthIdentity(token) {
  const grant = activeToken(token); if (!grant || grant.token_resource !== apiResource()) return null;
  return { userId: grant.user_id, sessionId: grant.session_id, oauthGrantId: grant.id, oauthScope: grant.scope };
}
export function authorizeOAuthApi(identity, req) {
  // OAuth tokens cannot become full login credentials or approve other grants.
  if (/^\/(auth|oauth|internal|infrastructure)(\/|$)/.test(req.path)) return false;
  const scopes = identity.oauthScope.split(' ');
  return scopes.includes(['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? 'morline:read' : 'morline:write');
}
export function confidential(req) {
  const expected = process.env.MCP_SHARED_SECRET;
  const provided = req.headers['x-morline-mcp-secret'];
  check(typeof expected === 'string' && expected.length >= 32 && typeof provided === 'string' && hash(expected) === hash(provided), 'invalid_client', 401);
}
export function verificationUri() { return `${FRONTEND_URL.replace(/\/$/, '')}/device`; }
export { transaction };
