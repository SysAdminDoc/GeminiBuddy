const path = require('path');
const WebpackUserscript = require('webpack-userscript');

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
        version: '36.0-grant-none', // Version bump for the new mode
        description: "CSP-Compliant in @grant none mode. Upgraded with a professional SaaS-style settings menu, UI refinements, and more.",
        author: 'Matthew Parker',
        match: 'https://gemini.google.com/*',
        icon: 'https://raw.githubusercontent.com/SysAdminDoc/GeminiBuddy/refs/heads/main/Google_Gemini_icon_2025.svg',
        connect: '*', // For the fetch API, a wildcard is often needed if the exact domains aren't specified.
        license: 'MIT',
        'run-at': 'document-idle',
        // Critical change: Switch to @grant none
        grant: 'none',
      },
    }),
  ],
  // Optional: Add babel-loader if you want to transpile modern JS for wider compatibility
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