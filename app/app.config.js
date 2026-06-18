const path = require('node:path');
const dotenv = require('dotenv');

// Load the monorepo-root .env first, then a local app/.env.local override if present.
// override: false means already-set env vars (e.g. from CI) are not clobbered.
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: false });
dotenv.config({ path: path.resolve(__dirname, '.env.local'), override: false });

module.exports = {
  expo: {
    name: 'Notes',
    slug: 'cubicecho-notes',
    version: '0.1.0',
    orientation: 'portrait',
    scheme: 'notes',
    userInterfaceStyle: 'automatic',
    web: {
      bundler: 'metro',
      output: 'single',
      favicon: './assets/favicon.png',
    },
    platforms: ['ios', 'android', 'web'],
    plugins: ['expo-router'],
  },
};
