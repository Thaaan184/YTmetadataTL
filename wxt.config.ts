import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: 'TubeGlot - YouTube Metadata & Subtitle Localizer',
    description: 'Personal-first, open-source YouTube localization tool without central backends or credit caps.',
    version: '1.0.0',
    permissions: ['storage', 'identity'],
    host_permissions: ['https://www.googleapis.com/*'],
  },
});
