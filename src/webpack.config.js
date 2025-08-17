const path = require('path');
const WebpackUserscript = require('webpack-userscript');

module.exports = {
  entry: './src/main.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'Gemini-Prompt-Panel.user.js',
  },
  plugins: [
    new WebpackUserscript({
      headers: {
        name: 'Gemini Prompt Panel Enhancer',
        namespace: 'https://github.com/SysAdminDoc/Gemini-Prompt-Panel',
        version: `[version]`,
        description: 'Upgraded with a professional UI, modular code, profiles, and more.',
        author: 'Matthew Parker & Gemini',
        match: 'https://gemini.google.com/*',
        icon: 'https://raw.githubusercontent.com/SysAdminDoc/Gemini-Prompt-Panel/refs/heads/main/Google_Gemini_icon_2025.svg',
        connect: ['api.github.com', 'gist.githubusercontent.com', 'raw.githubusercontent.com'],
        grant: ['GM_addStyle', 'GM_setValue', 'GM_getValue', 'GM_xmlhttpRequest'],
        'run-at': 'document-idle',
        license: 'MIT',
        updateURL: 'https://github.com/SysAdminDoc/Gemini-Prompt-Panel/raw/refs/heads/main/dist/Gemini%20Prompt%20Panel.user.js',
        downloadURL: 'https://github.com/SysAdminDoc/Gemini-Prompt-Panel/raw/refs/heads/main/dist/Gemini%20Prompt%20Panel.user.js',
      },
      pretty: true,
    }),
  ],
};