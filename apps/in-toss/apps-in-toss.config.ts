import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'techgotgan',
  navigationBar: {
    withTitle: true,
    withBackButton: false,
  },
  permissions: [],
  webBundleDir: 'dist',
});
