const path = require('path');
const WebpackUserscript = require('webpack-userscript');
const packageInfo = require('./package.js');

module.exports = {
  mode: 'production',
  entry: './src/main.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'GeminiBuddy.user.js',
    publicPath: '/',
  },
  plugins: [
    new WebpackUserscript({
      headers: {
        name: 'GeminiBuddy',
        namespace: 'https://github.com/SysAdminDoc/GeminiBuddy',
        version: packageInfo.version,
        description: 'Save, organize, sync, and run reusable prompts beside Gemini.',
        author: 'Matthew Parker',
        match: 'https://gemini.google.com/*',
        icon: 'https://raw.githubusercontent.com/SysAdminDoc/GeminiBuddy/refs/heads/main/icon.png',
        license: 'MIT',
        'run-at': 'document-idle',
        grant: 'none',
      },
    }),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
};
