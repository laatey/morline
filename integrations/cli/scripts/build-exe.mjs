// Node-only build helper: bundles the CLI and turns it into a standalone executable (Node SEA).
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const win = process.platform === 'win32';
const exe = join(dist, win ? 'morline.exe' : 'morline');
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: 'inherit', shell: win });

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

console.log('[1/4] Bundling CLI...');
run('npx', ['--yes', 'esbuild@0.24.0', 'src/cli.js', '--bundle', '--platform=node', '--format=cjs', '--target=node22', `--outfile=${join(dist, 'morline.cjs')}`]);

console.log('[2/4] Preparing executable blob...');
writeFileSync(join(dist, 'sea-config.json'), JSON.stringify({ main: join(dist, 'morline.cjs'), output: join(dist, 'sea-prep.blob'), disableExperimentalSEAWarning: true }));
execFileSync(process.execPath, ['--experimental-sea-config', join(dist, 'sea-config.json')], { stdio: 'inherit' });

console.log('[3/4] Copying Node runtime...');
copyFileSync(process.execPath, exe);
if (!win) chmodSync(exe, 0o755);
if (process.platform === 'darwin') run('codesign', ['--remove-signature', exe]);

console.log('[4/4] Injecting CLI...');
const args = [exe, 'NODE_SEA_BLOB', join(dist, 'sea-prep.blob'), '--sentinel-fuse', 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2'];
if (process.platform === 'darwin') args.push('--macho-segment-name', 'NODE_SEA');
run('npx', ['--yes', 'postject@1.0.0-alpha.6', ...args]);
if (process.platform === 'darwin') run('codesign', ['--sign', '-', exe]);

for (const f of ['morline.cjs', 'sea-config.json', 'sea-prep.blob']) rmSync(join(dist, f), { force: true });
console.log(`Built ${exe}`);
