const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const extensionDir = __dirname;
const distDir = path.join(extensionDir, 'dist');
const unpackedDir = path.join(distDir, 'geminibuddy-mv3');
const packageJson = require('./package.json');
const zipPath = path.join(distDir, `geminibuddy-mv3-v${packageJson.version}.zip`);

function removeIfExists(targetPath) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

function copyFile(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

removeIfExists(distDir);
fs.mkdirSync(unpackedDir, { recursive: true });

copyFile(path.join(extensionDir, 'manifest.json'), path.join(unpackedDir, 'manifest.json'));
copyFile(path.join(extensionDir, 'gm-shim.js'), path.join(unpackedDir, 'gm-shim.js'));
copyFile(path.join(extensionDir, 'options.html'), path.join(unpackedDir, 'options.html'));
copyFile(path.join(extensionDir, 'options.css'), path.join(unpackedDir, 'options.css'));
copyFile(path.join(extensionDir, 'options.js'), path.join(unpackedDir, 'options.js'));
copyFile(path.join(rootDir, 'GeminiBuddy.user.js'), path.join(unpackedDir, 'GeminiBuddy.user.js'));
copyFile(path.join(rootDir, 'icon.png'), path.join(unpackedDir, 'icon.png'));

execFileSync('C:\\Windows\\System32\\tar.exe', ['-a', '-c', '-f', zipPath, '-C', unpackedDir, '.'], {
  stdio: 'inherit'
});

console.log(`Built ${zipPath}`);
