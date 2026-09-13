import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { packCrx3File } from './crx3.mjs';

const extensionDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(extensionDir, '..');
const packageInfo = JSON.parse(fs.readFileSync(path.join(extensionDir, 'package.json'), 'utf8'));
const distDir = path.join(extensionDir, 'dist');
const zipPath = path.join(distDir, `geminibuddy-mv3-v${packageInfo.version}.zip`);
const crxPath = path.join(distDir, `geminibuddy-mv3-v${packageInfo.version}.crx`);
const keyPath = process.env.GEMINIBUDDY_CRX_KEY || path.join(repoRoot, 'GeminiBuddy-selfhost.pem');
const checksumPath = path.join(distDir, 'SHA256SUMS.txt');

execFileSync(process.execPath, ['chrome_extension/build-extension.js'], {
  cwd: repoRoot,
  stdio: 'inherit'
});

const verification = await packCrx3File(zipPath, keyPath, crxPath);
const checksumFiles = [
  zipPath,
  crxPath,
  path.join(repoRoot, 'GeminiBuddy.user.js'),
  path.join(repoRoot, 'banner.png'),
  path.join(repoRoot, 'icon.png')
];
const checksums = checksumFiles.map(filePath => {
  const digest = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  return `${digest}  ${path.basename(filePath)}`;
});
fs.writeFileSync(checksumPath, `${checksums.join('\n')}\n`);
console.log(JSON.stringify({
  zip: zipPath,
  crx: crxPath,
  checksums: checksumPath,
  key: keyPath,
  verification
}, null, 2));
