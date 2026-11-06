// Windows only: builds dist/Morline-CLI-Setup-<version>.exe with Inno Setup.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const candidates = [
  'C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe',
  'C:\\Program Files\\Inno Setup 6\\ISCC.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Inno Setup 6', 'ISCC.exe'),
];

function findISCC() {
  for (const p of candidates) if (fs.existsSync(p)) return p;
  try { return execSync('where ISCC.exe', { stdio: 'pipe' }).toString().split('\n')[0].trim() || null; } catch { return null; }
}

if (process.platform !== 'win32') { console.error('The installer can only be built on Windows.'); process.exit(1); }
console.log('=== Morline CLI Installer Builder ===\n');
if (!fs.existsSync(path.join(root, 'dist', 'morline.exe')) || process.argv.includes('--rebuild')) {
  console.log('[1/2] Building morline.exe...');
  execSync('node scripts/build-exe.mjs', { cwd: root, stdio: 'inherit' });
} else console.log('[1/2] Existing dist/morline.exe found (pass --rebuild to rebuild).');

const iscc = findISCC();
if (!iscc) { console.error('ERROR: Inno Setup 6 (ISCC.exe) not found. Install it from https://jrsoftware.org/isinfo.php'); process.exit(1); }
console.log('[2/2] Compiling installer...');
execSync(`"${iscc}" "${path.join(root, 'installer.iss')}"`, { cwd: root, stdio: 'inherit' });
const version = require(path.join(root, 'package.json')).version;
console.log(`\nInstaller ready: dist/Morline-CLI-Setup-${version}.exe`);
