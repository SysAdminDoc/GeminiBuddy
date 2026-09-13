const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const archiveRoot = path.join(repoRoot, 'concepts', 'marketing', '2026-09-13');

function readPngMetadata(filePath) {
  const png = fs.readFileSync(filePath);
  assert.strictEqual(png.toString('ascii', 1, 4), 'PNG', `${filePath} is not a PNG`);
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
    colorType: png.readUInt8(25)
  };
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

test('README opens with one version-free marketing hero', () => {
  const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
  const firstLine = readme.split(/\r?\n/, 1)[0];
  assert.strictEqual(firstLine, '![GeminiBuddy: your prompt library beside Gemini](banner.png)');
  assert.strictEqual((readme.match(/\]\(banner\.png\)/g) || []).length, 1);
  assert.doesNotMatch(readme, /codex-branding/i);

  const heroSource = fs.readFileSync(path.join(archiveRoot, 'source', 'hero.html'), 'utf8');
  assert.doesNotMatch(heroSource, /\bv?\d+\.\d+\.\d+\b/i);
  assert.doesNotMatch(heroSource, /\bversion\b/i);
});

test('marketing images use the approved dimensions and transparent icon', () => {
  const bannerPath = path.join(repoRoot, 'banner.png');
  assert.strictEqual(sha256(path.join(archiveRoot, 'selected', 'banner.png')), sha256(bannerPath));
  assert.deepStrictEqual(readPngMetadata(path.join(repoRoot, 'banner.png')), {
    width: 1600,
    height: 900,
    colorType: 2
  });
  assert.deepStrictEqual(readPngMetadata(path.join(repoRoot, 'icon.png')), {
    width: 1024,
    height: 1024,
    colorType: 6
  });
  const iconPath = path.join(repoRoot, 'icon.png');
  assert.strictEqual(sha256(path.join(archiveRoot, 'selected', 'icon.png')), sha256(iconPath));
  assert.strictEqual(sha256(path.join(archiveRoot, 'logo-concepts', 'selected-transparent-master.png')), sha256(iconPath));
  for (const rejected of ['rejected-checkerboard-pass-01.png', 'rejected-checkerboard-pass-02.png']) {
    assert.ok(fs.existsSync(path.join(archiveRoot, 'logo-concepts', rejected)));
  }

  const expectedScreenshots = new Map([
    ['injected-panel.png', [1440, 900]],
    ['options.png', [1440, 900]],
    ['side-panel.png', [420, 900]]
  ]);
  for (const [filename, [width, height]] of expectedScreenshots) {
    const metadata = readPngMetadata(path.join(archiveRoot, 'screenshots', filename));
    assert.strictEqual(metadata.width, width, filename);
    assert.strictEqual(metadata.height, height, filename);
  }
});

test('manifest icon declarations resolve to the complete browser icon set', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'chrome_extension', 'manifest.json'), 'utf8'));
  const iconDirectory = path.join(repoRoot, 'chrome_extension', 'icons');
  for (const size of [16, 32, 48, 64, 128, 256, 512, 1024]) {
    const iconPath = path.join(iconDirectory, `icon${size}.png`);
    assert.ok(fs.existsSync(iconPath), `Missing ${path.relative(repoRoot, iconPath)}`);
    const metadata = readPngMetadata(iconPath);
    assert.strictEqual(metadata.width, size);
    assert.strictEqual(metadata.height, size);
    assert.strictEqual(metadata.colorType, 6);
  }
  for (const [size, relativePath] of Object.entries(manifest.icons)) {
    assert.strictEqual(relativePath, `icons/icon${size}.png`);
  }
});
