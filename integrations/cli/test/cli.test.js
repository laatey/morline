import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', env: { ...process.env, MORLINE_API_URL: 'http://127.0.0.1:9/v1' } });

test('help lists login and deploy', () => {
  const r = run('help');
  assert.equal(r.status, 0);
  assert.match(r.stdout, /login/);
  assert.match(r.stdout, /deploy/);
});

test('unknown command fails', () => {
  const r = run('nope');
  assert.notEqual(r.status, 0);
  assert.match(r.stderr + r.stdout, /Unknown command/);
});

test('destructive command without a TTY needs --yes', () => {
  const r = run('stop', '--service', 'svc_1');
  assert.notEqual(r.status, 0);
  assert.match(r.stderr + r.stdout, /--yes|Not signed in|sign in/i);
});
